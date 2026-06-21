/* ═══════════════════════════════════════════════════════════════
   GESTION DE STAGE — app.js
   Calé EXACTEMENT sur index3.html (IDs, modals, boutons)
   Routes Flask (url_prefix="/api") tirées de route.py
═══════════════════════════════════════════════════════════════

   IDs HTML utilisés (NE PAS CHANGER) :
   ── Auth ──────────────────────────────────────────────────────
   page-login, page-register, page-dashboard
   login-role, lbl-login-id, login-id, login-pw, err-login
   reg-nom, reg-prenom, reg-mail, reg-pw, reg-pw2
   err-register, ok-register
   sb-avatar, sb-name, sb-role-pill, sb-nav
   topbar-title, topbar-user
   home-greeting, home-sub, stats-grid

   ── Modals ────────────────────────────────────────────────────
   overlay
   m-add-etudiant  → et-mode, et-id-edit, titre-m-etudiant,
                     err-m-etudiant, et-nom, et-prenom, et-ine,
                     et-mail, et-filiere, et-semestre
   m-add-superviseur → sup-mode, sup-id-edit, titre-m-sup,
                        err-m-sup, sup-nom, sup-prenom, sup-mail
   m-add-rapporteur  → rapp-mode, rapp-id-edit, titre-m-rapp,
                        err-m-rapp, rapp-nom, rapp-prenom, rapp-mail
   m-add-stage      → st-mode, titre-m-stage, err-m-stage,
                        st-titre, st-entreprise, st-ville, st-desc,
                        st-debut, st-fin,
                        st-etudiant, st-superviseur, st-rapporteur
   m-rapport        → err-m-rapport, rp-titre, rp-chemin, rp-contenu
                        titre-m-rapport, btn-submit-rapport
   m-evaluer        → titre-m-eval, err-m-eval, eval-rapport-box,
                        eval-bloc-label, eval-note, eval-avis
   m-eval-resp      → err-m-eval-resp, eval-resp-rapport-box,
                        eval-resp-note, eval-resp-avis
   m-delete         → del-msg

   ── Tableaux ──────────────────────────────────────────────────
   tb-etudiants, tb-superviseurs, tb-rapporteurs, tb-stages
   tb-eval-resp, tb-sup-etudiants, tb-rapp-etudiants

   ── Étudiant ──────────────────────────────────────────────────
   card-mon-stage, card-mon-rapport, card-mon-evaluation
   btn-rapport-action

   ── Sections ──────────────────────────────────────────────────
   s-home, s-etudiants, s-superviseurs, s-rapporteurs, s-stages
   s-evaluations-resp, s-mon-stage, s-mon-rapport, s-mon-evaluation
   s-sup-etudiants, s-rapp-etudiants

   ── Routes Flask ──────────────────────────────────────────────
   POST /login                              {role,identifier,password}
   POST /responsable/ajouter               {nom,prenom,mail,password}
   GET  /etudiants/liste/{id_resp}
   POST /etudiants/ajouter                 {id_responsable,ine,nom,prenom,mail,filiere,semestre,password}
   POST /etudiants/modifier                {id_responsable,id_etudiant,ine,nom,prenom,mail,filiere,semestre}
   DELETE /etudiants/{ine}                 body:{id_responsable,password}
   GET  /superviseurs/liste/{id_resp}
   POST /superviseurs/ajouter              {id_responsable,nom,prenom,mail,password}
   POST /superviseurs/modifier             {id_responsable,id_superviseur,nom,prenom,mail}
   DELETE /superviseurs/{id}               body:{id_responsable,password}
   GET  /rapporteurs/liste/{id_resp}
   POST /rapporteurs/ajouter               {id_responsable,nom,prenom,mail,password}
   POST /rapporteurs/modifier              {id_responsable,id_rapporteur,nom,prenom,mail}
   DELETE /rapporteurs/{id}                body:{id_responsable,password}
   GET  /stages/liste/{id_resp}
   POST /stages/ajouter                    {id_responsable,password,titre,entreprise,ville,
                                            description,date_debut,date_fin,
                                            id_etudiant,id_superviseur,id_rapporteur}
   DELETE /stages/{id}                     body:{id_responsable,password}
   GET  /rapport/voir/{id_stage}
   POST /rapport/ajouter                   {id_stage,titre,chemin_fichier,contenu}  multipart ou JSON
   POST /rapport/modifier                  {id_stage,titre,chemin_fichier,contenu}
   POST /rapport/valider                   {id_stage}
   POST /evaluation/responsable            {id_rapport,note,avis}
   POST /evaluation/superviseur            {id_rapport,note,avis}
   POST /evaluation/rapporteur             {id_rapport,note,avis}
   GET  /etudiant/stage/{id_etudiant}
   GET  /etudiant/evaluation/{ine}
   GET  /superviseur/stages/{id_superviseur}
   GET  /rapporteur/stages/{id_rapporteur}
   GET  /responsable/evaluation/{ine}
   GET  /superviseur/evaluation/{ine}
   GET  /rapporteur/evaluation/{ine}
═══════════════════════════════════════════════════════════════ */

const API = 'https://application-gestion-stage-4.onrender.com/api';

// ─── État global ─────────────────────────────────────────────
let currentUser      = null;
let studentsData     = [];
let superviseursData = [];
let rapporteursData  = [];
let _evalCtx         = null;   // { role, id_rapport, chemin, titre, ine }
let _deleteCtx       = null;   // { type, id, label }

// ─── Helpers ─────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const VALID_MAILS = ['@gmail.com', '@yahoo.com', '@yahoo.fr'];
const okMail = m => VALID_MAILS.some(d => (m || '').endsWith(d));
const esc = s => (s || '').toString().replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');

// Récupère l'id_responsable depuis currentUser quelle que soit la clé
const respId = () => currentUser?.id_responsable || currentUser?.id || null;

function toast(msg, type = 'info') {
    const c = $('alertContainer');
    if (!c) { console.log(msg); return; }
    const b = document.createElement('div');
    b.className = `alert alert-${type}`;
    b.innerHTML = `${msg} <button class="alert-close" onclick="this.parentElement.remove()">×</button>`;
    c.appendChild(b);
    setTimeout(() => b.remove(), 5000);
}

function setErr(id, msg)  { const e=$(id); if(!e)return; e.textContent=msg; e.classList.remove('hidden'); }
function clearErr(id)     { $(id)?.classList.add('hidden'); }

function togglePw(inputId, btn) {
    const i = $(inputId); if (!i) return;
    i.type = i.type === 'password' ? 'text' : 'password';
    btn.textContent = i.type === 'password' ? '👁' : '🔒';
}

function toggleSidebar() { $('sidebar')?.classList.toggle('open'); }

// ─── Fetch helpers ───────────────────────────────────────────
async function api(path, method = 'GET', body = null) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    try {
        const res  = await fetch(API + path, opts);
        const data = await res.json().catch(() => ({}));
        return { ok: res.ok, status: res.status, data };
    } catch {
        return { ok: false, status: 0, data: { success: false, message: 'Erreur réseau — Flask démarré ?' } };
    }
}

// Upload multipart (pour PDF)
// IMPORTANT : Ne jamais passer Content-Type manuellement avec FormData.
// Le navigateur le définit automatiquement avec le bon boundary.
async function apiUpload(path, formData) {
    try {
        const res  = await fetch(API + path, {
            method: 'POST',
            body: formData
            // PAS de headers : le navigateur gère Content-Type: multipart/form-data automatiquement
        });
        const data = await res.json().catch(() => ({}));
        return { ok: res.ok, status: res.status, data };
    } catch {
        return { ok: false, status: 0, data: { success: false, message: 'Erreur réseau.' } };
    }
}

// ─── Pages ───────────────────────────────────────────────────
function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    $(id)?.classList.add('active');
}

// ─── Sections ────────────────────────────────────────────────
function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    $(id)?.classList.add('active');
    const T = {
        's-home'            : 'Tableau de bord',
        's-etudiants'       : 'Étudiants',
        's-superviseurs'    : 'Superviseurs',
        's-rapporteurs'     : 'Rapporteurs',
        's-stages'          : 'Stages',
        's-evaluations-resp': 'Évaluations',
        's-mon-stage'       : 'Mon Stage',
        's-mon-rapport'     : 'Mon Rapport',
        's-mon-evaluation'  : 'Mon Évaluation',
        's-sup-etudiants'   : 'Mes Étudiants',
        's-rapp-etudiants'  : 'Mes Étudiants',
    };
    if ($('topbar-title')) $('topbar-title').textContent = T[id] || '';
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active-nav'));
    document.querySelector(`.nav-item[data-sec="${id}"]`)?.classList.add('active-nav');
}

