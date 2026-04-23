const API = 'http://localhost:5000/api';

/* ── State ─────────────────────────────────────────────────────── */
const S = {
  csv:          { subjects:'', teachers:'', rooms:'', classes:'' },
  timetable:    null,   // { class:{…}, teacher:{…} }
  score:        0,
  meta:         null,
  currentClass:   null,
  currentTeacher: null,
  currentView:    'class',
  parsedCSV:    {},
};

/* ── Sample CSE data ────────────────────────────────────────────── */
const SAMPLE = {
subjects:`subject_id,subject_name,year,semester,credits,hours_per_week,subject_type,requires_lab,lab_hours_per_week
S501,Machine Learning,3,5,4,4,theory,false,0
S502,Compiler Design,3,5,4,4,theory,false,0
S503,Computer Graphics,3,5,3,3,theory,false,0
S504,Artificial Intelligence,3,5,4,4,theory,false,0
S505,Mobile Computing,3,5,3,3,theory,false,0
S506,Cryptography & Network Security,3,5,3,3,theory,false,0
L501,ML Lab,3,5,2,0,lab,true,2
L502,Compiler Design Lab,3,5,2,0,lab,true,2
L503,Computer Graphics Lab,3,5,2,0,lab,true,2
S601,Deep Learning,3,6,4,4,theory,false,0
S602,Cloud Computing,3,6,3,3,theory,false,0
S603,Internet of Things,3,6,3,3,theory,false,0
S604,Big Data Analytics,3,6,4,4,theory,false,0
S605,Natural Language Processing,3,6,3,3,theory,false,0
S606,Professional Ethics,3,6,2,2,theory,false,0
L601,Deep Learning Lab,3,6,2,0,lab,true,2
L602,IoT Lab,3,6,2,0,lab,true,2
L603,Big Data Lab,3,6,2,0,lab,true,2`,

teachers:`teacher_id,teacher_name,designation,subjects,max_hours_per_day,available_days
T13,Prof. H. Prusty,Assistant Professor,"S501,S502",5,"Mon,Tue,Wed,Thu,Fri"
T14,Prof. J. Tripathy,Assistant Professor,"S501,S502",5,"Mon,Tue,Wed,Thu,Fri"
T15,Prof. F. Barik,Assistant Professor,"S503,S504",5,"Mon,Tue,Wed,Thu,Fri"
T16,Prof. E. Moharana,Assistant Professor,"S503,S504",5,"Mon,Tue,Wed,Thu,Fri"
T17,Prof. I. Lenka,Assistant Professor,"S505,S506",5,"Mon,Tue,Wed,Thu,Fri"
T18,Prof. V. Sahu,Assistant Professor,"S505,S506",5,"Mon,Tue,Wed,Thu,Fri"
T19,Prof. W. Dash,Assistant Professor,"S601,S602",5,"Mon,Tue,Wed,Thu,Fri"
T20,Prof. X. Patnaik,Assistant Professor,"S601,S602",5,"Mon,Tue,Wed,Thu,Fri"
T21,Prof. Y. Pradhan,Assistant Professor,"S603,S604",5,"Mon,Tue,Wed,Thu,Fri"
T22,Prof. Z. Biswal,Assistant Professor,"S603,S604",5,"Mon,Tue,Wed,Thu,Fri"
T23,Dr. Q. Choudhury,Professor,"S605,S606",5,"Mon,Tue,Wed,Thu,Fri"
T24,Prof. U. Nanda,Assistant Professor,"S605,S606",5,"Mon,Tue,Wed,Thu,Fri"
T57,Lab-Instr. Om Prakash,Lab Instructor,"L501,L502,L503",6,"Mon,Tue,Wed,Thu,Fri"
T58,Lab-Instr. Shiva Kumar,Lab Instructor,"L501,L502,L503",6,"Mon,Tue,Wed,Thu,Fri"
T59,Lab-Instr. Durga Devi,Lab Instructor,"L601,L602,L603",6,"Mon,Tue,Wed,Thu,Fri"
T60,Lab-Instr. Parvati Bai,Lab Instructor,"L601,L602,L603",6,"Mon,Tue,Wed,Thu,Fri"`,

rooms:`room_id,room_name,capacity,room_type,building
R01,Lecture Hall-A,80,classroom,Main Block
R02,Lecture Hall-B,80,classroom,Main Block
R03,Lecture Hall-C,60,classroom,Main Block
R04,Lecture Hall-D,60,classroom,Main Block
R05,Seminar Hall,40,classroom,Main Block
R06,CS Lab-1 (Programming),40,lab,CS Block
R07,CS Lab-2 (Networks),40,lab,CS Block
R08,CS Lab-3 (Advanced),35,lab,CS Block
R09,Electronics Lab,35,lab,EE Block
R10,Project Lab,30,lab,CS Block`,

classes:`class_id,class_name,year,semester,strength,subjects
C51,CSE-5A,3,5,52,"S501,S502,S503,S504,S505,S506,L501,L502,L503"
C52,CSE-5B,3,5,50,"S501,S502,S503,S504,S505,S506,L501,L502,L503"
C61,CSE-6A,3,6,52,"S601,S602,S603,S604,S605,S606,L601,L602,L603"
C62,CSE-6B,3,6,50,"S601,S602,S603,S604,S605,S606,L601,L602,L603"`
};

