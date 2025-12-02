/* pscript.js
   Full client-side app logic for Student Profile dashboard.
   - No Firebase JS here. Backend endpoints used:
     /api/profile/save, /api/profile/load,
     /api/timetable/save, /api/timetable/load,
     /api/goals/save, /api/goals/load
   - LocalStorage still used as offline fallback & UX speed.
   - Profile image is uploaded as dataURL (base64) and sent to backend.
*/

/* ---------------- small utilities ---------------- */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
function saveJSON(k, v){ localStorage.setItem(k, JSON.stringify(v)); }
function loadJSON(k, f){ try{ const v = JSON.parse(localStorage.getItem(k)); return v==null?f:v; }catch(e){return f;} }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* ---------------- DOM refs ---------------- */
const imageUpload = $('#imageUpload');
const profilePic = $('#profilePic');
const navAvatar = $('#navAvatar');
const modalAvatar = $('#modalAvatar');

const userName = $('#userName');
const userEmail = $('#userEmail');
const userCourse = $('#userCourse');
const saveProfileBtn = $('#saveProfile');
const resetProfileBtn = $('#resetProfile');

const table = $('#timetable');

const planner = $('#planner');
const plannerExport = $('#plannerExport');

const goalInput = $('#goalInput');
const goalList = $('#goalList');
const addGoalBtn = $('#addGoal');

const skillsKey = 'skills_v2';
let skills = loadJSON(skillsKey, []);

const badgeContainer = $('#badgeContainer');
const unlockModal = $('#unlockModal');
const modalBadgeName = $('#modalBadgeName');
const closeModalBtn = $('#closeModal');
const confettiCanvas = $('#confettiCanvas');

const xpKey = 'user_xp_v1';
let xp = loadJSON('xp', 0);
let level = loadJSON('level', 1);

/* ---------------- Sidebar toggle ---------------- */
const toggle = $('#menuToggle'), sidebar = $('#sidebar');
if(toggle && sidebar){
  toggle.addEventListener('click', ()=> {
    sidebar.classList.toggle('active');
    toggle.textContent = sidebar.classList.contains('active') ? '✖' : '☰';
  });
}

/* ---------------- Profile: local apply / save / server sync ---------------- */
function applyProfileLocal(p){
  if(!p) return;
  profilePic.src = p.pic || profilePic.src;
  navAvatar.src = p.pic || navAvatar.src;
  if(modalAvatar) modalAvatar.src = p.pic || modalAvatar.src;
  userName.value = p.name || '';
  userEmail.value = p.email || '';
  userCourse.value = p.course || '';
}

function localSaveProfile(){
  const p = { name: userName.value, email: userEmail.value, course: userCourse.value, pic: profilePic.src };
  saveJSON('profile', p);
  applyProfileLocal(p);
}

/* Convert a File to dataURL (base64) */
function fileToDataURL(file){
  return new Promise((res, rej)=>{
    const fr = new FileReader();
    fr.onload = ()=> res(fr.result);
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
}

/* Server save profile */
async function serverSaveProfile(){
  const payload = {
    name: userName.value.trim(),
    email: userEmail.value.trim(),
    course: userCourse.value.trim(),
    pic: profilePic.src
  };
  try{
    const r = await fetch('/api/profile/save', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    const j = await r.json();
    if(r.ok) {
      // SUCCESS: persist locally + inform user
      saveJSON('profile', payload);
      applyProfileLocal(payload);
      alert('Profile saved to server ✅');
    } else {
      // FAILURE: show server-provided message if available
      console.warn('serverSaveProfile failed', j);
      const msg = j && j.error ? j.error : 'Server save failed';
      alert('Profile NOT saved: ' + msg);
    }
  }catch(e){
    console.warn('serverSaveProfile error', e);
    alert('Network error while saving profile to server.');
  }
}

/* Server load profile */
async function serverLoadProfile(){
  try{
    const r = await fetch('/api/profile/load');
    const j = await r.json();
    if(r.ok && j.profile){
      applyProfileLocal(j.profile);
      saveJSON('profile', j.profile);
    } else {
      // fallback to local storage
      applyProfileLocal(loadJSON('profile', { name:'', email:'', course:'', pic: profilePic.src }));
    }
  }catch(e){
    // offline fallback
    console.warn('serverLoadProfile error', e);
    applyProfileLocal(loadJSON('profile', { name:'', email:'', course:'', pic: profilePic.src }));
  }
}

/* Hook image upload: convert file to dataURL, set src, and save */
if(imageUpload){
  imageUpload.addEventListener('change', async (e)=>{
    const f = e.target.files[0];
    if(!f) return;
    try{
      const dataUrl = await fileToDataURL(f);
      profilePic.src = dataUrl;
      navAvatar.src = dataUrl;
      if(modalAvatar) modalAvatar.src = dataUrl;
      localSaveProfile();
      // push to server but don't block UI
      serverSaveProfile();
    }catch(err){
      console.warn('image read failed', err);
    }
  });
}

if(saveProfileBtn){
  saveProfileBtn.addEventListener('click', ()=>{
    localSaveProfile();
    serverSaveProfile();
    // user gets explicit server feedback from serverSaveProfile() now
  });
}
if(resetProfileBtn){
  resetProfileBtn.addEventListener('click', ()=>{
    localStorage.removeItem('profile');
    location.reload();
  });
}

/* ---------------- TIMETABLE - local + server ---------------- */
function getTimetableArray(){
  const rows = [];
  for(let r of table.rows){
    rows.push(Array.from(r.cells).map(c => c.innerText));
  }
  return rows;
}

function setTimetableFromArray(arr){
  // clear
  while(table.rows.length) table.deleteRow(0);
  arr.forEach(row => {
    const r = table.insertRow(-1);
    row.forEach(cell => {
      const c = r.insertCell(-1);
      c.contentEditable = true;
      c.innerText = cell;
    });
  });
  saveJSON('timetable', arr);
}

/* Save timetable to server */
async function serverSaveTimetable(){
  const rows = getTimetableArray();
  try{
    const r = await fetch('/api/timetable/save', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ timetable: rows })
    });
    if(r.ok){
      saveJSON('timetable', rows);
    } else {
      const j = await r.json();
      console.warn('timetable save failed', j);
    }
  }catch(e){
    console.warn('timetable save error', e);
  }
}

