/* ═══════════════════════════════════════════════════════════
   GESTION DE STAGE — app.js
   Calé exactement sur route.py (Blueprint api_bp)
   Session en mémoire — pas de re-saisie de MDP après login
═══════════════════════════════════════════════════════════ */

const API = 'http://127.0.0.1:5000/api';   // même domaine que Flask

/* ─── Session ─────────────────────────────────────────────
   U = {
     role            : 'responsable'|'etudiant'|'superviseur'|'rapporteur'
     id_responsable  : number  (responsable)
     id_etudiant     : number  (etudiant)
     id_superviseur  : number  (superviseur)
     id_rapporteur   : number  (rapporteur)
     ine             : string  (etudiant)
     nom, prenom, mail
     password        : string  (conservé pour les routes qui le demandent)
   }
──────────────────────────────────────────────────────────── */
let U        = null;
let delCtx   = null;   // { type, id, label }
let evalCtx  = null;   // { ine, rapport }  rapport = { id_rapport, titre, chemin_fichier }
let stageCtx = null;   // stage de l'étudiant connecté

/* ─── Utilitaires ─────────────────────────────────────────*/
const $  = id => document.getElementById(id);
const s  = v  => (v ?? '—');
const sf = v  => (v != null ? Number(v).toFixed(2) : '—');
const safe = str => (str||'').toString().replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;');

const VALID_DOMAINS = ['gmail.com','yahoo.com','yahoo.fr'];
const validMail = m => m && VALID_DOMAINS.some(d => m.endsWith('@'+d));

function showPage(id){
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  $(id)?.classList.add('active');
}
function showSection(id){
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  $(id)?.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active-nav'));
  document.querySelector(`.nav-item[data-sec="${id}"]`)?.classList.add('active-nav');
  const T = {
    's-home':'Tableau de bord','s-etudiants':'Étudiants',
    's-superviseurs':'Superviseurs','s-rapporteurs':'Rapporteurs',
    's-stages':'Stages','s-evaluations-resp':'Évaluations',
    's-mon-stage':'Mon Stage','s-mon-rapport':'Mon Rapport',
    's-mon-evaluation':'Mon Évaluation',
    's-sup-etudiants':'Mes Étudiants','s-rapp-etudiants':'Mes Étudiants',
  };
  $('topbar-title').textContent = T[id] || 'Tableau de bord';
}
function toast(msg, type=''){
  const t = $('toast');
  t.textContent = msg; t.className = 'toast'+(type?' '+type:'');
  t.classList.remove('hidden');
  clearTimeout(t._t); t._t = setTimeout(()=>t.classList.add('hidden'), 3500);
}
function setErr(id, msg){ const e=$(id); if(!e)return; e.textContent=msg; e.classList.remove('hidden'); }
function clearErr(id){ $(id)?.classList.add('hidden'); }
function togglePw(inputId, btn){
  const i=$(inputId); if(!i)return;
  i.type = i.type==='password'?'text':'password';
  btn.textContent = i.type==='password'?'👁':'🔒';
}
function toggleSidebar(){ $('sidebar').classList.toggle('open'); }

function badge(status){
  const map = {'En attente':'badge-attente','Terminé':'badge-termine','Refusé':'badge-refuse'};
  return `<span class="badge ${map[status]||'badge-attente'}">${status||'En attente'}</span>`;
}

/* ─── API helper ──────────────────────────────────────────*/
async function api(path, method='GET', body=null){
  const opts = { method, headers:{'Content-Type':'application/json'} };
  if(body) opts.body = JSON.stringify(body);
  try{
    const res  = await fetch(API+path, opts);
    const data = await res.json().catch(()=>({}));
    return { ok:res.ok, status:res.status, data };
  }catch(e){
    return { ok:false, status:0, data:{success:false, message:'Erreur réseau — Flask démarré ?'} };
  }
}

/* ─── Modals ──────────────────────────────────────────────*/
function openModal(id){
  document.querySelectorAll('.modal').forEach(m=>m.classList.add('hidden'));
  $('overlay').classList.remove('hidden'); $('overlay').classList.add('active');
  $(id)?.classList.remove('hidden');
}
function closeModal(id){ if(id)$(id)?.classList.add('hidden'); $('overlay').classList.add('hidden'); $('overlay').classList.remove('active'); }
function overlayClick(e){ if(e.target===$('overlay')) closeModal(); }

/* ═══════════════════════════════════════════════════════════
   AUTH
   Routes : /responsable/connexion  /etudiant/connexion
            /superviseur/connexion  /rapporteur/connexion
            /responsable/ajouter  (inscription)
═══════════════════════════════════════════════════════════ */
function updateLoginLabel(){
  const role = $('login-role').value;
  $('lbl-login-id').textContent = role==='etudiant' ? 'INE' : 'Adresse email';
  $('login-id').placeholder     = role==='etudiant' ? 'Votre INE (ex : N0012026)' : 'exemple@gmail.com';
}

async function handleLogin(){
  clearErr('err-login');
  const id   = $('login-id').value.trim();
  const role = $('login-role').value;
  const pw   = $('login-pw').value;
  if(!id||!role||!pw){ setErr('err-login','Tous les champs sont requis.'); return; }

  const ROUTES = {
    responsable: ['/responsable/connexion', { mail:id,     password:pw }],
    etudiant:    ['/etudiant/connexion',    { ine:id,      password:pw }],
    superviseur: ['/superviseur/connexion', { mail:id,     password:pw }],
    rapporteur:  ['/rapporteur/connexion',  { mail:id,     password:pw }],
  };
  const [path, body] = ROUTES[role] || [];
  if(!path){ setErr('err-login','Rôle invalide.'); return; }

  const r = await api(path, 'POST', body);
  if(!r.data.success){ setErr('err-login', r.data.message||'Identifiants incorrects.'); return; }

  /* Construire la session */
  U = { role, password:pw, ...r.data };
  buildSidebar();
  $('topbar-user').textContent = `${U.prenom||''} ${U.nom||''}`.trim();
  showPage('page-dashboard');
  showSection('s-home');
  loadHomeStats();
}

