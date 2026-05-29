import pandas as pd
df = pd.read_csv("data/exam_malpractice_dataset.csv")
df["Total_Violations"] = df["Tab_Switch_Count"] + df["Copy_Paste_Attempts"] + df["Browser_Minimized_Count"] + df["Suspicious_Key_Presses"]
df["Movement_Score"] = df["Eye_Movement_Score"] + df["Head_Movement_Score"]
df["Device_Issues"] = df["Webcam_Disabled_Count"] + df["Mic_Disabled_Count"] + df["Internet_Disconnection_Count"]
df.to_csv("data/feature_engineered_dataset.csv", index=False)
print("Feature engineering completed and saved.")