/* Load timetable from server */
async function serverLoadTimetable(){
  try{
    const r = await fetch('/api/timetable/load');
    const j = await r.json();
    if(r.ok && Array.isArray(j.timetable) && j.timetable.length){
      setTimetableFromArray(j.timetable);
    } else {
      // fallback to local
      const t = loadJSON('timetable', [
        ['Day','Subject','Time'],
        ['Mon','Math','10 AM']
      ]);
      setTimetableFromArray(t);
    }
  }catch(e){
    const t = loadJSON('timetable', [
      ['Day','Subject','Time'],
      ['Mon','Math','10 AM']
    ]);
    setTimetableFromArray(t);
  }
}

/* Auto-add "Save timetable" button (UI) */
(function addTimetableSaveBtn(){
  const ctrl = document.querySelector('#timetable-sec .controls-row');
  if(!ctrl) return;
  const btn = document.createElement('button');
  btn.className = 'neon-btn primary';
  btn.id = 'saveTableBtn';
  btn.innerText = 'Save Timetable (Server)';
  btn.onclick = ()=> {
    serverSaveTimetable();
    alert('Attempted to save timetable to server.');
  };
  ctrl.appendChild(btn);
})();

/* Planner export (existing behavior) */
if(plannerExport){
  plannerExport.addEventListener('click', () => {
    const rows = [];
    for(let r of planner.rows){
      const cells = Array.from(r.cells).map(c=> '"' + c.innerText.replace(/"/g,'""') + '"');
      rows.push(cells.join(','));
    }
    const blob = new Blob([rows.join('\n')], { type:'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'planner.csv'; a.click();
    // mark badge: playlist will handle badge unlocking elsewhere when save occurs
  });
};

/* ---------------- GOALS - local + server ---------------- */
function saveTasksLocal(){
  const tasks = Array.from(goalList.children).map(li=> li.querySelector('.goal-text').innerText );
  saveJSON('tasks', tasks);
}

async function serverSaveGoals(){
  const goals = Array.from(goalList.children).map(li=> li.querySelector('.goal-text').innerText );
  try{
    const r = await fetch('/api/goals/save', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ goals })
    });
    if(r.ok) saveJSON('tasks', goals);
    else {
      const j = await r.json(); console.warn('serverSaveGoals failed', j);
    }
  }catch(e){
    console.warn('serverSaveGoals error', e);
  }
}

/* Render goal list from array */
function renderGoalList(tasks){
  goalList.innerHTML = '';
  tasks.forEach(t=>{
    const li = document.createElement('li');
    li.innerHTML = `<div class="goal-text">${escapeHtml(t)}</div>
      <div>
        <button class="neon-btn primary complete">✔</button>
        <button class="neon-btn ghost delete">✖</button>
      </div>`;
    goalList.appendChild(li);
    li.querySelector('.complete').onclick = ()=> {
      addXP(20 + Math.floor(Math.random()*16));
      const u = getUnlockedCount();
      if(u < badgeData.length){ unlockBadge(u); recordBadgeTimestamp(u); showUnlockModal(badgeData[u].name); }
      li.remove();
      saveTasksLocal();
      serverSaveGoals();
      recordTaskCompletion();
    };
    li.querySelector('.delete').onclick = ()=> { li.remove(); saveTasksLocal(); serverSaveGoals(); };
  });
}

/* Load goals from server then local fallback */
async function serverLoadGoals(){
  try{
    const r = await fetch('/api/goals/load');
    const j = await r.json();
    if(r.ok && Array.isArray(j.goals)){
      renderGoalList(j.goals);
      saveJSON('tasks', j.goals);
    } else {
      renderGoalList(loadJSON('tasks', []));
    }
  }catch(e){
    renderGoalList(loadJSON('tasks', []));
  }
}

/* Hook add goal */
if(addGoalBtn){
  addGoalBtn.onclick = ()=>{
    const text = goalInput.value.trim();
    if(!text) return;
    goalInput.value = '';
    const arr = loadJSON('tasks', []);
    arr.push(text);
    renderGoalList(arr);
    saveTasksLocal();
    serverSaveGoals();
  };
}

/* ---------------- XP / LEVEL helpers ---------------- */
function xpForLevel(l){ return 100 + (l-1)*60 + Math.floor((l-1)*(l-2)/2)*20; }
function updateXPDisplay(){
  const next = xpForLevel(level+1);
  const base = xpForLevel(level);
  const progress = Math.max(0, Math.min(1, (xp-base)/(next-base)));
  $('#xpBar').style.width = (progress*100)+'%';
  $('#levelText').innerText = 'Lv '+level;
  $('#xpText').innerText = xp+' / '+next+' XP';
  saveJSON('xp', xp); saveJSON('level', level);
}
updateXPDisplay();
function addXP(amount){ xp += amount; while(xp >= xpForLevel(level+1)) level++; updateXPDisplay(); }

/* ---------------- small visual effects (confetti / sound) ---------------- */
const confettiCtx = confettiCanvas.getContext ? confettiCanvas.getContext('2d') : null;
function playUnlockSound(){ try{ const ctx = new (window.AudioContext || window.webkitAudioContext)(); const o = ctx.createOscillator(), g = ctx.createGain(); o.type='sine'; o.frequency.setValueAtTime(880, ctx.currentTime); o.connect(g); g.connect(ctx.destination); g.gain.setValueAtTime(0, ctx.currentTime); g.gain.linearRampToValueAtTime(0.08, ctx.currentTime+0.01); o.start(); g.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime+0.5); o.stop(ctx.currentTime+0.5);}catch(e){}}
function createSparkles(target){ for(let i=0;i<6;i++){ const s=document.createElement('span'); s.style.position='absolute'; s.style.left=(10+Math.random()*80)+'%'; s.style.top=(10+Math.random()*60)+'%'; s.style.width=s.style.height=(6+Math.random()*10)+'px'; s.style.background='radial-gradient(circle,#fff,#ffd400)'; s.style.opacity='0'; target.appendChild(s); setTimeout(()=>{ s.style.transition='all .6s cubic-bezier(.2,.9,.2,1)'; s.style.opacity=1; s.style.transform='translateY(-18px) scale(1)'; },20+i*40); setTimeout(()=>{ s.style.opacity=0; s.style.transform='translateY(-28px) scale(.6)'; },700+i*30); setTimeout(()=>s.remove(),1200); } }
function runConfetti(duration=1400){ if(!confettiCtx) return; confettiCanvas.width = unlockModal.clientWidth; confettiCanvas.height = unlockModal.clientHeight; const W=confettiCanvas.width,H=confettiCanvas.height; const colors=['#FFD400','#FF6A00','#FF8A65','#FF3D81','#6A11CB','#2575FC']; let pieces=[]; for(let i=0;i<80;i++){ pieces.push({x:Math.random()*W,y:Math.random()*H*0.6+H*0.2,vx:(Math.random()-0.5)*6,vy:-(Math.random()*8+2),size:6+Math.random()*8,color:colors[Math.floor(Math.random()*colors.length)],rot:Math.random()*360,rVel:(Math.random()-0.5)*12}); } let t0=performance.now(); function frame(now){ confettiCtx.clearRect(0,0,W,H); for(let p of pieces){ p.x+=p.vx; p.y+=p.vy; p.vy+=0.28; p.rot+=p.rVel; confettiCtx.save(); confettiCtx.translate(p.x,p.y); confettiCtx.rotate(p.rot*Math.PI/180); confettiCtx.fillStyle=p.color; confettiCtx.fillRect(-p.size/2,-p.size/2,p.size,p.size/2); confettiCtx.restore(); } if(now-t0<duration) requestAnimationFrame(frame); else confettiCtx.clearRect(0,0,W,H); } requestAnimationFrame(frame); }