async function handleRegister(){
  clearErr('err-register'); clearErr('ok-register');
  const nom    = $('reg-nom').value.trim();
  const prenom = $('reg-prenom').value.trim();
  const mail   = $('reg-mail').value.trim();
  const pw     = $('reg-pw').value;
  const pw2    = $('reg-pw2').value;
  if(!nom||!prenom||!mail||!pw){ setErr('err-register','Tous les champs sont obligatoires.'); return; }
  if(!validMail(mail)){ setErr('err-register','Email invalide — gmail.com, yahoo.com ou yahoo.fr.'); return; }
  if(pw!==pw2){ setErr('err-register','Les mots de passe ne correspondent pas.'); return; }

  const r = await api('/responsable/ajouter','POST',{nom,prenom,mail,password:pw});
  if(r.data.success){
    $('ok-register').textContent='Compte créé ! Vous pouvez vous connecter.';
    $('ok-register').classList.remove('hidden');
    setTimeout(()=>showPage('page-login'), 2000);
  }else{
    setErr('err-register', r.data.message||'Erreur lors de la création.');
  }
}

function handleLogout(){
  U = stageCtx = null;
  $('login-id').value=''; $('login-pw').value=''; $('login-role').value='';
  showPage('page-login');
}

/* ═══════════════════════════════════════════════════════════
   SIDEBAR DYNAMIQUE
═══════════════════════════════════════════════════════════ */
function buildSidebar(){
  const MENUS = {
    responsable:[
      {l:'Tableau de bord',   i:'📊', s:'s-home'},
      {l:'Étudiants',         i:'🎓', s:'s-etudiants'},
      {l:'Superviseurs',      i:'👔', s:'s-superviseurs'},
      {l:'Rapporteurs',       i:'📝', s:'s-rapporteurs'},
      {l:'Stages',            i:'🏢', s:'s-stages'},
      {l:'Évaluations',       i:'⭐', s:'s-evaluations-resp'},
    ],
    etudiant:[
      {l:'Tableau de bord',   i:'📊', s:'s-home'},
      {l:'Mon Stage',         i:'🏢', s:'s-mon-stage'},
      {l:'Mon Rapport',       i:'📄', s:'s-mon-rapport'},
      {l:'Mon Évaluation',    i:'⭐', s:'s-mon-evaluation'},
    ],
    superviseur:[
      {l:'Tableau de bord',   i:'📊', s:'s-home'},
      {l:'Mes Étudiants',     i:'🎓', s:'s-sup-etudiants'},
    ],
    rapporteur:[
      {l:'Tableau de bord',   i:'📊', s:'s-home'},
      {l:'Mes Étudiants',     i:'🎓', s:'s-rapp-etudiants'},
    ],
  };
  const nav = $('sb-nav'); nav.innerHTML='';
  (MENUS[U.role]||[]).forEach(item=>{
    const d = document.createElement('div');
    d.className='nav-item'; d.dataset.sec=item.s;
    d.innerHTML=`<span class="nav-icon">${item.i}</span><span>${item.l}</span>`;
    d.onclick=()=>{ showSection(item.s); loadSection(item.s); if(window.innerWidth<769) toggleSidebar(); };
    nav.appendChild(d);
  });
  const init = (U.prenom?.[0]||U.nom?.[0]||'?').toUpperCase();
  $('sb-avatar').textContent = init;
  $('sb-name').textContent   = `${U.prenom||''} ${U.nom||''}`.trim();
  const RL = {responsable:'Responsable',etudiant:'Étudiant',superviseur:'Superviseur',rapporteur:'Rapporteur'};
  $('sb-role-pill').textContent = RL[U.role]||U.role;
}

/* ═══════════════════════════════════════════════════════════
   HOME STATS
═══════════════════════════════════════════════════════════ */
async function loadHomeStats(){
  $('home-greeting').textContent = `Bonjour, ${U.prenom||U.nom} 👋`;
  const grid = $('stats-grid');

  if(U.role==='responsable'){
    $('home-sub').textContent='Aperçu de votre département.';
    const id = U.id_responsable;
    const [rEt,rSt,rSup,rRap] = await Promise.all([
      api(`/etudiants/liste/${id}`),
      api(`/stages/liste/${id}`),
      api(`/superviseurs/liste/${id}`),
      api(`/rapporteurs/liste/${id}`),
    ]);
    const n = a => Array.isArray(a)?a.length:'—';
    grid.innerHTML=`
      <div class="stat-card"><div class="stat-icon">🎓</div><div class="stat-val">${n(rEt.data)}</div><div class="stat-lbl">Étudiants</div></div>
      <div class="stat-card"><div class="stat-icon">🏢</div><div class="stat-val">${n(rSt.data)}</div><div class="stat-lbl">Stages</div></div>
      <div class="stat-card"><div class="stat-icon">👔</div><div class="stat-val">${n(rSup.data)}</div><div class="stat-lbl">Superviseurs</div></div>
      <div class="stat-card"><div class="stat-icon">📝</div><div class="stat-val">${n(rRap.data)}</div><div class="stat-lbl">Rapporteurs</div></div>`;

  }else if(U.role==='etudiant'){
    $('home-sub').textContent='Suivez votre avancement de stage.';
    const rSt = await api(`/etudiant/stage/${U.id_etudiant}`);
    const st  = rSt.data;
    grid.innerHTML=`
      <div class="stat-card"><div class="stat-icon">🏢</div><div class="stat-val" style="font-size:1rem">${st?.titre||'—'}</div><div class="stat-lbl">Stage</div></div>
      <div class="stat-card"><div class="stat-icon">📄</div><div class="stat-val" style="font-size:1rem">${st?.rapport_status||'—'}</div><div class="stat-lbl">Rapport</div></div>`;

  }else{
    $('home-sub').textContent='Consultez vos affectations.';
    const id    = U.id_superviseur||U.id_rapporteur;
    const path  = U.role==='superviseur' ? `/superviseur/stages/${id}` : `/rapporteur/stages/${id}`;
    const rSt   = await api(path);
    const n     = Array.isArray(rSt.data)?rSt.data.length:'—';
    grid.innerHTML=`<div class="stat-card"><div class="stat-icon">🎓</div><div class="stat-val">${n}</div><div class="stat-lbl">Stages assignés</div></div>`;
  }
}

