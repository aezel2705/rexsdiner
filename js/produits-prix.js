// js/produits-prix.js
class ProduitsPrix {
    constructor() {
        this.modal = document.getElementById('modal-produit');
        this.form = document.getElementById('produit-form');
        this.produits = [];
        this.init();
    }

    async init() {
        await this.loadProduits();
        this.setupEventListeners();
    }

    async loadProduits() {
        try {
            const { data, error } = await auth.supabase
                .from('produits')
                .select('*')
                .order('nom');

            if (error) throw error;
            
            this.produits = data || [];
            this.renderProduits();

        } catch (error) {
            console.error('Erreur chargement produits:', error);
        }
    }

    renderProduits() {
    const tbody = document.getElementById('produits-body');
    if (!tbody) return;
    
    if (this.produits.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">Aucun produit</td></tr>';
        return;
    }

    const menus = this.produits.filter(p => p.type === 'menu');
    const unitaires = this.produits.filter(p => p.type === 'unitaire');

    let html = '';

    if (menus.length > 0) {
        html += `<tr style="background: #f0f4ff; font-weight: bold;">
            <td colspan="5">🍽️ Menus</td>
        </tr>`;
        menus.forEach(prod => {
            html += this.renderLigneProduit(prod);
        });
    }

    if (unitaires.length > 0) {
        html += `<tr style="background: #f0fff0; font-weight: bold;">
            <td colspan="5">🍔 Produits unitaires</td>
        </tr>`;
        unitaires.forEach(prod => {
            html += this.renderLigneProduit(prod);
        });
    }

    tbody.innerHTML = html;
}

renderLigneProduit(prod) {
    return `
        <tr>
            <td>${prod.nom}</td>
            <td><span class="badge badge-${prod.type}">${prod.type}</span></td>
            <td>$${prod.prix_vente.toFixed(2)}</td>
            <td>$${prod.cout_fabrication.toFixed(2)}</td>
            <td class="actions">
                <button class="btn-edit" onclick="produitsManager.editProduit('${prod.id}')">✏️</button>
                <button class="btn-delete" onclick="produitsManager.deleteProduit('${prod.id}')">🗑️</button>
            </td>
        </tr>
    `;
}

    setupEventListeners() {
        document.getElementById('btn-ajouter-produit')?.addEventListener('click', () => this.openModal());
        document.querySelector('#modal-produit .close')?.addEventListener('click', () => this.closeModal());

        this.form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveProduit();
        });

        window.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeModal();
        });

        document.getElementById('prod-type')?.addEventListener('change', () => this.toggleMenuComposition());
        document.getElementById('btn-ajouter-composition')?.addEventListener('click', () => this.ajouterLigneComposition());
    }

    toggleMenuComposition() {
        const type = document.getElementById('prod-type')?.value;
        const div = document.getElementById('menu-composition');
        if (div) div.style.display = type === 'menu' ? 'block' : 'none';
    }

    ajouterLigneComposition(produitId = '', quantite = '1') {
        const container = document.getElementById('composition-list');
        if (!container) return;

        const div = document.createElement('div');
        div.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: flex-end;';
        
        let options = '<option value="">Choisir un produit...</option>';
        this.produits.forEach(p => {
            options += `<option value="${p.id}" ${p.id === produitId ? 'selected' : ''}>${p.nom} - $${p.prix_vente}</option>`;
        });

        div.innerHTML = `
            <div class="form-group" style="flex: 2; margin: 0;">
                <select class="composition-select">${options}</select>
            </div>
            <div class="form-group" style="flex: 1; margin: 0;">
                <input type="number" class="composition-quantite" value="${quantite}" min="1" placeholder="Qté">
            </div>
            <button type="button" class="btn-remove-composition" style="background: #e74c3c; color: white; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer;">🗑️</button>
        `;

        div.querySelector('.btn-remove-composition').addEventListener('click', () => div.remove());
        container.appendChild(div);
    }

    async loadCompositionMenu(menuId) {
        const container = document.getElementById('composition-list');
        if (!container) return;
        container.innerHTML = '';

        const { data } = await auth.supabase
            .from('composition_menu')
            .select('*')
            .eq('menu_id', menuId);

        if (data && data.length > 0) {
            data.forEach(c => this.ajouterLigneComposition(c.produit_id, c.quantite));
        } else {
            this.ajouterLigneComposition();
        }
    }

    async saveCompositionMenu(menuId) {
        await auth.supabase.from('composition_menu').delete().eq('menu_id', menuId);

        const lignes = document.querySelectorAll('#composition-list > div');
        for (const ligne of lignes) {
            const select = ligne.querySelector('.composition-select');
            const quantite = ligne.querySelector('.composition-quantite');
            if (select?.value && quantite?.value) {
                await auth.supabase.from('composition_menu').insert({
                    menu_id: menuId,
                    produit_id: select.value,
                    quantite: parseInt(quantite.value)
                });
            }
        }
    }

    editProduit(id) {
        const produit = this.produits.find(p => p.id === id);
        if (!produit) return;

        document.getElementById('modal-produit-title').textContent = 'Modifier le produit';
        document.getElementById('prod-id').value = produit.id;
        document.getElementById('prod-nom').value = produit.nom;
        document.getElementById('prod-type').value = produit.type;
        document.getElementById('prod-prix-vente').value = produit.prix_vente;
        document.getElementById('prod-cout-fab').value = produit.cout_fabrication;

        if (produit.type === 'menu') {
            document.getElementById('menu-composition').style.display = 'block';
            this.loadCompositionMenu(produit.id);
        } else {
            document.getElementById('menu-composition').style.display = 'none';
        }

        this.openModal();
    }

    openModal() {
        if (this.modal) {
            this.modal.style.display = 'block';
            if (!document.getElementById('prod-id').value) {
                document.getElementById('modal-produit-title').textContent = 'Ajouter un produit';
                document.getElementById('menu-composition').style.display = 'none';
                document.getElementById('composition-list').innerHTML = '';
            }
        }
    }

    closeModal() {
        if (this.modal) {
            this.modal.style.display = 'none';
            this.form?.reset();
            document.getElementById('prod-id').value = '';
            document.getElementById('composition-list').innerHTML = '';
            document.getElementById('menu-composition').style.display = 'none';
        }
    }

    async saveProduit() {
        const id = document.getElementById('prod-id').value;
        const produitData = {
            nom: document.getElementById('prod-nom').value,
            type: document.getElementById('prod-type').value,
            prix_vente: parseFloat(document.getElementById('prod-prix-vente').value),
            cout_fabrication: parseFloat(document.getElementById('prod-cout-fab').value),
            updated_at: new Date().toISOString()
        };

        try {
            let produitId = id;

            if (id) {
                const { error } = await auth.supabase
                    .from('produits')
                    .update(produitData)
                    .eq('id', id);
                if (error) throw error;
            } else {
                const { data, error } = await auth.supabase
                    .from('produits')
                    .insert(produitData)
                    .select()
                    .single();
                if (error) throw error;
                produitId = data.id;
            }

            if (produitData.type === 'menu' && produitId) {
                await this.saveCompositionMenu(produitId);
            }

            this.closeModal();
            await this.loadProduits();

        } catch (error) {
            alert('Erreur: ' + error.message);
        }
    }

    async deleteProduit(id) {
        if (!confirm('Supprimer ce produit ?')) return;
        await auth.supabase.from('produits').delete().eq('id', id);
        await this.loadProduits();
    }
}

let produitsManager;

document.addEventListener('DOMContentLoaded', () => {
    if (auth.isAuthenticated()) produitsManager = new ProduitsPrix();
});