/* Unlock modal show/hide */
if(closeModalBtn) closeModalBtn.addEventListener('click', ()=>{ unlockModal.classList.remove('show'); unlockModal.setAttribute('aria-hidden','true'); if(confettiCtx) confettiCtx.clearRect(0,0,confettiCanvas.width,confettiCanvas.height); });
function showUnlockModal(name){
  modalBadgeName.innerText = name;
  unlockModal.classList.add('show'); unlockModal.setAttribute('aria-hidden','false');
  playUnlockSound(); runConfetti(1600);
  setTimeout(()=>{ closeModalBtn.click(); }, 2200);
}

/* ---------------- BADGES (rendering + unlock functions) ---------------- */
const badgeData = [
  { id: 'b0', name: 'Starter', hint: 'Create your first task' },
  { id: 'b1', name: 'Persistent', hint: 'Complete 5 tasks' },
  { id: 'b2', name: 'Fast Learner', hint: 'Add 3 skills' },
  { id: 'b3', name: 'Focused', hint: 'Complete a 25 min Pomodoro' },
  { id: 'b4', name: 'Task Master', hint: 'Complete 10 tasks' },
  { id: 'b5', name: 'Hard Worker', hint: 'Finish 3 Pomodoros' },
  { id: 'b6', name: 'Goal Crusher', hint: 'Complete 15 tasks' },
  { id: 'b7', name: 'Discipline Pro', hint: 'Complete tasks 7 days in a row' },
  { id: 'b8', name: 'Smart Worker', hint: 'Add a weekly planner entry' },
  { id: 'b9', name: 'Daily Achiever', hint: 'Complete a task every day for 3 days' },
  { id: 'b10', name: 'Time Saver', hint: 'Finish 5 Pomodoros' },
  { id: 'b11', name: 'Consistency King', hint: 'Complete 30 tasks' },
  { id: 'b12', name: 'Organised', hint: 'Create 5 planner slots' },
  { id: 'b13', name: 'Sharp Mind', hint: 'Reach Level 3' },
  { id: 'b14', name: 'Coder', hint: 'Add a "Coding" skill and mark it 60%+' },
  { id: 'b15', name: 'Debugger', hint: 'Edit a skill and save it' },
  { id: 'b16', name: 'Planner', hint: 'Export your planner CSV' },
  { id: 'b17', name: 'Top Performer', hint: 'Reach Level 5' },
  { id: 'b18', name: 'Champion', hint: 'Complete 50 tasks' },
  { id: 'b19', name: 'Legend', hint: 'Unlock all other badges' }
];