/* ═══════════════════════════════════════════════════════════
   ROUTER
═══════════════════════════════════════════════════════════ */
async function loadSection(id){
  if(id==='s-home'){ loadHomeStats(); return; }
  if(U.role==='responsable'){
    if(id==='s-etudiants')       loadEtudiants();
    if(id==='s-superviseurs')    loadSuperviseurs();
    if(id==='s-rapporteurs')     loadRapporteurs();
    if(id==='s-stages')         await loadStages();
    if(id==='s-evaluations-resp')loadEvalsResp();
  }
  if(U.role==='etudiant'){
    if(id==='s-mon-stage')      loadMonStage();
    if(id==='s-mon-rapport')    loadMonRapport();
    if(id==='s-mon-evaluation') loadMonEvaluation();
  }
  if(U.role==='superviseur' && id==='s-sup-etudiants')  loadSupEtudiants();
  if(U.role==='rapporteur'  && id==='s-rapp-etudiants') loadRappEtudiants();
}

/* ═══════════════════════════════════════════════════════════
   RESPONSABLE — ÉTUDIANTS
   GET  /etudiants/liste/{id_responsable}
   POST /etudiants/ajouter
   POST /etudiants/modifier
   POST /etudiants/supprimer
═══════════════════════════════════════════════════════════ */
async function loadEtudiants(){
  const tb=$('tb-etudiants');
  tb.innerHTML='<tr><td colspan="6" class="empty">Chargement…</td></tr>';
  const r = await api(`/etudiants/liste/${U.id_responsable}`);
  if(!Array.isArray(r.data)||!r.data.length){
    tb.innerHTML='<tr><td colspan="6" class="empty">Aucun étudiant enregistré.</td></tr>'; return;
  }
  tb.innerHTML = r.data.map(e=>`<tr>
    <td><code>${e.ine}</code></td>
    <td>${e.prenom} ${e.nom}</td>
    <td>${e.filiere}</td>
    <td>${e.semestre}</td>
    <td>${e.mail}</td>
    <td class="ac">
      <button class="btn-icon" title="Modifier" onclick='ouvrirEditEtudiant(${JSON.stringify(e)})'>✏️</button>
      <button class="btn-icon" title="Supprimer" onclick="ouvrirDel('etudiant',${e.id_etudiant},'${safe(e.prenom+' '+e.nom)}')">🗑️</button>
    </td></tr>`).join('');
}

function ouvrirAddEtudiant(){
  $('titre-m-etudiant').textContent='Ajouter un étudiant';
  $('et-mode').value='add'; $('et-id-edit').value='';
  ['et-nom','et-prenom','et-ine','et-mail','et-filiere','et-semestre','et-pw'].forEach(id=>$(id).value='');
  $('wrap-et-pw').style.display='none'; // CACHÉ COMME DEMANDÉ
  clearErr('err-m-etudiant'); openModal('m-add-etudiant');
}
function ouvrirEditEtudiant(e){
  $('titre-m-etudiant').textContent="Modifier l'étudiant";
  $('et-mode').value='edit'; $('et-id-edit').value=e.id_etudiant;
  $('et-nom').value=e.nom; $('et-prenom').value=e.prenom;
  $('et-ine').value=e.ine; $('et-mail').value=e.mail;
  $('et-filiere').value=e.filiere; $('et-semestre').value=e.semestre;
  $('wrap-et-pw').style.display='none'; // pas de MDP à la modif
  clearErr('err-m-etudiant'); openModal('m-add-etudiant');
}
async function submitEtudiant(){
  clearErr('err-m-etudiant');
  const mode    = $('et-mode').value;
  const nom     = $('et-nom').value.trim();
  const prenom  = $('et-prenom').value.trim();
  const ine     = $('et-ine').value.trim();
  const mail    = $('et-mail').value.trim();
  const filiere = $('et-filiere').value.trim();
  const semestre= parseInt($('et-semestre').value);

  if(!nom||!prenom||!ine||!mail||!filiere||isNaN(semestre)){
    setErr('err-m-etudiant','Tous les champs sont obligatoires.'); return;
  }
  if(!validMail(mail)){ setErr('err-m-etudiant','Email invalide — gmail/yahoo acceptés.'); return; }

  let r;
  if(mode==='add'){
    // Génération automatique (plus besoin de le demander à l'utilisateur)
    const pw = "Esi" + Math.random().toString(36).slice(-4);
    r = await api('/etudiants/ajouter','POST',{
      id_responsable:U.id_responsable, nom, prenom, ine, mail, filiere, semestre, password:pw
    });
  }else{
    r = await api('/etudiants/modifier','POST',{
      id_responsable:U.id_responsable,
      id_etudiant:parseInt($('et-id-edit').value),
      nom, prenom, ine, mail, filiere, semestre
    });
  }
  
  // Utilisation sécurisée pour afficher le toast de succès
  if(r && r.data && r.data.success !== false){
    toast(mode==='add'?'Étudiant ajouté.':'Étudiant modifié.','ok');
    closeModal('m-add-etudiant'); loadEtudiants();
  }else{ setErr('err-m-etudiant', r?.data?.message||'Erreur.'); }
}

