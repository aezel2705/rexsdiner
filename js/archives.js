// js/archives.js
class Archives {
    constructor() {
        this.allArchives = [];
        this.init();
    }

    async init() {
        await this.loadArchives();
        this.setupEventListeners();
    }

    async loadArchives() {
        try {
            const { data, error } = await auth.supabase    // ← CORRIGÉ
                .from('archives')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;

            this.allArchives = data || [];
            this.renderArchives(this.allArchives);

        } catch (error) {
            console.error('Erreur chargement archives:', error);
        }
    }

    renderArchives(archives) {
        const container = document.getElementById('archives-timeline');
        if (!container) return;
        
        if (archives.length === 0) {
            container.innerHTML = '<p>Aucune archive trouvée</p>';
            return;
        }

        container.innerHTML = archives.map(archive => {
            const date = new Date(archive.created_at);
            const icone = this.getIconForType(archive.type_action);
            
            return `
                <div class="timeline-item">
                    <div class="timeline-icon">${icone}</div>
                    <div class="timeline-content">
                        <div class="timeline-header">
                            <span class="timeline-type badge badge-${archive.type_action}">
                                ${archive.type_action}
                            </span>
                            <span class="timeline-date">
                                ${date.toLocaleString('fr-FR')}
                            </span>
                        </div>
                        <div class="timeline-description">
                            ${archive.description || ''}
                        </div>
                        <div class="timeline-details">
                            ${this.formatDetails(archive)}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    getIconForType(type) {
        const icons = {
            'vente': '💰',
            'fabrication': '🔧',
            'service': '⏱️'
        };
        return icons[type] || '📝';
    }

    formatDetails(archive) {
        if (!archive.details) return '';
        
        const details = archive.details;
        let html = '';

        if (archive.type_action === 'vente') {
            html = `
                <small>Montant: $${details.montant?.toFixed(2) || '0.00'}</small><br>
                <small>Employé ID: ${details.employe_id || 'N/A'}</small>
            `;
        } else if (archive.type_action === 'fabrication') {
            html = `
                <small>Quantité: ${details.quantite || '0'}</small><br>
                <small>Employé ID: ${details.employe_id || 'N/A'}</small>
            `;
        } else if (archive.type_action === 'service') {
            html = `
                <small>Durée: ${details.duree_minutes || '0'} minutes</small><br>
                <small>Valide: ${details.est_valide ? 'Oui' : 'Non (< 30 min)'}</small>
            `;
        }

        return html;
    }

    setupEventListeners() {
        const filterType = document.getElementById('filter-type');
        const filterDate = document.getElementById('filter-date-archives');
        const btnReset = document.getElementById('btn-reset-archives');

        if (filterType) {
            filterType.addEventListener('change', () => this.applyFilters());
        }
        if (filterDate) {
            filterDate.addEventListener('change', () => this.applyFilters());
        }
        if (btnReset) {
            btnReset.addEventListener('click', () => {
                if (filterType) filterType.value = '';
                if (filterDate) filterDate.value = '';
                this.renderArchives(this.allArchives);
            });
        }
    }

    applyFilters() {
        let filtered = [...this.allArchives];

        const type = document.getElementById('filter-type')?.value;
        const date = document.getElementById('filter-date-archives')?.value;

        if (type) {
            filtered = filtered.filter(a => a.type_action === type);
        }

        if (date) {
            filtered = filtered.filter(a => {
                const archiveDate = new Date(a.created_at).toISOString().split('T')[0];
                return archiveDate === date;
            });
        }

        this.renderArchives(filtered);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (auth.isAuthenticated()) {
        new Archives();
    }
});