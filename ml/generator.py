"""
TimeForge v2 - Credit-Weighted Timetable Generator
- Schedules one semester at a time (realistic, no cross-semester conflicts)
- Credit-weighted slot priority (high credits → prime morning slots)
- Labs placed as consecutive 2-hour blocks
- Teacher & room double-booking prevented within each semester
- Three output views: class, teacher
"""
import pandas as pd
import random
import copy

DAYS  = ["Monday","Tuesday","Wednesday","Thursday","Friday"]
SLOTS = ["8:00-9:00","9:00-10:00","10:00-11:00","11:00-12:00",
         "12:00-1:00","1:00-2:00","2:00-3:00","3:00-4:00"]
LUNCH      = "12:00-1:00"
THEORY_SL  = [s for s in SLOTS if s != LUNCH]
LAB_PAIRS  = [
    ("8:00-9:00","9:00-10:00"),
    ("9:00-10:00","10:00-11:00"),
    ("1:00-2:00","2:00-3:00"),
    ("2:00-3:00","3:00-4:00"),
]
PRIME     = ["8:00-9:00","9:00-10:00","10:00-11:00","11:00-12:00"]
AFTERNOON = ["1:00-2:00","2:00-3:00","3:00-4:00"]

# ── colour palette for subjects (frontend use) ──────────────────────────────
SUBJECT_COLORS = [
    "#6c63ff","#ff6b6b","#43e97b","#f7971e","#38d9f9",
    "#e040fb","#00e676","#ff9100","#40c4ff","#ea80fc",
    "#69f0ae","#ffff00","#ff6e40","#18ffff","#b9f6ca",
]