/* ═══════════════════════════════════════════════════════════
   RESPONSABLE — SUPERVISEURS
   GET  /superviseurs/liste/{id}
   POST /superviseurs/ajouter
   POST /superviseurs/modifier
   POST /superviseurs/supprimer
═══════════════════════════════════════════════════════════ */
async function loadSuperviseurs(){
  const tb=$('tb-superviseurs');
  tb.innerHTML='<tr><td colspan="4" class="empty">Chargement…</td></tr>';
  const r = await api(`/superviseurs/liste/${U.id_responsable}`);
  if(!Array.isArray(r.data)||!r.data.length){
    tb.innerHTML='<tr><td colspan="4" class="empty">Aucun superviseur enregistré.</td></tr>'; return;
  }
  tb.innerHTML = r.data.map(s=>`<tr>
    <td>${s.nom}</td><td>${s.prenom}</td><td>${s.mail}</td>
    <td class="ac">
      <button class="btn-icon" onclick='ouvrirEditSup(${JSON.stringify(s)})'>✏️</button>
      <button class="btn-icon" onclick="ouvrirDel('superviseur',${s.id_superviseur},'${safe(s.prenom+' '+s.nom)}')">🗑️</button>
    </td></tr>`).join('');
}
function ouvrirAddSup(){
  $('titre-m-sup').textContent='Ajouter un superviseur';
  $('sup-mode').value='add'; $('sup-id-edit').value='';
  ['sup-nom','sup-prenom','sup-mail','sup-pw'].forEach(id=>$(id).value='');
  $('wrap-sup-pw').style.display='none'; // CACHÉ COMME DEMANDÉ
  clearErr('err-m-sup'); openModal('m-add-superviseur');
}
function ouvrirEditSup(s){
  $('titre-m-sup').textContent='Modifier le superviseur';
  $('sup-mode').value='edit'; $('sup-id-edit').value=s.id_superviseur;
  $('sup-nom').value=s.nom; $('sup-prenom').value=s.prenom; $('sup-mail').value=s.mail;
  $('wrap-sup-pw').style.display='none'; clearErr('err-m-sup'); openModal('m-add-superviseur');
}
async function submitSuperviseur(){
  clearErr('err-m-sup');
  const mode   = $('sup-mode').value;
  const nom    = $('sup-nom').value.trim();
  const prenom = $('sup-prenom').value.trim();
  const mail   = $('sup-mail').value.trim();
  if(!nom||!prenom||!mail){ setErr('err-m-sup','Tous les champs sont obligatoires.'); return; }
  if(!validMail(mail)){ setErr('err-m-sup','Email invalide.'); return; }
  let r;
  if(mode==='add'){
    const pw = "Sup" + Math.random().toString(36).slice(-4);
    r = await api('/superviseurs/ajouter','POST',{id_responsable:U.id_responsable,nom,prenom,mail,password:pw});
  }else{
    r = await api('/superviseurs/modifier','POST',{
      id_responsable:U.id_responsable, id_superviseur:parseInt($('sup-id-edit').value), nom,prenom,mail
    });
  }
  if(r && r.data && r.data.success !== false){ 
    toast(mode==='add'?'Superviseur ajouté.':'Superviseur modifié.','ok'); 
    closeModal('m-add-superviseur'); loadSuperviseurs(); 
  }
  else{ setErr('err-m-sup', r?.data?.message||'Erreur.'); }
}

/* ═══════════════════════════════════════════════════════════
   RESPONSABLE — RAPPORTEURS
═══════════════════════════════════════════════════════════ */
async function loadRapporteurs(){
  const tb=$('tb-rapporteurs');
  tb.innerHTML='<tr><td colspan="4" class="empty">Chargement…</td></tr>';
  const r = await api(`/rapporteurs/liste/${U.id_responsable}`);
  if(!Array.isArray(r.data)||!r.data.length){
    tb.innerHTML='<tr><td colspan="4" class="empty">Aucun rapporteur enregistré.</td></tr>'; return;
  }
  tb.innerHTML = r.data.map(rp=>`<tr>
    <td>${rp.nom}</td><td>${rp.prenom}</td><td>${rp.mail}</td>
    <td class="ac">
      <button class="btn-icon" onclick='ouvrirEditRapp(${JSON.stringify(rp)})'>✏️</button>
      <button class="btn-icon" onclick="ouvrirDel('rapporteur',${rp.id_rapporteur},'${safe(rp.prenom+' '+rp.nom)}')">🗑️</button>
    </td></tr>`).join('');
}
function ouvrirAddRapp(){
  $('titre-m-rapp').textContent='Ajouter un rapporteur';
  $('rapp-mode').value='add'; $('rapp-id-edit').value='';
  ['rapp-nom','rapp-prenom','rapp-mail','rapp-pw'].forEach(id=>$(id).value='');
  $('wrap-rapp-pw').style.display='none'; // CACHÉ COMME DEMANDÉ
  clearErr('err-m-rapp'); openModal('m-add-rapporteur');
}
function ouvrirEditRapp(rp){
  $('titre-m-rapp').textContent='Modifier le rapporteur';
  $('rapp-mode').value='edit'; $('rapp-id-edit').value=rp.id_rapporteur;
  $('rapp-nom').value=rp.nom; $('rapp-prenom').value=rp.prenom; $('rapp-mail').value=rp.mail;
  $('wrap-rapp-pw').style.display='none'; clearErr('err-m-rapp'); openModal('m-add-rapporteur');
}
async function submitRapporteur(){
  clearErr('err-m-rapp');
  const mode   = $('rapp-mode').value;
  const nom    = $('rapp-nom').value.trim();
  const prenom = $('rapp-prenom').value.trim();
  const mail   = $('rapp-mail').value.trim();
  if(!nom||!prenom||!mail){ setErr('err-m-rapp','Tous les champs sont obligatoires.'); return; }
  if(!validMail(mail)){ setErr('err-m-rapp','Email invalide.'); return; }
  let r;
  if(mode==='add'){
    const pw = "Rap" + Math.random().toString(36).slice(-4);
    r = await api('/rapporteurs/ajouter','POST',{id_responsable:U.id_responsable,nom,prenom,mail,password:pw});
  }else{
    r = await api('/rapporteurs/modifier','POST',{
      id_responsable:U.id_responsable, id_rapporteur:parseInt($('rapp-id-edit').value), nom,prenom,mail
    });
  }
  if(r && r.data && r.data.success !== false){ 
    toast(mode==='add'?'Rapporteur ajouté.':'Rapporteur modifié.','ok'); 
    closeModal('m-add-rapporteur'); loadRapporteurs(); 
  }
  else{ setErr('err-m-rapp', r?.data?.message||'Erreur.'); }
}

