
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from pathlib import Path
import json, csv, uuid, base64, re
from datetime import datetime

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "backend"
SCREENSHOT_DIR = ROOT / "screenshots"
RECORDING_DIR = ROOT / "recordings"
SCREENSHOT_DIR.mkdir(exist_ok=True)
RECORDING_DIR.mkdir(exist_ok=True)

USERS_FILE = DATA_DIR / "students.json"
REPORTS_FILE = DATA_DIR / "exam_reports.json"
EXAMS_FILE = DATA_DIR / "exams.json"
EVIDENCE_PASSWORD = "evidence123"

app = FastAPI(title="Exam Malpractice Detection API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

def read_json(path, default):
    if not path.exists():
        path.write_text(json.dumps(default, indent=2), encoding="utf-8")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default

def write_json(path, data):
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")

def seed():
    read_json(USERS_FILE, [])
    read_json(REPORTS_FILE, [])
    exams = read_json(EXAMS_FILE, [])
    if not exams:
        exams = [{
            "id":"demo-test-1",
            "title":"Real Time MCQ Examination",
            "duration_minutes":20,
            "created_at":datetime.now().isoformat(),
            "questions":[
                {"question":"What is Machine Learning?","options":["Training computers to learn from data","Only typing code","Creating hardware","Deleting files"],"answer":"Training computers to learn from data"},
                {"question":"Which model is used for classification?","options":["Random Forest","K-Means","PCA","Apriori"],"answer":"Random Forest"},
                {"question":"What does DBMS mean?","options":["Database Management System","Data Backup Main Software","Digital Base Memory Service","None"],"answer":"Database Management System"},
                {"question":"Which classifier combines multiple models?","options":["Stacking Classifier","Bubble Sort","Linear Search","HTML Parser"],"answer":"Stacking Classifier"}
            ]
        }]
        write_json(EXAMS_FILE, exams)
seed()

class LoginData(BaseModel):
    username: str
    password: str
    role: str = "student"
    roll_number: str = ""
    department: str = ""

class RegisterData(BaseModel):
    username: str
    password: str
    full_name: str
    roll_number: str
    department: str
    email: str
    year: str = "3rd Year"

class ExamIn(BaseModel):
    title: str
    duration_minutes: int
    questions: list

class EvidencePass(BaseModel):
    password: str

@app.post("/register")
def register(data: RegisterData):
    full_name = data.full_name.strip()
    email = data.email.strip()
    username = data.username.strip()
    roll_number = data.roll_number.strip().upper()

    if len(full_name) < 3:
        raise HTTPException(status_code=400, detail="Full name too short")
    if "@" not in email or "." not in email:
        raise HTTPException(status_code=400, detail="Invalid email")
    if len(username) < 4:
        raise HTTPException(status_code=400, detail="Username minimum 4 characters")
    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Password minimum 6 characters")
    if len(roll_number) < 5:
        raise HTTPException(status_code=400, detail="Invalid roll number")

    users = read_json(USERS_FILE, [])
    for u in users:
        if u.get("username") == username:
            raise HTTPException(status_code=400, detail="Username already exists")

    users.append({
        "username": username,
        "password": data.password,
        "full_name": full_name,
        "roll_number": roll_number,
        "department": data.department,
        "email": email,
        "year": data.year
    })
    write_json(USERS_FILE, users)
    return {"message":"Student registered successfully"}

@app.post("/login")
def login(data: LoginData):
    if data.role == "admin":
        if data.username == "admin" and data.password == "admin123":
            return {"username":"admin", "role":"admin"}
        raise HTTPException(status_code=401, detail="Invalid admin login")

    users = read_json(USERS_FILE, [])
    for u in users:
        if u.get("username") == data.username.strip() and u.get("password") == data.password:
            return {**u, "role":"student"}

    raise HTTPException(status_code=404, detail="Student not found")

@app.get("/exams")
def exams():
    return read_json(EXAMS_FILE, [])

@app.post("/admin/exams")
def create_exam(exam: ExamIn):
    exams = read_json(EXAMS_FILE, [])
    item = exam.dict()
    item["id"] = "exam-" + uuid.uuid4().hex[:8]
    item["created_at"] = datetime.now().isoformat()
    exams.append(item)
    write_json(EXAMS_FILE, exams)
    return {"message":"Exam generated successfully", "exam": item}

def save_base64_file(data_url, folder, ext):
    if not data_url or "," not in data_url:
        return ""
    raw = data_url.split(",", 1)[1]
    name = f"{uuid.uuid4().hex}.{ext}"
    path = folder / name
    path.write_bytes(base64.b64decode(raw))
    return str(path)

@app.post("/submit-report")
def submit_report(report: dict):
    reports = read_json(REPORTS_FILE, [])
    report["id"] = uuid.uuid4().hex
    report["submitted_at"] = datetime.now().isoformat()
    saved_screens = []
    for s in report.get("screenshots", []):
        url = save_base64_file(s.get("image",""), SCREENSHOT_DIR, "jpg")
        if url:
            saved_screens.append({"url":url, "reason":s.get("reason",""), "time":s.get("time","")})
    report["evidence_screenshots"] = saved_screens
    if report.get("recording"):
        report["recording_url"] = save_base64_file(report["recording"], RECORDING_DIR, "webm")
    else:
        report["recording_url"] = ""
    warnings = int(report.get("warnings", 0))
    phone = int(report.get("phone_detected", 0))
    faces = int(report.get("multiple_faces", 0))
    noise = int(report.get("noise_alerts", 0))
    risk = min(100, warnings*15 + phone*20 + faces*20 + noise*10)
    report["risk_score"] = risk
    report["status"] = "Suspicious" if risk >= 45 else "Normal"
    report["admin_analysis_reason"] = report.get("submit_reason") or "Manual Submit"
    reports.append(report)
    write_json(REPORTS_FILE, reports)
    return {"message":"Report submitted"}

@app.get("/admin/reports")
def admin_reports():
    return read_json(REPORTS_FILE, [])

@app.get("/admin/summary")
def admin_summary():
    reports = read_json(REPORTS_FILE, [])
    return {
        "total_reports": len(reports),
        "normal_students": sum(1 for r in reports if r.get("status")=="Normal"),
        "suspicious_students": sum(1 for r in reports if r.get("status")=="Suspicious"),
        "evidence_count": sum(len(r.get("evidence_screenshots",[])) + (1 if r.get("recording_url") else 0) for r in reports)
    }

@app.post("/admin/evidence-password")
def evidence_password(data: EvidencePass):
    if data.password != EVIDENCE_PASSWORD:
        raise HTTPException(401, "Wrong evidence password")
    return {"message":"Evidence unlocked"}

@app.get("/admin/evidence-file")
def evidence_file(path: str, password: str):
    if password != EVIDENCE_PASSWORD:
        raise HTTPException(401, "Wrong password")
    p = Path(path)
    if not p.exists():
        raise HTTPException(404, "Evidence file missing")
    return FileResponse(p)

@app.get("/admin/export-csv")
def export_csv():
    reports = read_json(REPORTS_FILE, [])
    path = DATA_DIR / "reports_export.csv"
    fields = ["username","roll_number","department","exam_title","score","total_questions","warnings","risk_score","status","submit_reason","admin_analysis_reason"]
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for r in reports:
            w.writerow({k:r.get(k,"") for k in fields})
    return FileResponse(path, filename="exam_reports.csv")
