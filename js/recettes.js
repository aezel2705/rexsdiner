// js/recettes.js
class Recettes {
    constructor() {
        this.produits = [];
        this.ingredients = [];
        this.init();
    }

    async init() {
        await this.loadProduits();
        await this.loadIngredients();
        this.setupEventListeners();
    }

    async loadProduits() {
    const { data } = await auth.supabase
        .from('produits')
        .select('*')
        .order('type')
        .order('nom');

    if (data) {
        this.produits = data;
        document.querySelectorAll('#produit-recette, #admin-produit').forEach(select => {
            if (!select) return;
            select.innerHTML = '<option value="">Choisir...</option>';
            
            // Regrouper par type
            const menus = data.filter(p => p.type === 'menu');
            const unitaires = data.filter(p => p.type === 'unitaire');
            
            if (menus.length > 0) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = '🍽️ Menus';
                menus.forEach(p => {
                    optgroup.innerHTML += `<option value="${p.id}">${p.nom}</option>`;
                });
                select.appendChild(optgroup);
            }
            
            if (unitaires.length > 0) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = '🍔 Produits unitaires';
                unitaires.forEach(p => {
                    optgroup.innerHTML += `<option value="${p.id}">${p.nom}</option>`;
                });
                select.appendChild(optgroup);
            }
        });
    }
}

    async loadIngredients() {
        const { data } = await auth.supabase
            .from('ingredients')
            .select('*')
            .order('nom');
        if (data) this.ingredients = data;
    }

    setupEventListeners() {
        document.getElementById('btn-calculer')?.addEventListener('click', () => this.calculer());
        document.getElementById('btn-ajouter-ingredient')?.addEventListener('click', () => this.ajouterLigne());
        document.getElementById('btn-enregistrer-recette')?.addEventListener('click', () => this.enregistrer());
        document.getElementById('admin-produit')?.addEventListener('change', () => this.chargerRecette());
    }

    ajouterLigne(ingredientId = '', quantite = '') {
        const container = document.getElementById('ingredients-list');
        const div = document.createElement('div');
        div.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: flex-end;';
        
        let options = '<option value="">Choisir...</option>';
        this.ingredients.forEach(i => {
            options += `<option value="${i.id}" ${i.id === ingredientId ? 'selected' : ''}>${i.nom} - $${i.prix_unitaire}/${i.unite}</option>`;
        });

        div.innerHTML = `
            <div class="form-group" style="flex: 2; margin: 0;">
                <select class="ingredient-select">${options}</select>
            </div>
            <div class="form-group" style="flex: 1; margin: 0;">
                <input type="number" class="ingredient-quantite" value="${quantite}" min="0.01" step="0.01" placeholder="Qté">
            </div>
            <button type="button" class="btn-remove-ingredient" style="background: #e74c3c; color: white; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer;">🗑️</button>
        `;

        div.querySelector('.btn-remove-ingredient').addEventListener('click', () => div.remove());
        container.appendChild(div);
    }

    async chargerRecette() {
        const produitId = document.getElementById('admin-produit').value;
        document.getElementById('ingredients-list').innerHTML = '';
        
        if (!produitId) return;

        const { data } = await auth.supabase
            .from('recettes')
            .select('*, ingredients(nom, prix_unitaire, unite)')
            .eq('produit_id', produitId);

        if (data && data.length > 0) {
            document.getElementById('quantite-produite').value = data[0].quantite_produite;
            data.forEach(r => {
                this.ajouterLigne(r.ingredient_id, r.quantite_ingredient);
            });
        } else {
            this.ajouterLigne();
        }
    }

    async enregistrer() {
        const produitId = document.getElementById('admin-produit').value;
        const quantiteProduite = parseInt(document.getElementById('quantite-produite').value) || 1;

        if (!produitId) return this.msg('Choisissez un produit', 'error');

        const ingredients = [];
        document.querySelectorAll('#ingredients-list > div').forEach(div => {
            const select = div.querySelector('.ingredient-select');
            const quantite = div.querySelector('.ingredient-quantite');
            if (select.value && quantite.value) {
                ingredients.push({
                    produit_id: produitId,
                    ingredient_id: select.value,
                    quantite_ingredient: parseFloat(quantite.value),
                    quantite_produite: quantiteProduite
                });
            }
        });

        if (ingredients.length === 0) return this.msg('Ajoutez au moins un ingrédient', 'error');

        // Supprimer ancienne + insérer nouvelle
        await auth.supabase.from('recettes').delete().eq('produit_id', produitId);
        const { error } = await auth.supabase.from('recettes').insert(ingredients);
        
        if (error) return this.msg('Erreur: ' + error.message, 'error');
        this.msg('✅ Recette enregistrée !', 'success');
    }

    async calculer() {
    const produitId = document.getElementById('produit-recette').value;
    const quantiteVoulue = parseInt(document.getElementById('quantite-produire').value) || 1;

    if (!produitId) return;

    // Trouver le produit sélectionné
    const produit = this.produits.find(p => p.id === produitId);
    
    if (produit && produit.type === 'menu') {
        // C'est un menu : calculer à partir de la composition
        await this.calculerMenu(produitId, quantiteVoulue);
    } else {
        // C'est un produit unitaire : calculer à partir de la recette
        await this.calculerRecette(produitId, quantiteVoulue);
    }
}