/* ═══════════════════════════════════════════════════════════
   RESPONSABLE — STAGES
   GET  /stages/liste/{id}
   POST /stages/ajouter
   POST /stages/supprimer
   (pas de modifier stage dans route.py — on propose supprimer/recréer)
═══════════════════════════════════════════════════════════ */
async function loadStages(){
  const tb=$('tb-stages');
  tb.innerHTML='<tr><td colspan="8" class="empty">Chargement…</td></tr>';

  // Charger stages + listes pour afficher noms
  const [rSt, rEt, rSup, rRap] = await Promise.all([
    api(`/stages/liste/${U.id_responsable}`),
    api(`/etudiants/liste/${U.id_responsable}`),
    api(`/superviseurs/liste/${U.id_responsable}`),
    api(`/rapporteurs/liste/${U.id_responsable}`),
  ]);
  if(!Array.isArray(rSt.data)||!rSt.data.length){
    tb.innerHTML='<tr><td colspan="8" class="empty">Aucun stage enregistré.</td></tr>'; return;
  }

  // Index pour noms
  const etIdx  = Object.fromEntries((rEt.data||[]).map(e=>[e.id_etudiant,   `${e.prenom} ${e.nom}`]));
  const supIdx = Object.fromEntries((rSup.data||[]).map(s=>[s.id_superviseur,`${s.prenom} ${s.nom}`]));
  const rapIdx = Object.fromEntries((rRap.data||[]).map(r=>[r.id_rapporteur, `${r.prenom} ${r.nom}`]));

  tb.innerHTML = rSt.data.map(st=>`<tr>
    <td>${st.titre}</td>
    <td>${st.entreprise}</td>
    <td>${st.ville}</td>
    <td>${etIdx[st.etudiant]||'#'+st.etudiant}</td>
    <td>${supIdx[st.superviseur]||'#'+st.superviseur}</td>
    <td>${rapIdx[st.rapporteur]||'#'+st.rapporteur}</td>
    <td style="font-size:.78rem;white-space:nowrap">${st.date_debut}<br>${st.date_fin}</td>
    <td class="ac">
      <button class="btn-icon" onclick="ouvrirDel('stage',${st.id_stage},'${safe(st.titre)}')">🗑️</button>
    </td></tr>`).join('');
}

async function ouvrirAddStage(){
  clearErr('err-m-stage');
  // Charger les listes pour les dropdowns
  const [rEt,rSup,rRap] = await Promise.all([
    api(`/etudiants/liste/${U.id_responsable}`),
    api(`/superviseurs/liste/${U.id_responsable}`),
    api(`/rapporteurs/liste/${U.id_responsable}`),
  ]);
  const fill = (selId, items, idField) => {
    const sel=$(selId); sel.innerHTML='<option value="">-- Sélectionner --</option>';
    if(Array.isArray(items)) items.forEach(item=>{
      const o=document.createElement('option');
      o.value=item[idField]; o.textContent=`${item.prenom} ${item.nom}`;
      sel.appendChild(o);
    });
  };
  fill('st-etudiant',   rEt.data,  'id_etudiant');
  fill('st-superviseur', rSup.data, 'id_superviseur');
  fill('st-rapporteur',  rRap.data, 'id_rapporteur');
  ['st-titre','st-entreprise','st-ville','st-debut','st-fin','st-desc'].forEach(id=>$(id).value='');
  $('titre-m-stage').textContent='Ajouter un stage';
  openModal('m-add-stage');
}

async function submitStage(){
  clearErr('err-m-stage');
  const titre       = $('st-titre').value.trim();
  const entreprise  = $('st-entreprise').value.trim();
  const ville       = $('st-ville').value.trim();
  const date_debut  = $('st-debut').value;
  const date_fin    = $('st-fin').value;
  const description = $('st-desc').value.trim()||null;
  const id_etudiant   = parseInt($('st-etudiant').value);
  const id_superviseur= parseInt($('st-superviseur').value);
  const id_rapporteur = parseInt($('st-rapporteur').value);

  if(!titre||!entreprise||!ville||!date_debut||!date_fin){
    setErr('err-m-stage','Champs obligatoires manquants.'); return;
  }
  if(isNaN(id_etudiant)||isNaN(id_superviseur)||isNaN(id_rapporteur)){
    setErr('err-m-stage','Sélectionnez étudiant, superviseur et rapporteur.'); return;
  }
  const r = await api('/stages/ajouter','POST',{
    id_responsable:U.id_responsable, titre, entreprise, ville,
    description, date_debut, date_fin, id_etudiant, id_superviseur, id_rapporteur
  });
  if(r && r.data && r.data.success !== false){ toast('Stage enregistré.','ok'); closeModal('m-add-stage'); loadStages(); }
  else{ setErr('err-m-stage', r?.data?.message||'Erreur.'); }
}


/* ═══════════════════════════════════════════════════════════
   RESPONSABLE — ÉVALUATIONS
   Pour chaque stage → rapport → évaluation
   Le responsable peut consulter + noter (sa propre note)
   Route : POST /evaluation/responsable  { id_rapport, note, avis }
           GET  /responsable/evaluation/{ine}
═══════════════════════════════════════════════════════════ */
async function loadEvalsResp(){
  const tb=$('tb-eval-resp');
  tb.innerHTML='<tr><td colspan="9" class="empty">Chargement…</td></tr>';

  const [rSt, rEt] = await Promise.all([
    api(`/stages/liste/${U.id_responsable}`),
    api(`/etudiants/liste/${U.id_responsable}`),
  ]);
  if(!Array.isArray(rSt.data)||!rSt.data.length){
    tb.innerHTML='<tr><td colspan="9" class="empty">Aucun stage enregistré.</td></tr>'; return;
  }
  const etIdx = Object.fromEntries((rEt.data||[]).map(e=>[e.id_etudiant,e]));

  const rows = await Promise.all(rSt.data.map(async st => {
    const et  = etIdx[st.etudiant];
    const rRp = await api(`/rapport/voir/${st.id_stage}`);
    const rap = rRp.data && rRp.data.id_rapport ? rRp.data : null;

    let eval_data = null;
    if(et) {
      // UTILISATION CORRECTE DE INE
      const rEv = await api(`/responsable/evaluation/${et.ine}`);
      eval_data = rEv.data || null;
    }

    const lienRap = rap
      ? `<a href="${rap.chemin_fichier}" target="_blank" class="btn btn-sm btn-ghost">⬇️ Rapport</a>`
      : '—';

    const btnEval = rap
      ? `<button class="btn btn-sm btn-primary"
           onclick="ouvrirEvalResp('${safe(et?.ine||'')}',${rap.id_rapport},'${safe(rap.chemin_fichier)}','${safe(rap.titre)}')">
           ⭐ Évaluer</button>`
      : '—';

    return `<tr>
      <td>${et?`${et.prenom} ${et.nom}`:'—'}</td>
      <td>${st.titre}</td>
      <td>${lienRap}</td>
      <td>${rap ? badge(rap.status) : '—'}</td>
      <td>${sf(eval_data?.note_superviseur)}</td>
      <td>${sf(eval_data?.note_rapporteur)}</td>
      <td>${sf(eval_data?.note_responsable)}</td>
      <td>${sf(eval_data?.note_finale)}</td>
      <td class="ac">${btnEval}</td>
    </tr>`;
  }));
  tb.innerHTML = rows.join('')||'<tr><td colspan="9" class="empty">Aucune donnée.</td></tr>';
}