class TimetableGenerator:
    def __init__(self, subj_df, teach_df, room_df, class_df):
        self.subj_df  = subj_df.fillna("").copy()
        self.teach_df = teach_df.fillna("").copy()
        self.room_df  = room_df.fillna("").copy()
        self.class_df = class_df.fillna("").copy()

        self.sub_map   = {str(r["subject_id"]): dict(r) for _, r in subj_df.iterrows()}
        self.teach_map = {str(r["teacher_id"]): dict(r) for _, r in teach_df.iterrows()}
        self.room_map  = {str(r["room_id"]):    dict(r) for _, r in room_df.iterrows()}
        self.cls_map   = {str(r["class_id"]):   dict(r) for _, r in class_df.iterrows()}

        # subject_id -> [teacher_ids]
        self.sub2teach = {}
        for _, t in teach_df.iterrows():
            for s in str(t["subjects"]).split(","):
                s = s.strip()
                if s:
                    self.sub2teach.setdefault(s, []).append(str(t["teacher_id"]))

        self.classrooms = [str(r["room_id"]) for _, r in room_df.iterrows()
                           if str(r["room_type"]).lower() == "classroom"]
        self.labs       = [str(r["room_id"]) for _, r in room_df.iterrows()
                           if str(r["room_type"]).lower() == "lab"]

        # assign stable colors to subjects
        sids = list(self.sub_map.keys())
        self.sub_color = {sid: SUBJECT_COLORS[i % len(SUBJECT_COLORS)] for i, sid in enumerate(sids)}

    # ─── grid helpers ────────────────────────────────────────────────────────
    def _empty_grid(self, class_ids):
        return {cid: {d: {s: None for s in SLOTS} for d in DAYS} for cid in class_ids}

    def _teacher_free(self, tb, tid, day, slot):
        return (tid, day, slot) not in tb

    def _room_free(self, rb, rid, day, slot):
        return (rid, day, slot) not in rb

    # ─── pick helpers ────────────────────────────────────────────────────────
    def _pick_teacher(self, tb, daily, sid, day, slot):
        candidates = list(self.sub2teach.get(sid, []))
        random.shuffle(candidates)
        for tid in candidates:
            t    = self.teach_map.get(tid, {})
            maxd = int(t.get("max_hours_per_day", 5) or 5)
            avail = str(t.get("available_days","Mon,Tue,Wed,Thu,Fri"))
            if day[:3] not in avail: continue
            if daily.get((tid, day), 0) >= maxd: continue
            if not self._teacher_free(tb, tid, day, slot): continue
            return tid
        return None

    def _pick_room(self, rb, sid, strength, day, slot):
        sub    = self.sub_map.get(sid, {})
        is_lab = str(sub.get("requires_lab","false")).lower() == "true"
        pool   = self.labs if is_lab else self.classrooms
        random.shuffle(pool)
        str_n  = int(strength or 0)
        for rid in pool:
            r = self.room_map.get(rid, {})
            if int(r.get("capacity", 0) or 0) < str_n: continue
            if self._room_free(rb, rid, day, slot): return rid
        # fallback ignoring capacity
        for rid in pool:
            if self._room_free(rb, rid, day, slot): return rid
        return None

    def _slot_order(self, credits):
        c = int(credits or 3)
        return PRIME + AFTERNOON if c >= 4 else THEORY_SL

    def _make_entry(self, sid, tid, rid, stype, credits):
        sub = self.sub_map.get(sid, {})
        t   = self.teach_map.get(tid, {})
        r   = self.room_map.get(rid, {})
        return {
            "subject_id":   sid,
            "subject_name": sub.get("subject_name", sid),
            "teacher_id":   tid,
            "teacher_name": t.get("teacher_name", tid),
            "room_id":      rid,
            "room_name":    r.get("room_name", rid),
            "type":         stype,
            "credits":      int(credits or 3),
            "color":        self.sub_color.get(sid, "#6c63ff"),
        }

    # ─── schedule one semester group ─────────────────────────────────────────
    def _schedule_group(self, class_ids):
        grid  = self._empty_grid(class_ids)
        tb    = {}   # teacher busy: (tid, day, slot)
        rb    = {}   # room busy:    (rid, day, slot)
        daily = {}   # (tid, day) -> count

        # interleave A/B sections so both get fair access
        interleaved = []
        a = class_ids[::2]; b = class_ids[1::2]
        for i in range(max(len(a), len(b))):
            if i < len(a): interleaved.append(a[i])
            if i < len(b): interleaved.append(b[i])

        for cid in interleaved:
            cls      = self.cls_map.get(cid, {})
            strength = cls.get("strength", 60)
            subs_raw = [s.strip() for s in str(cls.get("subjects","")).split(",") if s.strip()]

            theory, labs = [], []
            for sid in subs_raw:
                sub = self.sub_map.get(sid, {})
                if str(sub.get("requires_lab","false")).lower() == "true":
                    labs.append(sid)
                else:
                    theory.append(sid)

            # sort theory by credits desc → high-credit gets prime slots first
            theory.sort(key=lambda s: -int(self.sub_map.get(s,{}).get("credits",3) or 3))

            day_use = {d: 0 for d in DAYS}

            # ── labs first (2-hr consecutive blocks) ──
            for sid in labs:
                sub     = self.sub_map.get(sid, {})
                lhrs    = int(sub.get("lab_hours_per_week", 2) or 2)
                credits = sub.get("credits", 2)
                for _ in range(max(lhrs // 2, 1)):
                    placed = False
                    for day in sorted(DAYS, key=lambda d: day_use[d]):
                        pairs = list(LAB_PAIRS); random.shuffle(pairs)
                        for s1, s2 in pairs:
                            if grid[cid][day][s1] or grid[cid][day][s2]: continue
                            tid = self._pick_teacher(tb, daily, sid, day, s1)
                            if not tid or not self._teacher_free(tb, tid, day, s2): continue
                            rid = self._pick_room(rb, sid, strength, day, s1)
                            if not rid or not self._room_free(rb, rid, day, s2): continue
                            entry = self._make_entry(sid, tid, rid, "lab", credits)
                            grid[cid][day][s1] = entry
                            grid[cid][day][s2] = {**entry, "lab_continuation": True}
                            tb[(tid,day,s1)] = tb[(tid,day,s2)] = True
                            rb[(rid,day,s1)] = rb[(rid,day,s2)] = True
                            daily[(tid,day)] = daily.get((tid,day),0) + 2
                            day_use[day] += 2
                            placed = True; break
                        if placed: break

            # ── theory sessions ──
            for sid in theory:
                sub     = self.sub_map.get(sid, {})
                hrs     = int(sub.get("hours_per_week", 3) or 3)
                credits = sub.get("credits", 3)
                sorder  = self._slot_order(credits)
                for _ in range(hrs):
                    for day in sorted(DAYS, key=lambda d: day_use[d]):
                        placed = False
                        for slot in sorder:
                            if slot == LUNCH: continue
                            if grid[cid][day][slot]: continue
                            tid = self._pick_teacher(tb, daily, sid, day, slot)
                            if not tid: continue
                            rid = self._pick_room(rb, sid, strength, day, slot)
                            if not rid: continue
                            entry = self._make_entry(sid, tid, rid, "theory", credits)
                            grid[cid][day][slot] = entry
                            tb[(tid,day,slot)] = True
                            rb[(rid,day,slot)]  = True
                            daily[(tid,day)] = daily.get((tid,day),0) + 1
                            day_use[day] += 1
                            placed = True; break
                        if placed: break

        return grid

    # ─── fitness per class ───────────────────────────────────────────────────
    def _class_score(self, cid, grid):
        cls  = self.cls_map.get(cid, {})
        subs = [s.strip() for s in str(cls.get("subjects","")).split(",") if s.strip()]
        req  = 0
        for sid in subs:
            sub = self.sub_map.get(sid, {})
            if not sub: continue
            is_lab = str(sub.get("requires_lab","false")).lower() == "true"
            req += int(sub.get("lab_hours_per_week",2) if is_lab else sub.get("hours_per_week",3) or 3)

        placed       = 0
        soft_penalty = 0

        for day in DAYS:
            seen_today     = []
            day_sess_count = 0
            for slot in SLOTS:
                sess = grid[cid][day][slot]
                if not sess:
                    continue
                placed += 1
                day_sess_count += 1
                sid = sess.get("subject_id","")
                # Penalty: same subject twice on same day
                if sid in seen_today:
                    soft_penalty += 0.8
                seen_today.append(sid)
            # Penalty: more than 5 sessions in one day (overloaded)
            if day_sess_count > 5:
                soft_penalty += (day_sess_count - 5) * 0.5

        # Penalty: teacher teaching more than 4 hours in one day
        teacher_day = {}
        for day in DAYS:
            for slot in SLOTS:
                sess = grid[cid][day][slot]
                if sess:
                    key = f"{sess.get('teacher_id','')}_{day}"
                    teacher_day[key] = teacher_day.get(key, 0) + 1
        for key, count in teacher_day.items():
            if count > 4:
                soft_penalty += (count - 4) * 0.4

        raw_score      = placed / max(req, 1)
        penalty_factor = min(soft_penalty / max(placed, 1), 0.20)
        return raw_score * (1 - penalty_factor)

    # ─── public ──────────────────────────────────────────────────────────────
    def generate(self, iterations=60):
        # group classes by semester
        sem_groups = {}
        for _, cls in self.class_df.iterrows():
            sem = str(cls.get("semester","1"))
            sem_groups.setdefault(sem, []).append(str(cls["class_id"]))

        best_full_grid  = {}
        total_req = total_placed = 0

        for sem, cids in sem_groups.items():
            best_g, best_s = None, -1
            for _ in range(iterations):
                g = self._schedule_group(cids)
                s = sum(self._class_score(c, g) for c in cids) / len(cids)
                if s > best_s:
                    best_s = s; best_g = copy.deepcopy(g)
                if best_s >= 0.92: break
            best_full_grid.update(best_g)

        # overall score — average of per-class scores (includes soft penalties)
        all_scores = [
            self._class_score(cid, best_full_grid)
            for cid in best_full_grid
        ]
        score = round((sum(all_scores) / max(len(all_scores), 1)) * 100, 1)
        return self._build_output(best_full_grid), score

    # ─── output builders ─────────────────────────────────────────────────────
    def _build_output(self, grid):
        return {
            "class":   self._class_view(grid),
            "teacher": self._teacher_view(grid),
        }

    def _class_view(self, grid):
        out = {}
        for _, cls in self.class_df.iterrows():
            cid = str(cls["class_id"])
            if cid not in grid: continue
            tt = {}
            for day in DAYS:
                tt[day] = []
                for slot in SLOTS:
                    sess = grid[cid][day][slot]
                    tt[day].append({"slot": slot, "is_lunch": slot==LUNCH, "session": sess})
            out[cid] = {
                "class_name": cls["class_name"],
                "year":       str(cls.get("year","")),
                "semester":   str(cls.get("semester","")),
                "timetable":  tt,
            }
        return out

    def _teacher_view(self, grid):
        tgrid = {tid: {d: {s: None for s in SLOTS} for d in DAYS} for tid in self.teach_map}
        for cid in grid:
            cn = self.cls_map.get(cid,{}).get("class_name", cid)
            for day in DAYS:
                for slot in SLOTS:
                    sess = grid[cid][day][slot]
                    if sess:
                        tid = sess.get("teacher_id")
                        if tid and tid in tgrid:
                            if tgrid[tid][day][slot] is None:
                                tgrid[tid][day][slot] = {**sess, "class_id": cid, "class_name": cn}
        out = {}
        for tid, t in self.teach_map.items():
            tt = {}
            for day in DAYS:
                tt[day] = []
                for slot in SLOTS:
                    tt[day].append({"slot": slot, "is_lunch": slot==LUNCH, "session": tgrid[tid][day][slot]})
            total = sum(1 for d in DAYS for s in SLOTS if tgrid[tid][d][s])
            out[tid] = {
                "teacher_name": t["teacher_name"],
                "designation":  t.get("designation","Faculty"),
                "total_weekly": total,
                "timetable":    tt,
            }
        return out


def load_and_generate(sp, tp, rp, cp, iterations=60):
    s = pd.read_csv(sp); t = pd.read_csv(tp)
    r = pd.read_csv(rp); c = pd.read_csv(cp)
    gen = TimetableGenerator(s, t, r, c)
    result, score = gen.generate(iterations=iterations)
    return result, score, {
        "subjects": s.to_dict(orient="records"),
        "teachers": t.to_dict(orient="records"),
        "rooms":    r.to_dict(orient="records"),
        "classes":  c.to_dict(orient="records"),
    }
