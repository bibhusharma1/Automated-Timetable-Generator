# ⚡ TimeForge v2 — Automated Timetable Generator

## 📁 Project Structure

```
forge-v2/
│
├── 📁 frontend/
│   ├── index.html          ← Main UI (open this in browser)
│   ├── style.css           ← All styling
│   └── app.js              ← All logic (CSV parse, generate, render, export)
│
├── 📁 ml/
│   └── generator.py        ← Scheduling engine (credit-weighted, per-semester)
│
├── 📁 sample_csvs/
│   ├── subjects.csv        ← 74 CSE subjects across 4 years + labs
│   ├── teachers.csv        ← 64 faculty members with subject assignments



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