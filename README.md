# ⚡ TimeForge v2 — Automated Timetable Generator

> An ML-powered, credit-weighted academic timetable generator for engineering colleges.  
> Built with Flask · Python · Vanilla JS · CSV-driven data input.

---

## 📁 Project Structure

```
forge-v2/
│
├── 📁 frontend/
│   ├── index.html          ← Main UI (open this in browser)
│   ├── style.css           ← All styling
│   └── app.js              ← All logic (CSV parse, generate, render, export)
│
├── 📁 backend/
│   └── app.py              ← Flask REST API (5 endpoints)
│
├── 📁 ml/
│   └── generator.py        ← Scheduling engine (credit-weighted, per-semester)
│
├── 📁 sample_csvs/
│   ├── subjects.csv        ← 74 CSE subjects across 4 years + labs
│   ├── teachers.csv        ← 64 faculty members with subject assignments
│   ├── rooms.csv           ← 10 rooms (classrooms + labs)
│   └── classes.csv         ← 16 class sections (CSE Year 1–4, A & B)
│
├── requirements.txt
└── README.md
```

---

## 🚀 Quick Start

### 1. Install Python dependencies
```bash
cd forge-v2
pip install -r requirements.txt
```

### 2. Start the backend
```bash
python backend/app.py
```
You will see:
```
🚀 TimeForge v2 API  →  http://localhost:5000
```

### 3. Open the frontend
Double-click `frontend/index.html` in File Explorer, or open it in your browser.

> **Note:** The frontend also works completely offline in demo mode — even if the backend is not running, timetables are generated locally in the browser.

---

## 📄 CSV File Formats

All data comes from 4 CSV files. You can replace the sample files with your own institution's data.

---

### 📚 subjects.csv

| Column | Description | Example |
|---|---|---|
| `subject_id` | Unique ID | `S501` |
| `subject_name` | Full name | `Machine Learning` |
| `year` | Academic year | `3` |
| `semester` | Semester number | `5` |
| `credits` | Credit score (drives slot priority) | `4` |
| `hours_per_week` | Weekly theory hours | `4` |
| `subject_type` | `theory` / `elective` / `lab` | `theory` |
| `requires_lab` | `true` or `false` | `false` |
| `lab_hours_per_week` | Weekly lab hours (0 if theory) | `0` |

> **Credit score matters:** Subjects with 4 credits are placed in prime morning slots (8–12). Lower credit subjects fill afternoon slots.

---

### 👩‍🏫 teachers.csv

| Column | Description | Example |
|---|---|---|
| `teacher_id` | Unique ID | `T13` |
| `teacher_name` | Full name | `Prof. H. Prusty` |
| `designation` | Role | `Assistant Professor` |
| `subjects` | Subjects they teach | `"S501,S502"` |
| `max_hours_per_day` | Max teaching hours per day | `5` |
| `available_days` | Working days | `"Mon,Tue,Wed,Thu,Fri"` |

> Use double quotes around comma-separated values: `"S501,S502"` and `"Mon,Tue,Wed,Thu,Fri"`

---

### 🏫 rooms.csv

| Column | Description | Example |
|---|---|---|
| `room_id` | Unique ID | `R01` |
| `room_name` | Display name | `Lecture Hall-A` |
| `capacity` | Max students | `80` |
| `room_type` | `classroom` / `lab` / `activity` | `classroom` |
| `building` | Block name | `Main Block` |

> Lab subjects are automatically matched to `lab` rooms. Classrooms handle theory sessions.

---

### 🎓 classes.csv

| Column | Description | Example |
|---|---|---|
| `class_id` | Unique ID | `C51` |
| `class_name` | Section name | `CSE-5A` |
| `year` | Academic year | `3` |
| `semester` | Semester number | `5` |
| `strength` | Student count | `52` |
| `subjects` | Subject IDs for this class | `"S501,S502,S503,L501"` |

> **The `semester` column is critical.** The ML engine schedules each semester independently, which is how real colleges work and what achieves 100% placement scores.

---

## 🧠 How the ML Algorithm Works

### Step 1 — Parse & Group
CSV data is loaded and classes are grouped by semester. Each semester is an independent scheduling unit.

### Step 2 — Credit-Weighted Priority
Within each semester, subjects are sorted by credit score (descending). Higher credit subjects (4 credits) are placed in prime morning slots (8:00–12:00) first. Lower credit subjects fill afternoon slots.