// ─── Modals ──────────────────────────────────────────────────
function openModal(id) {
    $('overlay')?.classList.remove('hidden');
    $(id)?.classList.remove('hidden');
}

function closeModal(id) {
    $(id)?.classList.add('hidden');
    // Ferme l'overlay si aucun modal visible
    const anyOpen = [...document.querySelectorAll('#overlay .modal')]
        .some(m => !m.classList.contains('hidden'));
    if (!anyOpen) $('overlay')?.classList.add('hidden');
}

function overlayClick(e) {
    if (e.target.id === 'overlay') {
        document.querySelectorAll('#overlay .modal').forEach(m => m.classList.add('hidden'));
        $('overlay')?.classList.add('hidden');
    }
}

// ═══════════════════════════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════════════════════════
function updateLoginLabel() {
    const role = $('login-role')?.value;
    if ($('lbl-login-id')) $('lbl-login-id').textContent = role === 'etudiant' ? 'INE' : 'Adresse email';
    if ($('login-id'))     $('login-id').placeholder     = role === 'etudiant'
        ? 'Votre INE (ex : N0014202024)' : 'exemple@gmail.com';
}

async function handleLogin() {
    clearErr('err-login');
    const role       = $('login-role')?.value;
    const identifier = $('login-id')?.value.trim();
    const password   = $('login-pw')?.value;

    if (!role || !identifier || !password) {
        setErr('err-login', 'Tous les champs sont requis.'); return;
    }

    // Routes exactes définies dans route.py
    const ROUTES = {
        responsable: ['/responsable/connexion', { mail: identifier, password }],
        etudiant:    ['/etudiant/connexion',    { ine:  identifier, password }],
        superviseur: ['/superviseur/connexion', { mail: identifier, password }],
        rapporteur:  ['/rapporteur/connexion',  { mail: identifier, password }],
    };
    const [path, body] = ROUTES[role] || [];
    if (!path) { setErr('err-login', 'Rôle invalide.'); return; }

    const r = await api(path, 'POST', body);

    if (!r.data.success) {
        setErr('err-login', r.data.message || 'Identifiants incorrects.'); return;
    }

    // Normaliser les IDs selon le rôle (Flask peut renvoyer "id" ou "id_responsable" etc.)
    const ud = { ...r.data, role, password };
    if (role === 'responsable') ud.id_responsable = ud.id_responsable || ud.id;
    if (role === 'etudiant')    ud.id_etudiant    = ud.id_etudiant    || ud.id;
    if (role === 'superviseur') ud.id_superviseur = ud.id_superviseur || ud.id;
    if (role === 'rapporteur')  ud.id_rapporteur  = ud.id_rapporteur  || ud.id;
    currentUser = ud;

    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    buildSidebar();
    if ($('topbar-user')) $('topbar-user').textContent = `${currentUser.prenom || ''} ${currentUser.nom || ''}`.trim();
    showPage('page-dashboard');
    showSection('s-home');
    loadHomeStats();
    toast('Connexion réussie !', 'success');
}

async function handleRegister() {
    clearErr('err-register'); clearErr('ok-register');
    const nom    = $('reg-nom')?.value.trim();
    const prenom = $('reg-prenom')?.value.trim();
    const mail   = $('reg-mail')?.value.trim();
    const pw     = $('reg-pw')?.value;
    const pw2    = $('reg-pw2')?.value;

    if (!nom || !prenom || !mail || !pw) {
        setErr('err-register', 'Tous les champs sont obligatoires.'); return;
    }
    if (!okMail(mail)) {
        setErr('err-register', 'Email invalide — @gmail.com, @yahoo.com ou @yahoo.fr.'); return;
    }
    if (pw !== pw2) {
        setErr('err-register', 'Les mots de passe ne correspondent pas.'); return;
    }

    const r = await api('/responsable/ajouter', 'POST', { nom, prenom, mail, password: pw });
    if (r.data.success) {
        if ($('ok-register')) {
            $('ok-register').textContent = 'Compte créé ! Vous pouvez vous connecter.';
            $('ok-register').classList.remove('hidden');
        }
        setTimeout(() => showPage('page-login'), 2000);
    } else {
        setErr('err-register', r.data.message || 'Erreur lors de la création.');
    }
}

function handleLogout() {
    currentUser = null;
    studentsData = superviseursData = rapporteursData = [];
    localStorage.removeItem('currentUser');
    showPage('page-login');
    toast('Déconnecté.', 'success');
}

function restoreUserSession() {
    const saved = localStorage.getItem('currentUser');
    if (!saved) return;
    try {
        currentUser = JSON.parse(saved);
        // Normaliser IDs au cas où la session serait ancienne
        const role = currentUser.role;
        if (role === 'responsable') currentUser.id_responsable = currentUser.id_responsable || currentUser.id;
        if (role === 'etudiant')    currentUser.id_etudiant    = currentUser.id_etudiant    || currentUser.id;
        if (role === 'superviseur') currentUser.id_superviseur = currentUser.id_superviseur || currentUser.id;
        if (role === 'rapporteur')  currentUser.id_rapporteur  = currentUser.id_rapporteur  || currentUser.id;
        buildSidebar();
        if ($('topbar-user')) $('topbar-user').textContent = `${currentUser.prenom || ''} ${currentUser.nom || ''}`.trim();
        showPage('page-dashboard');
        showSection('s-home');
        loadHomeStats();
    } catch (e) {
        console.error('Session invalide:', e);
        localStorage.removeItem('currentUser');
    }
}

// ─── Sidebar ─────────────────────────────────────────────────
function buildSidebar() {
    if (!currentUser) return;
    const MENUS = {
        responsable: [
            { l: 'Tableau de bord', i: '📊', s: 's-home' },
            { l: 'Étudiants',       i: '🎓', s: 's-etudiants' },
            { l: 'Superviseurs',    i: '👔', s: 's-superviseurs' },
            { l: 'Rapporteurs',     i: '📝', s: 's-rapporteurs' },
            { l: 'Stages',          i: '🏢', s: 's-stages' },
            { l: 'Évaluations',     i: '⭐', s: 's-evaluations-resp' },
        ],
        etudiant: [
            { l: 'Tableau de bord', i: '📊', s: 's-home' },
            { l: 'Mon Stage',       i: '🏢', s: 's-mon-stage' },
            { l: 'Mon Rapport',     i: '📄', s: 's-mon-rapport' },
            { l: 'Mon Évaluation',  i: '⭐', s: 's-mon-evaluation' },
        ],
        superviseur: [
            { l: 'Tableau de bord', i: '📊', s: 's-home' },
            { l: 'Mes Étudiants',   i: '🎓', s: 's-sup-etudiants' },
        ],
        rapporteur: [
            { l: 'Tableau de bord', i: '📊', s: 's-home' },
            { l: 'Mes Étudiants',   i: '🎓', s: 's-rapp-etudiants' },
        ],
    };
    const nav = $('sb-nav'); if (!nav) return;
    nav.innerHTML = '';
    (MENUS[currentUser.role] || []).forEach(item => {
        const d = document.createElement('div');
        d.className   = 'nav-item';
        d.dataset.sec = item.s;
        d.innerHTML   = `<span class="nav-icon">${item.i}</span><span>${item.l}</span>`;
        d.onclick     = () => { showSection(item.s); loadSection(item.s); if (window.innerWidth < 769) toggleSidebar(); };
        nav.appendChild(d);
    });
    // Tolérance aux noms de champs différents selon la version du backend
    const prenom = currentUser.prenom || '';
    const nom    = currentUser.nom    || currentUser.name || '';
    const ine    = currentUser.ine    || '';
    const displayName = `${prenom} ${nom}`.trim() || ine || currentUser.mail || 'Utilisateur';
    const init = displayName[0]?.toUpperCase() || '?';
    if ($('sb-avatar'))    $('sb-avatar').textContent    = init;
    if ($('sb-name'))      $('sb-name').textContent      = displayName;
    const RL = { responsable: 'Responsable', etudiant: 'Étudiant', superviseur: 'Superviseur', rapporteur: 'Rapporteur' };
    if ($('sb-role-pill')) $('sb-role-pill').textContent = RL[currentUser.role] || currentUser.role;
}

