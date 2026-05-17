// js/commandes.js
class Commandes {
    constructor() {
        this.produits = [];
        this.init();
    }

    async init() {
        await this.loadProduits();
        this.setupEventListeners();
    }

    async loadProduits() {
        const { data } = await auth.supabase
            .from('produits')
            .select('*')
            .eq('type', 'unitaire')
            .order('nom');

        if (data) {
            this.produits = data;
            this.renderProduitsQuantites();
        }
    }

    renderProduitsQuantites() {
        const container = document.getElementById('produits-quantites');
        if (!container) return;

        container.innerHTML = this.produits.map(p => `
            <div style="display: flex; align-items: center; gap: 15px; padding: 10px 0; border-bottom: 1px solid #eee;">
                <label style="flex: 2; margin: 0; font-weight: 500;">${p.nom}</label>
                <input type="number" 
                       class="qte-produit" 
                       data-produit-id="${p.id}" 
                       value="0" 
                       min="0" 
                       style="flex: 1; text-align: center;">
                <span style="flex: 1; color: #666; font-size: 0.9rem;">unité(s)</span>
            </div>
        `).join('');
    }

    setupEventListeners() {
        document.getElementById('btn-generer-commandes')?.addEventListener('click', () => {
            this.genererCommandes();
        });
    }

    async genererCommandes() {
        // Récupérer les quantités demandées
        const quantites = {};
        document.querySelectorAll('.qte-produit').forEach(input => {
            const qte = parseInt(input.value) || 0;
            if (qte > 0) {
                quantites[input.dataset.produitId] = qte;
            }
        });

        if (Object.keys(quantites).length === 0) {
            alert('Veuillez entrer au moins une quantité');
            return;
        }

        // Pour chaque produit, récupérer sa recette et calculer les ingrédients
        const ingredientsNeeded = {}; // { ingredient_nom: { quantite, unite } }

        for (const [produitId, qteVoulue] of Object.entries(quantites)) {
            const { data: recettes } = await auth.supabase
                .from('recettes')
                .select('quantite_ingredient, quantite_produite, ingredients(nom, unite)')
                .eq('produit_id', produitId);

            if (recettes) {
                for (const r of recettes) {
                    const ing = r.ingredients;
                    const multiplicateur = qteVoulue / r.quantite_produite;
                    const qteTotale = Math.ceil(r.quantite_ingredient * multiplicateur);

                    if (!ingredientsNeeded[ing.nom]) {
                        ingredientsNeeded[ing.nom] = { quantite: 0, unite: ing.unite };
                    }
                    ingredientsNeeded[ing.nom].quantite += qteTotale;
                }
            }
        }

        // Pour chaque ingrédient, trouver le fournisseur et son prix
        const commandesParFournisseur = {};

        for (const [ingredientNom, infos] of Object.entries(ingredientsNeeded)) {
            const { data: prixData } = await auth.supabase
                .from('supplier_prices')
                .select('price, suppliers(name)')
                .eq('ingredient_id', (await this.getIngredientId(ingredientNom)))
                .single();

            const fournisseur = prixData?.suppliers?.name || 'Fournisseur inconnu';
            const prix = prixData?.price || 0;

            if (!commandesParFournisseur[fournisseur]) {
                commandesParFournisseur[fournisseur] = { items: [], total: 0 };
            }

            commandesParFournisseur[fournisseur].items.push({
                ingredient: ingredientNom,
                quantite: infos.quantite,
                unite: infos.unite,
                prixUnitaire: prix,
                total: infos.quantite * prix
            });
            commandesParFournisseur[fournisseur].total += infos.quantite * prix;
        }

        // Afficher les résultats
        this.renderResultats(commandesParFournisseur);
    }

    async getIngredientId(nom) {
        const { data } = await auth.supabase
            .from('ingredients')
            .select('id')
            .eq('nom', nom)
            .single();
        return data?.id;
    }

    renderResultats(commandes) {
        const container = document.getElementById('liste-fournisseurs');
        const totalGeneralEl = document.getElementById('total-general');
        
        if (!container) return;

        let html = '';
        let totalGeneral = 0;

        for (const [fournisseur, data] of Object.entries(commandes)) {
            totalGeneral += data.total;
            
            html += `
                <div class="fournisseur-card">
                    <h4>🏪 ${fournisseur}</h4>
                    <table>
                        <thead>
                            <tr>
                                <th>Ingrédient</th>
                                <th>Quantité</th>
                                <th>Prix unitaire</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.items.map(item => `
                                <tr>
                                    <td>${item.ingredient}</td>
                                    <td>${item.quantite} ${item.unite}</td>
                                    <td>$${item.prixUnitaire.toFixed(2)}</td>
                                    <td>$${item.total.toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div class="total-fournisseur">
                        Total ${fournisseur} : $${data.total.toFixed(2)}
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;
        totalGeneralEl.textContent = `💰 Total général de la commande : $${totalGeneral.toFixed(2)}`;
        
        document.getElementById('resultats-commandes').style.display = 'block';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (auth.isAuthenticated()) new Commandes();
});
