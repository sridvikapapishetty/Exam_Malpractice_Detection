
from pathlib import Path
import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler

DATA_PATH = Path("data/exam_malpractice_dataset.csv")
MODEL_DIR = Path("models")
MODEL_DIR.mkdir(exist_ok=True)

def preprocess_dataset():
    df = pd.read_csv(DATA_PATH)
    print("Dataset Loaded Successfully")
    for col in df.columns:
        if df[col].dtype == "object":
            df[col] = df[col].fillna(df[col].mode()[0])
        else:
            df[col] = df[col].fillna(df[col].median())
    print("Missing values handled")
    before = df.shape[0]
    df.drop_duplicates(inplace=True)
    print("Duplicates Removed:", before - df.shape[0])

    df["Total_Violations"] = df["Tab_Switch_Count"] + df["Copy_Paste_Attempts"] + df["Browser_Minimized_Count"] + df["Suspicious_Key_Presses"]
    df["Movement_Score"] = df["Eye_Movement_Score"] + df["Head_Movement_Score"]
    df["Device_Issues"] = df["Webcam_Disabled_Count"] + df["Mic_Disabled_Count"] + df["Internet_Disconnection_Count"]
    print("Feature Engineering Completed")

    encoders = {}
    for col in df.select_dtypes(include=["object"]).columns:
        le = LabelEncoder()
        df[col] = le.fit_transform(df[col].astype(str))
        encoders[col] = le
    print("Label Encoding Completed")

    numeric_cols = df.select_dtypes(include=np.number).columns
    for col in numeric_cols:
        if col != "Malpractice_Label":
            q1, q3 = df[col].quantile(0.25), df[col].quantile(0.75)
            iqr = q3 - q1
            lower, upper = q1 - 1.5 * iqr, q3 + 1.5 * iqr
            df[col] = np.clip(df[col], lower, upper)
    print("Outlier Handling Completed")

    X = df.drop("Malpractice_Label", axis=1)
    y = df["Malpractice_Label"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    scaler = StandardScaler()
    X_train = scaler.fit_transform(X_train)
    X_test = scaler.transform(X_test)
    joblib.dump(scaler, MODEL_DIR / "scaler.pkl")
    joblib.dump(list(X.columns), MODEL_DIR / "features.pkl")
    joblib.dump(encoders, MODEL_DIR / "encoders.pkl")
    print("Train Test Split Completed")
    print("Scaler Saved")
    print("Features Saved")
    print("Preprocessing Completed Successfully")
    return X_train, X_test, y_train, y_test

if __name__ == "__main__":
    preprocess_dataset()
