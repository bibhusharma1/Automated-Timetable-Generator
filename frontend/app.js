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