const TEMPLATES = {
  subjects: 'subject_id,subject_name,year,semester,credits,hours_per_week,subject_type,requires_lab,lab_hours_per_week\nS001,Mathematics,1,1,4,4,theory,false,0',
  teachers: 'teacher_id,teacher_name,designation,subjects,max_hours_per_day,available_days\nT01,Dr. Smith,Professor,"S001,S002",5,"Mon,Tue,Wed,Thu,Fri"',
  rooms:    'room_id,room_name,capacity,room_type,building\nR01,Lecture Hall A,60,classroom,Main Block',
  classes:  'class_id,class_name,year,semester,strength,subjects\nC01,CSE-1A,1,1,60,"S001,S002,S003"',
};

const DAYS  = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
const SLOTS = ['8:00-9:00','9:00-10:00','10:00-11:00','11:00-12:00','12:00-1:00','1:00-2:00','2:00-3:00','3:00-4:00'];
const LUNCH = '12:00-1:00';
const LAB_PAIRS = [['8:00-9:00','9:00-10:00'],['9:00-10:00','10:00-11:00'],['1:00-2:00','2:00-3:00'],['2:00-3:00','3:00-4:00']];
const PRIME = ['8:00-9:00','9:00-10:00','10:00-11:00','11:00-12:00'];
const AFTERNOON = ['1:00-2:00','2:00-3:00','3:00-4:00'];

/* ── CSV PARSER ─────────────────────────────────────────────────── */
function parseCSV(raw) {
  const lines = raw.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const vals = splitCSVLine(line);
    return Object.fromEntries(headers.map((h,i) => [h.trim(), (vals[i]||'').trim()]));
  });
}
function splitCSVLine(line) {
  const out = []; let cur = '', inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; }
    else if (ch === ',' && !inQ) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map(v => v.replace(/^"|"$/g,'').trim());
}
/* ── TOAST ──────────────────────────────────────────────────────── */
function toast(msg, type='ok') {
  const el = document.createElement('div');
  el.className = toast toast-${type};
  el.textContent = msg;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(() => el.remove(), 3800);
}
/* ── LOADER ─────────────────────────────────────────────────────── */
let _loaderTimers = [];
function showLoader() {
  document.getElementById('loader').classList.add('show');
  for (let i=0;i<6;i++) document.getElementById(ls${i}).classList.remove('on');
  _loaderTimers.forEach(clearTimeout);
  loaderTimers = Array.from({length:6},(,i)=>setTimeout(()=>document.getElementById(ls${i}).classList.add('on'), i*550));
}
function hideLoader() {
  document.getElementById('loader').classList.remove('show');
  _loaderTimers.forEach(clearTimeout);
}
/* ── PROGRESS STEPS ─────────────────────────────────────────────── */
function setStep(n, state) {
  const el = document.getElementById(ps${n});
  const ln = document.getElementById(pl${n});
  el.className = prog-step ${state};
  if (ln && state==='done') ln.classList.add('done');
}