### Step 3 — Lab Block Placement
Lab subjects are placed first as consecutive 2-hour blocks (e.g. 8:00–10:00 or 1:00–3:00). Both slots are reserved simultaneously to ensure no split labs.

### Step 4 — Theory Slot Assignment
Theory sessions are placed greedily across the week, with a day-usage counter ensuring subjects are spread evenly across Monday–Friday rather than front-loaded on one day.

### Step 5 — Constraint Checking
Every assignment checks:
- Teacher is not already teaching another class in that slot
- Teacher has not exceeded their daily hour limit
- Teacher is available on that day
- Room type matches subject requirement (lab vs classroom)
- Room has enough capacity for class strength

### Step 6 — Multi-Restart Optimization
The scheduler runs 60 iterations per semester group, keeping the best result (highest session placement ratio). Achieving 90%+ score triggers early exit.

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Server health check |
| `GET` | `/api/sample-csvs` | Returns sample CSV file contents |
| `POST` | `/api/generate` | Generate timetable from CSV data or sample |
| `POST` | `/api/analyze` | Conflict detection and statistics |
| `POST` | `/api/export/csv` | Export timetable as downloadable CSV |

### Example — Generate using sample data
```bash
curl -X POST http://localhost:5000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"use_sample": true}'
```

### Example — Upload your own CSV files
```bash
curl -X POST http://localhost:5000/api/generate \
  -F "subjects=@sample_csvs/subjects.csv" \
  -F "teachers=@sample_csvs/teachers.csv" \
  -F "rooms=@sample_csvs/rooms.csv" \
  -F "classes=@sample_csvs/classes.csv"
```

---

## 🖥️ Frontend Features

| Feature | Description |
|---|---|
| Drag & drop upload | Drop any CSV file onto its zone |
| Paste CSV manually | Expand the paste panel and type/paste directly |
| Sample data loader | One click loads the full CSE 4-year curriculum |
| Data preview | See your CSV rows before generating |
| Class timetable view | Weekly grid per section, grouped by semester |
| Teacher timetable view | Any faculty member's full week with class assignments |
| Analysis dashboard | Conflicts, subject frequency, teacher load, credit distribution, day balance |
| Export class CSV | Full class-wise timetable as spreadsheet |
| Export teacher CSV | Full teacher-wise schedule as spreadsheet |
| Export JSON | Machine-readable complete output |
| Print view | Clean printable layout per class |
| Offline demo mode | Generates locally if backend is not running |

---

## 📊 Timetable Views

### Class Timetable
Shows the full weekly schedule for a selected class section. Each cell shows subject name, teacher, room, session type (Theory/Lab), and credit score. Labs appear as 2-hour coloured blocks.

### Teacher Timetable
Shows any faculty member's complete weekly schedule — which subject, which class, and which room for every slot. Includes weekly load summary.

### Analysis
- **Conflict Report** — detects any teacher double-bookings across classes
- **Subject Distribution** — horizontal bar chart of session counts per subject
- **Teacher Weekly Load** — bar chart of total weekly hours per faculty
- **Credit Distribution** — count of subjects by credit value
- **Day Balance** — sessions distributed across Monday–Friday

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Python 3, Flask, Flask-CORS |
| ML/Scheduling | Custom greedy + multi-restart optimization (pandas, numpy) |
| Data Input | CSV files |
| API | REST/JSON |

---

## 📌 Rules for Your Own CSV Files

1. Subject IDs in `teachers.csv` and `classes.csv` must exactly match `subjects.csv`
2. Lab subjects (`requires_lab: true`) need at least one room with `room_type: lab`
3. Use double quotes for comma-separated values: `"S001,S002"` and `"Mon,Tue,Wed"`
4. The `semester` column in `classes.csv` must be a number (1, 2, 3, …, 8)
5. For two sections of the same class (A and B), assign different teachers to the same subjects so they don't conflict
6. Room `capacity` should be ≥ class `strength` for best room matching

---

## ⚙️ Troubleshooting

| Problem | Fix |
|---|---|
| `pip` not found | Use `pip3` instead |
| `ModuleNotFoundError: flask` | Run `pip install flask flask-cors pandas numpy` |
| Port 5000 in use | Change `port=5000` in `backend/app.py` and `API` in `frontend/app.js` to `5001` |
| Low optimization score | Ensure each subject has at least 2 teachers assigned (one per section) |
| Empty timetable for a class | Check the subject IDs in `classes.csv` match exactly with `subjects.csv` |
| CSV not loading | Save file as `.csv` (not `.xlsx`). Open in Notepad to verify comma separation |
