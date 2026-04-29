// js/partenaires.js
class Partenaires {
    constructor() {
        this.modal = document.getElementById('modal-partenaire');
        this.form = document.getElementById('partenaire-form');
        this.partenaires = [];
        this.produits = [];
        this.init();
    }

    async init() {
        await this.loadProduits();
        await this.loadPartenaires();
        this.setupEventListeners();
    }

    async loadProduits() {
        const { data } = await auth.supabase
            .from('produits')
            .select('*')
            .eq('type', 'unitaire')
            .order('nom');
        this.produits = data || [];
    }

    async loadPartenaires() {
        const { data } = await auth.supabase
            .from('partenaires')
            .select('*')
            .order('nom');
        this.partenaires = data || [];
        this.renderPartenaires();
    }

    async getProduitsCount(partenaireId) {
        const { data } = await auth.supabase
            .from('partenaires_produits')
            .select('id', { count: 'exact' })
            .eq('partenaire_id', partenaireId);
        return data ? data.length : 0;
    }

    async renderPartenaires() {
        const tbody = document.getElementById('partenaires-body');
        if (!tbody) return;
        
        if (this.partenaires.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">Aucun partenaire</td></tr>';
            return;
        }

        let html = '';
        for (const p of this.partenaires) {
            const nbProduits = await this.getProduitsCount(p.id);
            html += `
                <tr>
                    <td>${p.nom}</td>
                    <td>
                        <span class="badge ${p.type === 'services_publics' ? 'badge-service' : 'badge-vente'}">
                            ${p.type === 'services_publics' ? 'Services publics' : 'Réduction'}
                        </span>
                    </td>
                    <td>${p.type === 'services_publics' ? p.prix_symbolique + ' $' : p.reduction_pct + ' %'}</td>
                    <td>${nbProduits} produit(s)</td>
                    <td><span class="badge ${p.actif ? 'badge-success' : 'badge-danger'}">${p.actif ? 'Actif' : 'Inactif'}</span></td>
                    <td class="actions">
                        <button class="btn-edit" onclick="partenairesManager.editPartenaire('${p.id}')">✏️</button>
                        <button class="btn-delete" onclick="partenairesManager.deletePartenaire('${p.id}')">🗑️</button>
                    </td>
                </tr>
            `;
        }
        tbody.innerHTML = html;
    }

    setupEventListeners() {
        document.getElementById('btn-ajouter-partenaire')?.addEventListener('click', () => this.openModal());
        document.querySelector('.close')?.addEventListener('click', () => this.closeModal());
        
        document.getElementById('part-type')?.addEventListener('change', (e) => {
            document.getElementById('group-reduction').style.display = e.target.value === 'reduction' ? 'block' : 'none';
            document.getElementById('group-prix-symbolique').style.display = e.target.value === 'services_publics' ? 'block' : 'none';
        });

        document.getElementById('btn-ajouter-produit-partenaire')?.addEventListener('click', () => this.ajouterLigneProduit());

        this.form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.savePartenaire();
        });

        window.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeModal();
        });
    }

    ajouterLigneProduit(produitId = '') {
        const container = document.getElementById('partenaires-produits-list');
        if (!container) return;

        const div = document.createElement('div');
        div.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: center;';
        
        let options = '<option value="">Choisir un produit...</option>';
        this.produits.forEach(p => {
            options += `<option value="${p.id}" ${p.id === produitId ? 'selected' : ''}>${p.nom} - $${p.prix_vente}</option>`;
        });

        div.innerHTML = `
            <select class="produit-partenaire-select" style="flex: 1;">${options}</select>
            <button type="button" class="btn-remove-produit" style="background: #e74c3c; color: white; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer;">🗑️</button>
        `;

        div.querySelector('.btn-remove-produit').addEventListener('click', () => div.remove());
        container.appendChild(div);
    }

    async loadProduitsPartenaire(partenaireId) {
        const container = document.getElementById('partenaires-produits-list');
        if (!container) return;
        container.innerHTML = '';

        const { data } = await auth.supabase
            .from('partenaires_produits')
            .select('produit_id')
            .eq('partenaire_id', partenaireId);

        if (data && data.length > 0) {
            data.forEach(p => this.ajouterLigneProduit(p.produit_id));
        } else {
            this.ajouterLigneProduit();
        }
    }

    async editPartenaire(id) {
        const p = this.partenaires.find(x => x.id === id);
        if (!p) return;
        
        document.getElementById('modal-title').textContent = 'Modifier le partenaire';
        document.getElementById('part-id').value = p.id;
        document.getElementById('part-nom').value = p.nom;
        document.getElementById('part-type').value = p.type;
        document.getElementById('part-reduction').value = p.reduction_pct;
        document.getElementById('part-prix-symbolique').value = p.prix_symbolique;
        
        document.getElementById('group-reduction').style.display = p.type === 'reduction' ? 'block' : 'none';
        document.getElementById('group-prix-symbolique').style.display = p.type === 'services_publics' ? 'block' : 'none';
        
        await this.loadProduitsPartenaire(p.id);
        this.openModal();
    }

    openModal() {
        if (this.modal) this.modal.style.display = 'block';
        if (!document.getElementById('part-id').value) {
            document.getElementById('modal-title').textContent = 'Ajouter un partenaire';
            document.getElementById('partenaires-produits-list').innerHTML = '';
            this.ajouterLigneProduit();
        }
    }

    closeModal() {
        if (this.modal) this.modal.style.display = 'none';
        this.form?.reset();
        document.getElementById('part-id').value = '';
        document.getElementById('partenaires-produits-list').innerHTML = '';
        document.getElementById('group-reduction').style.display = 'block';
        document.getElementById('group-prix-symbolique').style.display = 'none';
    }

    async savePartenaire() {
        const id = document.getElementById('part-id')?.value || null;
        const partenaireData = {
            nom: document.getElementById('part-nom').value,
            type: document.getElementById('part-type').value,
            reduction_pct: parseFloat(document.getElementById('part-reduction').value) || 0,
            prix_symbolique: parseFloat(document.getElementById('part-prix-symbolique').value) || 1.00,
            updated_at: new Date().toISOString()
        };

        try {
    let partenaireId = id;

    if (id) {
        // Modification
        await auth.supabase.from('partenaires').update(partenaireData).eq('id', id);
        partenaireId = id;
    } else {
        // Création
        const { data, error } = await auth.supabase
            .from('partenaires')
            .insert(partenaireData)
            .select()
            .single();
        if (error) throw error;
        partenaireId = data.id;
    }

    // Sauvegarder les produits autorisés
    if (partenaireId) {
        await auth.supabase.from('partenaires_produits').delete().eq('partenaire_id', partenaireId);

        const selects = document.querySelectorAll('.produit-partenaire-select');
        for (const select of selects) {
            if (select.value) {
                await auth.supabase.from('partenaires_produits').insert({
                    partenaire_id: partenaireId,
                    produit_id: select.value
                });
            }
        }
    }

    this.closeModal();
    await this.loadPartenaires();

} catch (error) {
    alert('Erreur: ' + error.message);
    console.error(error);
}
    }

    async deletePartenaire(id) {
        if (!confirm('Supprimer ce partenaire ?')) return;
        await auth.supabase.from('partenaires').delete().eq('id', id);
        await this.loadPartenaires();
    }
}

let partenairesManager;
document.addEventListener('DOMContentLoaded', () => {
    if (auth.isAuthenticated()) partenairesManager = new Partenaires();
});