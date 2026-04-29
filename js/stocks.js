// js/stocks.js
class Stocks {
    constructor() {
        this.init();
    }

    async init() {
        await this.loadStocks();
    }

    async loadStocks() {
        try {
            const { data, error } = await auth.supabase    // ← CORRIGÉ
                .from('stocks')
                .select(`
                    *,
                    produits (
                        nom,
                        prix_vente
                    )
                `)
                .order('updated_at', { ascending: false });

            if (error) throw error;

            this.renderStocks(data || []);
            this.updateStats(data || []);

        } catch (error) {
            console.error('Erreur chargement stocks:', error);
        }
    }

    renderStocks(stocks) {
        const tbody = document.getElementById('stocks-body');
        if (!tbody) return;
        
        if (stocks.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5">Aucun produit en stock</td></tr>';
            return;
        }

        tbody.innerHTML = stocks.map(stock => {
            const produit = stock.produits || {};
            const valeur = stock.quantite_disponible * (produit.prix_vente || 0);
            
            return `
                <tr>
                    <td>${produit.nom || 'Produit inconnu'}</td>
                    <td>
                        <span class="stock-quantity ${stock.quantite_disponible < 5 ? 'low-stock' : ''}">
                            ${stock.quantite_disponible}
                        </span>
                    </td>
                    <td>$${(produit.prix_vente || 0).toFixed(2)}</td>
                    <td>$${valeur.toFixed(2)}</td>
                    <td>${new Date(stock.updated_at).toLocaleString('fr-FR')}</td>
                </tr>
            `;
        }).join('');
    }

    updateStats(stocks) {
        const totalQuantiteEl = document.getElementById('total-stock');
        const valeurStockEl = document.getElementById('valeur-stock');
        
        const totalQuantite = stocks.reduce((sum, s) => sum + s.quantite_disponible, 0);
        const totalValeur = stocks.reduce((sum, s) => {
            return sum + (s.quantite_disponible * (s.produits?.prix_vente || 0));
        }, 0);

        if (totalQuantiteEl) totalQuantiteEl.textContent = totalQuantite;
        if (valeurStockEl) valeurStockEl.textContent = `$${totalValeur.toFixed(2)}`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (auth.isAuthenticated()) {
        new Stocks();
    }
});