// ─── Router sections ─────────────────────────────────────────
async function loadSection(id) {
    const role = currentUser?.role;
    if (id === 's-home')             loadHomeStats();
    if (role === 'responsable') {
        if (id === 's-etudiants')        loadEtudiants();
        if (id === 's-superviseurs')     loadSuperviseurs();
        if (id === 's-rapporteurs')      loadRapporteurs();
        if (id === 's-stages')  {/*loadStages();*/await Promise.all([ loadEtudiants(), loadSuperviseurs(), loadRapporteurs() ]); await loadStages(); }
        if(id==='s-evaluations-resp') loadEvalsResp();
    }
        if (id === 's-evaluations-resp') loadEvalsResp();

    if (role === 'etudiant') {
        if (id === 's-mon-stage')        loadMonStage();
        if (id === 's-mon-rapport')      loadMonRapport();
        if (id === 's-mon-evaluation')   loadMonEvaluation();
    }
    if (role === 'superviseur' && id === 's-sup-etudiants')  loadSupStages();
    if (role === 'rapporteur'  && id === 's-rapp-etudiants') loadRappStages();
}

// ─── Stats accueil ───────────────────────────────────────────
async function loadHomeStats() {
    const g = $('stats-grid'); if (!g) return;
    if ($('home-greeting')) $('home-greeting').textContent = `Bonjour, ${currentUser.prenom || currentUser.nom} 👋`;
    const role = currentUser.role;
    const id   = respId();

    if (role === 'responsable') {
        if ($('home-sub')) $('home-sub').textContent = 'Aperçu de votre département.';
        const [rEt, rSt, rSup, rRap] = await Promise.all([
            api(`/etudiants/liste/${id}`),
            api(`/stages/liste/${id}`),
            api(`/superviseurs/liste/${id}`),
            api(`/rapporteurs/liste/${id}`),
        ]);
        const n = a => Array.isArray(a) ? a.length : '—';
        g.innerHTML = `
            <div class="stat-card"><div class="stat-icon">🎓</div><div class="stat-val">${n(rEt.data)}</div><div class="stat-lbl">Étudiants</div></div>
            <div class="stat-card"><div class="stat-icon">🏢</div><div class="stat-val">${n(rSt.data)}</div><div class="stat-lbl">Stages</div></div>
            <div class="stat-card"><div class="stat-icon">👔</div><div class="stat-val">${n(rSup.data)}</div><div class="stat-lbl">Superviseurs</div></div>
            <div class="stat-card"><div class="stat-icon">📝</div><div class="stat-val">${n(rRap.data)}</div><div class="stat-lbl">Rapporteurs</div></div>`;
    } else if (role === 'etudiant') {
        if ($('home-sub')) $('home-sub').textContent = 'Suivez votre avancement.';
        const r  = await api(`/etudiant/stage/${currentUser.id_etudiant}`);
        const st = r.data;
        g.innerHTML = `
            <div class="stat-card"><div class="stat-icon">🏢</div><div class="stat-val" style="font-size:1rem">${st?.titre || '—'}</div><div class="stat-lbl">Stage</div></div>
            <div class="stat-card"><div class="stat-icon">📄</div><div class="stat-val" style="font-size:1rem">${st?.rapport_status || 'En attente'}</div><div class="stat-lbl">Rapport</div></div>`;
    } else {
        if ($('home-sub')) $('home-sub').textContent = 'Consultez vos affectations.';
        const pathId = role === 'superviseur' ? currentUser.id_superviseur : currentUser.id_rapporteur;
        const r = await api(role === 'superviseur' ? `/superviseur/stages/${pathId}` : `/rapporteur/stages/${pathId}`);
        const n = Array.isArray(r.data) ? r.data.length : '—';
        g.innerHTML = `<div class="stat-card"><div class="stat-icon">🎓</div><div class="stat-val">${n}</div><div class="stat-lbl">Stages assignés</div></div>`;
    }
}

// ═══════════════════════════════════════════════════════════════
//  RESPONSABLE — ÉTUDIANTS
//  Modal : m-add-etudiant
//  Champs : et-mode, et-id-edit, titre-m-etudiant, err-m-etudiant
//           et-nom, et-prenom, et-ine, et-mail, et-filiere, et-semestre
//  Tableau : tb-etudiants
// ═══════════════════════════════════════════════════════════════

// Appelé par le bouton "+ Ajouter" dans la section Étudiants
// <button onclick="openModal('m-add-etudiant')"> dans HTML
// → on intercepte l'ouverture pour réinitialiser le formulaire
function _initModalEtudiantAjout() {
    clearErr('err-m-etudiant');
    // Vider tous les champs
    ['et-nom','et-prenom','et-ine','et-mail','et-filiere','et-semestre'].forEach(id => {
        const el = $(id); if (el) el.value = '';
    });
    if ($('et-mode'))           $('et-mode').value           = 'add';
    if ($('et-id-edit'))        $('et-id-edit').value        = '';
    if ($('titre-m-etudiant'))  $('titre-m-etudiant').textContent = 'Ajouter un étudiant';
}

// Surcharge openModal pour réinitialiser les modals avant ouverture
const _openModalOriginal = window.openModal;
function openModal(id) {
    // Réinitialisation propre selon le modal
    if (id === 'm-add-etudiant')    _initModalEtudiantAjout();
    if (id === 'm-add-superviseur') _initModalSupAjout();
    if (id === 'm-add-rapporteur')  _initModalRappAjout();
    if (id === 'm-add-stage')       _initModalStageAjout();
    // Afficher overlay + modal
    $('overlay')?.classList.remove('hidden');
    $(id)?.classList.remove('hidden');
}

function ouvrirModifEtudiant(id_etudiant, ine, nom, prenom, mail, filiere, semestre) {
    clearErr('err-m-etudiant');
    if ($('et-mode'))          $('et-mode').value          = 'edit';
    if ($('et-id-edit'))       $('et-id-edit').value       = id_etudiant;
    if ($('titre-m-etudiant')) $('titre-m-etudiant').textContent = "Modifier l'étudiant";
    if ($('et-nom'))     $('et-nom').value     = nom;
    if ($('et-prenom'))  $('et-prenom').value  = prenom;
    if ($('et-ine'))     $('et-ine').value     = ine;
    if ($('et-mail'))    $('et-mail').value    = mail;
    if ($('et-filiere')) $('et-filiere').value = filiere;
    if ($('et-semestre'))$('et-semestre').value= semestre;

    $('overlay')?.classList.remove('hidden');
    $('m-add-etudiant')?.classList.remove('hidden');
}

async function submitEtudiant() {
    clearErr('err-m-etudiant');
    const mode     = $('et-mode')?.value || 'add';
    const id_etud  = $('et-id-edit')?.value;
    const nom      = $('et-nom')?.value.trim();
    const prenom   = $('et-prenom')?.value.trim();
    const ine      = $('et-ine')?.value.trim();
    const mail     = $('et-mail')?.value.trim();
    const filiere  = $('et-filiere')?.value.trim();
    const semestre = parseInt($('et-semestre')?.value);

    if (!nom || !prenom || !ine || !mail || !filiere || isNaN(semestre)) {
        setErr('err-m-etudiant', 'Tous les champs sont obligatoires.'); return;
    }
    if (!okMail(mail)) {
        setErr('err-m-etudiant', 'Email invalide — @gmail.com, @yahoo.com ou @yahoo.fr.'); return;
    }

    let r;
    if (mode === 'add') {
        // Le backend (generer_password) crée le vrai mot de passe et l'envoie par mail.
        // On envoie un mot de passe temporaire aléatoire pour satisfaire la validation.
        const tempPw = 'Tmp' + Math.random().toString(36).slice(-8) + '!';
        r = await api('/etudiants/ajouter', 'POST', {
            id_responsable: respId(), ine, nom, prenom, mail, filiere, semestre, password: tempPw
        });
    } else {
        r = await api('/etudiants/modifier', 'POST', {
            id_responsable: respId(), id_etudiant: parseInt(id_etud),
            ine, nom, prenom, mail, filiere, semestre
        });
    }

    if (r.data.success) {
        toast(mode === 'add' ? 'Étudiant ajouté ! Identifiants envoyés par email.' : 'Étudiant modifié.', 'success');
        closeModal('m-add-etudiant');
        await loadEtudiants();
    } else {
        setErr('err-m-etudiant', r.data.message || 'Erreur.');
    }
}

