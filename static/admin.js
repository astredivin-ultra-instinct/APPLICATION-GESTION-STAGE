// 1. Initialisation de la console d'administration par le Responsable Académique
function initialiserEspaceResponsable(nom, id_responsable) {
    const dashboardContainer = document.getElementById('dashboard-container');
    
    dashboardContainer.innerHTML = `
        <div class="card" style="max-width:100%; width:100%;">
            <h2>Console d'Administration Académique</h2>
            <p class="subtitle">Responsable Connecté : ${nom} (ID Responsable: ${id_responsable})</p>
            
            <div style="background:#e8f4fd; padding:15px; border-radius:6px; margin-bottom:25px; display:flex; gap:15px; align-items:center; justify-content:space-between; border:1px solid #3498db;">
                <div>
                    <strong>👤 Mon Compte Responsable Principal</strong>
                    <br><small>Droit d'édition ou de suppression exclusive de votre accès administrateur.</small>
                </div>
                <div>
                    <button id="btn-mod-resp" class="btn-primary" style="margin:0; width:auto; padding:8px 15px; background:#3498db;">Modifier mes accès</button>
                </div>
            </div>

            <div style="display:flex; gap:10px; margin-bottom:20px; flex-wrap:wrap;">
                <button class="btn-primary" style="margin:0; flex:1;" onclick="chargerFiltreExclusifResponsable('etudiants', ${id_responsable})">🎓 Vos Étudiants</button>
                <button class="btn-primary" style="margin:0; flex:1;" onclick="chargerFiltreExclusifResponsable('superviseurs', ${id_responsable})">👨‍🏫 Vos Superviseurs</button>
                <button class="btn-primary" style="margin:0; flex:1;" onclick="chargerFiltreExclusifResponsable('rapporteurs', ${id_responsable})">📝 Vos Rapporteurs</button>
                <button class="btn-primary" style="margin:0; flex:1;" onclick="chargerFiltreExclusifResponsable('evaluations', ${id_responsable})">📊 Suivi Croisé Évaluations & Notes</button>
            </div>

            <div id="panneau-crud-responsable" style="border:1px solid #ddd; padding:20px; border-radius:6px; background:#fff;">
                <p style="text-align:center; color:#7f8c8d;">Sélectionnez un volet pour n'afficher que les données que vous avez vous-même ajoutées.</p>
            </div>

            <button onclick="deconnexion()" class="btn-primary" style="max-width:200px; margin:30px auto 0 auto; display:block;">Se déconnecter</button>
        </div>`;

    document.getElementById('btn-mod-resp').addEventListener('click', () => {
        alert("Déclenchement de la fonction backend: Modifier_responsable");
    });
}

// 2. LOGIQUE CRÉATRICE DE RENDU EXCLUSIF PAR ID_RESPONSABLE
async function chargerFiltreExclusifResponsable(rubrique, id_responsable) {
    const panneau = document.getElementById('panneau-crud-responsable');
    panneau.innerHTML = `<h4>Chargement des données exclusives...</h4>`;

    try {
        if (rubrique === 'etudiants') {
            // HARMONISÉ avec : @api_bp.route('/responsable/<int:id_responsable>/etudiants')
            const res = await fetch(`/api/responsables/${id_responsable}/etudiants`);
            const etudiants = await res.json();

            panneau.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <h4>🎓 Vos Étudiants (Ajoutés par vous)</h4>
                    <button onclick="ouvrirFormulaireAjoutEtudiant(${id_responsable})" class="btn-success" style="width:auto; margin:0;">＋ Ajouter Étudiant</button>
                </div>
                <p style="font-size:13px; color:#666; margin-top:-10px;">Données issues de l'API. Seul vous pouvez gérer leurs accès uniques.</p>
                <table>
                    <tr><th>INE</th><th>Nom & Prénom</th><th>Filière</th><th style="text-align:center;">Actions Compte (Droit Unique)</th></tr>
                    ${etudiants.map(et => `
                        <tr>
                            <td><code>${et.ine}</code></td>
                            <td><b>${et.nom} ${et.prenom}</b></td>
                            <td>${et.filiere} (Semestre ${et.semestre})</td>
                            <td style="text-align:center;">
                                <button onclick="modifierAccesUtilisateur('etudiant', '${et.ine}')" style="background:#3498db; color:white; border:none; padding:5px 10px; border-radius:3px; cursor:pointer;">Modifier Accès</button>
                                <button onclick="supprimerEtudiant('${et.ine}', ${id_responsable})" style="background:var(--danger-color); color:white; border:none; padding:5px 10px; border-radius:3px; cursor:pointer; margin-left:5px;">Supprimer</button>
                            </td>
                        </tr>
                    `).join('')}
                </table>`;
        } 
        else if (rubrique === 'evaluations') {
            // HARMONISÉ avec : @api_bp.route('/responsable/<int:id_responsable>/stages')
            const res = await fetch(`/api/responsables/${id_responsable}/stages`);
            const stages = await res.json();

            panneau.innerHTML = `
                <h4>📊 Tableau Croisé des Notes et Commentaires de vos Étudiants</h4>
                <p style="font-size:13px; color:#666; margin-top:-10px;">Suivi complet des appréciations des jurys affectés par vos soins.</p>
                
                ${stages.map(st => `
                    <div style="border:1px solid #ddd; padding:15px; border-radius:6px; margin-bottom:20px; background:#fafafa;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                            <strong>🎓 Étudiant : ${st.etudiant}</strong>
                        </div>
                        <p style="font-size:13px; margin:5px 0;"><b>Thème :</b> ${st.titre} | <b>Description :</b> ${st.description}</p>
                        
                        <table>
                            <tr><th>Évaluateur</th><th>Note / Informations Encadrement</th></tr>
                            <tr><td><b>Superviseur</b></td><td>ID Superviseur affecté : ${st.id_superviseur || 'Aucun'}</td></tr>
                            <tr><td><b>Rapporteur</b></td><td>ID Rapporteur affecté : ${st.id_rapporteur || 'Aucun'}</td></tr>
                        </table>
                    </div>
                `).join('')}`;
        } 
        else {
            // HARMONISÉ avec : /responsable/<id>/superviseurs et /responsable/<id>/rapporteurs
            const res = await fetch(`/api/responsables/${id_responsable}/${rubrique}`);
            const collaborateurs = await res.json();

            panneau.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <h4>📁 Vos Collaborateurs : ${rubrique.toUpperCase()}</h4>
                    <button onclick="alert('Action : ajouter à la section ${rubrique}')" class="btn-success" style="width:auto; margin:0;">＋ Ajouter un Compte</button>
                </div>
                <table>
                    <tr><th>Nom & Prénom</th><th>Email</th><th style="text-align:center;">Actions Compte</th></tr>
                    ${collaborateurs.map(col => `
                        <tr>
                            <td><b>${col.nom} ${col.prenom}</b></td>
                            <td>${col.mail}</td>
                            <td style="text-align:center;">
                                <button onclick="modifierAccesUtilisateur('${rubrique.slice(0,-1)}', '${col.id_superviseur || col.id_rapporteur}')" style="background:#3498db; color:white; border:none; padding:5px 10px; border-radius:3px; cursor:pointer;">Modifier Accès</button>
                            </td>
                        </tr>
                    `).join('')}
                </table>`;
        }
    } catch(e) {
        panneau.innerHTML = `<p class="error-message">Erreur de liaison API sur cette section.</p>`;
    }
}

