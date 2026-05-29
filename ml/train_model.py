
from pathlib import Path
import joblib
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, StackingClassifier
from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier
from preprocess import preprocess_dataset

MODEL_DIR = Path("models")
MODEL_DIR.mkdir(exist_ok=True)

X_train, X_test, y_train, y_test = preprocess_dataset()

models = {
    "logistic_regression": LogisticRegression(max_iter=1000),
    "decision_tree": DecisionTreeClassifier(random_state=42),
    "random_forest": RandomForestClassifier(n_estimators=150, random_state=42),
    "svm": SVC(kernel="rbf", probability=True, random_state=42),
    "knn": KNeighborsClassifier(n_neighbors=5)
}

for name, model in models.items():
    print("Training", name)
    model.fit(X_train, y_train)
    joblib.dump(model, MODEL_DIR / f"{name}.pkl")

base_models = [
    ("lr", LogisticRegression(max_iter=1000)),
    ("dt", DecisionTreeClassifier(random_state=42)),
    ("rf", RandomForestClassifier(n_estimators=150, random_state=42)),
    ("svm", SVC(kernel="rbf", probability=True, random_state=42)),
    ("knn", KNeighborsClassifier(n_neighbors=5))
]

stacking = StackingClassifier(
    estimators=base_models,
    final_estimator=LogisticRegression(max_iter=1000),
    cv=5
)
print("Training Final Stacking Classifier...")
stacking.fit(X_train, y_train)
joblib.dump(stacking, MODEL_DIR / "malpractice_model.pkl")
print("All Models Trained Successfully")
print("Final Stacking Model Saved")