async function loadEtudiants() {
    const tb = $('tb-etudiants'); if (!tb) return;
    tb.innerHTML = '<tr><td colspan="6" class="empty">Chargement…</td></tr>';
    const r = await api(`/etudiants/liste/${respId()}`);
    studentsData = Array.isArray(r.data) ? r.data : [];
    if (!studentsData.length) {
        tb.innerHTML = '<tr><td colspan="6" class="empty">Aucun étudiant enregistré.</td></tr>';
        _updateStageDropdowns(); return;
    }
    tb.innerHTML = studentsData.map(e => `<tr>
        <td><code>${e.ine}</code></td>
        <td>${e.nom} ${e.prenom}</td>
        <td>${e.filiere || '—'}</td>
        <td>${e.semestre || '—'}</td>
        <td>${e.mail}</td>
        <td class="ac">
            <button class="btn-icon" title="Modifier"
                onclick="ouvrirModifEtudiant(${e.id_etudiant},'${esc(e.ine)}','${esc(e.nom)}','${esc(e.prenom)}','${esc(e.mail)}','${esc(e.filiere)}',${e.semestre||1})">✏️</button>
            <button class="btn-icon" title="Supprimer"
                onclick="ouvrirDelete('etudiant','${esc(e.ine)}','${esc(e.prenom+' '+e.nom)}')">🗑️</button>
        </td></tr>`).join('');
    _updateStageDropdowns();
}

// ═══════════════════════════════════════════════════════════════
//  RESPONSABLE — SUPERVISEURS
//  Modal : m-add-superviseur
//  Champs : sup-mode, sup-id-edit, titre-m-sup, err-m-sup
//           sup-nom, sup-prenom, sup-mail
//  Tableau : tb-superviseurs
// ═══════════════════════════════════════════════════════════════
function _initModalSupAjout() {
    clearErr('err-m-sup');
    ['sup-nom','sup-prenom','sup-mail'].forEach(id => { const el=$(id); if(el)el.value=''; });
    if ($('sup-mode'))    $('sup-mode').value    = 'add';
    if ($('sup-id-edit')) $('sup-id-edit').value = '';
    if ($('titre-m-sup')) $('titre-m-sup').textContent = 'Ajouter un superviseur';
}

function ouvrirModifSuperviseur(id, nom, prenom, mail) {
    clearErr('err-m-sup');
    if ($('sup-mode'))    $('sup-mode').value    = 'edit';
    if ($('sup-id-edit')) $('sup-id-edit').value = id;
    if ($('titre-m-sup')) $('titre-m-sup').textContent = 'Modifier le superviseur';
    if ($('sup-nom'))    $('sup-nom').value    = nom;
    if ($('sup-prenom')) $('sup-prenom').value = prenom;
    if ($('sup-mail'))   $('sup-mail').value   = mail;
    $('overlay')?.classList.remove('hidden');
    $('m-add-superviseur')?.classList.remove('hidden');
}

async function submitSuperviseur() {
    clearErr('err-m-sup');
    const mode    = $('sup-mode')?.value || 'add';
    const id_edit = $('sup-id-edit')?.value;
    const nom     = $('sup-nom')?.value.trim();
    const prenom  = $('sup-prenom')?.value.trim();
    const mail    = $('sup-mail')?.value.trim();

    if (!nom || !prenom || !mail) { setErr('err-m-sup', 'Tous les champs sont obligatoires.'); return; }
    if (!okMail(mail))            { setErr('err-m-sup', 'Email invalide.'); return; }

    let r;
    if (mode === 'add') {
        const tempPw = 'Tmp' + Math.random().toString(36).slice(-8) + '!';
        r = await api('/superviseurs/ajouter', 'POST', { id_responsable: respId(), nom, prenom, mail, password: tempPw });
    } else {
        r = await api('/superviseurs/modifier', 'POST', { id_responsable: respId(), id_superviseur: parseInt(id_edit), nom, prenom, mail });
    }

    if (r.data.success) {
        toast(mode === 'add' ? 'Superviseur ajouté ! Identifiants envoyés par email.' : 'Superviseur modifié.', 'success');
        closeModal('m-add-superviseur');
        await loadSuperviseurs();
    } else { setErr('err-m-sup', r.data.message || 'Erreur.'); }
}

async function loadSuperviseurs() {
    const tb = $('tb-superviseurs'); if (!tb) return;
    tb.innerHTML = '<tr><td colspan="4" class="empty">Chargement…</td></tr>';
    const r = await api(`/superviseurs/liste/${respId()}`);
    superviseursData = Array.isArray(r.data) ? r.data : [];
    if (!superviseursData.length) {
        tb.innerHTML = '<tr><td colspan="4" class="empty">Aucun superviseur enregistré.</td></tr>';
        _updateStageDropdowns(); return;
    }
    tb.innerHTML = superviseursData.map(s => `<tr>
        <td>${s.nom}</td><td>${s.prenom}</td><td>${s.mail}</td>
        <td class="ac">
            <button class="btn-icon" onclick="ouvrirModifSuperviseur(${s.id_superviseur},'${esc(s.nom)}','${esc(s.prenom)}','${esc(s.mail)}')">✏️</button>
            <button class="btn-icon" onclick="ouvrirDelete('superviseur',${s.id_superviseur},'${esc(s.prenom+' '+s.nom)}')">🗑️</button>
        </td></tr>`).join('');
    _updateStageDropdowns();
}

// ═══════════════════════════════════════════════════════════════
//  RESPONSABLE — RAPPORTEURS
//  Modal : m-add-rapporteur
//  Champs : rapp-mode, rapp-id-edit, titre-m-rapp, err-m-rapp
//           rapp-nom, rapp-prenom, rapp-mail
//  Tableau : tb-rapporteurs
// ═══════════════════════════════════════════════════════════════
function _initModalRappAjout() {
    clearErr('err-m-rapp');
    ['rapp-nom','rapp-prenom','rapp-mail'].forEach(id => { const el=$(id); if(el)el.value=''; });
    if ($('rapp-mode'))    $('rapp-mode').value    = 'add';
    if ($('rapp-id-edit')) $('rapp-id-edit').value = '';
    if ($('titre-m-rapp')) $('titre-m-rapp').textContent = 'Ajouter un rapporteur';
}

function ouvrirModifRapporteur(id, nom, prenom, mail) {
    clearErr('err-m-rapp');
    if ($('rapp-mode'))    $('rapp-mode').value    = 'edit';
    if ($('rapp-id-edit')) $('rapp-id-edit').value = id;
    if ($('titre-m-rapp')) $('titre-m-rapp').textContent = 'Modifier le rapporteur';
    if ($('rapp-nom'))    $('rapp-nom').value    = nom;
    if ($('rapp-prenom')) $('rapp-prenom').value = prenom;
    if ($('rapp-mail'))   $('rapp-mail').value   = mail;
    $('overlay')?.classList.remove('hidden');
    $('m-add-rapporteur')?.classList.remove('hidden');
}

async function submitRapporteur() {
    clearErr('err-m-rapp');
    const mode    = $('rapp-mode')?.value || 'add';
    const id_edit = $('rapp-id-edit')?.value;
    const nom     = $('rapp-nom')?.value.trim();
    const prenom  = $('rapp-prenom')?.value.trim();
    const mail    = $('rapp-mail')?.value.trim();

    if (!nom || !prenom || !mail) { setErr('err-m-rapp', 'Tous les champs sont obligatoires.'); return; }
    if (!okMail(mail))            { setErr('err-m-rapp', 'Email invalide.'); return; }

    let r;
    if (mode === 'add') {
        const tempPw = 'Tmp' + Math.random().toString(36).slice(-8) + '!';
        r = await api('/rapporteurs/ajouter', 'POST', { id_responsable: respId(), nom, prenom, mail, password: tempPw });
    } else {
        r = await api('/rapporteurs/modifier', 'POST', { id_responsable: respId(), id_rapporteur: parseInt(id_edit), nom, prenom, mail });
    }

    if (r.data.success) {
        toast(mode === 'add' ? 'Rapporteur ajouté ! Identifiants envoyés par email.' : 'Rapporteur modifié.', 'success');
        closeModal('m-add-rapporteur');
        await loadRapporteurs();
    } else { setErr('err-m-rapp', r.data.message || 'Erreur.'); }
}

async function loadRapporteurs() {
    const tb = $('tb-rapporteurs'); if (!tb) return;
    tb.innerHTML = '<tr><td colspan="4" class="empty">Chargement…</td></tr>';
    const r = await api(`/rapporteurs/liste/${respId()}`);
    rapporteursData = Array.isArray(r.data) ? r.data : [];
    if (!rapporteursData.length) {
        tb.innerHTML = '<tr><td colspan="4" class="empty">Aucun rapporteur enregistré.</td></tr>';
        _updateStageDropdowns(); return;
    }
    tb.innerHTML = rapporteursData.map(rp => `<tr>
        <td>${rp.nom}</td><td>${rp.prenom}</td><td>${rp.mail}</td>
        <td class="ac">
            <button class="btn-icon" onclick="ouvrirModifRapporteur(${rp.id_rapporteur},'${esc(rp.nom)}','${esc(rp.prenom)}','${esc(rp.mail)}')">✏️</button>
            <button class="btn-icon" onclick="ouvrirDelete('rapporteur',${rp.id_rapporteur},'${esc(rp.prenom+' '+rp.nom)}')">🗑️</button>
        </td></tr>`).join('');
    _updateStageDropdowns();
}

