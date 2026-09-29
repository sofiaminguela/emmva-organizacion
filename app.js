/* ===== Config & data ===== */
const SECTIONS = {
  '3anos':   { label:'3 años',            short:'3 años',   class:'3anos'   },
  '4y5anos': { label:'4–5 años',          short:'4–5 años', class:'4y5anos' },
  'flauta':  { label:'Iniciación flauta', short:'Flauta',   class:'flauta'  },
};
const DOW = ['Lun','Mar','Mié','Jué','Vie','Sáb','Dom'];
const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const STORAGE_KEY = 'musicapp_v1';

/* Determine current school year (Sep -> Jun) */
function computeSchoolYearStart(){
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(); // 0=Jan
  if(m >= 8) return y;        // Sep-Dec
  if(m <= 5) return y - 1;    // Jan-Jun
  return y;                   // Jul/Aug -> upcoming course
}
const SY_START = computeSchoolYearStart();
const SCHOOL_MONTHS = [8,9,10,11,0,1,2,3,4,5].map((m,i)=>({
  m, y: m>=8 ? SY_START : SY_START+1, name: MONTH_NAMES[m]
}));

/* ===== State ===== */
let STATE = loadState();
function loadState(){
  let s = null;
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) s = JSON.parse(raw);
  }catch(e){}
  if(!s) s = {};
  if(!Array.isArray(s.activities)) s.activities = [];
  if(!Array.isArray(s.students) || !s.students.length){
    s.students = [1,2,3,4,5,6].map(n=>({ id:'st'+n, name:'Alumno '+n }));
  }
  if(!Array.isArray(s.flautaRecords)) s.flautaRecords = [];
  return s;
}
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE)); }
function uid(p='a'){ return p+Date.now().toString(36)+Math.random().toString(36).slice(2,7); }

/* ===== Nav / router state ===== */
let currentView = 'calendario';
let flautaSubView = 'clases'; // 'clases' | 'alumnos'
let selectedStudentId = null;
let calMonthIdx = SCHOOL_MONTHS.findIndex(sm=>{
  const now=new Date();
  return sm.m===now.getMonth() && sm.y===now.getFullYear();
});
if(calMonthIdx<0) calMonthIdx = 0;
let weekAnchor = mondayOf(new Date());

document.getElementById('cursoLabel').textContent = `${SY_START}–${SY_START+1}`;

