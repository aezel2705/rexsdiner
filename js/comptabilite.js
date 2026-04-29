// js/comptabilite.js
class Comptabilite {
    constructor() {
        this.init();
    }

    async init() {
        this.setDefaultDates();
        await this.loadComptabilite();
        await this.loadArchivesHebdo();
        this.setupEventListeners();
    }

    setDefaultDates() {
        const now = new Date();
        const debutSemaine = new Date(now);
        debutSemaine.setDate(now.getDate() - now.getDay() + 1);
        
        const dateDebut = document.getElementById('date-debut');
        const dateFin = document.getElementById('date-fin');
        
        if (dateFin) dateFin.valueAsDate = now;
        if (dateDebut) dateDebut.valueAsDate = debutSemaine;
    }

    async loadComptabilite() {
    const dateDebut = document.getElementById('date-debut')?.value;
    const dateFin = document.getElementById('date-fin')?.value;

    if (!dateDebut || !dateFin) return;

    try {
        // Charger les ventes de la période
        const { data: ventes, error } = await auth.supabase
            .from('ventes')
            .select('*')
            .eq('est_valide', true)
            .gte('created_at', dateDebut)
            .lte('created_at', dateFin + 'T23:59:59');

        if (error) {
            console.error('Erreur chargement ventes:', error);
            return;
        }

        if (ventes && ventes.length > 0) {
            // Ajouter le nom de l'employé pour chaque vente
            for (const vente of ventes) {
                if (vente.employe_id) {
                    const { data: emp } = await auth.supabase
                        .from('employes')
                        .select('nom, salaire_base, commission')
                        .eq('id', vente.employe_id)
                        .single();
                    vente.employes = emp;
                }
            }

            this.calculerStats(ventes);
            this.calculerStatsEmployes(ventes);
            this.calculerTopProduits(ventes);
            await this.calculerStatsPartenaires(ventes);
        } else {
            // Réinitialiser l'affichage
            document.getElementById('ca-total').textContent = '$0.00';
            document.getElementById('benefices').textContent = '$0.00';
            document.getElementById('nb-ventes').textContent = '0';
            document.getElementById('total-salaires').textContent = '$0.00';
            document.getElementById('body-employes').innerHTML = '<tr><td colspan="5">Aucune vente</td></tr>';
            document.getElementById('body-produits').innerHTML = '<tr><td colspan="3">Aucun produit</td></tr>';
            const bodyPartenaires = document.getElementById('body-partenaires');
            if (bodyPartenaires) bodyPartenaires.innerHTML = '<tr><td colspan="5">Aucune vente partenaire</td></tr>';
        }

    } catch (error) {
        console.error('Erreur chargement comptabilité:', error);
    }
}

    calculerStats(ventes) {
    const caOriginal = ventes.reduce((sum, v) => sum + (v.montant_original || v.montant_total), 0);
    const benefices = ventes.reduce((sum, v) => sum + (v.benefice_net || 0), 0);

    document.getElementById('ca-total').textContent = `$${caOriginal.toFixed(2)}`;
    document.getElementById('benefices').textContent = `$${benefices.toFixed(2)}`;
    document.getElementById('nb-ventes').textContent = ventes.length;
}

    calculerStatsEmployes(ventes) {
        const employesStats = {};

        ventes.forEach(vente => {
            const empId = vente.employe_id;
            const empNom = vente.employes?.nom || 'Inconnu';
            
            if (!employesStats[empId]) {
                employesStats[empId] = {
                    nom: empNom,
                    ventes: 0,
                    salaire_base: vente.employes?.salaire_base || 0,
                    commission_pct: vente.employes?.commission || 0
                };
            }
            
            employesStats[empId].ventes += vente.montant_total;
        });

        let totalSalaires = 0;
        const tbody = document.getElementById('body-employes');
        if (!tbody) return;
        
        tbody.innerHTML = Object.values(employesStats).map(emp => {
            const commission = (emp.ventes * emp.commission_pct) / 100;
            const total = Math.min(emp.salaire_base + commission, 19000);
            totalSalaires += total;
            
            return `
                <tr>
                    <td>${emp.nom}</td>
                    <td>$${emp.ventes.toFixed(2)}</td>
                    <td>$${commission.toFixed(2)}</td>
                    <td>$${emp.salaire_base.toFixed(2)}</td>
                    <td>$${total.toFixed(2)}</td>
                </tr>
            `;
        }).join('');

        const totalSalairesEl = document.getElementById('total-salaires');
        if (totalSalairesEl) totalSalairesEl.textContent = `$${totalSalaires.toFixed(2)}`;

        const beneficesEl = document.getElementById('benefices');
        if (beneficesEl) {
            const benefices = parseFloat(beneficesEl.textContent.replace('$', '')) || 0;
            beneficesEl.textContent = `$${(benefices - totalSalaires).toFixed(2)}`;
        }
    }