/* ── FILE HANDLING ──────────────────────────────────────────────── */
function handleFile(name, input) {
  const file = input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    loadCSV(name, e.target.result, file.name);
  };
  reader.readAsText(file);
}

function loadCSV(name, content, filename) {
  S.csv[name] = content;
  document.getElementById(ta-${name}).value = content;
  const dz = document.getElementById(dz-${name});
  dz.classList.add('filled');
  document.getElementById(dzs-${name}).textContent = ✓ ${filename || name+'.csv'};

  S.parsedCSV[name] = parseCSV(content);
  updatePreviewSection();
  toast(${name}.csv loaded — ${S.parsedCSV[name].length} rows, 'ok');
}

function updatePreviewSection() {
  const loaded = Object.keys(S.parsedCSV).filter(k => S.parsedCSV[k]?.length > 0);
  if (!loaded.length) return;
  document.getElementById('previewSection').style.display = 'block';
  showPreview(loaded[0], document.querySelector('.ptab'));
}

function showPreview(name, btn) {
  document.querySelectorAll('.ptab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const rows = S.parsedCSV[name] || [];
  if (!rows.length) { document.getElementById('previewTable').innerHTML = '<p style="color:var(--muted);font-size:0.8rem;padding:8px">No data loaded for '+name+'</p>'; return; }
  const cols = Object.keys(rows[0]);
  document.getElementById('previewTable').innerHTML = `
    <table>
      <thead><tr>${cols.map(c=><th>${c}</th>).join('')}</tr></thead>
      <tbody>${rows.slice(0,10).map(r=><tr>${cols.map(c=><td>${r[c]||''}</td>).join('')}</tr>).join('')}</tbody>
    </table>
    ${rows.length>10?<p style="font-size:0.72rem;color:var(--muted);padding:6px 0">+${rows.length-10} more rows…</p>:''}`;
}
/* ── SAMPLE DATA ────────────────────────────────────────────────── */
function loadSample() {
  Object.keys(SAMPLE).forEach(name => loadCSV(name, SAMPLE[name], ${name}.csv (sample)));
  toast('Sample CSE 3rd-year data loaded!', 'inf');
  setStep(1,'done'); setStep(2,'active');
}

function showFormatGuide() {
  const g = document.getElementById('formatGuide');
  g.style.display = g.style.display==='none' ? 'block' : 'none';
}

function clearAll() {
  Object.keys(S.csv).forEach(name => {
    S.csv[name] = '';
    document.getElementById(ta-${name}).value = '';
    document.getElementById(dz-${name}).classList.remove('filled');
    document.getElementById(dzs-${name}).textContent = '';
  });
  S.parsedCSV = {};
  document.getElementById('previewSection').style.display = 'none';
  setStep(1,'active'); setStep(2,''); setStep(3,''); setStep(4,'');
  toast('Cleared', 'err');
}

/* ── SYNC TEXTAREAS → state ─────────────────────────────────────── */
function syncTextareas() {
  Object.keys(S.csv).forEach(name => {
    const v = document.getElementById(ta-${name}).value.trim();
    if (v) { S.csv[name] = v; if (!S.parsedCSV[name]) S.parsedCSV[name] = parseCSV(v); }
  });
}

/* ── GENERATE ───────────────────────────────────────────────────── */
async function generate() {
  syncTextareas();
  const missing = Object.entries(S.csv).filter(([,v])=>!v).map(([k])=>k);
  if (missing.length) { toast(Missing: ${missing.join(', ')}, 'err'); return; }

  showLoader();
  document.getElementById('statusPill').textContent = '● GENERATING';
  document.getElementById('statusPill').className = 'pill pill-amber';
  setStep(2,'active');

  try {
    const res = await fetch(${API}/generate, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ subjects:S.csv.subjects, teachers:S.csv.teachers, rooms:S.csv.rooms, classes:S.csv.classes })
    });
    const data = await res.json();
    hideLoader();
    if (!res.ok || data.error) { toast(Error: ${data.error}, 'err'); return; }
    applyResult(data.timetable, data.score, data.metadata);
  } catch {
    hideLoader();
    // demo mode
    demoGenerate();
  }
}