function ouvrirEvalResp(ine, id_rapport, chemin, titre_rap){
  evalCtx = { ine, rapport:{ id_rapport, chemin_fichier:chemin, titre:titre_rap } };
  $('eval-resp-rapport-box').innerHTML=`
    <span>📄 <strong>${titre_rap||'—'}</strong></span>
    ${chemin?`<a href="${chemin}" target="_blank" class="btn btn-sm btn-ghost">⬇️ Télécharger</a>`:'<em style="color:var(--muted)">Fichier indisponible</em>'}`;
  $('eval-resp-note').value=''; $('eval-resp-avis').value='';
  clearErr('err-m-eval-resp'); openModal('m-eval-resp');
}
async function submitEvalResponsable(){
  clearErr('err-m-eval-resp');
  const note = parseFloat($('eval-resp-note').value);
  const avis = $('eval-resp-avis').value.trim()||null;
  if(isNaN(note)||note<0||note>20){ setErr('err-m-eval-resp','Note entre 0 et 20 requise.'); return; }
  if(!evalCtx){ setErr('err-m-eval-resp','Contexte perdu.'); return; }
  
  // Utilisation correcte du id_rapport pour la méthode POST
  const r = await api('/evaluation/responsable','POST',{
    id_rapport: evalCtx.rapport.id_rapport,
    note, avis
  });
  if(r && r.data && r.data.success !== false){ toast('Note enregistrée.','ok'); closeModal('m-eval-resp'); evalCtx=null; loadEvalsResp(); }
  else{ setErr('err-m-eval-resp', r?.data?.message||'Erreur.'); }
}

/* ═══════════════════════════════════════════════════════════
   ÉTUDIANT — MON STAGE
   GET /etudiant/stage/{id_etudiant}
═══════════════════════════════════════════════════════════ */
async function loadMonStage(){
  const c = $('card-mon-stage');
  c.innerHTML='<div class="info-placeholder">Chargement…</div>';
  const r = await api(`/etudiant/stage/${U.id_etudiant}`);
  const st = r.data;
  if(!st||!st.id_stage){
    c.innerHTML='<div class="info-placeholder">Aucun stage enregistré pour votre compte.</div>'; return;
  }
  stageCtx = st;
  c.innerHTML=`
    <div class="info-card">
      <h4>Stage</h4>
      <div class="info-row"><span class="lbl">Titre</span><span class="val">${s(st.titre)}</span></div>
      <div class="info-row"><span class="lbl">Entreprise</span><span class="val">${s(st.entreprise)}</span></div>
      <div class="info-row"><span class="lbl">Statut rapport</span><span class="val">${badge(st.rapport_status)}</span></div>
    </div>
    <div class="info-card">
      <h4>Encadrants</h4>
      <div class="info-row"><span class="lbl">Superviseur</span><span class="val">ID #${s(st.superviseur)}</span></div>
      <div class="info-row"><span class="lbl">Rapporteur</span><span class="val">ID #${s(st.rapporteur)}</span></div>
    </div>`;
}

/* ═══════════════════════════════════════════════════════════
   ÉTUDIANT — MON RAPPORT
   GET  /rapport/voir/{id_stage}
   POST /rapport/ajouter   { id_stage, titre, file (via FormData) }
   POST /rapport/valider   { id_stage }  → status = "Terminé"
═══════════════════════════════════════════════════════════ */
async function loadMonRapport(){
  const c = $('card-mon-rapport');
  c.innerHTML='<div class="info-placeholder">Chargement…</div>';

  // S'assurer qu'on a le stage
  if(!stageCtx){
    const rs = await api(`/etudiant/stage/${U.id_etudiant}`);
    stageCtx = rs.data;
  }
  if(!stageCtx||!stageCtx.id_stage){
    c.innerHTML='<div class="info-placeholder">Aucun stage — impossible de déposer un rapport.</div>';
    $('btn-rapport-action').style.display='none'; return;
  }
  $('btn-rapport-action').style.display='';

  const rRp = await api(`/rapport/voir/${stageCtx.id_stage}`);
  const rap  = rRp.data && rRp.data.id_rapport ? rRp.data : null;

  if(!rap){
    $('btn-rapport-action').textContent='+ Déposer';
    c.innerHTML='<div class="info-placeholder">Aucun rapport déposé — cliquez sur "+ Déposer".</div>'; return;
  }

  // Rapport existe
  $('btn-rapport-action').textContent = rap.status==='Terminé' ? '🔒 Rapport terminé' : '✏️ Modifier';
  $('btn-rapport-action').disabled    = rap.status==='Terminé';

  c.innerHTML=`
    <div class="info-card">
      <h4>Mon Rapport</h4>
      <div class="info-row"><span class="lbl">Titre</span><span class="val">${s(rap.titre)}</span></div>
      <div class="info-row"><span class="lbl">Statut</span><span class="val">${badge(rap.status)}</span></div>
      <div class="info-row"><span class="lbl">Fichier</span><span class="val"><a href="${rap.chemin_fichier}" target="_blank">📎 Télécharger</a></span></div>
      ${rap.contenu?`<div class="info-row"><span class="lbl">Résumé</span><span class="val">${rap.contenu}</span></div>`:''}
    </div>
    <div class="info-card" style="align-self:start">
      <h4>Actions</h4>
      ${rap.status!=='Terminé'
        ?`<button class="btn btn-success btn-sm" onclick="validerRapport(${stageCtx.id_stage})">✔ Marquer Terminé</button>
          &nbsp;<button class="btn btn-danger btn-sm" onclick="ouvrirDel('rapport',${stageCtx.id_stage},'votre rapport')">🗑️</button>`
        :'<p style="color:var(--ok);font-size:.85rem">✔ Rapport soumis et verrouillé</p>'}
    </div>`;
}