// ═══════════════════════════════════════════════════════════════
//  RESPONSABLE — STAGES
//  Modal : m-add-stage
//  Champs : titre-m-stage, err-m-stage, st-titre, st-entreprise,
//           st-ville, st-desc, st-debut, st-fin,
//           st-etudiant (dropdown), st-superviseur, st-rapporteur
//  Tableau : tb-stages
// ═══════════════════════════════════════════════════════════════
function _updateStageDropdowns() {
    const selEt  = $('st-etudiant');
    const selSup = $('st-superviseur');
    const selRap = $('st-rapporteur');
    if (selEt) {
        selEt.innerHTML = '<option value="">-- Sélectionner un étudiant --</option>';
        studentsData.forEach(e => {
            selEt.innerHTML += `<option value="${e.id_etudiant}">${e.prenom} ${e.nom} (${e.ine})</option>`;
        });
    }
    if (selSup) {
        selSup.innerHTML = '<option value="">-- Sélectionner un superviseur --</option>';
        superviseursData.forEach(s => {
            selSup.innerHTML += `<option value="${s.id_superviseur}">${s.prenom} ${s.nom}</option>`;
        });
    }
    if (selRap) {
        selRap.innerHTML = '<option value="">-- Sélectionner un rapporteur --</option>';
        rapporteursData.forEach(rp => {
            selRap.innerHTML += `<option value="${rp.id_rapporteur}">${rp.prenom} ${rp.nom}</option>`;
        });
    }
}

async function _initModalStageAjout() {
    clearErr('err-m-stage');
    ['st-titre','st-entreprise','st-ville','st-desc','st-debut','st-fin'].forEach(id => {
        const el = $(id); if (el) el.value = '';
    });
    if ($('titre-m-stage')) $('titre-m-stage').textContent = 'Ajouter un stage';
    // Charger les listes si vides
    if (!studentsData.length)     await loadEtudiants();
    if (!superviseursData.length) await loadSuperviseurs();
    if (!rapporteursData.length)  await loadRapporteurs();
    _updateStageDropdowns();
}

async function submitStage() {
    clearErr('err-m-stage');
    const titre          = $('st-titre')?.value.trim();
    const entreprise     = $('st-entreprise')?.value.trim();
    const ville          = $('st-ville')?.value.trim();
    const description    = $('st-desc')?.value.trim() || null;
    const date_debut     = $('st-debut')?.value;
    const date_fin       = $('st-fin')?.value;
    const id_etudiant    = parseInt($('st-etudiant')?.value);
    const id_superviseur = parseInt($('st-superviseur')?.value);
    const id_rapporteur  = parseInt($('st-rapporteur')?.value);

    if (!titre || !entreprise || !ville || !date_debut || !date_fin) {
        setErr('err-m-stage', 'Champs obligatoires manquants.'); return;
    }
    if (isNaN(id_etudiant) || isNaN(id_superviseur) || isNaN(id_rapporteur)) {
        setErr('err-m-stage', 'Sélectionnez étudiant, superviseur et rapporteur.'); return;
    }

    const r = await api('/stages/ajouter', 'POST', {
        id_responsable: respId(), password: currentUser.password,
        titre, entreprise, ville, description, date_debut, date_fin,
        id_etudiant, id_superviseur, id_rapporteur
    });

    if (r.data.success) {
        toast('Stage enregistré.', 'success');
        closeModal('m-add-stage');
        await loadStages();
    } else { setErr('err-m-stage', r.data.message || 'Erreur.'); }
}

async function loadStages() {
    const tb = $('tb-stages'); if (!tb) return;
    tb.innerHTML = '<tr><td colspan="8" class="empty">Chargement…</td></tr>';
    const r = await api(`/stages/liste/${respId()}`);
    const stages = Array.isArray(r.data) ? r.data : [];
    if (!stages.length) {
        tb.innerHTML = '<tr><td colspan="8" class="empty">Aucun stage enregistré.</td></tr>'; return;
    }
    // Index noms lisibles
    const etIdx  = Object.fromEntries(studentsData.map(e  => [e.id_etudiant,    `${e.prenom} ${e.nom}`]));
    const supIdx = Object.fromEntries(superviseursData.map(s => [s.id_superviseur, `${s.prenom} ${s.nom}`]));
    const rapIdx = Object.fromEntries(rapporteursData.map(rp=> [rp.id_rapporteur,  `${rp.prenom} ${rp.nom}`]));


    tb.innerHTML = stages.map(st => {
    const idEtudiant = st.etudiant;
    const idSuperviseur = st.superviseur;
    const idRapporteur = st.rapporteur;

    const nomEtudiant = etIdx[idEtudiant] || etIdx[String(idEtudiant)] || `#${idEtudiant}`;
    const nomSuperviseur = supIdx[idSuperviseur] || supIdx[String(idSuperviseur)] || `#${idSuperviseur}`;
    const nomRapporteur = rapIdx[idRapporteur] || rapIdx[String(idRapporteur)] || `#${idRapporteur}`;

    return `<tr>
        <td><b>${st.titre}</b></td>
        <td>${st.entreprise}</td>
        <td>${st.ville}</td>
        <td>${nomEtudiant}</td>
        <td>${nomSuperviseur}</td>
        <td>${nomRapporteur}</td>
        <td style="font-size:.78rem;white-space:nowrap">${st.date_debut}<br>${st.date_fin}</td>
        <td class="ac">
            <button class="btn-icon" onclick="ouvrirDelete('stage',${st.id_stage},'${esc(st.titre)}')">🗑️</button>
        </td>
    </tr>`;
}).join('');
    /*tb.innerHTML = stages.map(st => `<tr>
        <td><b>${st.titre}</b></td>
        <td>${st.entreprise}</td>
        <td>${st.ville}</td>
        <td>${etIdx[st.etudiant]    || etIdx[st.id_etudiant]    || '#'+st.etudiant}</td>
        <td>${supIdx[st.superviseur] || supIdx[st.id_superviseur] || '#'+st.superviseur}</td>
        <td>${rapIdx[st.rapporteur]  || rapIdx[st.id_rapporteur]  || '#'+st.rapporteur}</td>
        <td style="font-size:.78rem;white-space:nowrap">${st.date_debut}<br>${st.date_fin}</td>
        <td class="ac">
            <button class="btn-icon" onclick="ouvrirDelete('stage',${st.id_stage},'${esc(st.titre)}')">🗑️</button>
        </td></tr>`).join('');*/
}

// ═══════════════════════════════════════════════════════════════
//  RESPONSABLE — ÉVALUATIONS
//  Tableau : tb-eval-resp
//  Modal   : m-eval-resp
//  Champs  : eval-resp-rapport-box, eval-resp-note, eval-resp-avis, err-m-eval-resp
//
//  IMPORTANT : La route GET /responsable/evaluation/{ine} reçoit une INE.
//  Le lien stage→rapport→ine est fait ici dans le JS.
// ═══════════════════════════════════════════════════════════════
async function loadEvalsResp() {
    const tb = $('tb-eval-resp'); if (!tb) return;
    tb.innerHTML = '<tr><td colspan="9" class="empty">Chargement…</td></tr>';

    // S'assurer que les listes sont chargées
    if (!studentsData.length)    await loadEtudiants();
    if (!superviseursData.length)await loadSuperviseurs();
    if (!rapporteursData.length) await loadRapporteurs();

    const rSt  = await api(`/stages/liste/${respId()}`);
    const stages = Array.isArray(rSt.data) ? rSt.data : [];
    if (!stages.length) {
        tb.innerHTML = '<tr><td colspan="9" class="empty">Aucun stage enregistré.</td></tr>'; return;
    }

    // Index étudiant par id pour retrouver l'INE
    const etById = Object.fromEntries(studentsData.map(e => [e.id_etudiant, e]));

    const rows = await Promise.all(stages.map(async st => {
        // Trouver l'étudiant lié à ce stage
        const et = etById[st.etudiant] || etById[st.id_etudiant] || null;
        const ine = et?.ine || null;

        // Rapport du stage
        const rRp = await api(`/rapport/voir/${st.id_stage}`);
        const rap = rRp.data?.id_rapport ? rRp.data : null;

        // Évaluation via INE de l'étudiant
        let ev = null;
        if (ine && rap) {
            const rEv = await api(`/responsable/evaluation/${String(ine)}`);
            if (rEv.ok && rEv.data){ ev = rEv.data;}
        }

        const moy  = ev ? calcMoy(ev.note_superviseur, ev.note_rapporteur, ev.note_responsable) : null;
        const lien = rap
            ? `<a href="${rap.chemin_fichier}" target="_blank" class="btn btn-sm btn-ghost">⬇️ Rapport</a>`
            : '—';
        // Bouton Évaluer — on passe id_rapport et ine pour le contexte
        const btn  = rap
            ? `<button class="btn btn-sm btn-primary"
                 onclick="ouvrirEvalResp('${esc(ine||'')}',${rap.id_rapport},'${esc(rap.chemin_fichier||'')}','${esc(rap.titre||'')}')">
                 ⭐ Évaluer</button>`
            : '—';

        return `<tr>
            <td>${et ? `${et.prenom} ${et.nom}` : '—'}</td>
            <td>${st.titre}</td>
            <td>${lien}</td>
            <td>${rap ? badge(rap.status) : '—'}</td>
            <td>${ev?.note_superviseur ?? '—'}</td>
            <td>${ev?.commentaire_superviseur ?? '—'}</td>
            <td>${ev?.note_rapporteur  ?? '—'}</td>
            <td>${ev?.commentaire_rapporteur ?? '—'}</td>
            <td>${ev?.note_responsable ?? '—'}</td>
            <td>${ev?.commentaire_responsable ?? '—'}</td>
            <td>${moy != null ? moy.toFixed(2) + '/20' : '—'}</td>
            <td class="ac">${btn}</td>
        </tr>`;
    }));
    tb.innerHTML = rows.join('') || '<tr><td colspan="9" class="empty">Aucune donnée.</td></tr>';
}

