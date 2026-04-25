"""
TimeForge v2 — Flask Backend
Endpoints:
  GET  /api/health
  GET  /api/sample-csvs
  POST /api/generate        (JSON with csv strings, or multipart files, or use_sample)
  POST /api/analyze
  POST /api/export/csv
"""
import os, sys, io, traceback
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ml.generator import TimetableGenerator

app      = Flask(__name__)
CORS(app, origins=["https://timeforge-v2.vercel.app", "http://localhost:5000"])
ROOT     = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAMPLE   = os.path.join(ROOT, "sample_csvs")

# ── validation ────────────────────────────────────────────────────────────────
REQUIRED_COLS = {
    "subjects": ["subject_id","subject_name","hours_per_week","subject_type","requires_lab","credits"],
    "teachers": ["teacher_id","teacher_name","subjects","max_hours_per_day","available_days"],
    "rooms":    ["room_id","room_name","capacity","room_type"],
    "classes":  ["class_id","class_name","strength","subjects"],
}

def validate(df, name):
    missing = [c for c in REQUIRED_COLS[name] if c not in df.columns]
    return (False, f"{name} CSV missing columns: {missing}") if missing else (True,"ok")

# ── helpers ───────────────────────────────────────────────────────────────────
def load_dfs(data):
    dfs = {}
    for name in ["subjects","teachers","rooms","classes"]:
        csv_str = data.get(name,"")
        if not csv_str:
            return None, f"Missing CSV data: {name}"
        try:
            dfs[name] = pd.read_csv(io.StringIO(csv_str))
        except Exception as e:
            return None, f"Error parsing {name}: {e}"
        ok, msg = validate(dfs[name], name)
        if not ok:
            return None, msg
    return dfs, None

def load_sample_dfs():
    dfs = {}
    for name in ["subjects","teachers","rooms","classes"]:
        path = os.path.join(SAMPLE, f"{name}.csv")
        dfs[name] = pd.read_csv(path)
    return dfs

# ── routes ────────────────────────────────────────────────────────────────────
@app.route("/api/health")
def health():
    return jsonify({"status":"ok","message":"TimeForge v2 API running"})

@app.route("/api/sample-csvs")
def get_samples():
    out = {}
    for name in ["subjects","teachers","rooms","classes"]:
        p = os.path.join(SAMPLE, f"{name}.csv")
        if os.path.exists(p):
            with open(p) as f:
                out[name] = f.read()
    return jsonify(out)

@app.route("/api/generate", methods=["POST"])
def generate():
    try:
        if request.content_type and "multipart" in request.content_type:
            dfs = {}
            for name in ["subjects","teachers","rooms","classes"]:
                if name not in request.files:
                    return jsonify({"error": f"Missing file: {name}.csv"}), 400
                dfs[name] = pd.read_csv(request.files[name])
                ok, msg = validate(dfs[name], name)
                if not ok:
                    return jsonify({"error": msg}), 400
        else:
            body = request.get_json() or {}
            if body.get("use_sample"):
                dfs = load_sample_dfs()
            else:
                dfs, err = load_dfs(body)
                if err:
                    return jsonify({"error": err}), 400

        gen    = TimetableGenerator(dfs["subjects"], dfs["teachers"], dfs["rooms"], dfs["classes"])
        result, score = gen.generate(iterations=80)

        # Stats
        total = sum(
            1 for view in result["class"].values()
            for day_slots in view["timetable"].values()
            for s in day_slots
            if s["session"] and not (s["session"] or {}).get("lab_continuation")
        )
        return jsonify({
            "success":   True,
            "timetable": result,
            "score":     score,
            "stats": {
                "total_sessions": total,
                "classes_count":  len(result["class"]),
                "teachers_count": len(result["teacher"]),
            },
            "metadata": {k: dfs[k].to_dict(orient="records") for k in dfs}
        })
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route("/api/analyze", methods=["POST"])
def analyze():
    try:
        data      = request.get_json() or {}
        timetable = data.get("timetable", {})
        class_tt  = timetable.get("class", {})
        teacher_tt= timetable.get("teacher", {})

        conflicts     = []
        subject_freq  = {}
        teacher_hours = {}

        # Check teacher double-booking across classes
        teacher_slots = {}
        for cid, cls in class_tt.items():
            for day, slots in cls["timetable"].items():
                for s in slots:
                    sess = s.get("session")
                    if not sess or sess.get("lab_continuation"): continue
                    tid = sess.get("teacher_id")
                    key = (tid, day, s["slot"])
                    if key in teacher_slots:
                        conflicts.append(
                            f"{sess['teacher_name']} double-booked on {day} {s['slot']}"
                        )
                    teacher_slots[key] = cid
                    sn = sess.get("subject_name","")
                    subject_freq[sn] = subject_freq.get(sn, 0) + 1

        for tid, tch in teacher_tt.items():
            teacher_hours[tch["teacher_name"]] = tch.get("total_weekly", 0)

        return jsonify({
            "conflicts":      list(set(conflicts)),
            "subject_freq":   subject_freq,
            "teacher_hours":  teacher_hours,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/export/csv", methods=["POST"])
def export_csv():
    try:
        data      = request.get_json() or {}
        timetable = data.get("timetable", {})
        view      = data.get("view", "class")
        rows      = [["Name","Day","Time Slot","Type","Subject","Teacher/Class","Room","Credits","Is Lunch"]]

        if view == "class":
            for cid, cls in timetable.get("class",{}).items():
                for day, slots in cls["timetable"].items():
                    for s in slots:
                        sess = s.get("session")
                        rows.append([
                            cls["class_name"], day, s["slot"],
                            sess["type"] if sess else ("LUNCH" if s["is_lunch"] else "FREE"),
                            sess.get("subject_name","") if sess else "",
                            sess.get("teacher_name","") if sess else "",
                            sess.get("room_name","")    if sess else "",
                            sess.get("credits","")      if sess else "",
                            "Yes" if s["is_lunch"] else "No",
                        ])
        else:
            for tid, tch in timetable.get("teacher",{}).items():
                for day, slots in tch["timetable"].items():
                    for s in slots:
                        sess = s.get("session")
                        rows.append([
                            tch["teacher_name"], day, s["slot"],
                            sess["type"] if sess else ("LUNCH" if s["is_lunch"] else "FREE"),
                            sess.get("subject_name","") if sess else "",
                            sess.get("class_name","")   if sess else "",
                            sess.get("room_name","")    if sess else "",
                            sess.get("credits","")      if sess else "",
                            "Yes" if s["is_lunch"] else "No",
                        ])

        csv_str = "\n".join(",".join(f'"{v}"' for v in row) for row in rows)
        return send_file(
            io.BytesIO(csv_str.encode()),
            mimetype="text/csv",
            as_attachment=True,
            download_name=f"timetable_{view}.csv"
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5000))
    print(f"🚀 TimeForge v2 API  →  http://0.0.0.0:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)