function metallicIconSVG(index){
  const gid = 'mg' + index;
  const accent1 = '#8570f2', accent2 = '#c68bff';
  return `
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="${gid}-g1" x1="0" x2="1">
          <stop offset="0" stop-color="${accent1}" stop-opacity="1"/>
          <stop offset="1" stop-color="${accent2}" stop-opacity="1"/>
        </linearGradient>
        <radialGradient id="${gid}-r1" cx="30%" cy="20%" r="80%">
          <stop offset="0" stop-color="#fff8d6" stop-opacity="0.9"/>
          <stop offset="1" stop-color="${accent2}" stop-opacity="0.18"/>
        </radialGradient>
        <filter id="${gid}-s" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#7a56f0" flood-opacity="0.22"/>
        </filter>
      </defs>

      <circle cx="32" cy="32" r="30" fill="url(#${gid}-r1)" />
      <path d="M32 8 L38.5 24 L56 26 L42 38 L46 56 L32 46 L18 56 L22 38 L8 26 L25.5 24 Z"
            fill="url(#${gid}-g1)" stroke="#fff5" stroke-opacity="0.08" stroke-width="0.6" filter="url(#${gid}-s)"/>
      <path d="M13 27 C22 25, 28 20, 32 18" stroke="rgba(255,255,255,0.8)" stroke-width="1.6" fill="none" opacity="0.65"/>
    </svg>
  `;
}