async calculerMenu(menuId, quantiteVoulue) {
    // Récupérer la composition du menu
    const { data: composition } = await auth.supabase
        .from('composition_menu')
        .select('quantite, produits!composition_menu_produit_id_fkey(id, nom)')
        .eq('menu_id', menuId);

    if (!composition || composition.length === 0) {
        document.getElementById('resultats-recette').style.display = 'none';
        return;
    }

    let coutTotal = 0;
    let html = '';

    for (const comp of composition) {
        const produit = comp.produits;
        const qteMenu = comp.quantite * quantiteVoulue;

        const { data: recette } = await auth.supabase
            .from('recettes')
            .select('quantite_ingredient, quantite_produite, ingredients(nom, prix_unitaire, unite)')
            .eq('produit_id', produit.id);

        if (recette && recette.length > 0) {
            html += `<h4 style="margin-top: 20px; color: var(--primary-color); border-bottom: 2px solid var(--accent-color); padding-bottom: 5px;">
                📦 ${produit.nom} ×${qteMenu}
            </h4>`;
            html += '<table style="margin-bottom: 15px;"><thead><tr><th>Ingrédient</th><th>Qté totale</th><th>Prix unitaire</th><th>Coût</th></tr></thead><tbody>';

            for (const r of recette) {
                const ing = r.ingredients;
                const multiplicateur = qteMenu / r.quantite_produite;
                const qteTotale = Math.ceil(r.quantite_ingredient * multiplicateur);
                const cout = qteTotale * ing.prix_unitaire;
                coutTotal += cout;

                html += `<tr>
                    <td>${ing.nom}</td>
                    <td><strong>${qteTotale} ${ing.unite}</strong></td>
                    <td>$${ing.prix_unitaire.toFixed(2)}</td>
                    <td>$${cout.toFixed(2)}</td>
                </tr>`;
            }

            html += '</tbody></table>';
        }
    }

    // Total général
    html += `<table style="margin-top: 20px; border-top: 3px solid var(--accent-color);">
        <tfoot>
            <tr style="font-size: 1.1rem;">
                <td colspan="3"><strong>💰 Coût total pour ${quantiteVoulue} menu(s)</strong></td>
                <td><strong>$${coutTotal.toFixed(2)}</strong></td>
            </tr>
            <tr style="font-size: 1.1rem;">
                <td colspan="3"><strong>💵 Coût unitaire par menu</strong></td>
                <td><strong>$${(coutTotal/quantiteVoulue).toFixed(2)}</strong></td>
            </tr>
        </tfoot>
    </table>`;

    document.getElementById('resultats-recette').innerHTML = html;
    document.getElementById('resultats-recette').style.display = 'block';
}

async calculerRecette(produitId, quantiteVoulue) {
    // Code existant de la fonction calculer() originale
    const { data } = await auth.supabase
        .from('recettes')
        .select('quantite_ingredient, quantite_produite, ingredients(nom, prix_unitaire, unite)')
        .eq('produit_id', produitId);

    if (!data || data.length === 0) {
        document.getElementById('resultats-recette').style.display = 'none';
        return;
    }

    const quantiteProduite = data[0].quantite_produite;
    const multiplicateur = quantiteVoulue / quantiteProduite;
    let coutTotal = 0;
    let html = '<table><thead><tr><th>Ingrédient</th><th>Qté base</th><th>Qté totale</th><th>Prix unitaire</th><th>Coût</th></tr></thead><tbody>';

    data.forEach(r => {
        const ing = r.ingredients;
        const qteTotale = Math.ceil(r.quantite_ingredient * multiplicateur);
        const cout = qteTotale * ing.prix_unitaire;
        coutTotal += cout;
        html += `<tr>
            <td>${ing.nom}</td>
            <td>${r.quantite_ingredient} ${ing.unite}</td>
            <td><strong>${qteTotale} ${ing.unite}</strong></td>
            <td>$${ing.prix_unitaire.toFixed(2)}</td>
            <td>$${cout.toFixed(2)}</td>
        </tr>`;
    });

    html += `</tbody><tfoot><tr><td colspan="4"><strong>Coût total</strong></td><td><strong>$${coutTotal.toFixed(2)}</strong></td></tr>`;
    html += `<tr><td colspan="4"><strong>Coût unitaire</strong></td><td><strong>$${(coutTotal/quantiteVoulue).toFixed(2)}</strong></td></tr></tfoot></table>`;

    document.getElementById('resultats-recette').innerHTML = html;
    document.getElementById('resultats-recette').style.display = 'block';
}

    msg(texte, type) {
        const div = document.getElementById('message-recette');
        div.textContent = texte;
        div.className = 'message message-' + type;
        div.style.display = 'block';
        setTimeout(() => div.style.display = 'none', 4000);
    }
}

let recettesManager;
document.addEventListener('DOMContentLoaded', () => {
    if (auth.isAuthenticated()) recettesManager = new Recettes();
});