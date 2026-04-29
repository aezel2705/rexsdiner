// js/dashboard.js
class Dashboard {
    constructor() {
        this.timerInterval = null;
        this.serviceStartTime = null;
        this.currentServiceId = null;
        this.init();
    }

    async init() {
        this.displayDate();
        this.loadStats();
        this.setupTimer();
        await this.restoreTimerState();
    }

    displayDate() {
        const date = new Date();
        const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        const el = document.getElementById('current-date');
        if (el) el.textContent = date.toLocaleDateString('fr-FR', options);
    }

    async loadStats() {
        try {
            // Chiffre d'affaires
            const { data: ventes } = await auth.supabase
                .from('ventes')
                .select('montant_final, montant_total')
                .eq('est_valide', true);
            
            const ca = ventes ? ventes.reduce((sum, v) => sum + (v.montant_final || v.montant_total), 0) : 0;
            const caEl = document.getElementById('chiffre-affaires');
            if (caEl) caEl.textContent = `$${ca.toFixed(2)}`;

            // Salaire, temps, employés actifs
            await this.loadPersonalStats();

        } catch (error) {
            console.error('Erreur chargement stats:', error);
        }
    }

    async loadPersonalStats() {
        try {
            // Recharger les infos de l'employé connecté
            const { data: employe } = await auth.supabase
                .from('employes')
                .select('salaire_total, heures_travaillees, nombre_services')
                .eq('id', auth.currentUser.id)
                .single();

            if (employe) {
                const salaireEl = document.getElementById('salaire');
                if (salaireEl) salaireEl.textContent = `$${(employe.salaire_total || 0).toFixed(2)}`;

                const tempsEl = document.getElementById('temps-travaille');
                if (tempsEl) tempsEl.textContent = `${(employe.heures_travaillees || 0)}h`;

                // Mettre à jour localStorage
                auth.currentUser.heures_travaillees = employe.heures_travaillees;
                auth.currentUser.salaire_total = employe.salaire_total;
                localStorage.setItem('currentUser', JSON.stringify(auth.currentUser));
            }

            // Employés actifs
            const { data: employes } = await auth.supabase
                .from('employes')
                .select('id');
            const empEl = document.getElementById('employes-actifs');
            if (empEl) empEl.textContent = employes ? employes.length : 0;

        } catch (error) {
            console.error('Erreur stats personnelles:', error);
        }
    }

    async restoreTimerState() {
        const savedStartTime = localStorage.getItem('serviceStartTime');
        const savedServiceId = localStorage.getItem('currentServiceId');
        
        if (savedStartTime) {
            this.serviceStartTime = new Date(parseInt(savedStartTime));
            this.currentServiceId = savedServiceId;
            
            document.getElementById('btn-prise-service').disabled = true;
            document.getElementById('btn-fin-service').disabled = false;
            
            this.startTimerInterval();
        }
    }

    setupTimer() {
        document.getElementById('btn-prise-service')?.addEventListener('click', () => {
            this.startService();
        });

        document.getElementById('btn-fin-service')?.addEventListener('click', () => {
            this.stopService();
        });
    }

    async startService() {
        const now = new Date();
        this.serviceStartTime = now;
        
        // Sauvegarder dans localStorage
        localStorage.setItem('serviceStartTime', now.getTime().toString());
        
        // Créer le service dans Supabase
        try {
            const { data, error } = await auth.supabase
                .from('services')
                .insert({
                    employe_id: auth.currentUser.id,
                    debut: now.toISOString(),
                    est_valide: true
                })
                .select()
                .single();

            if (error) {
                console.error('Erreur création service:', error);
            } else if (data) {
                this.currentServiceId = data.id;
                localStorage.setItem('currentServiceId', data.id);
            }
        } catch (e) {
            console.error('Exception création service:', e);
        }
        
        document.getElementById('btn-prise-service').disabled = true;
        document.getElementById('btn-fin-service').disabled = false;
        
        this.startTimerInterval();
    }

    startTimerInterval() {
        clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            this.updateTimerDisplay();
        }, 1000);
        this.updateTimerDisplay();
    }

    updateTimerDisplay() {
        if (!this.serviceStartTime) return;
        
        const now = new Date();
        const diffMs = now.getTime() - this.serviceStartTime.getTime();
        const totalSeconds = Math.floor(diffMs / 1000);
        
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        const display = document.getElementById('timer-display');
        if (display) {
            display.textContent = 
                `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
    }

    async stopService() {
        clearInterval(this.timerInterval);
        
        const now = new Date();
        const diffMs = this.serviceStartTime ? now.getTime() - this.serviceStartTime.getTime() : 0;
        const dureeMinutes = Math.floor(diffMs / 60000);
        const estValide = dureeMinutes >= 30;
        
        document.getElementById('btn-prise-service').disabled = false;
        document.getElementById('btn-fin-service').disabled = true;
        
        // Mettre à jour le service dans Supabase
        if (this.currentServiceId) {
            try {
                await auth.supabase
                    .from('services')
                    .update({
                        fin: now.toISOString(),
                        duree_minutes: dureeMinutes,
                        est_valide: estValide
                    })
                    .eq('id', this.currentServiceId);
            } catch (e) {
                console.error('Erreur mise à jour service:', e);
            }
        }
        
        // Mettre à jour les stats de l'employé si service valide
        if (estValide) {
            try {
                const heures = dureeMinutes / 60;
                
                // Récupérer les valeurs actuelles
                const { data: emp } = await auth.supabase
                    .from('employes')
                    .select('heures_travaillees, nombre_services')
                    .eq('id', auth.currentUser.id)
                    .single();

                if (emp) {
                    await auth.supabase
                        .from('employes')
                        .update({
                            heures_travaillees: (emp.heures_travaillees || 0) + heures,
                            nombre_services: (emp.nombre_services || 0) + 1
                        })
                        .eq('id', auth.currentUser.id);
                }
            } catch (e) {
                console.error('Erreur mise à jour employé:', e);
            }
        }
        
        // Effacer le localStorage
        localStorage.removeItem('serviceStartTime');
        localStorage.removeItem('currentServiceId');
        this.serviceStartTime = null;
        this.currentServiceId = null;
        
        document.getElementById('timer-display').textContent = '00:00:00';
        
        if (!estValide) {
            alert('⚠️ Service non valide (moins de 30 minutes). Non comptabilisé.');
        } else {
            alert(`✅ Service terminé !\nDurée : ${dureeMinutes} minutes (${(dureeMinutes/60).toFixed(1)}h)`);
        }
        
        // Recharger les stats
        await this.loadPersonalStats();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (auth.isAuthenticated()) {
        new Dashboard();
    }
});