function renderBadgesWithIcons(){
  const container = badgeContainer;
  if(!container) return;
  container.innerHTML = '';
  const unlocked = loadJSON('badges', []);
  badgeData.forEach((b,i)=>{
    const card = document.createElement('div');
    card.className = 'badge ' + (unlocked.includes(i) ? 'unlocked' : 'locked');
    card.id = 'badge-' + i;
    card.setAttribute('role','listitem');
    card.setAttribute('tabindex','0');
    card.dataset.index = i;
    card.innerHTML = `
      <div class="icon-wrap" aria-hidden="true">${metallicIconSVG(i)}</div>
      <div class="label">${b.name}</div>
      <div class="tooltip" role="tooltip" aria-hidden="true">
        <h4>${b.name}</h4>
        <p>${b.hint}</p>
      </div>
    `;
    card.addEventListener('click', ()=>{ if(card.classList.contains('unlocked')){ modalBadgeName.innerText = b.name; showUnlockModal(b.name); } else { card.animate([{transform:'scale(1)'},{transform:'scale(1.04)'},{transform:'scale(1)'}],{duration:320,easing:'cubic-bezier(.2,.9,.2,1)'}); } });
    card.addEventListener('mouseenter', ()=> { const tt = card.querySelector('.tooltip'); if(tt) tt.setAttribute('aria-hidden','false'); });
    card.addEventListener('mouseleave', ()=> { const tt = card.querySelector('.tooltip'); if(tt) tt.setAttribute('aria-hidden','true'); });
    card.addEventListener('focusin', ()=> { const tt = card.querySelector('.tooltip'); if(tt) tt.setAttribute('aria-hidden','false'); });
    card.addEventListener('focusout', ()=> { const tt = card.querySelector('.tooltip'); if(tt) tt.setAttribute('aria-hidden','true'); });
    container.appendChild(card);
  });
}
renderBadgesWithIcons();

function unlockBadgeByIndex(i){
  const idx = Number(i);
  const el = document.getElementById('badge-'+idx);
  if(!el || el.classList.contains('unlocked')) return;
  el.classList.remove('locked'); el.classList.add('unlocked');
  createSparkles(el); playUnlockSound();
  const unlocked = loadJSON('badges', []);
  if(!unlocked.includes(idx)){ unlocked.push(idx); saveJSON('badges', unlocked); }
  recordBadgeTimestamp(idx);
  renderGallery(); // update gallery if open
  showUnlockModal(badgeData[idx].name);
}
function unlockBadge(i){ unlockBadgeByIndex(i); }

/* ---------------- Skills CRUD (modal) ---------------- */
const skillsList = $('#skillsList'), skillModal = $('#skillModal'); const skillModalTitle = $('#skillModalTitle');
const skillName = $('#skillName'), skillPercent = $('#skillPercent'); const skillSave = $('#skillSave'), skillCancel = $('#skillCancel');
let editingId = null;

function renderSkills(){
  skillsList.innerHTML = '';
  if(skills.length === 0){ const hint = document.createElement('div'); hint.className='muted'; hint.style.opacity='.7'; hint.innerText='No skills yet — click "Add Skill".'; skillsList.appendChild(hint); return; }
  skills.forEach((s,idx)=> {
    const item = document.createElement('div'); item.className='skill-item'; item.dataset.id=s.id;
    item.innerHTML = `<div class="skill-left"><div class="skill-meta"><div class="skill-name">${escapeHtml(s.name)}</div><div class="skill-percent">${s.pct}%</div></div><div class="skill-bar-wrap"><div class="skill-bar"><div class="skill-fill" style="width:0%"></div></div></div></div><div class="skill-controls"><button class="neon-btn primary edit">Edit</button><button class="neon-btn secondary up">▲</button><button class="neon-btn secondary down">▼</button><button class="neon-btn ghost delete">Delete</button></div>`;
    skillsList.appendChild(item);
    const fill = item.querySelector('.skill-fill'); setTimeout(()=> fill.style.width = s.pct + '%', 50);
    item.querySelector('.edit').onclick = ()=> openEditSkill(s.id);
    item.querySelector('.delete').onclick = ()=> { if(confirm('Delete skill?')){ skills = skills.filter(x=>x.id!==s.id); saveJSON(skillsKey,skills); renderSkills(); } };
    item.querySelector('.up').onclick = ()=> { if(idx===0) return; [skills[idx-1],skills[idx]]=[skills[idx],skills[idx-1]]; saveJSON(skillsKey,skills); renderSkills(); };
    item.querySelector('.down').onclick = ()=> { if(idx===skills.length-1) return; [skills[idx+1],skills[idx]]=[skills[idx],skills[idx+1]]; saveJSON(skillsKey,skills); renderSkills(); };
  });
}
function openAddSkill(){ editingId=null; skillModalTitle.innerText='Add Skill'; skillName.value=''; skillPercent.value=75; openModal(skillModal); }
function openEditSkill(id){ const s = skills.find(x=>x.id===id); if(!s) return; editingId=id; skillModalTitle.innerText='Edit Skill'; skillName.value=s.name; skillPercent.value=s.pct; openModal(skillModal); }
$('#openAddSkill').onclick = openAddSkill;
skillCancel.onclick = ()=> closeModal(skillModal);
skillSave.onclick = ()=> {
  const name = skillName.value.trim(); let pct = Number(skillPercent.value); pct = Math.max(0,Math.min(100, isNaN(pct)?0:pct));
  if(!name){ alert('Enter skill name'); return; }
  if(editingId){ const idx = skills.findIndex(x=>x.id===editingId); if(idx>=0){ skills[idx].name=name; skills[idx].pct=pct; } }
  else { const id='s_'+Date.now()+Math.floor(Math.random()*999); skills.push({id,name,pct}); }
  saveJSON(skillsKey,skills); renderSkills(); closeModal(skillModal);
};
function openModal(el){ el.classList.add('show'); el.setAttribute('aria-hidden','false'); }
function closeModal(el){ el.classList.remove('show'); el.setAttribute('aria-hidden','true'); }
renderSkills();
$('#saveAll')?.addEventListener('click', ()=> { saveJSON(skillsKey,skills); alert('Saved'); });

