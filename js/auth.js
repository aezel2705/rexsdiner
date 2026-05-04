// js/auth.js
class Auth {
    constructor() {
        this.currentUser = null;
        this.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        this.checkSession();
    }

    async login(username, password) {
        const { data, error } = await this.supabase
            .from('employes')
            .select('*')
            .eq('username', username)
            .single();

        if (error) throw new Error('Erreur de connexion');
        if (!data) throw new Error('Utilisateur non trouvé');
        if (data.password_hash !== password) throw new Error('Mot de passe incorrect');

        this.currentUser = data;
        localStorage.setItem('currentUser', JSON.stringify(data));
        return data;
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    }

    checkSession() {
    const user = localStorage.getItem('currentUser');
    if (user) {
        const parsed = JSON.parse(user);
        if (parsed.force_logout) {
            localStorage.removeItem('currentUser');
            this.currentUser = null;
            return;
        }
        this.currentUser = parsed;
    }
}

    isAuthenticated() {
        return !!this.currentUser;
    }

    // AJOUTER CETTE FONCTION
    async hashPassword(password) {
    // Version simple sans hashage
    return password;
    }
}

const auth = new Auth();
