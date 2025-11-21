# 📊 DataLakeQ — Lightweight Data Quality Gate

**FastAPI + React + Pandas**

DataLakeQ is a plug-and-play **data quality firewall** for Lakehouse pipelines.  
Upload any CSV → get a full trust score, contract validation, PII scan, outlier analysis, and drift detection in one unified dashboard.

**Output:** 0–100 Quality Score + **GREEN / YELLOW / RED** Label  
**Engine:** FastAPI + Pandas  
**UI:** React + Vite + TypeScript

---

## 🚀 Features

### ✔ Basic Profiling
- Row & column count  
- Missing values (total + per column)  
- Duplicate rows  

### ✔ Contract Validation (YAML)
- Required columns  
- Type mismatches  
- Unique key violations  

### ✔ PII Detection
Detects:
- Emails  
- Phone-like patterns  
- Long numeric ID-like patterns  

### ✔ Outlier Detection
- z-score method  
- Outlier ratio per numeric column  
- Severity classification  

### ✔ Drift Detection
- Baseline auto-created on first run  
- Mean comparison on subsequent runs  
- Flags drift when change > 30%  

### ✔ Scoring Engine
- 0–100 score based on all checks  
- Labels:  
  - **GREEN (80–100)**  
  - **YELLOW (50–79)**  
  - **RED (0–49)**  

---

## 🧪 Included Demo Data
Located in `/data`:
- `customers_v1.csv` → baseline dataset  
- `customers_v2.csv` → drift version  

Contract is defined in:  
- `contracts/customers.yaml`

---

## 🛠 Setup

### 1. Clone
```bash
git clone https://github.com/<your-username>/DataLakeQuality.git
cd DataLakeQuality
```

### 2. Backend (FastAPI)
```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# Linux/Mac
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend runs at:
- Health: [http://localhost:8000/health](http://localhost:8000/health)  
- Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

### 3. Frontend (React)
```bash
cd ../frontend
npm install
npm run dev
```

Open the dashboard:  
👉 [http://localhost:5173](http://localhost:5173)

---

## 🧠 How to Use (Demo Workflow)
1. Open frontend UI  
2. Dataset name → `customers`  
3. Upload `customers_v1.csv` → baseline created  
4. Upload `customers_v2.csv` → drift detected  
5. View:  
   - Quality score  
   - Contract issues  
   - PII detection  
   - Outliers  
   - Drift analysis  
   - Raw JSON (debug)  

---

## 📡 API Endpoint

**POST** `/analyze`

**Form-Data:**
- `dataset_name` (string)  
- `file` (CSV upload)  

**Returns:**
```json
{
  "dataset_name": "customers",
  "quality_score": 75.0,
  "quality_label": "YELLOW",
  "summary": {...},
  "contract": {...},
  "pii": {...},
  "outliers": {...},
  "drift": {...},
  "generated_at": "2025-11-21T15:34:41Z"
}
```

---

## 📁 Project Structure
```
backend/
  app/
    main.py
    core/
      quality_gate.py
      contracts.py
      pii.py
      outliers.py
      drift.py
      scoring.py
    models/
      report.py
    utils/
      io.py
contracts/
  customers.yaml
data/
  customers_v1.csv
  customers_v2.csv
frontend/
  src/App.tsx
```

---

## 📜 License
MIT License

---

## 🏁 Hackathon Notes
This build is optimized for:
- Fast demo  
- Clear scoring  
- Realistic drift detection  
- Simple, explainable checks  
- Clean React UI  
- Fully reproducible workflow  
```