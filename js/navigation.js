// js/navigation.js
class Navigation {
    constructor() {
        this.pages = [
            { id: 'dashboard', nom: 'Dashboard', icone: '📊', url: 'index.html' },
            { id: 'carte', nom: 'La Carte', icone: '📋', url: 'carte.html' },
            { id: 'declarer-vente', nom: 'Déclarer Vente', icone: '💰', url: 'declarer-vente.html' },
            { id: 'fabrication', nom: 'Fabrication', icone: '🔧', url: 'fabrication.html' },
            { id: 'recettes', nom: 'Recettes', icone: '🧾', url: 'recettes.html' },
            { id: 'stocks', nom: 'Stocks', icone: '📦', url: 'stocks.html' },
            { id: 'produits-prix', nom: 'Produits & Prix', icone: '🏷️', url: 'produits-prix.html' },
            { id: 'employes', nom: 'Employés', icone: '👥', url: 'employes.html' },
            { id: 'partenaires', nom: 'Partenaires', icone: '🤝', url: 'partenaires.html' },
            { id: 'declarations', nom: 'Déclarations', icone: '📝', url: 'declarations.html' },
            { id: 'comptabilite', nom: 'Comptabilité', icone: '💼', url: 'comptabilite.html' },
            { id: 'archives', nom: 'Archives', icone: '🗄️', url: 'archives.html' },
            { id: 'chat', nom: 'Chat', icone: '💬', url: 'chat.html' },
        ];
        
        // Ajouter "Mon Profil" APRÈS la boucle de construction
        this.init();
    }

    async init() {
        if (!auth.isAuthenticated()) {
            window.location.href = 'login.html';
            return;
        }
        this.buildNavigation();
    }

    buildNavigation() {
        const navMenu = document.getElementById('nav-menu');
        if (!navMenu) return;

        const currentPage = window.location.pathname.split('/').pop();

        // Pages normales
        this.pages.forEach(page => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = page.url;
            a.innerHTML = `${page.icone} ${page.nom}`;
            
            if (currentPage === page.url || (currentPage === '' && page.url === 'index.html')) {
                a.classList.add('active');
            }
            
            li.appendChild(a);
            navMenu.appendChild(li);
        });

        // Séparateur
        const separator = document.createElement('li');
        separator.innerHTML = '<hr style="border-color: rgba(255,255,255,0.1); margin: 10px 15px;">';
        navMenu.appendChild(separator);

        // Lien "Mon Profil"
        const liProfile = document.createElement('li');
        const aProfile = document.createElement('a');
        aProfile.href = 'profile.html';
        aProfile.innerHTML = '👤 Mon Profil';
        if (currentPage === 'profile.html') {
            aProfile.classList.add('active');
        }
        liProfile.appendChild(aProfile);
        navMenu.appendChild(liProfile);
        
        const liTheme = document.createElement('li');
        const aTheme = document.createElement('a');
        aTheme.href = '#';
        aTheme.id = 'theme-toggle';
        const isDark = localStorage.getItem('darkMode') === 'true';
        aTheme.innerHTML = isDark ? '☀️ Mode Clair' : '🌙 Mode Sombre';
        aTheme.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleTheme();
        });
        liTheme.appendChild(aTheme);
        navMenu.appendChild(liTheme);

        // Déconnexion
        const liLogout = document.createElement('li');
        const aLogout = document.createElement('a');
        aLogout.href = '#';
        aLogout.id = 'logout-btn';
        aLogout.innerHTML = '🚪 Déconnexion';
        liLogout.appendChild(aLogout);
        navMenu.appendChild(liLogout);

        document.getElementById('logout-btn').addEventListener('click', (e) => {
            e.preventDefault();
            auth.logout();
        });
         if (isDark) {
            document.body.classList.add('dark-mode');
        }
    }
        toggleTheme() {
        const isDark = document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', isDark);
        const btn = document.getElementById('theme-toggle');
        btn.innerHTML = isDark ? '☀️ Mode Clair' : '🌙 Mode Sombre';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new Navigation();
});