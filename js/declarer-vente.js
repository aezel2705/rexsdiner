// js/declarer-vente.js
class DeclarerVente {
    constructor() {
        this.produits = [];
        this.employes = [];
        this.partenaires = [];
        this.init();
    }

    async init() {
        await this.loadProduits();
        await this.loadEmployes();
        await this.loadPartenaires();
        this.setupEventListeners();
        this.calculerTotaux();
    }

    async loadProduits() {
        const { data } = await auth.supabase
            .from('produits')
            .select('*')
            .order('nom');

        if (data) {
            this.produits = data;
            this.populateProduitSelects();
        }
    }

    async loadEmployes() {
        const { data } = await auth.supabase
            .from('employes')
            .select('id, nom')
            .order('nom');

        if (data) {
            this.employes = data;
            const select = document.getElementById('employe-select');
            if (!select) return;
            select.innerHTML = '<option value="">Choisir l\'employé...</option>';
            data.forEach(emp => {
                select.innerHTML += `<option value="${emp.id}">${emp.nom}</option>`;
            });
        }
    }

    async loadPartenaires() {
        const { data } = await auth.supabase
            .from('partenaires')
            .select('*')
            .eq('actif', true)
            .order('nom');

        if (data) {
            this.partenaires = data;
            const select = document.getElementById('partenaire-select');
            if (!select) return;
            data.forEach(p => {
                const label = p.type === 'services_publics' 
                    ? `${p.nom} (Services publics - ${p.prix_symbolique}$)` 
                    : `${p.nom} (Réduction ${p.reduction_pct}%)`;
                select.innerHTML += `<option value="${p.id}">${label}</option>`;
            });
        }
    }

    populateProduitSelects() {
    const partenaireId = document.getElementById('partenaire-select')?.value;
    
    if (!partenaireId) {
        // Pas de partenaire : afficher tous les produits
        this.updateSelects(this.produits);
    } else {
        // Partenaire sélectionné : filtrer selon les produits autorisés
        this.loadProduitsAutorises(partenaireId).then(ids => {
            const produitsAutorises = ids.length > 0 ? this.produits.filter(p => ids.includes(p.id)) : [];
            this.updateSelects(produitsAutorises);
        });
    }
}

async loadProduitsAutorises(partenaireId) {
    const { data } = await auth.supabase
        .from('partenaires_produits')
        .select('produit_id')
        .eq('partenaire_id', partenaireId);
    return data ? data.map(p => p.produit_id) : [];
}

updateSelects(produitsAutorises) {
    const menus = produitsAutorises.filter(p => p.type === 'menu');
    const unitaires = produitsAutorises.filter(p => p.type === 'unitaire');

    document.querySelectorAll('.produit-select').forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">Produit...</option>';
        
        if (menus.length > 0) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = '🍽️ Menus';
            menus.forEach(p => {
                optgroup.innerHTML += `<option value="${p.id}" data-prix="${p.prix_vente}" data-cout="${p.cout_fabrication}">${p.nom} - $${p.prix_vente}</option>`;
            });
            select.appendChild(optgroup);
        }
        
