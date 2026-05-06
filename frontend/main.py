from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
import psycopg2.extras
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import cross_val_score
import joblib
import os
import logging
from datetime import date, timedelta
from typing import Optional
import uvicorn

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Sage RH — Health ML Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:9000", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", 5432)),
    "database": os.getenv("DB_NAME", "rh"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "supersecret"),
}

MODEL_DIR = os.getenv("MODEL_DIR", "./models")
os.makedirs(MODEL_DIR, exist_ok=True)

BURNOUT_THRESHOLD = int(os.getenv("BURNOUT_THRESHOLD", 70))


def get_connection():
    return psycopg2.connect(**DB_CONFIG)


def load_attendance_features(months_back: int = 12) -> pd.DataFrame:
    conn = get_connection()
    since = date.today() - timedelta(days=months_back * 30)
    query = """
        SELECT
            e.id            AS employee_id,
            e.matricule,
            e.full_name,
            e.hire_date,
            d.name          AS department,
            et.type         AS employment_type,
            a.date,
            a.clock_in,
            a.debut,
            a.clock_out,
            a.fin,
            EXTRACT(EPOCH FROM a.total_attendance)/3600.0  AS total_hours,
            EXTRACT(EPOCH FROM a.overtime)/3600.0          AS overtime_hours,
            a.horaire,
            ar.reason       AS absence_reason,
            a.appele,
            a.appele_at
        FROM attendance a
        JOIN employee e      ON e.id = a.employee_id
        JOIN department d    ON d.id = e.department_id
        JOIN employment_type et ON et.id = e.employment_type_id
        LEFT JOIN absence_reason ar ON ar.id = a.absence_reason_id
        WHERE a.date >= %s
        ORDER BY e.id, a.date
    """
    df = pd.read_sql_query(query, conn, params=(since,))
    conn.close()
    return df


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"])
    df["year_month"] = df["date"].dt.to_period("M")

    df["is_absent"] = df["absence_reason"].notna() & (df["clock_in"].isna())
    df["is_absent"] = df["is_absent"].fillna(False)

    def parse_time_diff_minutes(t1_str, t2_str):
        if pd.isna(t1_str) or pd.isna(t2_str):
            return np.nan
        try:
            t1 = pd.to_datetime(str(t1_str), format="%H:%M:%S")
            t2 = pd.to_datetime(str(t2_str), format="%H:%M:%S")
            return (t1 - t2).total_seconds() / 60.0
        except Exception:
            return np.nan

    df["lateness_min"] = df.apply(
        lambda r: parse_time_diff_minutes(r["clock_in"], r["debut"]), axis=1
    )
    df["lateness_min"] = df["lateness_min"].clip(lower=0)

    grouped = df.groupby(["employee_id", "year_month"]).agg(
        total_days=("date", "count"),
        absent_days=("is_absent", "sum"),
        overtime_hours=("overtime_hours", "sum"),
        total_hours=("total_hours", "sum"),
        nurse_calls=("appele", "sum"),
        avg_lateness_min=("lateness_min", "mean"),
        unique_absence_reasons=("absence_reason", "nunique"),
    ).reset_index()

    grouped["absence_rate"] = grouped["absent_days"] / grouped["total_days"].clip(lower=1)
    grouped["overtime_rate"] = grouped["overtime_hours"] / grouped["total_hours"].clip(lower=1)
    grouped["chronic_late"] = (grouped["avg_lateness_min"] > 15).astype(int)
    grouped["nurse_call_rate"] = grouped["nurse_calls"] / grouped["total_days"].clip(lower=1)

    emp_info = df[["employee_id", "matricule", "full_name", "department", "hire_date", "employment_type"]].drop_duplicates("employee_id")
    emp_info["hire_date"] = pd.to_datetime(emp_info["hire_date"])
    emp_info["seniority_years"] = (pd.Timestamp.now() - emp_info["hire_date"]).dt.days / 365.25

    features = grouped.merge(emp_info, on="employee_id", how="left")

    le_dept = LabelEncoder()
    le_et = LabelEncoder()
    features["dept_encoded"] = le_dept.fit_transform(features["department"].fillna("UNKNOWN"))
    features["et_encoded"] = le_et.fit_transform(features["employment_type"].fillna("UNKNOWN"))

    return features


def compute_burnout_label(features: pd.DataFrame) -> pd.DataFrame:
    """
    Heuristic labeling for training:
    burnout = 1 if (absence_rate > 0.2 AND overtime_rate > 0.15)
               OR nurse_call_rate > 0.1
               OR (chronic_late AND absence_rate > 0.15)
    """
    df = features.copy()
    df["burnout_label"] = (
        ((df["absence_rate"] > 0.2) & (df["overtime_rate"] > 0.15)) |
        (df["nurse_call_rate"] > 0.1) |
        (df["chronic_late"] == 1) & (df["absence_rate"] > 0.15)
    ).astype(int)
    return df


