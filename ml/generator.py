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

        self.sub2teach = {}
        for _, t in teach_df.iterrows():
            for s in str(t["subjects"]).split(","):
                s = s.strip()
                if s:
                    self.sub2teach.setdefault(s, []).append(str(t["teacher_id"]))

        self.classrooms = [str(r["room_id"]) for _, r in room_df.iterrows()
                           if str(r["room_type"]).lower() == "classroom"]

        self.labs = [str(r["room_id"]) for _, r in room_df.iterrows()
                     if str(r["room_type"]).lower() == "lab"]
        


def _empty_grid(self, class_ids):
        return {cid: {d: {s: None for s in SLOTS} for d in DAYS} for cid in class_ids}

    def _teacher_free(self, tb, tid, day, slot):
        return (tid, day, slot) not in tb

    def _room_free(self, rb, rid, day, slot):
        return (rid, day, slot) not in rb