/* ---------------- Study Charts (Chart.js) ---------------- */
let pieChart, lineChart;
function generateStudyCharts(){
  if(pieChart) pieChart.destroy(); if(lineChart) lineChart.destroy();
  const pieCtx = document.getElementById('performancePie').getContext('2d');
  const colors = [getComputedStyle(document.documentElement).getPropertyValue('--accent1').trim()||'#8570f2', '#9f84f7', '#c7b5ff'];
  pieChart = new Chart(pieCtx, { type:'pie', data:{ labels:['Assignments','Projects','Tests'], datasets:[{ data:[Math.floor(Math.random()*40)+30, Math.floor(Math.random()*30)+20, Math.floor(Math.random()*30)+20], backgroundColor:colors, borderColor:'#fff', borderWidth:2 }]}, options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'bottom'}} } });
  const lineCtx = document.getElementById('performanceLine').getContext('2d');
  lineChart = new Chart(lineCtx, { type:'line', data:{ labels:['Jan','Feb','Mar','Apr','May','Jun'], datasets:[{ label:'Performance', data:[60+Math.random()*20,70+Math.random()*20,65+Math.random()*20,75+Math.random()*20,80+Math.random()*20,85+Math.random()*20], borderColor:getComputedStyle(document.documentElement).getPropertyValue('--accent1').trim()||'#8570f2', backgroundColor:'rgba(133,112,242,0.18)', fill:true, tension:0.4, pointRadius:5 }] }, options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{y:{min:40,max:100}} } });
}
generateStudyCharts();
$('#refreshStats')?.addEventListener('click', generateStudyCharts);

/* ---------------- Pomodoro ---------------- */
let workMinsInput = $('#workMins'), breakMinsInput = $('#breakMins'), timerDisplay = $('#timerDisplay'), sessionCountEl = $('#sessionCount');
let pomStart = $('#pomStart'), pomPause = $('#pomPause'), pomReset = $('#pomReset');
let timer=null, remaining=25*60, isWork=true, sessions=0, running=false;
function msToTime(sec){ const m=Math.floor(sec/60), s=sec%60; return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; }
function setRemaining(){ remaining = parseInt(workMinsInput.value||25)*60; isWork=true; timerDisplay.innerText = msToTime(remaining); }
setRemaining();
pomStart?.addEventListener('click', ()=>{ if(running) return; running=true; runTimer(); });
pomPause?.addEventListener('click', ()=>{ running=false; clearInterval(timer); timer=null; });
pomReset?.addEventListener('click', ()=>{ running=false; clearInterval(timer); timer=null; sessions=0; sessionCountEl.innerText='Sessions: 0'; setRemaining(); });
function runTimer(){
  timer = setInterval(()=>{
    if(!running){ clearInterval(timer); return; }
    if(remaining<=0){
      if(isWork){ sessions++; sessionCountEl.innerText = 'Sessions: '+sessions; addXP(35); const u = getUnlockedCount(); if(u < badgeData.length){ unlockBadge(u); recordBadgeTimestamp(u); } remaining = parseInt(breakMinsInput.value||5)*60; isWork=false; playUnlockSound(); recordTaskCompletion(); }
      else { remaining = parseInt(workMinsInput.value||25)*60; isWork=true; }
    } else remaining--;
    timerDisplay.innerText = msToTime(remaining);
  },1000);
}