    calculerTopProduits(ventes) {
    const tbody = document.getElementById('body-produits');
    if (!tbody) return;
    
    if (ventes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3">Aucun produit</td></tr>';
        return;
    }

    // Compter les types de vente
    const standard = ventes.filter(v => v.type_vente === 'standard').length;
    const reduction = ventes.filter(v => v.type_vente === 'reduction').length;
    const servicesPublics = ventes.filter(v => v.type_vente === 'services_publics').length;

    tbody.innerHTML = `
        <tr><td>Ventes standard</td><td>${standard}</td><td>-</td></tr>
        <tr><td>Ventes avec réduction</td><td>${reduction}</td><td>-</td></tr>
        <tr><td>Ventes services publics</td><td>${servicesPublics}</td><td>-</td></tr>
    `;
}
async calculerStatsPartenaires(ventes) {
    const stats = {};
    
    for (const vente of ventes) {
        if (vente.partenaire_id) {
            if (!stats[vente.partenaire_id]) {
                const { data } = await auth.supabase
                    .from('partenaires')
                    .select('nom')
                    .eq('id', vente.partenaire_id)
                    .single();
                
                stats[vente.partenaire_id] = {
                    nom: data?.nom || 'Inconnu',
                    nbVentes: 0,
                    montantReel: 0,
                    montantFacture: 0
                };
            }
            stats[vente.partenaire_id].nbVentes++;
            stats[vente.partenaire_id].montantReel += vente.montant_original || vente.montant_total;
            stats[vente.partenaire_id].montantFacture += vente.montant_final || vente.montant_total;
        }
    }

    const tbody = document.getElementById('body-partenaires');
    if (!tbody) return;

    if (Object.keys(stats).length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">Aucune vente partenaire</td></tr>';
        return;
    }

    tbody.innerHTML = Object.values(stats).map(s => `
        <tr>
            <td>${s.nom}</td>
            <td>${s.nbVentes}</td>
            <td>$${s.montantReel.toFixed(2)}</td>
            <td>$${s.montantFacture.toFixed(2)}</td>
            <td>$${(s.montantReel - s.montantFacture).toFixed(2)}</td>
        </tr>
    `).join('');
}
    setupEventListeners() {
        const btnActualiser = document.getElementById('btn-actualiser');
        if (btnActualiser) {
            btnActualiser.addEventListener('click', () => this.loadComptabilite());
        }
        document.getElementById('btn-cloturer-semaine')?.addEventListener('click', () => {
    this.cloturerSemaine();
});
    }
    async loadArchivesHebdo() {
    const { data } = await auth.supabase
        .from('archives_hebdo')
        .select('*, employes(nom)')
        .order('created_at', { ascending: false })
        .limit(6);

    const tbody = document.getElementById('body-archives-hebdo');
    if (!tbody) return;

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">Aucune archive</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(a => `
        <tr>
            <td>${new Date(a.semaine_debut).toLocaleDateString('fr-FR')} → ${new Date(a.semaine_fin).toLocaleDateString('fr-FR')}</td>
            <td>$${a.chiffre_affaires_total.toFixed(2)}</td>
            <td>${a.nombre_ventes}</td>
            <td>${a.total_heures_travaillees}h</td>
            <td>$${a.total_salaires.toFixed(2)}</td>
            <td><strong>$${a.benefice_entreprise.toFixed(2)}</strong></td>
            <td>${a.employes?.nom || 'N/A'}</td>
        </tr>
    `).join('');
}

async cloturerSemaine() {
    if (!confirm('⚠️ Êtes-vous sûr de vouloir clôturer la semaine ?\n\nCette action va :\n- Sauvegarder un récapitulatif\n- Remettre les compteurs à zéro\n- Cette action est irréversible')) {
        return;
    }

    const dateDebut = document.getElementById('date-debut')?.value;
    const dateFin = document.getElementById('date-fin')?.value;

    if (!dateDebut || !dateFin) {
        alert('Veuillez sélectionner une période');
        return;
    }

    try {
        // Récupérer toutes les ventes valides de la période
        const { data: ventes } = await auth.supabase
            .from('ventes')
            .select('*')
            .eq('est_valide', true)
            .gte('created_at', dateDebut)
            .lte('created_at', dateFin + 'T23:59:59');

        // Récupérer les services valides
        const { data: services } = await auth.supabase
            .from('services')
            .select('*')
            .eq('est_valide', true)
            .gte('created_at', dateDebut)
            .lte('created_at', dateFin + 'T23:59:59');

        // Calculs
        const caTotal = ventes ? ventes.reduce((s, v) => s + (v.montant_final || v.montant_total), 0) : 0;
        const caStandard = ventes ? ventes.filter(v => v.type_vente === 'standard').reduce((s, v) => s + v.montant_final, 0) : 0;
        const caReduction = ventes ? ventes.filter(v => v.type_vente === 'reduction').reduce((s, v) => s + v.montant_final, 0) : 0;
        const caServicesPublics = ventes ? ventes.filter(v => v.type_vente === 'services_publics').reduce((s, v) => s + v.montant_final, 0) : 0;
        const subventions = ventes ? ventes.reduce((s, v) => s + ((v.montant_original || v.montant_total) - (v.montant_final || v.montant_total)), 0) : 0;
        const totalHeures = services ? services.reduce((s, sv) => s + (sv.duree_minutes || 0), 0) / 60 : 0;
        const nbServices = services ? services.length : 0;

        // Calculer les salaires
        const { data: employes } = await auth.supabase
            .from('employes')
            .select('salaire_total');
        const totalSalaires = employes ? employes.reduce((s, e) => s + e.salaire_total, 0) : 0;

        const benefice = caTotal - totalSalaires;

        // Sauvegarder l'archive
        const { error } = await auth.supabase
            .from('archives_hebdo')
            .insert({
                semaine_debut: dateDebut,
                semaine_fin: dateFin,
                chiffre_affaires_total: caTotal,
                chiffre_affaires_standard: caStandard,
                chiffre_affaires_reduction: caReduction,
                chiffre_affaires_services_publics: caServicesPublics,
                total_subventions: subventions,
                total_salaires: totalSalaires,
                benefice_entreprise: benefice,
                nombre_ventes: ventes ? ventes.length : 0,
                nombre_services_valides: nbServices,
                total_heures_travaillees: totalHeures,
                details: { ventes: ventes, services: services },
                cloture_par: auth.currentUser.id
            });

        if (error) throw error;

        // Remettre les compteurs à zéro
        await auth.supabase
            .from('employes')
            .update({
                ventes_totales: 0,
                commission_totale: 0,
                salaire_total: 0,  // Sera recalculé avec le salaire de base
                heures_travaillees: 0,
                nombre_services: 0
            })
            .neq('id', '00000000-0000-0000-0000-000000000000');

        // Remettre les salaires = salaire de base
        await auth.supabase
            .from('employes')
            .select('id, salaire_base')
            .then(async ({ data }) => {
                for (const emp of data || []) {
                    await auth.supabase
                        .from('employes')
                        .update({ salaire_total: emp.salaire_base })
                        .eq('id', emp.id);
                }
            });

        alert('✅ Semaine clôturée avec succès !\n\nRécapitulatif sauvegardé dans les archives.\nTous les compteurs ont été remis à zéro.');
        
        await this.loadArchivesHebdo();
        await this.loadComptabilite();

    } catch (error) {
        alert('❌ Erreur lors de la clôture: ' + error.message);
        console.error(error);
    }
}
}

document.addEventListener('DOMContentLoaded', () => {
    if (auth.isAuthenticated()) {
        new Comptabilite();
    }
});