function applyResult(timetable, score, metadata) {
  S.timetable = timetable;
  S.score     = score;
  S.meta      = metadata;

  document.getElementById('statusPill').textContent = ● DONE — ${score}%;
  document.getElementById('statusPill').className = 'pill pill-green';
  setStep(2,'done'); setStep(3,'active');

  renderResults();
  toast(✅ Timetable generated! Score: ${score}%, 'ok');
}
/* ── DEMO GENERATION (no backend) ──────────────────────────────── */
function demoGenerate() {
  const subjects = parseCSV(S.csv.subjects);
  const teachers = parseCSV(S.csv.teachers);
  const rooms    = parseCSV(S.csv.rooms);
  const classes  = parseCSV(S.csv.classes);

  const subMap = Object.fromEntries(subjects.map(s=>[s.subject_id, s]));
  const sub2teach = {};
  teachers.forEach(t => {
    (t.subjects||'').split(',').forEach(s => {
      s=s.trim(); if(s) { sub2teach[s]=sub2teach[s]||[]; sub2teach[s].push(t); }
    });
  });
  const classrooms = rooms.filter(r=>r.room_type==='classroom');
  const labs       = rooms.filter(r=>r.room_type==='lab');

  // color palette
  const COLORS=['#6c63ff','#ff6b6b','#43e97b','#f7971e','#38d9f9','#e040fb','#00e676','#ff9100','#40c4ff','#ea80fc'];
  const subColor = {};
  subjects.forEach((s,i)=>{ subColor[s.subject_id]=COLORS[i%COLORS.length]; });

  // group by semester
  const semGroups = {};
  classes.forEach(c=>{ const sem=c.semester||'1'; semGroups[sem]=semGroups[sem]||[]; semGroups[sem].push(c); });

  const classView={}, teacherGrid={};
  teachers.forEach(t=>{ teacherGrid[t.teacher_id]={teacher_name:t.teacher_name, designation:t.designation||'Faculty', total_weekly:0, timetable:{}}; DAYS.forEach(d=>{ teacherGrid[t.teacher_id].timetable[d]=[]; SLOTS.forEach(s=>teacherGrid[t.teacher_id].timetable[d].push({slot:s,is_lunch:s===LUNCH,session:null})); }); });

  Object.entries(semGroups).forEach(([sem, semClasses]) => {
    const tb={}, rb={}, daily={};
    semClasses.forEach(cls => {
      const cid=cls.class_id, strength=parseInt(cls.strength||60);
      const subs=(cls.subjects||'').split(',').map(s=>s.trim()).filter(Boolean);
      const theory=[], labList=[];
      subs.forEach(sid=>{ const sub=subMap[sid]; if(!sub) return; (sub.requires_lab==='true'?labList:theory).push(sid); });
      theory.sort((a,b)=>-parseInt(subMap[a]?.credits||3)+parseInt(subMap[b]?.credits||3));

      const grid={}; DAYS.forEach(d=>{ grid[d]={}; SLOTS.forEach(s=>grid[d][s]=null); });
      const dayUse={};DAYS.forEach(d=>dayUse[d]=0);

      function pickTeacher(sid,day,slot) {
        for(const t of shuffle([...(sub2teach[sid]||[])])) {
          const tid=t.teacher_id, maxD=parseInt(t.max_hours_per_day||5);
          if((daily[tid+'|'+day]||0)>=maxD) continue;
          if(tb[tid+'|'+day+'|'+slot]) continue;
          return t;
        }
        return null;
      }
      function pickRoom(sid,day,slot) {
        const isLab=subMap[sid]?.requires_lab==='true';
        for(const r of shuffle([...(isLab?labs:classrooms)])) {
          if(parseInt(r.capacity||0)<strength) continue;
          if(rb[r.room_id+'|'+day+'|'+slot]) continue;
          return r;
        }
        return null;
      }
      function markT(t,day,slot,n=1){tb[t.teacher_id+'|'+day+'|'+slot]=true; daily[t.teacher_id+'|'+day]=(daily[t.teacher_id+'|'+day]||0)+n;}
      function markR(r,day,slot){rb[r.room_id+'|'+day+'|'+slot]=true;}
      function makeEntry(sid,t,r,type,credits){
        const sub=subMap[sid]||{};
        return {subject_id:sid, subject_name:sub.subject_name||sid, teacher_id:t.teacher_id, teacher_name:t.teacher_name, room_id:r.room_id, room_name:r.room_name, type, credits:parseInt(credits||3), color:subColor[sid]||'#6c63ff'};
      }

      // labs
      labList.forEach(sid=>{
        const sub=subMap[sid]||{}, lhrs=parseInt(sub.lab_hours_per_week||2), crd=sub.credits||2;
        for(let b=0;b<Math.max(Math.floor(lhrs/2),1);b++){
          let placed=false;
          for(const day of sortedDays(dayUse)){
            for(const [s1,s2] of shuffle([...LAB_PAIRS])){
              if(grid[day][s1]||grid[day][s2]) continue;
              const t=pickTeacher(sid,day,s1); if(!t||tb[t.teacher_id+'|'+day+'|'+s2]) continue;
              const r=pickRoom(sid,day,s1); if(!r||rb[r.room_id+'|'+day+'|'+s2]) continue;
              const entry=makeEntry(sid,t,r,'lab',crd);
              grid[day][s1]=entry; grid[day][s2]={...entry,lab_continuation:true};
              markT(t,day,s1); markT(t,day,s2); markR(r,day,s1); markR(r,day,s2);
              dayUse[day]+=2; placed=true; break;
            }
            if(placed) break;
          }
        }
      });

      // theory
      theory.forEach(sid=>{
        const sub=subMap[sid]||{}, hrs=parseInt(sub.hours_per_week||3), crd=sub.credits||3;
        const slotOrder=parseInt(crd)>=4?[...PRIME,...AFTERNOON]:[...SLOTS.filter(s=>s!==LUNCH)];
        for(let h=0;h<hrs;h++){
          let placed=false;
          for(const day of sortedDays(dayUse)){
            for(const slot of slotOrder){
              if(slot===LUNCH||grid[day][slot]) continue;
              const t=pickTeacher(sid,day,slot); if(!t) continue;
              const r=pickRoom(sid,day,slot); if(!r) continue;
              grid[day][slot]=makeEntry(sid,t,r,'theory',crd);
              markT(t,day,slot); markR(r,day,slot); dayUse[day]++;
              placed=true; break;
            }
            if(placed) break;
          }
        }
      });

      classView[cid]={ class_name:cls.class_name, year:cls.year||'', semester:cls.semester||'', timetable:{} };
      DAYS.forEach(day=>{
        classView[cid].timetable[day]=SLOTS.map(slot=>({slot,is_lunch:slot===LUNCH,session:grid[day][slot]}));
        SLOTS.forEach(slot=>{
          const sess=grid[day][slot];
          if(sess){ const tid=sess.teacher_id; if(tid&&teacherGrid[tid]){ const sl=teacherGrid[tid].timetable[day].find(x=>x.slot===slot); if(sl&&!sl.session) sl.session={...sess,class_id:cid,class_name:cls.class_name}; teacherGrid[tid].total_weekly++; }}
        });
      });
    });
  });

  teachers.forEach(t=>{ if(teacherGrid[t.teacher_id]) teacherGrid[t.teacher_id].total_weekly=Math.floor(teacherGrid[t.teacher_id].total_weekly); });

  // score
  let req=0, placed=0;
  classes.forEach(cls=>{ (cls.subjects||'').split(',').forEach(sid=>{ sid=sid.trim(); const sub=subMap[sid]; if(!sub) return; const isLab=sub.requires_lab==='true'; req+=parseInt(isLab?sub.lab_hours_per_week:sub.hours_per_week||3); }); });
  Object.values(classView).forEach(cv=>{ Object.values(cv.timetable).forEach(day=>day.forEach(s=>{ if(s.session) placed++; })); });
  const score=Math.round(Math.min(placed/Math.max(req,1),1)*1000)/10;

  applyResult({class:classView, teacher:teacherGrid}, score, {subjects:parseCSV(S.csv.subjects), teachers:parseCSV(S.csv.teachers), rooms:parseCSV(S.csv.rooms), classes:parseCSV(S.csv.classes)});
}

