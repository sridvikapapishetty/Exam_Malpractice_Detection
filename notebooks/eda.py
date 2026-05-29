import pandas as pd
df = pd.read_csv("data/exam_malpractice_dataset.csv")
print(df.head())
print(df.info())
print(df.describe())
print(df["Malpractice_Label"].value_counts())