/* ===== Helpers ===== */
function pad(n){ return n<10 ? '0'+n : ''+n; }
function toISO(d){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function mondayOf(d){
  const x = new Date(d);
  const day = (x.getDay()+6)%7; // 0=Mon
  x.setDate(x.getDate()-day);
  x.setHours(0,0,0,0);
  return x;
}
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function fmtHuman(iso){
  const [y,m,d] = iso.split('-').map(Number);
  const dt = new Date(y,m-1,d);
  return `${dt.getDate()} de ${MONTH_NAMES[dt.getMonth()].toLowerCase()}`;
}
function actsForDate(iso){ return STATE.activities.filter(a=>a.date===iso); }
function recordsForDate(iso){ return STATE.flautaRecords.filter(r=>r.date===iso); }
function sortByDate(arr){ return [...arr].sort((a,b)=> a.date.localeCompare(b.date)); }
function sortByDateDesc(arr){ return [...arr].sort((a,b)=> b.date.localeCompare(a.date)); }
function studentName(id){ const s = STATE.students.find(x=>x.id===id); return s ? s.name : 'Alumno'; }
function dayHasFlauta(iso){ return recordsForDate(iso).length>0 || actsForDate(iso).some(a=>a.section==='flauta'); }
function sectionsForDate(iso){
  const set = new Set(actsForDate(iso).map(a=>a.section));
  if(recordsForDate(iso).length) set.add('flauta');
  return [...set];
}

/* ===== Tabs / navigation ===== */
function setView(view){
  currentView = view;
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active', b.dataset.view===view));
  document.querySelectorAll('.bnitem').forEach(b=>b.classList.toggle('active', b.dataset.view===view));
  render();
}
document.getElementById('tabs').addEventListener('click', e=>{
  const b = e.target.closest('.tab'); if(!b) return; setView(b.dataset.view);
});
document.getElementById('bottomnav').addEventListener('click', e=>{
  const b = e.target.closest('.bnitem'); if(!b) return; setView(b.dataset.view);
});

/* ===== Render dispatcher ===== */
function render(){
  const app = document.getElementById('app');
  if(currentView==='calendario') app.innerHTML = renderCalendarView();
  else if(currentView==='semana') app.innerHTML = renderWeekView();
  else if(currentView==='flauta') app.innerHTML = renderFlautaView();
  else app.innerHTML = renderSectionView(currentView);
  bindDynamicHandlers();
}

/* ===== Calendar (month grid) ===== */
function renderCalendarView(){
  const sm = SCHOOL_MONTHS[calMonthIdx];
  const first = new Date(sm.y, sm.m, 1);
  const firstDow = (first.getDay()+6)%7; // 0=Mon
  const start = addDays(first, -firstDow);
  const todayISO = toISO(new Date());

  let cells = '';
  for(let i=0;i<42;i++){
    const d = addDays(start,i);
    const iso = toISO(d);
    const outside = d.getMonth()!==sm.m;
    const secs = sectionsForDate(iso);
    const dots = secs.map(s=>`<span class="dot dot-${s}"></span>`).join('');
    cells += `<div class="daycell ${outside?'outside':''} ${iso===todayISO?'today':''} ${secs.length?'hasitems':''}" data-date="${iso}" data-action="open-day">
      <span class="daynum">${d.getDate()}</span>
      <div class="daydots">${dots}</div>
    </div>`;
  }

  return `
  <div class="view-head">
    <div>
      <h2>Calendario común</h2>
    </div>
    <button class="btn btn-primary" data-action="new-activity"><span>＋</span> Añadir actividad</button>
  </div>
  <div class="monthnav" style="margin-bottom:12px">
    <button class="btn btn-icon btn-ghost" data-action="prev-month" ${calMonthIdx===0?'disabled style="opacity:.35"':''}>‹</button>
    <span class="label">${sm.name} ${sm.y}</span>
    <button class="btn btn-icon btn-ghost" data-action="next-month" ${calMonthIdx===9?'disabled style="opacity:.35"':''}>›</button>
  </div>
  <div class="calwrap">
    <div class="weekdays">${DOW.map(d=>`<span>${d}</span>`).join('')}</div>
    <div class="calgrid">${cells}</div>
  </div>
  <div style="display:flex;gap:14px;margin-top:14px;flex-wrap:wrap">
    <span class="pill pill-3anos">● 3 años</span>
    <span class="pill pill-4y5anos">● 4–5 años</span>
    <span class="pill pill-flauta">● Flauta</span>
  </div>`;
}

/* ===== Week view ===== */
function renderWeekView(){
  const days = [...Array(7)].map((_,i)=>addDays(weekAnchor,i));
  const todayISO = toISO(new Date());
  const weekLabel = `${days[0].getDate()} ${MONTH_NAMES[days[0].getMonth()].slice(0,3)} – ${days[6].getDate()} ${MONTH_NAMES[days[6].getMonth()].slice(0,3)} ${days[6].getFullYear()}`;

  const cols = days.map((d,i)=>{
    const iso = toISO(d);
    const acts = sortByDate(actsForDate(iso));
    const recs = recordsForDate(iso);
    const body = (acts.length || recs.length)
      ? acts.map(a=>miniCard(a)).join('') + recs.map(r=>miniCardRecord(r)).join('')
      : `<div class="weekday-empty">Sin actividades</div>`;
    return `<div class="weekday-col ${iso===todayISO?'today':''}">
      <div class="weekday-head"><span class="wd">${DOW[i]}</span><span class="wn">${d.getDate()}</span></div>
      ${body}
    </div>`;
  }).join('');

  return `
  <div class="view-head">
    <div>
      <h2>Vista semanal</h2>
    </div>
    <button class="btn btn-primary" data-action="new-activity"><span>＋</span> Añadir actividad</button>
  </div>
  <div class="monthnav" style="margin-bottom:14px">
    <button class="btn btn-icon btn-ghost" data-action="prev-week">‹</button>
    <span class="label">${weekLabel}</span>
    <button class="btn btn-icon btn-ghost" data-action="next-week">›</button>
  </div>
  <div class="weekgrid">${cols}</div>`;
}

function miniCard(a){
  const s = SECTIONS[a.section];
  return `<div class="mini-card sec-${a.section}-soft" data-action="edit-activity" data-id="${a.id}">
    ${s.short} · ${a.title || 'Actividad'}
  </div>`;
}
function miniCardRecord(r){
  return `<div class="mini-card sec-flauta-soft" data-action="edit-record" data-id="${r.id}">
    Flauta · ${escapeHtml(studentName(r.studentId))}
    <small>${escapeHtml(r.song||'—')}</small>
  </div>`;
}

/* ===== Section view ===== */
function renderSectionView(section){
  const meta = SECTIONS[section];
  const acts = sortByDate(STATE.activities.filter(a=>a.section===section));

  let listHtml;
  if(!acts.length){
    listHtml = `<div class="empty-state"><span class="emoji">🎶</span>Todavía no hay actividades en ${meta.label}.<br>Añade la primera para empezar el curso.</div>`;
  }else{
    const groups = {};
    acts.forEach(a=>{
      const [y,m] = a.date.split('-');
      const key = `${MONTH_NAMES[Number(m)-1]} ${y}`;
      (groups[key] = groups[key]||[]).push(a);
    });
    listHtml = Object.entries(groups).map(([label,items])=>`
      <div class="monthgroup-title">${label}</div>
      <div class="actlist">${items.map(a=>activityCard(a)).join('')}</div>
    `).join('');
  }

  return `
  <div class="view-head">
    <div>
      <h2>${meta.label}</h2>
      <div class="view-sub">${acts.length} actividad${acts.length===1?'':'es'} programada${acts.length===1?'':'s'}</div>
    </div>
    <button class="btn btn-primary" data-action="new-activity" data-section="${section}"><span>＋</span> Añadir actividad</button>
  </div>
  ${listHtml}`;
}

function activityCard(a){
  const meta = SECTIONS[a.section];
  const ytId = extractYoutubeId(a.youtube);
  const chips = (a.instruments||[]).map(i=>`<span class="chip">${escapeHtml(i)}</span>`).join('');

  return `<div class="act-card border-${a.section}">
    <div class="act-top">
      <div>
        <div class="act-date">${fmtHuman(a.date)}</div>
        <div class="act-title">${escapeHtml(a.title||'Actividad')}</div>
      </div>
      <span class="pill pill-${a.section}">${meta.short}</span>
    </div>
    ${a.description ? `<div class="act-desc">${escapeHtml(a.description)}</div>` : ''}
    ${chips ? `<div class="chips">${chips}</div>` : ''}
    ${ytId ? `<a class="yt-link" href="https://youtu.be/${ytId}" target="_blank" rel="noopener">Ver en YouTube</a><br>` : ''}
    <div class="act-actions">
      <button class="btn btn-soft btn-sm" data-action="edit-activity" data-id="${a.id}">Editar</button>
      <button class="btn btn-danger btn-sm" data-action="delete-activity" data-id="${a.id}">Borrar</button>
    </div>
  </div>`;
}

/* ===== Flauta view: clases generales + fichas por alumno ===== */
function renderFlautaView(){
  const meta = SECTIONS.flauta;
  const head = `
  <div class="view-head">
    <div>
      <h2>${meta.label}</h2>
    </div>
    ${flautaSubView==='clases' ? `<button class="btn btn-primary" data-action="new-activity" data-section="flauta"><span>＋</span> Añadir actividad</button>` : ''}
  </div>
  <div class="subtabs">
    <button class="subtab ${flautaSubView==='clases'?'active':''}" data-action="flauta-sub" data-sub="clases">Clases generales</button>
    <button class="subtab ${flautaSubView==='alumnos'?'active':''}" data-action="flauta-sub" data-sub="alumnos">Alumnos</button>
  </div>`;

  if(flautaSubView==='alumnos') return head + renderAlumnosView();

  const acts = sortByDate(STATE.activities.filter(a=>a.section==='flauta'));
  if(!acts.length) return head + `<div class="empty-state"><span class="emoji">🪈</span>Todavía no hay clases generales de flauta.<br>Añade la primera actividad del grupo.</div>`;
  const groups = {};
  acts.forEach(a=>{
    const [y,m] = a.date.split('-');
    const key = `${MONTH_NAMES[Number(m)-1]} ${y}`;
    (groups[key] = groups[key]||[]).push(a);
  });
  const listHtml = Object.entries(groups).map(([label,items])=>`
    <div class="monthgroup-title">${label}</div>
    <div class="actlist">${items.map(a=>activityCard(a)).join('')}</div>
  `).join('');
  return head + listHtml;
}

function renderAlumnosView(){
  if(!selectedStudentId || !STATE.students.find(s=>s.id===selectedStudentId)){
    selectedStudentId = STATE.students[0].id;
  }
  const chips = STATE.students.map(s=>
    `<button class="student-chip ${s.id===selectedStudentId?'active':''}" data-action="select-student" data-id="${s.id}">${escapeHtml(s.name)}</button>`
  ).join('');

  const student = STATE.students.find(s=>s.id===selectedStudentId);
  const recs = sortByDateDesc(STATE.flautaRecords.filter(r=>r.studentId===selectedStudentId));
  const recsHtml = recs.length ? recs.map(r=>`
    <div class="record-row">
      <div>
        <div class="record-date">${fmtHuman(r.date)}</div>
        <div class="record-song">${escapeHtml(r.song||'—')}</div>
        ${r.note ? `<div class="record-note">${escapeHtml(r.note)}</div>` : ''}
      </div>
      <div class="record-actions">
        <button class="btn btn-soft btn-sm" data-action="edit-record" data-id="${r.id}">Editar</button>
        <button class="btn btn-danger btn-sm" data-action="delete-record" data-id="${r.id}">Borrar</button>
      </div>
    </div>`).join('')
    : `<div class="weekday-empty" style="padding:10px 0">Sin canciones registradas todavía.</div>`;

  return `
  <div class="student-row">${chips}</div>
  <div class="student-card">
    <div class="student-card-head">
      <div class="student-name">${escapeHtml(student.name)}<button class="editnamebtn" data-action="rename-student" data-id="${student.id}">✎</button></div>
      <button class="btn btn-primary btn-sm" data-action="new-record" data-studentid="${student.id}">＋ Añadir canción</button>
    </div>
    ${recsHtml}
  </div>`;
}

function extractYoutubeId(url){
  if(!url) return null;
  const m = url.match(/(?:youtu\.be\/|v=|embed\/)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : null;
}
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ===== Event delegation for dynamic content ===== */
function bindDynamicHandlers(){
  document.getElementById('app').onclick = (e)=>{
    const el = e.target.closest('[data-action]');
    if(!el) return;
    const action = el.dataset.action;
    if(action==='open-day') openDayPanel(el.dataset.date);
    else if(action==='new-activity') openActivityForm({ section: el.dataset.section || null });
    else if(action==='edit-activity') openActivityForm({ id: el.dataset.id });
    else if(action==='delete-activity') openConfirmDelete(el.dataset.id);
    else if(action==='prev-month'){ if(calMonthIdx>0){calMonthIdx--; render();} }
    else if(action==='next-month'){ if(calMonthIdx<9){calMonthIdx++; render();} }
    else if(action==='prev-week'){ weekAnchor = addDays(weekAnchor,-7); render(); }
    else if(action==='next-week'){ weekAnchor = addDays(weekAnchor,7); render(); }
    else if(action==='flauta-sub'){ flautaSubView = el.dataset.sub; render(); }
    else if(action==='select-student'){ selectedStudentId = el.dataset.id; render(); }
    else if(action==='rename-student') openRenameStudent(el.dataset.id);
    else if(action==='new-record') openRecordForm({ studentId: el.dataset.studentid });
    else if(action==='edit-record') openRecordForm({ id: el.dataset.id });
    else if(action==='delete-record') openConfirmDeleteRecord(el.dataset.id);
  };
}

/* ===== Modal system ===== */
function closeModal(){ document.getElementById('modalRoot').innerHTML=''; }
function openModal(html){
  document.getElementById('modalRoot').innerHTML = `<div class="overlay" data-action="overlay-close">${html}</div>`;
  document.querySelector('.overlay').addEventListener('click', e=>{
    if(e.target.dataset.action==='overlay-close') closeModal();
  });
}

/* --- Day panel --- */
function openDayPanel(iso){
  const acts = sortByDate(actsForDate(iso));
  const listHtml = acts.length
    ? `<div class="daylist">${acts.map(a=>miniCard(a)).join('')}</div>`
    : `<div class="weekday-empty" style="margin-bottom:14px">No hay actividades este día.</div>`;

  openModal(`
    <div class="sheet">
      <div class="sheet-head">
        <h3>${fmtHuman(iso)}</h3>
        <button class="closebtn" data-action="overlay-close">✕</button>
      </div>
      ${listHtml}
      <div class="daypanel-actions">
        <button class="btn btn-ghost" id="btnSeeWeek">Ver semana completa</button>
        <button class="btn btn-primary" id="btnAddFromDay">＋ Añadir actividad</button>
      </div>
    </div>`);

  document.getElementById('btnSeeWeek').onclick = ()=>{
    weekAnchor = mondayOf(new Date(iso+'T00:00:00'));
    closeModal(); setView('semana');
  };
  document.getElementById('btnAddFromDay').onclick = ()=>{ closeModal(); openActivityForm({ date: iso }); };
  document.querySelectorAll('.sheet .mini-card').forEach(c=>{
    c.addEventListener('click', ()=>{
      const isRecord = c.dataset.action==='edit-record';
      closeModal();
      if(isRecord) openRecordForm({ id: c.dataset.id });
      else openActivityForm({ id: c.dataset.id });
    });
  });
}

/* --- Confirm delete --- */
function openConfirmDelete(id){
  const a = STATE.activities.find(x=>x.id===id);
  if(!a) return;
  openModal(`
    <div class="sheet">
      <div class="sheet-head"><h3>Borrar actividad</h3><button class="closebtn" data-action="overlay-close">✕</button></div>
      <p class="confirm-text">¿Seguro que quieres borrar «${escapeHtml(a.title||'esta actividad')}»? Esta acción no se puede deshacer.</p>
      <div class="sheet-actions">
        <button class="btn btn-ghost" data-action="overlay-close">Cancelar</button>
        <button class="btn btn-danger" id="btnConfirmDel">Borrar</button>
      </div>
    </div>`);
  document.getElementById('btnConfirmDel').onclick = ()=>{
    STATE.activities = STATE.activities.filter(x=>x.id!==id);
    saveState(); closeModal(); render();
  };
}

/* --- Activity form (create / edit) --- */
let formDraft = null; // working copy while modal open

function openActivityForm({ id=null, section=null, date=null }={}){
  const existing = id ? STATE.activities.find(a=>a.id===id) : null;
  formDraft = existing ? JSON.parse(JSON.stringify(existing)) : {
    id: uid(),
    section: section || (currentView in SECTIONS ? currentView : '3anos'),
    date: date || toISO(new Date()),
    title:'', youtube:'', description:'', instruments:[]
  };
  renderActivityForm(!!existing);
}

function renderActivityForm(isEdit){
  const d = formDraft;
  const secButtons = Object.entries(SECTIONS).map(([key,m])=>
    `<button type="button" class="sec-choice-btn ${d.section===key?'sel-'+key:''}" data-secpick="${key}">${m.label}</button>`
  ).join('');

  openModal(`
    <div class="sheet">
      <div class="sheet-head">
        <h3>${isEdit?'Editar actividad':'Nueva actividad'}</h3>
        <button class="closebtn" data-action="overlay-close">✕</button>
      </div>
      <div class="field">
        <label>Sección</label>
        <div class="section-choice">${secButtons}</div>
      </div>
      <div class="field">
        <label>Fecha</label>
        <input type="date" id="fDate" value="${d.date}">
      </div>
      <div class="field">
        <label>Título</label>
        <input type="text" id="fTitle" placeholder="Ej. Ritmo con claves" value="${escapeHtml(d.title)}">
      </div>
      <div class="field">
        <label>Descripción</label>
        <textarea id="fDesc" placeholder="Breve descripción de la actividad">${escapeHtml(d.description)}</textarea>
      </div>
      <div class="field">
        <label>Enlace de YouTube</label>
        <input type="url" id="fYoutube" placeholder="https://youtu.be/..." value="${escapeHtml(d.youtube)}">
      </div>
      <div class="field">
        <label>Instrumentos</label>
        <div class="addrow">
          <input type="text" id="fInstrInput" placeholder="Ej. Panderetas">
          <button type="button" class="btn btn-soft btn-sm" id="btnAddInstr">Añadir</button>
        </div>
        <div class="instr-tags" id="instrTags"></div>
      </div>
      <div class="sheet-actions">
        <button class="btn btn-ghost" data-action="overlay-close">Cancelar</button>
        <button class="btn btn-primary" id="btnSaveActivity">${isEdit?'Guardar cambios':'Crear actividad'}</button>
      </div>
    </div>`);

  wireActivityForm();
}

function wireActivityForm(){
  const d = formDraft;

  document.querySelectorAll('.sec-choice-btn').forEach(b=>{
    b.onclick = ()=>{
      d.section = b.dataset.secpick;
      document.querySelectorAll('.sec-choice-btn').forEach(x=>{
        x.className = 'sec-choice-btn' + (x.dataset.secpick===d.section ? ' sel-'+d.section : '');
      });
    };
  });

  function renderInstrTags(){
    document.getElementById('instrTags').innerHTML = d.instruments.map((ins,i)=>
      `<span class="instr-tag">${escapeHtml(ins)} <button type="button" data-rmi="${i}">✕</button></span>`
    ).join('');
    document.querySelectorAll('[data-rmi]').forEach(b=>{
      b.onclick = ()=>{ d.instruments.splice(Number(b.dataset.rmi),1); renderInstrTags(); };
    });
  }
  renderInstrTags();
  document.getElementById('btnAddInstr').onclick = ()=>{
    const inp = document.getElementById('fInstrInput');
    const v = inp.value.trim();
    if(v){ d.instruments.push(v); inp.value=''; renderInstrTags(); }
  };
  document.getElementById('fInstrInput').addEventListener('keydown', e=>{
    if(e.key==='Enter'){ e.preventDefault(); document.getElementById('btnAddInstr').click(); }
  });

  document.getElementById('btnSaveActivity').onclick = ()=>{
    d.date = document.getElementById('fDate').value || toISO(new Date());
    d.title = document.getElementById('fTitle').value.trim();
    d.description = document.getElementById('fDesc').value.trim();
    d.youtube = document.getElementById('fYoutube').value.trim();
    if(!d.title){ document.getElementById('fTitle').style.borderColor = '#C4302B'; return; }
    const idx = STATE.activities.findIndex(a=>a.id===d.id);
    if(idx>=0) STATE.activities[idx] = d; else STATE.activities.push(d);
    saveState(); closeModal(); render();
  };
}

/* --- Rename student --- */
function openRenameStudent(id){
  const s = STATE.students.find(x=>x.id===id);
  if(!s) return;
  openModal(`
    <div class="sheet">
      <div class="sheet-head"><h3>Nombre del alumno</h3><button class="closebtn" data-action="overlay-close">✕</button></div>
      <div class="field"><label>Nombre</label><input type="text" id="fStudentName" value="${escapeHtml(s.name)}"></div>
      <div class="sheet-actions">
        <button class="btn btn-ghost" data-action="overlay-close">Cancelar</button>
        <button class="btn btn-primary" id="btnSaveStudent">Guardar</button>
      </div>
    </div>`);
  document.getElementById('btnSaveStudent').onclick = ()=>{
    const v = document.getElementById('fStudentName').value.trim();
    if(v) s.name = v;
    saveState(); closeModal(); render();
  };
}

/* --- Flute song record form (add/edit) --- */
let recordDraft = null;
function openRecordForm({ id=null, studentId=null }={}){
  const existing = id ? STATE.flautaRecords.find(r=>r.id===id) : null;
  recordDraft = existing ? {...existing} : {
    id: uid('r'),
    studentId: studentId || selectedStudentId || STATE.students[0].id,
    date: toISO(new Date()),
    song:'', note:''
  };
  const d = recordDraft;
  const studentOptions = STATE.students.map(s=>`<option value="${s.id}" ${s.id===d.studentId?'selected':''}>${escapeHtml(s.name)}</option>`).join('');

  openModal(`
    <div class="sheet">
      <div class="sheet-head">
        <h3>${existing?'Editar canción':'Nueva canción'}</h3>
        <button class="closebtn" data-action="overlay-close">✕</button>
      </div>
      <div class="field"><label>Alumno</label><select id="fStudent">${studentOptions}</select></div>
      <div class="field"><label>Fecha</label><input type="date" id="fRecDate" value="${d.date}"></div>
      <div class="field"><label>Canción</label><input type="text" id="fSong" placeholder="Ej. Estrellita" value="${escapeHtml(d.song)}"></div>
      <div class="field"><label>Nota (opcional)</label><textarea id="fNote" placeholder="Cómo le fue, qué repasar...">${escapeHtml(d.note)}</textarea></div>
      <div class="sheet-actions">
        <button class="btn btn-ghost" data-action="overlay-close">Cancelar</button>
        <button class="btn btn-primary" id="btnSaveRecord">${existing?'Guardar cambios':'Añadir'}</button>
      </div>
    </div>`);

  document.getElementById('btnSaveRecord').onclick = ()=>{
    d.studentId = document.getElementById('fStudent').value;
    d.date = document.getElementById('fRecDate').value || toISO(new Date());
    d.song = document.getElementById('fSong').value.trim();
    d.note = document.getElementById('fNote').value.trim();
    if(!d.song){ document.getElementById('fSong').style.borderColor = '#C4302B'; return; }
    const idx = STATE.flautaRecords.findIndex(r=>r.id===d.id);
    if(idx>=0) STATE.flautaRecords[idx] = d; else STATE.flautaRecords.push(d);
    selectedStudentId = d.studentId;
    saveState(); closeModal(); render();
  };
}

/* --- Confirm delete record --- */
function openConfirmDeleteRecord(id){
  const r = STATE.flautaRecords.find(x=>x.id===id);
  if(!r) return;
  openModal(`
    <div class="sheet">
      <div class="sheet-head"><h3>Borrar canción</h3><button class="closebtn" data-action="overlay-close">✕</button></div>
      <p class="confirm-text">¿Borrar «${escapeHtml(r.song||'esta canción')}» de ${escapeHtml(studentName(r.studentId))}?</p>
      <div class="sheet-actions">
        <button class="btn btn-ghost" data-action="overlay-close">Cancelar</button>
        <button class="btn btn-danger" id="btnConfirmDelRec">Borrar</button>
      </div>
    </div>`);
  document.getElementById('btnConfirmDelRec').onclick = ()=>{
    STATE.flautaRecords = STATE.flautaRecords.filter(x=>x.id!==id);
    saveState(); closeModal(); render();
  };
}

/* ===== Init ===== */
render();