/* ---------------- STREAK ---------------- */
const STREAK_KEY = 'user_streak_v1';
function loadStreak(){ return loadJSON(STREAK_KEY, { lastDate: null, current: 0, longest: 0, history: {} }); }
function saveStreak(s){ saveJSON(STREAK_KEY, s); }
function renderStreakUI(){
  const s = loadStreak();
  const container = document.getElementById('streakDays');
  if(!container) return;
  container.innerHTML = '';
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  const diff = (day + 6) % 7;
  monday.setDate(now.getDate() - diff);
  for(let i=0;i<7;i++){
    const d = new Date(monday); d.setDate(monday.getDate() + i);
    const key = d.toISOString().slice(0,10);
    const active = !!s.history[key];
    const weekday = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i];
    const cell = document.createElement('div'); cell.className = 'streak-cell ' + (active ? 'active' : 'inactive');
    cell.innerHTML = `<div class="streak-day">${weekday}</div><div class="streak-flame" data-day="${key}"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2s4 3.6 4 7c0 3.1-2 5-4 7-2-2-4-3.9-4-7 0-3.4 4-7 4-7z" fill="url(#flameGrad)"/><defs><linearGradient id="flameGrad" x1="0" x2="1"><stop offset="0" stop-color="#fff2a6"/><stop offset="1" stop-color="#c68bff"/></linearGradient></defs></svg></div>`;
    container.appendChild(cell);
  }
  $('#streakCurrent').innerText = s.current;
  $('#streakLongest').innerText = s.longest;
}
function recordTaskCompletion(){
  const s = loadStreak();
  const today = new Date(); today.setHours(0,0,0,0);
  const todayKey = today.toISOString().slice(0,10);
  const lastKey = s.lastDate ? s.lastDate.slice(0,10) : null;
  if(lastKey === todayKey) return false;
  let increment = 1;
  if(s.lastDate){
    const last = new Date(s.lastDate); last.setHours(0,0,0,0);
    const diffDays = Math.round((today - last) / (1000*60*60*24));
    if(diffDays === 1) increment = s.current + 1;
    else increment = 1;
  }
  s.current = increment;
  s.lastDate = today.toISOString();
  s.history[todayKey] = true;
  if(s.current > (s.longest||0)) s.longest = s.current;
  saveStreak(s);
  renderStreakUI();
  const milestoneMap = { 3: 9, 7: 7, 14: 11, 30: 19 };
  if(milestoneMap[s.current]){ const idx = milestoneMap[s.current]; unlockBadge(idx); recordBadgeTimestamp(idx); }
  return true;
}
$('#manualCheckIn')?.addEventListener('click', ()=> { const ok = recordTaskCompletion(); if(ok) alert('Marked today as complete — streak updated!'); else alert('You already checked in today.'); });
function attachTaskCompletionHook(){ document.addEventListener('click', (e)=>{ const el = e.target; if(el && el.classList && el.classList.contains('complete')){ setTimeout(()=>{ recordTaskCompletion(); },80); } }); }
attachTaskCompletionHook();
renderStreakUI();

/* ---------------- BADGE GALLERY / Timestamps ---------------- */
function recordBadgeTimestamp(index){ const m = loadJSON('badgeUnlockTimes', {}); if(!m[index]) m[index] = (new Date()).toISOString(); saveJSON('badgeUnlockTimes', m); }
let currentGalleryIndex = 0;
function renderGallery(){
  const grid = $('#galleryGrid'); if(!grid) return;
  grid.innerHTML = '';
  const unlocked = loadJSON('badges', []);
  badgeData.forEach((b,i)=>{
    const tile = document.createElement('div'); tile.className = 'badge ' + (unlocked.includes(i)? 'unlocked': 'locked'); tile.dataset.index = i;
    tile.innerHTML = `<div class="icon-wrap">${metallicIconSVG(i)}</div><div class="label">${b.name}</div>`;
    tile.onclick = ()=> showBadgeInGallery(i);
    grid.appendChild(tile);
  });
  showBadgeInGallery(currentGalleryIndex);
}
function showBadgeInGallery(index){
  currentGalleryIndex = index;
  const b = badgeData[index];
  $('#galleryBadgeName').innerText = b.name;
  $('#galleryBadgeHint').innerText = b.hint;
  $('#galleryBadgeIcon').innerHTML = metallicIconSVG(index).replace(/width="64"/g,'width="140"').replace(/height="64"/g,'height="140"');
  const times = loadJSON('badgeUnlockTimes', {}); const t = times[index] ? new Date(times[index]).toLocaleString() : null;
  $('#galleryBadgeTime').innerText = t ? `Unlocked: ${t}` : 'Locked';
  $$('#galleryGrid .badge').forEach(el => el.classList.toggle('selected', Number(el.dataset.index) === index));
}
$('#viewBadgeGalleryBtn')?.addEventListener('click', ()=> { renderGallery(); $('#badgeGalleryModal').classList.add('show'); $('#badgeGalleryModal').setAttribute('aria-hidden','false'); });
$('#closeGallery')?.addEventListener('click', ()=> { $('#badgeGalleryModal').classList.remove('show'); $('#badgeGalleryModal').setAttribute('aria-hidden','true'); });
$('#galleryCloseBtn')?.addEventListener('click', ()=> $('#closeGallery')?.click());
$('#prevBadge')?.addEventListener('click', ()=> { currentGalleryIndex = (currentGalleryIndex - 1 + badgeData.length) % badgeData.length; showBadgeInGallery(currentGalleryIndex); });
$('#nextBadge')?.addEventListener('click', ()=> { currentGalleryIndex = (currentGalleryIndex + 1) % badgeData.length; showBadgeInGallery(currentGalleryIndex); });
$('#galleryShare')?.addEventListener('click', ()=> {
  const b = badgeData[currentGalleryIndex]; const times = loadJSON('badgeUnlockTimes', {}); const t = times[currentGalleryIndex] ? new Date(times[currentGalleryIndex]).toLocaleString() : null;
  const text = t ? `I unlocked the "${b.name}" badge on ${t}!` : `I found the "${b.name}" badge in my trophy room.`;
  navigator.clipboard?.writeText(text).then(()=> alert('Copied share text to clipboard!')).catch(()=> alert('Copy not supported in this browser.'));
});

