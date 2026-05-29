
from pathlib import Path
import joblib
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, classification_report
from preprocess import preprocess_dataset

MODEL_DIR = Path("models")
X_train, X_test, y_train, y_test = preprocess_dataset()
model = joblib.load(MODEL_DIR / "malpractice_model.pkl")
pred = model.predict(X_test)

print("MODEL EVALUATION")
print("="*50)
print("Accuracy :", round(accuracy_score(y_test, pred), 4))
print("Precision:", round(precision_score(y_test, pred), 4))
print("Recall   :", round(recall_score(y_test, pred), 4))
print("F1 Score :", round(f1_score(y_test, pred), 4))
print("Confusion Matrix:")
print(confusion_matrix(y_test, pred))
print("Classification Report:")
print(classification_report(y_test, pred))