function ouvrirRapport(){
  clearErr('err-m-rapport');
  $('rp-titre').value=''; 
  $('rp-chemin').value="Cliquez sur 'Déposer' pour choisir votre PDF";
  $('rp-chemin').disabled = true; // Empêche d'écrire dedans manuellement
  $('rp-contenu').value='';
  $('titre-m-rapport').textContent = 'Déposer mon rapport';
  $('btn-submit-rapport').textContent = 'Déposer';
  openModal('m-rapport');
}

// UPLOAD DE FICHIER REEL VIA FORM-DATA
async function submitRapport(){
  clearErr('err-m-rapport');
  const titre  = $('rp-titre').value.trim();
  const contenu= $('rp-contenu').value.trim()||null;
  if(!stageCtx?.id_stage){ setErr('err-m-rapport','Stage introuvable.'); return; }

  // Création du sélecteur de fichier
  let inputFichier = document.createElement('input');
  inputFichier.type = 'file';
  inputFichier.accept = 'application/pdf';

  inputFichier.onchange = async () => {
    const file = inputFichier.files[0];
    if (!file) return;

    $('rp-chemin').value = file.name;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('id_stage', stageCtx.id_stage);
    formData.append('titre', titre || file.name);
    if(contenu) formData.append('contenu', contenu);

    try {
      const res = await fetch(API + '/rapport/ajouter', {
        method: 'POST',
        body: formData // Pas de JSON ici, on envoie le vrai fichier
      });
      const data = await res.json().catch(()=>({}));
      
      if(res.ok && data.success !== false) {
        toast('Rapport enregistré avec succès !', 'ok');
        closeModal('m-rapport');
        loadMonRapport();
      } else {
        setErr('err-m-rapport', data.message || 'Erreur lors du dépôt.');
      }
    } catch (e) {
      setErr('err-m-rapport', 'Erreur réseau avec le serveur.');
    }
  };

  // Déclenche l'ouverture de l'explorateur (PC/Android/iOS)
  inputFichier.click();
}

async function validerRapport(id_stage){
  const r = await api('/rapport/valider','POST',{ id_stage });
  if(r && r.data && r.data.success !== false){ toast('Rapport marqué Terminé — verrouillé.','ok'); loadMonRapport(); }
  else{ toast(r?.data?.message||'Erreur.','err'); }
}

/* ═══════════════════════════════════════════════════════════
   ÉTUDIANT — MON ÉVALUATION
   GET /etudiant/evaluation/{ine}
═══════════════════════════════════════════════════════════ */
async function loadMonEvaluation(){
  const c = $('card-mon-evaluation');
  c.innerHTML='<div class="info-placeholder">Chargement…</div>';
  const r = await api(`/etudiant/evaluation/${U.ine}`);
  const ev = r.data;
  if(!ev||(!ev.note_superviseur&&!ev.note_rapporteur&&!ev.note_responsable)){
    c.innerHTML='<div class="info-placeholder">Aucune évaluation disponible pour le moment.</div>'; return;
  }
  const moy = calcMoy(ev.note_superviseur, ev.note_rapporteur, ev.note_responsable);
  c.innerHTML=`
    <div class="info-card">
      <h4>Notes reçues</h4>
      ${evalRow('Superviseur', ev.note_superviseur, ev.commentaire_superviseur)}
      ${evalRow('Rapporteur',  ev.note_rapporteur,  ev.commentaire_rapporteur)}
      ${evalRow('Responsable', ev.note_responsable, ev.commentaire_responsable)}
    </div>
    <div class="info-card" style="align-self:start;text-align:center">
      <h4>Note finale</h4>
      <div class="note-box">
        <div class="note-lbl">Moyenne générale</div>
        <div class="note-num">${moy!==null?moy.toFixed(2)+'/20':'En attente'}</div>
      </div>
    </div>`;
}
function evalRow(who, note, comment){
  return`<div class="eval-row">
    <span class="eval-row-who">${who}</span>
    <span class="eval-row-note">${note!=null?note+'/20':'Non noté'}</span>
    ${comment?`<div class="eval-row-comment">${comment}</div>`:''}
  </div>`;
}
function calcMoy(...notes){
  const v=notes.filter(n=>n!=null);
  return v.length ? +(v.reduce((a,b)=>a+b,0)/v.length).toFixed(2) : null;
}

/* ═══════════════════════════════════════════════════════════
   SUPERVISEUR — MES ÉTUDIANTS / ÉVALUATION
   GET  /superviseur/stages/{id_superviseur}
   GET  /rapport/voir/{id_stage}
   POST /evaluation/superviseur  { id_rapport, note, avis }
   GET  /superviseur/evaluation/{ine}
═══════════════════════════════════════════════════════════ */
async function loadSupEtudiants(){
  const tb=$('tb-sup-etudiants');
  tb.innerHTML='<tr><td colspan="5" class="empty">Chargement…</td></tr>';
  const r = await api(`/superviseur/stages/${U.id_superviseur}`);
  if(!Array.isArray(r.data)||!r.data.length){
    tb.innerHTML='<tr><td colspan="5" class="empty">Aucun étudiant assigné.</td></tr>'; return;
  }
  // Pour chaque stage on récupère le rapport
  const rows = await Promise.all(r.data.map(async st=>{
    const rRp = await api(`/rapport/voir/${st.id_stage}`);
    const rap = rRp.data && rRp.data.id_rapport ? rRp.data : null;

    // On a besoin de l'INE de l'étudiant — get_stages_superviseur retourne id_etudiant
    // On récupère le rapport via stage, l'INE est dans eval si elle existe
    const btnEval = rap
      ? `<button class="btn btn-sm btn-primary"
           onclick="ouvrirEvalEncadreur('superviseur',${rap.id_rapport},'${safe(rap.chemin_fichier)}','${safe(rap.titre)}',${st.id_stage})">
           ⭐ Évaluer</button>`
      : '—';

    return`<tr>
      <td>—</td>
      <td>Étudiant #${st.etudiant}</td>
      <td>${st.titre}</td>
      <td>${rap ? badge(rap.status) : badge('En attente')}</td>
      <td class="ac">
        ${rap ? `<a href="${rap.chemin_fichier}" target="_blank" class="btn btn-sm btn-ghost">⬇️ Rapport</a>` : ''}
        ${btnEval}
      </td></tr>`;
  }));
  tb.innerHTML = rows.join('');
}

