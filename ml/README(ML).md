#  TimeForge v2: ML-Driven Timetable Engine

This directory contains the core logic for the **Automated Timetable Generator**, a heuristic-based scheduling engine designed to solve the complex constraints of academic planning.

##  Key Features

* **Credit-Weighted Scheduling**: Automatically prioritizes high-credit core subjects for prime morning slots (8:00 AM - 12:00 PM).
* **Heuristic Optimization**: Employs an iterative scoring system that runs up to 60 simulations per semester to find the highest-density schedule.
* **Lab-Block Logic**: Recognizes laboratory requirements and schedules them in consecutive 2-hour blocks to maintain pedagogical continuity.
* **Conflict Resolution**: Hard-coded prevention of teacher double-booking and room capacity violations.
* **Multi-View Output**: Generates dedicated schedules for both individual classes and faculty workloads.

##  Technical Logic

The engine follows a structured pipeline:
1.  **Data Mapping**: Ingests CSV data into relational maps for rapid lookup.
2.  **Constraint Validation**: Checks teacher availability (`max_hours_per_day`) and room types (`Lab` vs. `Classroom`) before placement.
3.  **Fitness Scoring**: Evaluates each iteration using a placement density formula:
    $$Score = \frac{\text{Placed Sessions}}{\text{Required Hours}}$$
4.  **Convergence**: The algorithm terminates early once a semester reaches a **92% efficiency** threshold or completes its iteration limit.

##  File Structure

| File | Description |
| :--- | :--- |
| `generator.py` | The main engine containing the `TimetableGenerator` class and optimization logic. |
| `sample_csvs/` | Example data structures for Subjects, Teachers, Rooms, and Classes. |

##  Contributors 
- Alibha Jena
- Guptesh Kumar Giri
