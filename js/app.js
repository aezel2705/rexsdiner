// js/app.js
class App {
    constructor() {
        this.pages = [
            { id: 'dashboard', nom: 'Dashboard', icone: '📊' },
            { id: 'carte', nom: 'La Carte', icone: '📋' },
            { id: 'declarer-vente', nom: 'Déclarer Vente', icone: '💰' },
            { id: 'fabrication', nom: 'Fabrication', icone: '🔧' },
            { id: 'stocks', nom: 'Stocks', icone: '📦' },
            { id: 'produits-prix', nom: 'Produits & Prix', icone: '🏷️' },
            { id: 'employes', nom: 'Employés', icone: '👥' },
            { id: 'declarations', nom: 'Déclarations', icone: '📝' },
            { id: 'comptabilite', nom: 'Comptabilité', icone: '💼' },
            { id: 'archives', nom: 'Archives', icone: '🗄️' }
        ];
        
        this.init();
    }

    async init() {
        await this.buildNavigation();
        this.setupNavigation();
    }

    async buildNavigation() {
        if (!auth.currentUser) return;

        const navMenu = document.getElementById('nav-menu');
        const permissions = await this.getUserPermissions();

        this.pages.forEach(page => {
            if (permissions[page.id]) {
                const li = document.createElement('li');
                li.innerHTML = `<a href="#" data-page="${page.id}">${page.icone} ${page.nom}</a>`;
                navMenu.appendChild(li);
            }
        });

        // Ajouter le bouton de déconnexion
        const li = document.createElement('li');
        li.innerHTML = '<a href="#" id="logout-btn">🚪 Déconnexion</a>';
        navMenu.appendChild(li);

        document.getElementById('logout-btn').addEventListener('click', (e) => {
            e.preventDefault();
            auth.logout();
        });
    }

    async getUserPermissions() {
        const { data: grade } = await supabase
            .from('grades')
            .select('permissions')
            .eq('nom', auth.currentUser.grade)
            .single();

        return grade ? grade.permissions : {};
    }

    setupNavigation() {
        document.querySelectorAll('#nav-menu a[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.target.getAttribute('data-page');
                this.loadPage(page);
                
                // Activer le lien
                document.querySelectorAll('#nav-menu a').forEach(a => a.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
    }

    loadPage(pageId) {
        // Ici, vous chargeriez le contenu de la page correspondante
        // Pour une SPA (Single Page Application), vous pouvez charger dynamiquement le contenu
        console.log(`Chargement de la page: ${pageId}`);
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    if (auth.isAuthenticated()) {
        new App();
    }
});