/* ═══════════════════════════════════════════════════════════
   RAPPORTEUR — MES ÉTUDIANTS / ÉVALUATION
   GET  /rapporteur/stages/{id_rapporteur}
   POST /evaluation/rapporteur  { id_rapport, note, avis }
═══════════════════════════════════════════════════════════ */
async function loadRappEtudiants(){
  const tb=$('tb-rapp-etudiants');
  tb.innerHTML='<tr><td colspan="5" class="empty">Chargement…</td></tr>';
  const r = await api(`/rapporteur/stages/${U.id_rapporteur}`);
  if(!Array.isArray(r.data)||!r.data.length){
    tb.innerHTML='<tr><td colspan="5" class="empty">Aucun étudiant assigné.</td></tr>'; return;
  }
  const rows = await Promise.all(r.data.map(async st=>{
    const rRp = await api(`/rapport/voir/${st.id_stage}`);
    const rap = rRp.data && rRp.data.id_rapport ? rRp.data : null;
    const btnEval = rap
      ? `<button class="btn btn-sm btn-primary"
           onclick="ouvrirEvalEncadreur('rapporteur',${rap.id_rapport},'${safe(rap.chemin_fichier)}','${safe(rap.titre)}',${st.id_stage})">
           ⭐ Évaluer</button>`
      : '—';
    return`<tr>
      <td>—</td>
      <td>Étudiant #${st.etudiant}</td>
      <td>${st.titre}</td>
      <td>${rap ? badge(rap.status) : badge('En attente')}</td>
      <td class="ac">
        ${rap ? `<a href="${rap.chemin_fichier}" target="_blank" class="btn btn-sm btn-ghost">⬇️ Rapport</a>` : ''}
        ${btnEval}
      </td></tr>`;
  }));
  tb.innerHTML = rows.join('');
}

/* ─── Modal évaluation encadreur (superviseur ou rapporteur) ─*/
function ouvrirEvalEncadreur(role, id_rapport, chemin, titre_rap, id_stage){
  evalCtx = { role, id_rapport, id_stage, rapport:{ chemin_fichier:chemin, titre:titre_rap } };
  const labels = { superviseur:'🏢 Ma note — Superviseur', rapporteur:'📝 Ma note — Rapporteur' };
  $('eval-bloc-label').textContent = labels[role]||'Ma note';
  $('titre-m-eval').textContent    = role==='superviseur' ? 'Évaluer (Superviseur)' : 'Évaluer (Rapporteur)';
  $('eval-rapport-box').innerHTML  = `
    <span>📄 <strong>${titre_rap||'—'}</strong></span>
    ${chemin?`<a href="${chemin}" target="_blank" class="btn btn-sm btn-ghost">⬇️ Télécharger</a>`:'<em style="color:var(--muted)">Fichier indisponible</em>'}`;
  $('eval-note').value=''; $('eval-avis').value='';
  clearErr('err-m-eval'); openModal('m-evaluer');
}

async function submitEvaluation(){
  clearErr('err-m-eval');
  const note = parseFloat($('eval-note').value);
  const avis = $('eval-avis').value.trim()||null;
  if(isNaN(note)||note<0||note>20){ setErr('err-m-eval','Note entre 0 et 20 requise.'); return; }
  if(!evalCtx){ setErr('err-m-eval','Contexte perdu — réessayez.'); return; }

  const path = evalCtx.role==='superviseur' ? '/evaluation/superviseur' : '/evaluation/rapporteur';
  const r = await api(path,'POST',{ id_rapport:evalCtx.id_rapport, note, avis });

  if(r && r.data && r.data.success !== false){
    toast('Note enregistrée.','ok'); closeModal('m-evaluer'); evalCtx=null;
    if(U.role==='superviseur') loadSupEtudiants();
    else loadRappEtudiants();
  }else{ setErr('err-m-eval', r?.data?.message||'Erreur.'); }
}

/* ═══════════════════════════════════════════════════════════
   SUPPRESSION GÉNÉRIQUE
   POST /etudiants/supprimer    { id_responsable, id_etudiant }
   POST /superviseurs/supprimer { id_responsable, id_superviseur }
   POST /rapporteurs/supprimer  { id_responsable, id_rapporteur }
   POST /stages/supprimer       { id_responsable, id_stage }
   (rapport : pas de route DELETE dans route.py — on utilise statut)
═══════════════════════════════════════════════════════════ */
function ouvrirDel(type, id, label){
  delCtx={type,id,label};
  $('del-msg').textContent=`Voulez-vous vraiment supprimer : « ${label} » ?`;
  openModal('m-delete');
}
async function confirmDelete(){
  if(!delCtx) return;
  const {type,id}=delCtx;
  let r;
  if(type==='etudiant')
    r = await api('/etudiants/supprimer','POST',{id_responsable:U.id_responsable, id_etudiant:id});
  else if(type==='superviseur')
    r = await api('/superviseurs/supprimer','POST',{id_responsable:U.id_responsable, id_superviseur:id});
  else if(type==='rapporteur')
    r = await api('/rapporteurs/supprimer','POST',{id_responsable:U.id_responsable, id_rapporteur:id});
  else if(type==='stage')
    r = await api('/stages/supprimer','POST',{id_responsable:U.id_responsable, id_stage:id});
  else if(type==='rapport'){
    // Pas de DELETE rapport → on passe le statut à "Refusé"
    r = await api('/rapport/statut','POST',{id_stage:id, status:'Refusé'});
  }

  if(r && r.data && r.data.success !== false){
    toast('Supprimé avec succès.','ok'); closeModal('m-delete'); delCtx=null;
    const act=document.querySelector('.section.active');
    if(act) loadSection(act.id);
  }else{
    toast(r?.data?.message||'Erreur de suppression.','err');
  }
}

/* ═══════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', ()=> showPage('page-login'));