/* Patch unlockBadge to also record timestamp if called globally */
(function patchUnlockBadgeTimestamping(){
  const original = window.unlockBadge || null;
  if(original){
    window.unlockBadge = function(i){
      original(i);
      try{ recordBadgeTimestamp(Number(i)); } catch(e){}
      if(document.getElementById('badgeGalleryModal')?.classList.contains('show')) renderGallery();
    };
  }
})();

/* ---------------- Hydration on load: load profile, timetable, goals from server (fallback local) ---------------- */
(async function hydrate(){
  // local apply first for snappy UI
  const pr = loadJSON('profile', null);
  if(pr) applyProfileLocal(pr);

  // load server-side (overwrites local if present)
  await serverLoadProfile();
  await serverLoadTimetable();
  await serverLoadGoals();

  const savedSkills = loadJSON(skillsKey, null); if(savedSkills){ skills = savedSkills; renderSkills(); }
  updateXPDisplay();
  renderBadgesWithIcons();
  renderGallery();
  renderStreakUI();
})();

/* save on exit */
window.addEventListener('beforeunload', ()=> { saveJSON(skillsKey, skills); saveJSON('xp', xp); saveJSON('level', level); });

/* ---------------- attach small UI helpers (timetable add/delete, planner add row/col) ---------------- */
/* Timetable row/col controls (unchanged semantics) */
$('#addRow')?.addEventListener('click', ()=> {
  const r = table.insertRow(-1);
  for(let i=0;i<table.rows[0].cells.length;i++){ const c = r.insertCell(i); c.contentEditable = true; c.innerText = i===0?'Day':'Edit'; }
});
$('#deleteRow')?.addEventListener('click', ()=> { if(table.rows.length>2) table.deleteRow(-1); });
$('#addColumn')?.addEventListener('click', ()=> { for(let r of table.rows){ const c = r.insertCell(-1); c.contentEditable = true; c.innerText = r.rowIndex===0? 'New Col':'Edit'; } });
$('#deleteColumn')?.addEventListener('click', ()=> { const cols = table.rows[0].cells.length; if(cols>1) for(let r of table.rows) r.deleteCell(-1); });

/* Planner controls (unchanged) */
$('#plannerAddCol')?.addEventListener('click', ()=> {
  const head = planner.tHead.rows[0];
  const th = document.createElement('th'); th.contentEditable = true; th.innerText = 'New Day';
  head.appendChild(th);
  for(let r of planner.tBodies[0].rows){ const td = r.insertCell(-1); td.contentEditable = true; td.innerText = ''; }
});
$('#plannerAddRow')?.addEventListener('click', ()=> {
  const row = planner.tBodies[0].insertRow(-1);
  for(let c=0;c<planner.tHead.rows[0].cells.length;c++){ const td = row.insertCell(-1); td.contentEditable = true; td.innerText = c===0?'Time':''; }
});

/* ---------------- Helper functions to update server when local changes happen ---------------- */
function saveTasksLocal(){ const tasks = Array.from(goalList.children).map(li=> li.querySelector('.goal-text').innerText ); saveJSON('tasks', tasks); }
function saveTimetableLocal(){ saveJSON('timetable', getTimetableArray()); }

/* automatically save goals/timetable locally when user edits (simple mutation observer) */
const timetableObserver = new MutationObserver(()=> { saveTimetableLocal(); });
try{ timetableObserver.observe(table, { subtree:true, childList:true, characterData:true }); }catch(e){}

/* Mutation observer for goals */
const goalsObserver = new MutationObserver(()=> { saveTasksLocal(); });
try{ goalsObserver.observe(goalList, { subtree:true, childList:true, characterData:true }); }catch(e){}

/* small UX: save to server when user clicks specific save buttons (already added) */
document.addEventListener('click', (e)=>{
  if(e.target && e.target.id === 'saveTableBtn'){ serverSaveTimetable(); }
  if(e.target && (e.target.id === 'saveProfile' || e.target.matches('#saveProfile'))){ serverSaveProfile(); }
});

/* ---------------- END OF FILE ---------------- */
