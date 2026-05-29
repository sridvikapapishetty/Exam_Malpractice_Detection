
# Exam Malpractice Detection - Final Clean Real Time Project

## Run Steps

### 1. Install Python packages
```powershell
pip install -r requirements.txt
```

### 2. Run ML
```powershell
python ml/preprocess.py
python ml/train_model.py
python ml/evaluate_model.py
```

### 3. Start backend
```powershell
cd backend
python -m uvicorn main:app --reload
```

### 4. Start frontend in new terminal
```powershell
cd frontend
npm install
npm run dev
```

Open:
http://localhost:5173

## Admin Login
username: admin
password: admin123

## Evidence Password
evidence123

## Features
- Strict student registration validation
- Admin test creation
- Student test selection
- AI proctoring monitoring
- Phone/multiple face/noise/tab/copy warnings
- Smart warnings: questions > 30 gives 5 chances, else 3
- Screenshot and video evidence
- Admin analytics graphs and CSV export
- ML dataset, preprocessing, training, evaluation


## UI Fixes Added
- Blue professional UI
- Evidence controls aligned properly
- Submitted time shown in admin report
- Warning timeline shown with exact warning time