function ouvrirEvalResp(ine, id_rapport, chemin, titre) {
    _evalCtx = { role: 'responsable', ine: String(ine), id_rapport, chemin, titre };
    if ($('eval-resp-rapport-box')) $('eval-resp-rapport-box').innerHTML =
        `📄 <b>${titre || '—'}</b> &nbsp;
         ${chemin ? `<a href="${chemin}" target="_blank" class="btn btn-sm btn-ghost">⬇️ Télécharger</a>` : ''}`;
    if ($('eval-resp-note')) $('eval-resp-note').value = '';
    if ($('eval-resp-avis')) $('eval-resp-avis').value = '';
    clearErr('err-m-eval-resp');
    $('overlay')?.classList.remove('hidden');
    $('m-eval-resp')?.classList.remove('hidden');
}

async function submitEvalResponsable() {
    clearErr('err-m-eval-resp');
    if (!_evalCtx) { setErr('err-m-eval-resp', 'Contexte perdu.'); return; }
    const note = parseFloat($('eval-resp-note')?.value);
    const avis = $('eval-resp-avis')?.value.trim() || null;
    if (isNaN(note) || note < 0 || note > 20) { setErr('err-m-eval-resp', 'Note entre 0 et 20 requise.'); return; }

    const r = await api('/evaluation/responsable', 'POST', { id_rapport: _evalCtx.id_rapport, note, avis });
    if (r.data.success) {
        toast('Note enregistrée.', 'success');
        closeModal('m-eval-resp');
        _evalCtx = null;
        await loadEvalsResp();
    } else { setErr('err-m-eval-resp', r.data.message || 'Erreur.'); }
}

//  ÉTUDIANT — MON STAGE
async function loadMonStage() {
    const c = $('card-mon-stage'); if (!c) return;
    c.innerHTML = '<div class="info-placeholder">Chargement…</div>';
    const r  = await api(`/etudiant/stage/${currentUser.id_etudiant}`);
    const st = r.data;
    if (!st || !st.id_stage) {
        c.innerHTML = '<div class="info-placeholder">Aucun stage enregistré pour votre compte.</div>'; return;
    }
    // Mémoriser id_stage pour les appels rapport
    currentUser._id_stage = st.id_stage;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    c.innerHTML = `
        <div class="info-card">
            <h4>Stage</h4>
            <div class="info-row"><span class="lbl">Titre</span><span class="val">${st.titre}</span></div>
            <div class="info-row"><span class="lbl">Entreprise</span><span class="val">${st.entreprise || '—'}</span></div>
            <div class="info-row"><span class="lbl">Période</span><span class="val"> DU ${st.date_debut  || '—'} AU ${st.date_fin || '—'}</span></div>
            <div class="info-row"><span class="lbl">Statut rapport</span><span class="val">${badge(st.rapport_status || 'En attente')}</span></div>
        </div>`;
}

