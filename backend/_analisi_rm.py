"""Analisi struttura e duplicati RealeMutua ARROTONDA."""
import pandas as pd

EXCEL = "/Users/giovannipucariello/Desktop/PreventivatoreAndre/preventivatoreagea/resources/RealeMutua.xlsx"
df = pd.read_excel(EXCEL, sheet_name="ARROTONDA")

print("Shape:", df.shape)
print("\nNaN counts in first 6 cols:")
for c in df.columns[:6]:
    n = df[c].isna().sum()
    e = (df[c] == "").sum()
    print(f"  {c}: {n} NaN, {e} empty")

# Duplicates on (ISTAT, codice specie)
key2 = ["codice ISTAT comune", "codice specie"]
dup2 = df.duplicated(subset=key2, keep=False)
print(f"\nDuplicates on (ISTAT, codice specie): {dup2.sum()} rows")

# Duplicates on (Descrizione comune, descrizione specie)
key3 = ["Descrizione comune", "descrizione specie"]
dup3 = df.duplicated(subset=key3, keep=False)
print(f"Duplicates on (Desc comune, Desc specie): {dup3.sum()} rows")

# Show examples of duplicates on (Desc, specie)
if dup3.sum() > 0:
    groups = df[dup3].groupby(key3)
    count = 0
    for name, grp in groups:
        print(f"\n--- Duplicate group: {name}")
        print(f"    ISTAT: {grp['codice ISTAT comune'].tolist()}")
        print(f"    GR intero fr15: {grp['Tasso GR intero fr 15%'].tolist()}")
        count += 1
        if count >= 3:
            break

# Also check: same ISTAT different tasso values
if dup2.sum() > 0:
    groups2 = df[dup2].groupby(key2)
    count = 0
    for name, grp in groups2:
        if len(grp) > 1:
            print(f"\n--- Dup ISTAT+specie: {name}")
            for _, row in grp.iterrows():
                print(f"    Desc: {row['Descrizione comune']}, GR15: {row['Tasso GR intero fr 15%']}")
            count += 1
            if count >= 3:
                break

# Check all tasso columns to understand which ones can vary
tasso_cols = [c for c in df.columns if "Tasso" in str(c)]
print(f"\n\nTotal tasso columns: {len(tasso_cols)}")
print("Tasso columns:", tasso_cols)
