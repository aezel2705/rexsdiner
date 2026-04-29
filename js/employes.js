// js/employes.js
class Employes {
    constructor() {
        this.modal = document.getElementById('modal-employe');
        this.form = document.getElementById('employe-form');
        this.employes = [];
        this.init();
    }

    async init() {
        await this.loadEmployes();
        await this.loadGrades();
        this.setupEventListeners();
    }

    async loadEmployes() {
        try {
            const { data, error } = await auth.supabase    // ← auth.supabase
                .from('employes')
                .select('*')
                .order('nom');

            if (error) throw error;
            
            this.employes = data || [];
            this.renderEmployes();

        } catch (error) {
            console.error('Erreur chargement employés:', error);
        }
    }

    renderEmployes() {
        const tbody = document.getElementById('employes-body');
        
        if (!tbody) return;
        
        if (this.employes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10">Aucun employé</td></tr>';
            return;
        }

        tbody.innerHTML = this.employes.map(emp => {
            const salaireTotal = Math.min(
                emp.salaire_base + emp.commission_totale, 
                19000
            );
            
            return `
                <tr>
                    <td>${emp.nom}</td>
                    <td><span class="badge badge-${emp.grade}">${emp.grade}</span></td>
                    <td>$${emp.salaire_base.toFixed(2)}</td>
                    <td>${emp.commission}%</td>
                    <td>$${emp.ventes_totales.toFixed(2)}</td>
                    <td>$${emp.commission_totale.toFixed(2)}</td>
                    <td>$${salaireTotal.toFixed(2)}</td>
                    <td>${emp.heures_travaillees}h</td>
                    <td>${emp.nombre_services}</td>
                    <td class="actions">
                        <button class="btn-edit" onclick="employesManager.editEmploye('${emp.id}')">✏️</button>
                        <button class="btn-delete" onclick="employesManager.deleteEmploye('${emp.id}')">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    setupEventListeners() {
        const btnAjouter = document.getElementById('btn-ajouter-employe');
        if (btnAjouter) {
            btnAjouter.addEventListener('click', () => this.openModal());
        }

        const closeBtn = document.querySelector('#modal-employe .close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }

        if (this.form) {
            this.form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveEmploye();
            });
        }

        window.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });
         document.getElementById('select-grade')?.addEventListener('change', (e) => {
        this.afficherPermissions(e.target.value);
    });

    document.getElementById('btn-save-permissions')?.addEventListener('click', () => {
        this.savePermissions();
    });
    }

    editEmploye(id) {
        const employe = this.employes.find(e => e.id === id);
        if (!employe) return;

        document.getElementById('modal-title').textContent = 'Modifier l\'employé';
        document.getElementById('emp-id').value = employe.id;
        document.getElementById('emp-nom').value = employe.nom;
        document.getElementById('emp-username').value = employe.username;
        document.getElementById('emp-password').value = '';
        document.getElementById('emp-grade').value = employe.grade;
        document.getElementById('emp-salaire').value = employe.salaire_base;

        this.openModal();
    }

    openModal() {
        if (this.modal) {
            this.modal.style.display = 'block';
            if (!document.getElementById('emp-id').value) {
                document.getElementById('modal-title').textContent = 'Ajouter un employé';
            }
        }
    }

    closeModal() {
        if (this.modal) {
            this.modal.style.display = 'none';
            this.form.reset();
            document.getElementById('emp-id').value = '';
        }
    }

    async saveEmploye() {
        const id = document.getElementById('emp-id').value;
        const password = document.getElementById('emp-password').value;
        
        const employeData = {
            nom: document.getElementById('emp-nom').value,
            username: document.getElementById('emp-username').value,
            grade: document.getElementById('emp-grade').value,
            salaire_base: parseFloat(document.getElementById('emp-salaire').value),
            updated_at: new Date().toISOString()
        };

        try {
            if (password) {
                employeData.password_hash = await auth.hashPassword(password);
            }

            if (id) {
                const { error } = await auth.supabase   // ← auth.supabase
                    .from('employes')
                    .update(employeData)
                    .eq('id', id);
                if (error) throw error;
            } else {
                if (!password) {
                    alert('Le mot de passe est obligatoire pour un nouvel employé');
                    return;
                }
                const { error } = await auth.supabase   // ← auth.supabase
                    .from('employes')
                    .insert(employeData);
                if (error) throw error;
            }

            this.closeModal();
            await this.loadEmployes();

        } catch (error) {
            alert('Erreur: ' + error.message);
        }
    }

    async deleteEmploye(id) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cet employé ?')) return;

        try {
            const { error } = await auth.supabase       // ← auth.supabase
                .from('employes')
                .delete()
                .eq('id', id);
            if (error) throw error;
            await this.loadEmployes();
        } catch (error) {
            alert('Erreur lors de la suppression: ' + error.message);
        }
        
    }
        async loadGrades() {
        const { data } = await auth.supabase
            .from('grades')
            .select('*')
            .order('nom');

        if (data) {
            const select = document.getElementById('select-grade');
            if (!select) return;
            select.innerHTML = '<option value="">Choisir...</option>';
            data.forEach(g => {
                select.innerHTML += `<option value="${g.id}">${g.nom}</option>`;
            });
            this.grades = data;
        }
    }

    afficherPermissions(gradeId) {
        const container = document.getElementById('permissions-container');
        const list = document.getElementById('permissions-list');
        
        if (!gradeId) {
            container.style.display = 'none';
            return;
        }

        const grade = this.grades.find(g => g.id === gradeId);
        if (!grade) return;

        container.style.display = 'block';
        list.innerHTML = '';

        const pages = [
            { id: 'dashboard', nom: 'Dashboard' },
            { id: 'carte', nom: 'La Carte' },
            { id: 'declarer_vente', nom: 'Déclarer Vente' },
            { id: 'fabrication', nom: 'Fabrication' },
            { id: 'recettes', nom: 'Recettes' },
            { id: 'stocks', nom: 'Stocks' },
            { id: 'produits_prix', nom: 'Produits & Prix' },
            { id: 'employes', nom: 'Employés' },
            { id: 'partenaires', nom: 'Partenaires' },
            { id: 'declarations', nom: 'Déclarations' },
            { id: 'comptabilite', nom: 'Comptabilité' },
            { id: 'archives', nom: 'Archives' }
        ];

        const perms = grade.permissions || {};

        pages.forEach(page => {
            const div = document.createElement('div');
            div.style.cssText = 'display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid #eee;';
            div.innerHTML = `
                <input type="checkbox" id="perm-${page.id}" ${perms[page.id] ? 'checked' : ''}>
                <label for="perm-${page.id}" style="margin: 0; cursor: pointer;">${page.nom}</label>
            `;
            list.appendChild(div);
        });
    }

    async savePermissions() {
        const gradeId = document.getElementById('select-grade')?.value;
        if (!gradeId) return;

        const permissions = {};
        document.querySelectorAll('#permissions-list input[type="checkbox"]').forEach(cb => {
            const pageId = cb.id.replace('perm-', '');
            permissions[pageId] = cb.checked;
        });

        const { error } = await auth.supabase
            .from('grades')
            .update({ permissions })
            .eq('id', gradeId);

        if (error) {
            alert('Erreur: ' + error.message);
        } else {
            alert('✅ Permissions enregistrées !');
        }
    }
}

// Instance globale
let employesManager;

document.addEventListener('DOMContentLoaded', () => {
    if (auth.isAuthenticated()) {
        employesManager = new Employes();
    }
});