// =========================================================================
// 3. FORMULAIRE D'AJOUT ÉTUDIANT (HARMONISÉ POST /etudiants)
// =========================================================================
function ouvrirFormulaireAjoutEtudiant(id_responsable) {
    const panneau = document.getElementById('panneau-crud-responsable');
    panneau.innerHTML = `
        <h4>Ajouter un Nouvel Étudiant au Cursus</h4>
        <form id="form-add-etudiant-admin" style="margin-top:15px;">
            <div class="form-group"><label>INE de l'etudiant</label><input type="text" id="add-ine" required></div>
            <div style="display:flex; gap:10px;">
                <div class="form-group" style="flex:1;"><label>Nom</label><input type="text" id="add-nom" required></div>
                <div class="form-group" style="flex:1;"><label>Prénom</label><input type="text" id="add-prenom" required></div>
            </div>
            <div class="form-group"><label>Email de l'etdudiant (@gmail.com/@yahoo.com requis)</label><input type="email" id="add-mail" required></div>
            <div style="display:flex; gap:10px;">
                <div class="form-group" style="flex:1;"><label>Filière</label><input type="text" id="add-filiere" required></div>
                <div class="form-group" style="flex:1;"><label>Semestre (Numérique)</label><input type="number" id="add-semestre" required></div>
            </div>
            <button type="submit" class="btn-success">Ajouter Etudiant</button>
            <button type="button" onclick="chargerFiltreExclusifResponsable('etudiants', ${id_responsable})" class="btn-primary" style="background:#7f8c8d;">Annuler</button>
        </form>`;

    document.getElementById('form-add-etudiant-admin').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // HARMONISÉ : Structure attendue par add_etudiant dans route.py
        const payload = {
            id_responsable: parseInt(id_responsable),
            ine: document.getElementById('add-ine').value,
            nom: document.getElementById('add-nom').value,
            prenom: document.getElementById('add-prenom').value,
            mail: document.getElementById('add-mail').value,
            filiere: document.getElementById('add-filiere').value,
            semestre: parseInt(document.getElementById('add-semestre').value)
        };

        // HARMONISÉ : Route Flask pure 'POST /api/etudiants'
        const res = await fetch('/api/etudiants', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        if(res.ok) {
            alert("Étudiant créé avec succès !");
            chargerFiltreExclusifResponsable('etudiants', id_responsable);
        } else {
            alert("Erreur : " + data.message);
        }
    });
}

function modifierAccesUtilisateur(role, id) {
    alert(`Backend : Action Modifier_${role} pour l'identifiant : ${id}.`);
}

// =========================================================================
// 4. SUPPRESSION D'UN ÉTUDIANT (HARMONISÉ DELETE /etudiants/<ine>)
// =========================================================================
async function supprimerEtudiant(ine, id_responsable) {
    if(!confirm(`Voulez-vous supprimer l'étudiant avec l'INE ${ine} ?`)) return;

    // Récupération sécurisée du mot de passe admin requis par ta route Flask pour valider le delete
    const passwordAdmin = prompt("Veuillez saisir votre mot de passe administrateur pour confirmer la suppression :");
    if (!passwordAdmin) return;

    try {
        // HARMONISÉ : Route '@api_bp.route('/etudiants/<ine>', methods=['DELETE'])'
        const res = await fetch(`/api/etudiants/${ine}`, { 
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: passwordAdmin }) // Transmission requise du password dans le corps
        });

        const data = await res.json();
        if(res.ok) {
            alert("Étudiant retiré avec succès de la base de données.");
            chargerFiltreExclusifResponsable('etudiants', id_responsable);
        } else {
            alert("Erreur : " + data.message);
        }
    } catch (error) {
        console.error("Erreur suppression :", error);
    }
}