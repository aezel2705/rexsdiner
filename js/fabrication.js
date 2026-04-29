// js/fabrication.js
class Fabrication {
    constructor() {
        this.produits = [];
        this.employes = [];
        this.init();
    }

    async init() {
        await this.loadProduits();
        await this.loadEmployes();
        this.setupEventListeners();
        await this.loadDernieresFabrications();
    }

    async loadProduits() {
    const { data } = await auth.supabase
        .from('produits')
        .select('*')
        .eq('type', 'unitaire')   // ← Uniquement les produits unitaires
        .order('nom');

    if (data) {
        this.produits = data;
        const select = document.getElementById('produit-fabrication');
        if (!select) return;
        
        select.innerHTML = '<option value="">Choisir le produit...</option>';
        
        data.forEach(p => {
            select.innerHTML += `<option value="${p.id}">${p.nom}</option>`;
        });
    }
}

    async loadEmployes() {
        const { data } = await auth.supabase    // ← CORRIGÉ
            .from('employes')
            .select('id, nom')
            .order('nom');

        if (data) {
            this.employes = data;
            const select = document.getElementById('employe-fabrication');
            if (!select) return;
            
            data.forEach(emp => {
                const option = document.createElement('option');
                option.value = emp.id;
                option.textContent = emp.nom;
                if (emp.id === auth.currentUser?.id) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
        }
    }

    setupEventListeners() {
        const btnDeclarer = document.getElementById('btn-declarer-fabrication');
        if (btnDeclarer) {
            btnDeclarer.addEventListener('click', () => this.declarerFabrication());
        }
    }

    async declarerFabrication() {
        const employeId = document.getElementById('employe-fabrication')?.value;
        const produitId = document.getElementById('produit-fabrication')?.value;
        const quantite = parseInt(document.getElementById('quantite-fabrication')?.value);

        if (!employeId || !produitId || !quantite) {
            this.afficherMessage('Veuillez remplir tous les champs', 'error');
            return;
        }

        try {
            const { error: fabError } = await auth.supabase    // ← CORRIGÉ
                .from('fabrications')
                .insert({
                    employe_id: employeId,
                    produit_id: produitId,
                    quantite: quantite
                });

            if (fabError) throw fabError;

            await this.updateStock(produitId, quantite);

            await auth.supabase    // ← CORRIGÉ
                .from('archives')
                .insert({
                    type_action: 'fabrication',
                    description: `Fabrication de ${quantite} unité(s)`,
                    details: {
                        employe_id: employeId,
                        produit_id: produitId,
                        quantite: quantite
                    }
                });

            this.afficherMessage('Fabrication déclarée avec succès !', 'success');
            this.resetFormulaire();
            await this.loadDernieresFabrications();

        } catch (error) {
            this.afficherMessage('Erreur: ' + error.message, 'error');
        }
    }

    async updateStock(produitId, quantite) {
        const { data: stock } = await auth.supabase    // ← CORRIGÉ
            .from('stocks')
            .select('*')
            .eq('produit_id', produitId)
            .single();

        if (stock) {
            await auth.supabase    // ← CORRIGÉ
                .from('stocks')
                .update({
                    quantite_disponible: stock.quantite_disponible + quantite,
                    updated_at: new Date().toISOString()
                })
                .eq('produit_id', produitId);
        } else {
            await auth.supabase    // ← CORRIGÉ
                .from('stocks')
                .insert({
                    produit_id: produitId,
                    quantite_disponible: quantite
                });
        }
    }

    async loadDernieresFabrications() {
        const { data } = await auth.supabase    // ← CORRIGÉ
            .from('fabrications')
            .select(`
                *,
                employes (nom),
                produits (nom)
            `)
            .order('created_at', { ascending: false })
            .limit(10);

        const container = document.getElementById('liste-fabrications');
        if (!container) return;
        
        if (data && data.length > 0) {
            container.innerHTML = data.map(fab => `
                <div class="fabrication-item">
                    <div class="fab-header">
                        <strong>${fab.produits?.nom || 'Produit inconnu'}</strong>
                        <span>par ${fab.employes?.nom || 'Employé inconnu'}</span>
                    </div>
                    <div class="fab-details">
                        <span>Quantité: ${fab.quantite}</span>
                        <span>${new Date(fab.created_at).toLocaleString('fr-FR')}</span>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p>Aucune fabrication récente</p>';
        }
    }

    resetFormulaire() {
        const select = document.getElementById('produit-fabrication');
        const input = document.getElementById('quantite-fabrication');
        if (select) select.value = '';
        if (input) input.value = '1';
    }

    afficherMessage(message, type) {
        const messageDiv = document.getElementById('message-fabrication');
        if (!messageDiv) return;
        
        messageDiv.textContent = message;
        messageDiv.className = `message message-${type}`;
        messageDiv.style.display = 'block';
        setTimeout(() => messageDiv.style.display = 'none', 5000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (auth.isAuthenticated()) {
        new Fabrication();
    }
});