// ═══════════════════════════════════════════════════════════════
//  ÉTUDIANT — MON RAPPORT
//  Conteneur : card-mon-rapport
//  Bouton    : btn-rapport-action
//  Modal     : m-rapport
//  Champs    : rp-titre, rp-chemin, rp-contenu, err-m-rapport,
//              titre-m-rapport, btn-submit-rapport
//
//  Logique : En attente → peut modifier/valider
//            Terminé    → verrouillé, lecture seule
//
//  Upload PDF : on utilise FormData si un fichier est sélectionné,
//               sinon JSON avec chemin textuel.
// ═══════════════════════════════════════════════════════════════
async function loadMonRapport() {
    const c   = $('card-mon-rapport');
    const btn = $('btn-rapport-action');
    if (!c) return;
    c.innerHTML = '<div class="info-placeholder">Chargement…</div>';

    // Récupérer id_stage — on recharge toujours depuis l'API pour fiabilité
    if (!currentUser._id_stage) {
        const rs = await api(`/etudiant/stage/${currentUser.id_etudiant || currentUser.id}`);
        if (rs.ok && rs.data?.id_stage) {
            currentUser._id_stage = rs.data.id_stage;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
    }
    if (!currentUser._id_stage) {
        c.innerHTML = '<div class="info-placeholder">Aucun stage enregistré — le rapport ne peut pas encore être déposé.</div>';
        if (btn) btn.style.display = 'none'; return;
    }
    if (btn) btn.style.display = '';

    const rRp = await api(`/rapport/voir/${currentUser._id_stage}`);
    const rap  = rRp.data?.id_rapport ? rRp.data : null;

    if (!rap) {
        if (btn) { btn.textContent = '+ Déposer'; btn.disabled = false; btn.onclick = ouvrirModalRapport; }
        c.innerHTML = '<div class="info-placeholder">Aucun rapport déposé. Cliquez sur "+ Déposer".</div>';
        return;
    }

    const verrouille = rap.status === 'Terminé';
    if (btn) {
        btn.textContent = verrouille ? '🔒 Rapport verrouillé' : '✏️ Modifier';
        btn.disabled    = verrouille;
        btn.onclick     = verrouille ? null : ouvrirModalRapport;
    }

    c.innerHTML = `
        <div class="info-card">
            <h4>Mon Rapport</h4>
            <div class="info-row"><span class="lbl">Titre</span><span class="val">${rap.titre}</span></div>
            <div class="info-row"><span class="lbl">Statut</span><span class="val">${badge(rap.status)}</span></div>
            <div class="info-row"><span class="lbl">Fichier</span>
                <span class="val"><a href="${rap.chemin_fichier}" target="_blank">📎 Télécharger</a></span></div>
            ${rap.contenu ? `<div class="info-row"><span class="lbl">Résumé</span><span class="val">${rap.contenu}</span></div>` : ''}
        </div>
        ${!verrouille ? `
        <div class="info-card" style="align-self:start">
            <h4>Actions</h4>
            <p style="font-size:.82rem;color:var(--muted);margin-bottom:.75rem">
                ⚠️ Une fois validé, vous ne pourrez plus modifier ni supprimer votre rapport.
            </p>
            <button class="btn btn-success btn-sm" onclick="validerRapport()">✔ Valider et soumettre</button>
        </div>` : `
        <div class="info-card" style="align-self:start">
            <h4>Statut</h4>
            <p style="color:var(--ok,green);font-size:.88rem">✔ Rapport soumis et verrouillé. Votre jury peut maintenant l'évaluer.</p>
        </div>`}`;
}

function ouvrirModalRapport() {
    clearErr('err-m-rapport');
    if ($('rp-titre'))  $('rp-titre').value  = '';
    if ($('rp-contenu'))$('rp-contenu').value= '';
    // Injecter l'input file si absent dans le HTML
    let fileWrap = $('rp-file-wrap');
    if (!fileWrap) {
        const mb = $('m-rapport')?.querySelector('.mb');
        if (mb) {
            fileWrap = document.createElement('div');
            fileWrap.id        = 'rp-file-wrap';
            fileWrap.className = 'form-group';
            fileWrap.innerHTML = `
                <label>Fichier PDF <span style="color:var(--danger,red)">*</span></label>
                <input type="file" id="rp-fichier" accept=".pdf"
                    style="display:block;width:100%;padding:.6rem;border:1.5px solid var(--border,#DDE3EE);border-radius:10px;font-size:.88rem;cursor:pointer;background:#fff"/>
                <small style="color:var(--muted,#6B7280);font-size:.78rem">Uniquement les fichiers .pdf</small>`;
            // Insérer en 1ère position dans le corps du modal
            mb.insertBefore(fileWrap, mb.firstChild);
        }
    }
    // Réinitialiser le champ file
    const fi = $('rp-fichier'); if (fi) fi.value = '';
    if ($('titre-m-rapport')) $('titre-m-rapport').textContent = 'Déposer / Modifier mon rapport';
    $('overlay')?.classList.remove('hidden');
    $('m-rapport')?.classList.remove('hidden');
}

async function submitRapport() {
    clearErr('err-m-rapport');

    // Récupérer id_stage — peut être absent si session restaurée depuis localStorage
    let id_stage = currentUser._id_stage;
    if (!id_stage) {
        const rSt = await api(`/etudiant/stage/${currentUser.id_etudiant}`);
        if (rSt.data?.id_stage) {
            id_stage = rSt.data.id_stage;
            currentUser._id_stage = id_stage;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
    }
    if (!id_stage) {
        setErr('err-m-rapport', 'Stage introuvable — impossible de déposer le rapport.'); return;
    }

    const titre     = $('rp-titre')?.value.trim();
    const contenu   = $('rp-contenu')?.value.trim() || '';
    const fileInput = $('rp-fichier');

    if (!titre) { setErr('err-m-rapport', 'Le titre du rapport est requis.'); return; }
    if (!fileInput || !fileInput.files?.length) {
        setErr('err-m-rapport', 'Veuillez sélectionner un fichier PDF.'); return;
    }
    const file = fileInput.files[0];
    if (!file.name.toLowerCase().endsWith('.pdf')) {
        setErr('err-m-rapport', 'Uniquement les fichiers .pdf sont acceptés.'); return;
    }

    // Vérifier si rapport existant
    const rEx   = await api(`/rapport/voir/${id_stage}`);
    const existe = rEx.data?.id_rapport;
    if (existe && rEx.data.status === 'Terminé') {
        setErr('err-m-rapport', 'Rapport verrouillé — modification impossible.'); return;
    }

    // TOUJOURS FormData (la route Flask attend request.files['file'])
    const fd = new FormData();
    fd.append('id_stage', String(id_stage));  // Flask : request.form.get("id_stage") → string puis int()
    fd.append('titre',    titre);
    fd.append('contenu',  contenu || '');
    fd.append('file',     file);              // clé "file" : request.files['file'] dans route.py

    const r = await apiUpload(existe ? '/rapport/modifier' : '/rapport/ajouter', fd);

    if (r.data.success) {
        toast('Rapport déposé avec succès.', 'success');
        closeModal('m-rapport');
        // Réinitialiser l'input file
        if (fileInput) fileInput.value = '';
        await loadMonRapport();
    } else { setErr('err-m-rapport', r.data.message || 'Erreur lors du dépôt.'); }
}

async function validerRapport() {
    if (!confirm('Valider et soumettre le rapport ? Cette action est irréversible — vous ne pourrez plus le modifier.')) return;
    const r = await api('/rapport/valider', 'POST', { id_stage: currentUser._id_stage });
    if (r.data.success) { toast('Rapport soumis et verrouillé.', 'success'); await loadMonRapport(); }
    else toast(r.data.message || 'Erreur.', 'error');
}

// ═══════════════════════════════════════════════════════════════
//  ÉTUDIANT — MON ÉVALUATION
//  Conteneur : card-mon-evaluation
// ═══════════════════════════════════════════════════════════════
async function loadMonEvaluation() {
    const c = $('card-mon-evaluation'); if (!c) return;
    c.innerHTML = '<div class="info-placeholder">Chargement…</div>';
    const r  = await api(`/etudiant/evaluation/${currentUser.ine}`);
    const ev = r.data;
    if (!ev || (!ev.note_superviseur && !ev.note_rapporteur && !ev.note_responsable)) {
        c.innerHTML = '<div class="info-placeholder">Aucune évaluation disponible pour le moment.</div>'; return;
    }
    const moy = calcMoy(ev.note_superviseur, ev.note_rapporteur, ev.note_responsable);
    c.innerHTML = `
        <div class="info-card">
            <h4>Notes reçues</h4>
            ${evalLigne('Superviseur', ev.note_superviseur, ev.commentaire_superviseur)}
            ${evalLigne('Rapporteur',  ev.note_rapporteur,  ev.commentaire_rapporteur)}
            ${evalLigne('Responsable', ev.note_responsable, ev.commentaire_responsable)}
        </div>
        <div class="info-card" style="align-self:start;text-align:center">
            <h4>Note finale</h4>
            <div style="background:var(--navy,#1B2A4A);border-radius:10px;color:#fff;padding:1rem;margin-top:.5rem">
                <div style="font-size:.75rem;opacity:.7;text-transform:uppercase;letter-spacing:.5px">Moyenne générale</div>
                <div style="font-size:2.4rem;font-weight:700">${moy != null ? moy.toFixed(2) + ' /20' : 'En attente'}</div>
            </div>
        </div>`;
}

// ═══════════════════════════════════════════════════════════════
//  SUPERVISEUR — MES STAGES & ÉVALUATION
//  Tableau : tb-sup-etudiants
//  Modal   : m-evaluer (bloc unique superviseur)
//
//  IMPORTANT : La route /superviseur/evaluation/{ine} prend une INE.
//  On récupère l'INE via l'id_etudiant du stage.
// ═══════════════════════════════════════════════════════════════
async function loadSupStages() {
    const tb = $('tb-sup-etudiants'); if (!tb) return;
    tb.innerHTML = '<tr><td colspan="6" class="empty">Chargement…</td></tr>';
    const r = await api(`/superviseur/stages/${currentUser.id_superviseur}`);
    const stages = Array.isArray(r.data) ? r.data : [];
    if (!stages.length) {
        tb.innerHTML = '<tr><td colspan="6" class="empty">Aucun étudiant assigné.</td></tr>'; return;
    }
    const rows = await Promise.all(stages.map(async st => {
        const rRp = await api(`/rapport/voir/${st.id_stage}`);
        const rap = rRp.data?.id_rapport ? rRp.data : null;

        // /etudiants/{id}/by-id retourne une LISTE → on prend le 1er élément
        const idEt   = st.id_etudiant || st.etudiant;
        const rEt    = await api(`/etudiants/${idEt}/by-id`).catch(() => ({ data: [] }));
        const etData = Array.isArray(rEt.data) ? rEt.data[0] : rEt.data;
        const ine    = etData?.ine   || null;
        const nomEt  = etData ? `${etData.prenom || ''} ${etData.nom || ''}`.trim() : null;

        let noteExist = null;
        if (ine) {
            const rEv = await api(`/superviseur/evaluation/${String(ine)}`);
            console.log(JSON.stringify(rEv));
            console.log(Object.keys(rEv.data),rEv.data?.note_superviseur ,rEv.data)
            if (rEv.ok && rEv.data?.note_superviseur != null) noteExist = rEv.data.note_superviseur;
        }

        const btn = rap
            ? `<button class="btn btn-sm btn-primary"
                 onclick="ouvrirEvalEncadreur('superviseur',${rap.id_rapport},'${esc(rap.chemin_fichier||'')}','${esc(rap.titre||'')}','${esc(ine||'')}')">
                 ⭐ Évaluer</button>`
            : '—';

        return `<tr>
            <td>${ine   ? `<code>${ine}</code>` : '#'+idEt}</td>
            <td>${nomEt ? nomEt : '—'}</td>
            <td>${st.titre}</td>
            <td>${badge(rap?.status || 'En attente')}</td>
            <td>${rap ? `<a href="${rap.chemin_fichier}" target="_blank" class="btn btn-sm btn-ghost">⬇️ Rapport</a>` : '—'}</td>
            <td class="ac">
                ${btn}
                ${noteExist !== null ? `<span style="color:green;margin-left:.5rem">✔ ${noteExist}/20</span>` : ''}
            </td></tr>`;
    }));
    tb.innerHTML = rows.join('');
}

// ═══════════════════════════════════════════════════════════════
//  RAPPORTEUR — MES STAGES & ÉVALUATION
//  Tableau : tb-rapp-etudiants
//  Modal   : m-evaluer (bloc unique rapporteur)
// ═══════════════════════════════════════════════════════════════
async function loadRappStages() {
    const tb = $('tb-rapp-etudiants'); if (!tb) return;
    tb.innerHTML = '<tr><td colspan="6" class="empty">Chargement…</td></tr>';
    const r = await api(`/rapporteur/stages/${currentUser.id_rapporteur}`);
    const stages = Array.isArray(r.data) ? r.data : [];
    if (!stages.length) {
        tb.innerHTML = '<tr><td colspan="6" class="empty">Aucun étudiant assigné.</td></tr>'; return;
    }
    const rows = await Promise.all(stages.map(async st => {
        const rRp = await api(`/rapport/voir/${st.id_stage}`);
        const rap = rRp.data?.id_rapport ? rRp.data : null;

        // /etudiants/{id}/by-id retourne une LISTE → on prend le 1er élément
        const idEt   = st.id_etudiant || st.etudiant;
        const rEt    = await api(`/etudiants/${idEt}/by-id`).catch(() => ({ data: [] }));
        const etData = Array.isArray(rEt.data) ? rEt.data[0] : rEt.data;
        const ine    = etData?.ine   || null;
        const nomEt  = etData ? `${etData.prenom || ''} ${etData.nom || ''}`.trim() : null;

        let noteExist = null;
        if (ine) {
            const rEv = await api(`/rapporteur/evaluation/${String(ine)}`);
            if (rEv.ok && rEv.data?.note_rapporteur != null) noteExist = rEv.data.note_rapporteur;
        }

        const btn = rap
            ? `<button class="btn btn-sm btn-primary"
                 onclick="ouvrirEvalEncadreur('rapporteur',${rap.id_rapport},'${esc(rap.chemin_fichier||'')}','${esc(rap.titre||'')}','${esc(ine||'')}')">
                 ⭐ Évaluer</button>`
            : '—';

        return `<tr>
            <td>${ine   ? `<code>${ine}</code>` : '#'+idEt}</td>
            <td>${nomEt ? nomEt : '—'}</td>
            <td>${st.titre}</td>
            <td>${badge(rap?.status || 'En attente')}</td>
            <td>${rap ? `<a href="${rap.chemin_fichier}" target="_blank" class="btn btn-sm btn-ghost">⬇️ Rapport</a>` : '—'}</td>
            <td class="ac">
                ${btn}
                ${noteExist != null ? `<span style="color:green;margin-left:.5rem">✔ ${noteExist}/20</span>` : ''}
            </td></tr>`;
    }));
    tb.innerHTML = rows.join('');
}

// ─── Modal évaluation encadreur (superviseur ou rapporteur) ──
// Champs : titre-m-eval, err-m-eval, eval-rapport-box,
//          eval-bloc-label, eval-note, eval-avis
function ouvrirEvalEncadreur(role, id_rapport, chemin, titre, ine) {
    _evalCtx = { role, id_rapport, chemin, titre, ine: String(ine) };
    const LBL = { superviseur: '🏢 Ma note — Superviseur', rapporteur: '📝 Ma note — Rapporteur' };
    if ($('eval-bloc-label'))  $('eval-bloc-label').textContent = LBL[role] || 'Ma note';
    if ($('titre-m-eval'))     $('titre-m-eval').textContent    = `Évaluer — ${role === 'superviseur' ? 'Superviseur' : 'Rapporteur'}`;
    if ($('eval-rapport-box')) $('eval-rapport-box').innerHTML  =
        `📄 <b>${titre || '—'}</b> &nbsp;
         ${chemin ? `<a href="${chemin}" target="_blank" class="btn btn-sm btn-ghost">⬇️ Télécharger</a>` : ''}`;
    if ($('eval-note')) $('eval-note').value = '';
    if ($('eval-avis')) $('eval-avis').value = '';
    clearErr('err-m-eval');
    $('overlay')?.classList.remove('hidden');
    $('m-evaluer')?.classList.remove('hidden');
}

async function submitEvaluation() {
    clearErr('err-m-eval');
    if (!_evalCtx) { setErr('err-m-eval', 'Contexte perdu — réessayez.'); return; }
    const note = parseFloat($('eval-note')?.value);
    const avis = $('eval-avis')?.value.trim() || null;
    if (isNaN(note) || note < 0 || note > 20) { setErr('err-m-eval', 'Note entre 0 et 20 requise.'); return; }

    const path = _evalCtx.role === 'superviseur' ? '/evaluation/superviseur' : '/evaluation/rapporteur';
    const r    = await api(path, 'POST', { id_rapport: _evalCtx.id_rapport, note, avis });

    // Compatible avec Flask qui renvoie {success:true} ou {message:"..."} sans champ success
    const ok = r.ok && (r.data.success === true || (r.data.success === undefined && !r.data.error));
    if (ok) {
        toast('Note enregistrée avec succès !', 'success');
        closeModal('m-evaluer');
        _evalCtx = null;
        if (currentUser.role === 'superviseur') loadSupStages();
        else loadRappStages();
    } else {
        setErr('err-m-eval', r.data.message || r.data.error || 'Erreur.');
    }

}

/*async function submitEvaluation() {
    clearErr('err-m-eval');
    if (!_evalCtx) { setErr('err-m-eval', 'Contexte perdu — réessayez.'); return; }
    const note = parseFloat($('eval-note')?.value);
    const avis = $('eval-avis')?.value.trim() || null;
    if (isNaN(note) || note < 0 || note > 20) { setErr('err-m-eval', 'Note entre 0 et 20 requise.'); return; }

    const path = _evalCtx.role === 'superviseur' ? '/evaluation/superviseur' : '/evaluation/rapporteur';
    const r    = await api(path, 'POST', { id_rapport: _evalCtx.id_rapport, note, avis });

    if (r.data.success) {
        toast('Note enregistrée.', 'success');
        closeModal('m-evaluer');
        _evalCtx = null;
        if (currentUser.role === 'superviseur') loadSupStages();
        else loadRappStages();
    } else { setErr('err-m-eval', r.data.message || 'Erreur.'); }
}*/

// ═══════════════════════════════════════════════════════════════
//  SUPPRESSION GÉNÉRIQUE
//  Modal : m-delete  Champs : del-msg
// ═══════════════════════════════════════════════════════════════
function ouvrirDelete(type, id, label) {
    _deleteCtx = { type, id, label };
    if ($('del-msg')) $('del-msg').textContent = `Voulez-vous vraiment supprimer : « ${label} » ?`;
    $('overlay')?.classList.remove('hidden');
    $('m-delete')?.classList.remove('hidden');
}

async function confirmDelete() {
    if (!_deleteCtx) return;
    const { type, id } = _deleteCtx;
    const id_resp = respId();
    let r;

    // Toutes les suppressions sont en POST (comme défini dans route.py)
    if (type === 'etudiant')
        r = await api('/etudiants/supprimer', 'POST', { id_responsable: id_resp, ine: id });
    else if (type === 'superviseur')
        r = await api('/superviseurs/supprimer', 'POST', { id_responsable: id_resp, id_superviseur: id });
    else if (type === 'rapporteur')
        r = await api('/rapporteurs/supprimer', 'POST', { id_responsable: id_resp, id_rapporteur: id });
    else if (type === 'stage')
        r = await api('/stages/supprimer', 'POST', { id_responsable: id_resp, id_stage: id });
    
    if (r?.ok || r?.data?.success) {
        toast('Supprimé avec succès.', 'success');
        closeModal('m-delete');
        _deleteCtx = null;
        // Recharger la section active
        const active = document.querySelector('.section.active');
        if (active) loadSection(active.id);
    } else {
        toast(r?.data?.message || 'Erreur de suppression.', 'error');
    }
}

// ═══════════════════════════════════════════════════════════════
//  UTILITAIRES
// ═══════════════════════════════════════════════════════════════
function badge(status) {
    const cls = { 'En attente': 'badge-attente', 'Terminé': 'badge-termine', 'Refusé': 'badge-refuse' }[status] || 'badge-attente';
    return `<span class="badge ${cls}">${status || 'En attente'}</span>`;
}

function evalLigne(who, note, comment) {
    return `<div class="eval-row" style="padding:.45rem 0;border-bottom:1px solid var(--border,#DDE3EE)">
        <b style="min-width:100px;display:inline-block">${who}</b>
        <span>${note != null ? note + '/20' : 'Non noté'}</span>
        ${comment ? `<div style="font-size:.78rem;color:var(--muted,#6B7280);font-style:italic;margin-top:.1rem">${comment}</div>` : ''}
    </div>`;
}

function calcMoy(...notes) {
    const v = notes.filter(n => n != null && !isNaN(n));
    return v.length ? +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(2) : null;
}

// ═══════════════════════════════════════════════════════════════
//  INITIALISATION
// ═══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    restoreUserSession();
});