        if (unitaires.length > 0) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = '🍔 Produits unitaires';
            unitaires.forEach(p => {
                optgroup.innerHTML += `<option value="${p.id}" data-prix="${p.prix_vente}" data-cout="${p.cout_fabrication}">${p.nom} - $${p.prix_vente}</option>`;
            });
            select.appendChild(optgroup);
        }
        
        select.value = currentValue;
    });
}

    setupEventListeners() {
        document.getElementById('btn-ajouter-ligne')?.addEventListener('click', () => this.ajouterLigne());

        document.getElementById('produits-container')?.addEventListener('change', (e) => {
            if (e.target.classList.contains('produit-select')) this.handleProduitChange(e.target);
            if (e.target.classList.contains('quantite-input')) this.calculerTotaux();
        });

        document.getElementById('produits-container')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-remove-ligne')) this.supprimerLigne(e.target);
        });

        document.getElementById('btn-declarer')?.addEventListener('click', () => this.declarerVente());

        document.getElementById('partenaire-select')?.addEventListener('change', (e) => {
            this.afficherInfoPartenaire(e.target.value);
            this.populateProduitSelects();
        });
    }

    afficherInfoPartenaire(partenaireId) {
        const info = document.getElementById('partenaire-info');
        if (!info) return;

        if (!partenaireId) {
            info.style.display = 'none';
            return;
        }

        const p = this.partenaires.find(x => x.id === partenaireId);
        if (p) {
            info.style.display = 'block';
            if (p.type === 'services_publics') {
                info.textContent = `💰 Le client paiera ${p.prix_symbolique}$ (montant symbolique)`;
            } else {
                info.textContent = `🔖 Réduction de ${p.reduction_pct}% appliquée sur le total`;
            }
        }
    }

    ajouterLigne() {
        const container = document.getElementById('produits-container');
        if (!container) return;
        
        const template = document.querySelector('.produit-ligne');
        if (!template) return;
        
        const newLigne = template.cloneNode(true);
        newLigne.querySelector('.produit-select').value = '';
        newLigne.querySelector('.quantite-input').value = '1';
        newLigne.querySelector('.prix-input').value = '';
        container.appendChild(newLigne);
    }

    supprimerLigne(btn) {
        const lignes = document.querySelectorAll('.produit-ligne');
        if (lignes.length > 1) {
            btn.closest('.produit-ligne').remove();
            this.calculerTotaux();
        }
    }

    handleProduitChange(select) {
        const option = select.options[select.selectedIndex];
        const prixInput = select.closest('.produit-ligne').querySelector('.prix-input');
        if (option && option.dataset.prix) {
            prixInput.value = `$${parseFloat(option.dataset.prix).toFixed(2)}`;
        } else {
            prixInput.value = '';
        }
        this.calculerTotaux();
    }

    calculerTotaux() {
        let totalVente = 0;
        let coutTotal = 0;

        document.querySelectorAll('.produit-ligne').forEach(ligne => {
            const select = ligne.querySelector('.produit-select');
            const quantite = parseInt(ligne.querySelector('.quantite-input').value) || 0;
            
            if (select.value && select.options[select.selectedIndex].dataset.prix) {
                const prix = parseFloat(select.options[select.selectedIndex].dataset.prix);
                const cout = parseFloat(select.options[select.selectedIndex].dataset.cout) || 0;
                totalVente += prix * quantite;
                coutTotal += cout * quantite;
            }
        });

        const partenaireId = document.getElementById('partenaire-select')?.value;
        let montantFinal = totalVente;
        
        if (partenaireId) {
            const partenaire = this.partenaires.find(p => p.id === partenaireId);
            if (partenaire) {
                if (partenaire.type === 'services_publics') {
                    montantFinal = partenaire.prix_symbolique;
                } else if (partenaire.type === 'reduction') {
                    montantFinal = totalVente * (1 - partenaire.reduction_pct / 100);
                }
            }
        }

        const totalEl = document.getElementById('total-vente');
        if (totalEl) {
            totalEl.textContent = `$${totalVente.toFixed(2)}`;
            if (montantFinal !== totalVente) {
                totalEl.innerHTML = `<span style="text-decoration: line-through; color: #999;">$${totalVente.toFixed(2)}</span> <strong>$${montantFinal.toFixed(2)}</strong>`;
            }
        }
        
        document.getElementById('cout-total').textContent = `$${coutTotal.toFixed(2)}`;
        document.getElementById('benefice-net').textContent = `$${(montantFinal - coutTotal).toFixed(2)}`;
    }

    async declarerVente() {
        const employeId = document.getElementById('employe-select')?.value;
        const partenaireId = document.getElementById('partenaire-select')?.value || null;
        
        if (!employeId) {
            this.afficherMessage('Veuillez sélectionner un employé', 'error');
            return;
        }

        let totalVente = 0;
        let coutTotal = 0;
        const details = [];

        document.querySelectorAll('.produit-ligne').forEach(ligne => {
            const select = ligne.querySelector('.produit-select');
            const quantite = parseInt(ligne.querySelector('.quantite-input').value) || 0;
            
            if (select.value && quantite > 0) {
                const option = select.options[select.selectedIndex];
                const prix = parseFloat(option.dataset.prix);
                const cout = parseFloat(option.dataset.cout) || 0;
                
                totalVente += prix * quantite;
                coutTotal += cout * quantite;
                
                details.push({
                    produit_id: select.value,
                    quantite: quantite,
                    prix_unitaire: prix
                });
            }
        });

        if (details.length === 0) {
            this.afficherMessage('Veuillez ajouter au moins un produit', 'error');
            return;
        }

        let montantFinal = totalVente;
        let typeVente = 'standard';

        if (partenaireId) {
            const partenaire = this.partenaires.find(p => p.id === partenaireId);
            if (partenaire) {
                if (partenaire.type === 'services_publics') {
                    montantFinal = partenaire.prix_symbolique;
                    typeVente = 'services_publics';
                } else {
                    montantFinal = totalVente * (1 - partenaire.reduction_pct / 100);
                    typeVente = 'reduction';
                }
            }
        }

        try {
            const { data: vente, error: venteError } = await auth.supabase
                .from('ventes')
                .insert({
                    employe_id: employeId,
                    partenaire_id: partenaireId,
                    montant_total: totalVente,
                    montant_original: totalVente,
                    montant_final: montantFinal,
                    benefice_net: montantFinal - coutTotal,
                    type_vente: typeVente,
                    est_valide: true
                })
                .select()
                .single();

            if (venteError) throw venteError;

            for (const detail of details) {
                await auth.supabase
                    .from('details_vente')
                    .insert({
                        vente_id: vente.id,
                        ...detail
                    });
            }

            // Récupérer la commission du GRADE de l'employé
            const { data: employe } = await auth.supabase
                .from('employes')
                .select('ventes_totales, salaire_base, grade, grades(commission)')
                .eq('id', employeId)
                .single();

            if (employe) {
                const tauxCommission = employe.grades?.commission || 25;
                const nouvellesVentes = employe.ventes_totales + totalVente;
                const commissionMontant = (nouvellesVentes * tauxCommission) / 100;
                const nouveauSalaire = Math.min(employe.salaire_base + commissionMontant, 19000);

                await auth.supabase
                    .from('employes')
                    .update({
                        ventes_totales: nouvellesVentes,
                        commission_totale: commissionMontant,
                        salaire_total: nouveauSalaire
                    })
                    .eq('id', employeId);
            }

            await auth.supabase
                .from('archives')
                .insert({
                    type_action: 'vente',
                    description: `Vente ${typeVente !== 'standard' ? '(' + typeVente + ')' : ''} - ${details.length} produit(s)`,
                    details: { 
                        employe_id: employeId, 
                        partenaire_id: partenaireId,
                        montant_original: totalVente, 
                        montant_final: montantFinal,
                        type_vente: typeVente,
                        produits: details 
                    }
                });

            this.afficherMessage(`Vente déclarée !${partenaireId ? ' (Facturé: $' + montantFinal.toFixed(2) + ')' : ''}`, 'success');
            this.resetFormulaire();
            
        } catch (error) {
            console.error('Erreur:', error);
            this.afficherMessage('Erreur: ' + error.message, 'error');
        }
    }

    resetFormulaire() {
        document.getElementById('employe-select').value = '';
        document.getElementById('partenaire-select').value = '';
        const info = document.getElementById('partenaire-info');
        if (info) info.style.display = 'none';
        
        const container = document.getElementById('produits-container');
        if (!container) return;
        
        const lignes = container.querySelectorAll('.produit-ligne');
        lignes.forEach((ligne, index) => {
            if (index === 0) {
                ligne.querySelector('.produit-select').value = '';
                ligne.querySelector('.quantite-input').value = '1';
                ligne.querySelector('.prix-input').value = '';
            } else {
                ligne.remove();
            }
        });
        
        this.calculerTotaux();
    }

    afficherMessage(message, type) {
        const messageDiv = document.getElementById('message-vente');
        if (!messageDiv) return;
        messageDiv.textContent = message;
        messageDiv.className = `message message-${type}`;
        messageDiv.style.display = 'block';
        setTimeout(() => messageDiv.style.display = 'none', 5000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (auth.isAuthenticated()) new DeclarerVente();
});