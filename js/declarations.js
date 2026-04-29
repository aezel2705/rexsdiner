// js/declarations.js
class Declarations {
    constructor() {
        this.allDeclarations = [];
        this.init();
    }

    async init() {
        await this.loadEmployes();
        await this.loadDeclarations();
        this.setupEventListeners();
    }

    async loadEmployes() {
        const { data } = await auth.supabase    // ← CORRIGÉ
            .from('employes')
            .select('id, nom')
            .order('nom');

        if (data) {
            const select = document.getElementById('filter-employe');
            if (!select) return;
            
            data.forEach(emp => {
                const option = document.createElement('option');
                option.value = emp.id;
                option.textContent = emp.nom;
                select.appendChild(option);
            });
        }
    }

    async loadDeclarations() {
    try {
        const { data: ventes, error } = await auth.supabase
            .from('ventes')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Pour chaque vente, récupérer les détails et le nom de l'employé
        for (const vente of data || []) {
            // Employé
            if (vente.employe_id) {
                const { data: emp } = await auth.supabase
                    .from('employes')
                    .select('nom')
                    .eq('id', vente.employe_id)
                    .single();
                vente.employe_nom = emp?.nom || 'N/A';
            }

            // Détails de la vente (produits)
            const { data: details } = await auth.supabase
                .from('details_vente')
                .select('quantite, produit_id')
                .eq('vente_id', vente.id);

            if (details && details.length > 0) {
                // Récupérer le nom de chaque produit
                const produitsNoms = [];
                for (const d of details) {
                    const { data: prod } = await auth.supabase
                        .from('produits')
                        .select('nom')
                        .eq('id', d.produit_id)
                        .single();
                    produitsNoms.push(`${d.quantite}x ${prod?.nom || 'Inconnu'}`);
                }
                vente.produits_str = produitsNoms.join(', ');
            } else {
                vente.produits_str = 'Aucun produit';
            }
        }

        this.allDeclarations = data || [];
        this.renderDeclarations(this.allDeclarations);

    } catch (error) {
        console.error('Erreur chargement déclarations:', error);
    }
}

    renderDeclarations(declarations) {
        const tbody = document.getElementById('declarations-body');
        if (!tbody) return;
        
        if (declarations.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">Aucune déclaration</td></tr>';
            return;
        }

        tbody.innerHTML = declarations.map(decl => {
            const produits = decl.produits_str || 'N/A';

            return `
    <tr>
        <td>${new Date(decl.created_at).toLocaleString('fr-FR')}</td>
        <td>${decl.employe_nom || 'N/A'}</td>
        <td>${produits}</td>
        <td>
            ${decl.type_vente && decl.type_vente !== 'standard' ? 
                `<span class="badge badge-${decl.type_vente === 'services_publics' ? 'service' : 'vente'}">
                    ${decl.type_vente === 'services_publics' ? 'Serv. public' : 'Réduction'}
                </span>` 
                : '<span class="badge badge-success">Standard</span>'}
        </td>
        <td>$${decl.montant_final ? decl.montant_final.toFixed(2) : decl.montant_total.toFixed(2)}</td>
        <td>$${decl.benefice_net.toFixed(2)}</td>
        <td>
            <span class="badge ${decl.est_valide ? 'badge-success' : 'badge-danger'}">
                ${decl.est_valide ? 'Valide' : 'Invalide'}
            </span>
        </td>
    </tr>
`;
        }).join('');
    }

    setupEventListeners() {
        const filterEmploye = document.getElementById('filter-employe');
        const filterDate = document.getElementById('filter-date');
        const btnReset = document.getElementById('btn-reset-filters');

        if (filterEmploye) {
            filterEmploye.addEventListener('change', () => this.applyFilters());
        }
        if (filterDate) {
            filterDate.addEventListener('change', () => this.applyFilters());
        }
        if (btnReset) {
            btnReset.addEventListener('click', () => {
                if (filterEmploye) filterEmploye.value = '';
                if (filterDate) filterDate.value = '';
                this.renderDeclarations(this.allDeclarations);
            });
        }
    }

    applyFilters() {
        let filtered = [...this.allDeclarations];

        const employeId = document.getElementById('filter-employe')?.value;
        const dateFilter = document.getElementById('filter-date')?.value;

        if (employeId) {
            filtered = filtered.filter(d => d.employe_id === employeId);
        }

        if (dateFilter) {
            filtered = filtered.filter(d => {
                const date = new Date(d.created_at).toISOString().split('T')[0];
                return date === dateFilter;
            });
        }

        this.renderDeclarations(filtered);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (auth.isAuthenticated()) {
        new Declarations();
    }
});