// js/profile.js
class Profile {
    constructor() {
        this.init();
    }

    async init() {
        if (!auth.currentUser) {
            window.location.href = 'login.html';
            return;
        }

        this.loadProfile();
        this.setupEventListeners();
    }

    loadProfile() {
        const user = auth.currentUser;
        
        const profileNom = document.getElementById('profile-nom');
        const profilePoste = document.getElementById('profile-poste');
        const profileUsername = document.getElementById('profile-username');
        const profileNomComplet = document.getElementById('profile-nom-complet');
        
        if (profileNom) profileNom.textContent = user.nom;
        if (profilePoste) profilePoste.textContent = user.grade;
        if (profileUsername) profileUsername.value = user.username;
        if (profileNomComplet) profileNomComplet.value = user.nom;
    }

    setupEventListeners() {
        const profileForm = document.getElementById('profile-form');
        if (profileForm) {
            profileForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.updateProfile();
            });
        }
    }

    async updateProfile() {
        const newNom = document.getElementById('profile-nom-complet')?.value;
        const newPassword = document.getElementById('profile-new-password')?.value;
        const confirmPassword = document.getElementById('profile-confirm-password')?.value;

        if (!newNom) {
            this.showMessage('Le nom ne peut pas être vide', 'error');
            return;
        }

        if (newPassword && newPassword !== confirmPassword) {
            this.showMessage('Les mots de passe ne correspondent pas', 'error');
            return;
        }

        try {
            const updateData = {
                nom: newNom,
                updated_at: new Date().toISOString()
            };

            if (newPassword) {
                updateData.password_hash = await auth.hashPassword(newPassword);
            }

            const { error } = await auth.supabase    // ← CORRIGÉ
                .from('employes')
                .update(updateData)
                .eq('id', auth.currentUser.id);

            if (error) throw error;

            auth.currentUser.nom = newNom;
            localStorage.setItem('currentUser', JSON.stringify(auth.currentUser));

            this.showMessage('Profil mis à jour avec succès !', 'success');
            
            const profileNom = document.getElementById('profile-nom');
            if (profileNom) profileNom.textContent = newNom;
            
            const newPasswordInput = document.getElementById('profile-new-password');
            const confirmPasswordInput = document.getElementById('profile-confirm-password');
            if (newPasswordInput) newPasswordInput.value = '';
            if (confirmPasswordInput) confirmPasswordInput.value = '';

        } catch (error) {
            this.showMessage('Erreur: ' + error.message, 'error');
        }
    }

    showMessage(message, type) {
        const messageDiv = document.getElementById('profile-message');
        if (!messageDiv) return;
        
        messageDiv.textContent = message;
        messageDiv.className = `message message-${type}`;
        messageDiv.style.display = 'block';
        
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (auth.isAuthenticated()) {
        new Profile();
    }
});