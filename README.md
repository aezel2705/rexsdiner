# Rex Diner's - Système de Gestion

Application web de gestion pour restaurant avec suivi des ventes, stocks, employés et comptabilité.

## Technologies utilisées
- Frontend : HTML5, CSS3, JavaScript (Vanilla)
- Backend : Supabase (BaaS)
- Hébergement : GitHub Pages

## Installation

1. Clonez ce dépôt
2. Créez un projet sur [Supabase](https://supabase.com)
3. Exécutez les requêtes SQL fournies dans `database.sql`
4. Configurez vos clés Supabase dans `js/supabase-config.js`
5. Activez GitHub Pages dans les paramètres du dépôt

## Structure du projet
rex-diners/
├── index.html # Dashboard principal
├── login.html # Page de connexion
├── carte.html # Carte des produits
├── declarer-vente.html # Déclaration de ventes
├── fabrication.html # Déclaration de fabrications
├── stocks.html # Gestion des stocks
├── produits-prix.html # Gestion des produits
├── employes.html # Gestion des employés
├── declarations.html # Historique des ventes
├── comptabilite.html # Comptabilité
├── archives.html # Archives complètes
├── profile.html # Profil utilisateur
├── css/
│ ├── style.css
│ └── login.css
├── js/
│ ├── supabase-config.js
│ ├── auth.js
│ ├── navigation.js
│ ├── dashboard.js
│ ├── login.js
│ ├── declarer-vente.js
│ ├── fabrication.js
│ ├── stocks.js
│ ├── produits-prix.js
│ ├── employes.js
│ ├── declarations.js
│ ├── comptabilite.js
│ ├── archives.js
│ ├── profile.js
│ └── carte.js
└── database.sql # Structure de la base de données


## Fonctionnalités

- ✅ Authentification sécurisée
- ✅ Gestion des rôles et permissions
- ✅ Pointage de service avec compteur horaire
- ✅ Déclaration de ventes
- ✅ Déclaration de fabrications
- ✅ Gestion des stocks en temps réel
- ✅ Gestion des employés
- ✅ Comptabilité hebdomadaire
- ✅ Archives complètes
- ✅ Dashboard personnalisé
- ✅ Interface responsive

## Sécurité

- Clé anon Supabase publique (frontend)
- Clé service_role jamais exposée
- Mots de passe hashés
- Permissions basées sur les grades

## Licence

Tous droits réservés - Rex Diner's © 2026