FEATURE_COLS = [
    "absence_rate", "overtime_rate", "overtime_hours",
    "avg_lateness_min", "nurse_call_rate", "chronic_late",
    "unique_absence_reasons", "seniority_years",
    "dept_encoded", "et_encoded", "total_days",
]


def train_models():
    logger.info("Loading data from PostgreSQL...")
    df_raw = load_attendance_features(months_back=12)

    if df_raw.empty:
        logger.warning("No attendance data found — using dummy model")
        return False

    logger.info(f"Loaded {len(df_raw)} rows for {df_raw['employee_id'].nunique()} employees")

    features = engineer_features(df_raw)
    features = compute_burnout_label(features)

    X = features[FEATURE_COLS].fillna(0)
    y_burnout = features["burnout_label"]

    rf = RandomForestClassifier(
        n_estimators=200,
        max_depth=8,
        min_samples_leaf=3,
        random_state=42,
        class_weight="balanced",
    )

    if len(X) >= 10:
        scores = cross_val_score(rf, X, y_burnout, cv=min(5, len(X)//2), scoring="f1_weighted")
        logger.info(f"Burnout RF CV F1: {scores.mean():.3f} ± {scores.std():.3f}")

    rf.fit(X, y_burnout)
    joblib.dump(rf, f"{MODEL_DIR}/burnout_rf.pkl")
    joblib.dump(FEATURE_COLS, f"{MODEL_DIR}/feature_cols.pkl")

    gb = GradientBoostingClassifier(
        n_estimators=150,
        max_depth=4,
        learning_rate=0.05,
        random_state=42,
    )

    features["future_absent"] = (
        features.groupby("employee_id")["absence_rate"]
        .shift(-1)
        .fillna(0)
        > 0.1
    ).astype(int)

    y_absence = features["future_absent"]
    gb.fit(X, y_absence)
    joblib.dump(gb, f"{MODEL_DIR}/absence_gb.pkl")

    logger.info("Models trained and saved.")
    return True


def load_models():
    burnout_model = None
    absence_model = None
    try:
        burnout_model = joblib.load(f"{MODEL_DIR}/burnout_rf.pkl")
        absence_model = joblib.load(f"{MODEL_DIR}/absence_gb.pkl")
        logger.info("Models loaded from disk.")
    except FileNotFoundError:
        logger.info("No saved models found — will train on first call.")
    return burnout_model, absence_model


burnout_model, absence_model = load_models()


def get_top_risk_factors(model, row: pd.Series, feature_names: list) -> list:
    importances = model.feature_importances_
    values = row[feature_names].fillna(0).values
    weighted = importances * np.abs(values)
    top_idx = np.argsort(weighted)[::-1][:3]
    factor_labels = {
        "absence_rate": "Taux d'absence élevé",
        "overtime_rate": "Surcharge heures supplémentaires",
        "overtime_hours": "Volume heures supp. important",
        "avg_lateness_min": "Retards chroniques",
        "nurse_call_rate": "Appels infirmier fréquents",
        "chronic_late": "Retards répétés",
        "unique_absence_reasons": "Motifs d'absence variés",
        "seniority_years": "Profil ancienneté",
        "dept_encoded": "Département à risque",
        "et_encoded": "Type de contrat",
        "total_days": "Présence irrégulière",
    }
    return [factor_labels.get(feature_names[i], feature_names[i]) for i in top_idx if weighted[i] > 0]


@app.on_event("startup")
async def startup():
    global burnout_model, absence_model
    if burnout_model is None:
        try:
            success = train_models()
            if success:
                burnout_model, absence_model = load_models()
        except Exception as e:
            logger.error(f"Training failed on startup: {e}")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "models_loaded": burnout_model is not None,
        "burnout_threshold": BURNOUT_THRESHOLD,
    }


@app.get("/ml/risk/{matricule}")
def get_employee_risk(matricule: str):
    global burnout_model, absence_model

    if burnout_model is None:
        raise HTTPException(status_code=503, detail="Models not trained yet. Call POST /ml/train first.")

    df_raw = load_attendance_features(months_back=3)
    if df_raw.empty:
        raise HTTPException(status_code=404, detail="No attendance data found.")

    emp_data = df_raw[df_raw["matricule"] == matricule]
    if emp_data.empty:
        raise HTTPException(status_code=404, detail=f"Employee {matricule} not found in attendance data.")

    features = engineer_features(emp_data)
    if features.empty:
        raise HTTPException(status_code=404, detail="Not enough data to compute score.")

    latest = features.sort_values("year_month").iloc[-1]
    X_row = latest[FEATURE_COLS].fillna(0).values.reshape(1, -1)

    burnout_proba = burnout_model.predict_proba(X_row)[0]
    burnout_score = int(burnout_proba[1] * 100)

    absence_proba = absence_model.predict_proba(X_row)[0]
    absence_risk = int(absence_proba[1] * 100)

    risk_factors = get_top_risk_factors(burnout_model, latest, FEATURE_COLS)

    recommendation = None
    if burnout_score >= BURNOUT_THRESHOLD:
        recommendation = {
            "type": "CONGE_BURNOUT",
            "message": f"Score burnout critique ({burnout_score}/100). Repos recommandé.",
            "auto_create_conge": True,
        }

    return {
        "matricule": matricule,
        "full_name": str(latest.get("full_name", "")),
        "department": str(latest.get("department", "")),
        "burnout_score": burnout_score,
        "absence_risk_pct": absence_risk,
        "risk_level": "CRITIQUE" if burnout_score >= 80 else "ÉLEVÉ" if burnout_score >= BURNOUT_THRESHOLD else "MODÉRÉ" if burnout_score >= 40 else "FAIBLE",
        "risk_factors": risk_factors,
        "stats": {
            "absence_rate_pct": round(float(latest["absence_rate"]) * 100, 1),
            "overtime_hours": round(float(latest["overtime_hours"]), 1),
            "avg_lateness_min": round(float(latest["avg_lateness_min"]) if not pd.isna(latest["avg_lateness_min"]) else 0, 1),
            "nurse_calls_month": int(latest["nurse_calls"]),
        },
        "recommendation": recommendation,
    }


@app.get("/ml/dashboard")
def get_dashboard(department: Optional[str] = None):
    global burnout_model, absence_model

    if burnout_model is None:
        raise HTTPException(status_code=503, detail="Models not trained yet.")

    df_raw = load_attendance_features(months_back=3)
    if df_raw.empty:
        return {"employees": [], "summary": {}}

    if department:
        df_raw = df_raw[df_raw["department"] == department]

    features = engineer_features(df_raw)
    latest_per_emp = features.sort_values("year_month").groupby("employee_id").last().reset_index()

    X = latest_per_emp[FEATURE_COLS].fillna(0)
    burnout_probas = burnout_model.predict_proba(X)[:, 1]
    absence_probas = absence_model.predict_proba(X)[:, 1]

    latest_per_emp["burnout_score"] = (burnout_probas * 100).astype(int)
    latest_per_emp["absence_risk"] = (absence_probas * 100).astype(int)
    latest_per_emp["risk_level"] = latest_per_emp["burnout_score"].apply(
        lambda s: "CRITIQUE" if s >= 80 else "ÉLEVÉ" if s >= BURNOUT_THRESHOLD else "MODÉRÉ" if s >= 40 else "FAIBLE"
    )
    latest_per_emp["needs_conge"] = latest_per_emp["burnout_score"] >= BURNOUT_THRESHOLD

    employees = []
    for _, row in latest_per_emp.sort_values("burnout_score", ascending=False).iterrows():
        employees.append({
            "matricule": str(row["matricule"]),
            "full_name": str(row["full_name"]),
            "department": str(row["department"]),
            "burnout_score": int(row["burnout_score"]),
            "absence_risk_pct": int(row["absence_risk"]),
            "risk_level": row["risk_level"],
            "needs_conge": bool(row["needs_conge"]),
            "nurse_calls_month": int(row["nurse_calls"]),
            "absence_rate_pct": round(float(row["absence_rate"]) * 100, 1),
        })

    n_critique = sum(1 for e in employees if e["risk_level"] == "CRITIQUE")
    n_eleve = sum(1 for e in employees if e["risk_level"] == "ÉLEVÉ")
    n_conge = sum(1 for e in employees if e["needs_conge"])

    return {
        "employees": employees,
        "summary": {
            "total": len(employees),
            "critique": n_critique,
            "eleve": n_eleve,
            "needs_conge": n_conge,
            "avg_burnout_score": round(float(latest_per_emp["burnout_score"].mean()), 1) if len(latest_per_emp) > 0 else 0,
        },
    }


@app.post("/ml/train")
def trigger_training(background_tasks: BackgroundTasks):
    def _train():
        global burnout_model, absence_model
        try:
            success = train_models()
            if success:
                burnout_model, absence_model = load_models()
                logger.info("Models retrained successfully.")
        except Exception as e:
            logger.error(f"Training error: {e}")

    background_tasks.add_task(_train)
    return {"message": "Training started in background."}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
