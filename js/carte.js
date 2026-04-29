// js/carte.js
class Carte {
    constructor() {
        this.init();
    }

    async init() {
        await this.loadCarte();
    }

    async loadCarte() {
        try {
            const { data, error } = await auth.supabase
                .from('produits')
                .select('*')
                .order('type')
                .order('nom');

            if (error) throw error;

            await this.renderCarte(data || []);

        } catch (error) {
            console.error('Erreur chargement carte:', error);
        }
    }

async renderCarte(produits) {
    const container = document.getElementById('carte-container');
    if (!container) return;
    
    if (produits.length === 0) {
        container.innerHTML = '<p>Aucun produit dans la carte</p>';
        return;
    }

    const menus = produits.filter(p => p.type === 'menu');
    const unitaires = produits.filter(p => p.type === 'unitaire');

    let html = '';

    // Section Menus
    if (menus.length > 0) {
        html += '<div class="carte-section"><h3>🍽️ Menus</h3><div class="produits-list">';
        
        for (const menu of menus) {
            const composition = await this.getComposition(menu.id);
            html += this.createMenuCard(menu, composition);
        }
        
        html += '</div></div>';
    }
    
    // Section Produits unitaires
    if (unitaires.length > 0) {
        html += '<div class="carte-section"><h3>🍔 Produits à l\'unité</h3><div class="produits-list">';
        html += unitaires.map(p => this.createProduitCard(p)).join('');
        html += '</div></div>';
    }

    container.innerHTML = html;
}

async getComposition(menuId) {
    try {
        const { data, error } = await auth.supabase
            .from('composition_menu')
            .select('quantite, produits!composition_menu_produit_id_fkey(nom)')
            .eq('menu_id', menuId);

        if (error) {
            console.error('Erreur:', error.message);
            return [];
        }

        console.log('Composition:', data);
        return data || [];
    } catch (e) {
        console.error('Exception:', e);
        return [];
    }
}

    createMenuCard(menu, composition) {
        let compositionHtml = '';
        
        if (composition.length > 0) {
            compositionHtml = `
                <div class="menu-composition">
                    ${composition.map(c => `
                        <span class="comp-item">${c.quantite}x ${c.produits?.nom || 'Inconnu'}</span>
                    `).join('')}
                </div>
            `;
        }

        return `
            <div class="produit-card menu-card">
                <div class="produit-card-header">
                    <h4>${menu.nom}</h4>
                    <span class="badge badge-menu">Menu</span>
                </div>
                ${compositionHtml}
                <div class="produit-card-body">
                    <div class="produit-prix">
                        <span class="prix">$${menu.prix_vente.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        `;
    }

    createProduitCard(produit) {
        return `
            <div class="produit-card">
                <div class="produit-card-header">
                    <h4>${produit.nom}</h4>
                </div>
                <div class="produit-card-body">
                    <div class="produit-prix">
                        <span class="prix">$${produit.prix_vente.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        `;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (auth.isAuthenticated()) {
        new Carte();
    }
});