function shuffle(arr) { for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } return arr; }
function sortedDays(use) { return [...DAYS].sort((a,b)=>(use[a]||0)-(use[b]||0)); }
/* ── RENDER RESULTS ─────────────────────────────────────────────── */
function renderResults() {
  document.getElementById('sec-results').style.display = 'block';
  document.getElementById('sec-results').scrollIntoView({behavior:'smooth', block:'start'});

  // score banner
  setTimeout(()=>{
    document.getElementById('scoreNum').textContent = ${S.score}%;
    document.getElementById('scoreFill').style.width = ${S.score}%;
  }, 100);

  const classCount   = Object.keys(S.timetable.class).length;
  const teacherCount = Object.keys(S.timetable.teacher).length;
  const totalSessions = Object.values(S.timetable.class).reduce((acc,c)=>acc+Object.values(c.timetable).flat().filter(s=>s.session&&!s.session?.lab_continuation).length, 0);

  document.getElementById('scoreStats').innerHTML = `
    <div class="sstat"><div class="sstat-val">${classCount}</div><div class="sstat-lbl">classes scheduled</div></div>
    <div class="sstat"><div class="sstat-val">${teacherCount}</div><div class="sstat-lbl">teachers assigned</div></div>
    <div class="sstat"><div class="sstat-val">${totalSessions}</div><div class="sstat-lbl">total sessions</div></div>`;

  buildClassBar();
  buildTeacherBar();
  buildLegend();
  buildAnalysis();
  setStep(3,'done'); setStep(4,'active');
}
/* ── VIEW SWITCHING ─────────────────────────────────────────────── */
function switchView(view) {
  S.currentView = view;
  document.querySelectorAll('.vsw').forEach(b=>b.classList.remove('active'));
  document.getElementById(vsw-${view}).classList.add('active');
  document.querySelectorAll('.view-panel').forEach(p=>p.classList.add('hidden'));
  document.getElementById(vp-${view}).classList.remove('hidden');
  if(view==='teacher') renderTeacherStats();
}

/* ── LEGEND ─────────────────────────────────────────────────────── */
function buildLegend() {
  document.getElementById('ttLegend').innerHTML = `
    <div class="legend-item"><div class="legend-dot" style="background:#3d5afe"></div>Theory</div>
    <div class="legend-item"><div class="legend-dot" style="background:#00bfa5"></div>Lab (2-hr block)</div>
    <div class="legend-item"><div class="legend-dot" style="background:#ff6e40"></div>Lunch Break</div>
    <div class="legend-item"><div class="legend-dot" style="background:var(--bg3)"></div>Free Slot</div>
    <div class="legend-item">🟡 Credit score shown on each session</div>`;
}