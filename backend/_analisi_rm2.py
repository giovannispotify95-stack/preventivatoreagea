"""Deeper analysis of duplicates in RealeMutua ARROTONDA."""
import pandas as pd

EXCEL = "/Users/giovannipucariello/Desktop/PreventivatoreAndre/preventivatoreagea/resources/RealeMutua.xlsx"
df = pd.read_excel(EXCEL, sheet_name="ARROTONDA")

tasso_cols = [c for c in df.columns if "Tasso" in str(c)]

# Example with actual different tasso values: ISTAT 71006, specie 0310000
key2 = ["codice ISTAT comune", "codice specie"]
dup2 = df.duplicated(subset=key2, keep=False)

print("=== Duplicati su (ISTAT, codice specie) con tassi diversi ===")
groups = df[dup2].groupby(key2)
count = 0
for name, grp in groups:
    if len(grp) > 1:
        # Check if tasso values actually differ
        tasso_vals = grp[tasso_cols].fillna(0)
        if not all((tasso_vals.iloc[0] == tasso_vals.iloc[i]).all() for i in range(1, len(grp))):
            print(f"\nISTAT={name[0]}, specie={name[1]}")
            for _, row in grp.iterrows():
                desc = row["Descrizione comune"]
                relevant = {c: row[c] for c in tasso_cols if pd.notna(row[c]) and row[c] != 0}
                print(f"  Desc: {desc}")
                for k, v in list(relevant.items())[:5]:
                    print(f"    {k}: {v}")
            count += 1
            if count >= 5:
                break

# Now look at (Descrizione comune, descrizione specie) duplicates with actual tasso
print("\n\n=== Duplicati su (Desc comune, desc specie) con tassi diversi ===")
key3 = ["Descrizione comune", "descrizione specie"]
dup3 = df.duplicated(subset=key3, keep=False)
groups3 = df[dup3].groupby(key3)
count = 0
for name, grp in groups3:
    if len(grp) > 1:
        tasso_vals = grp[tasso_cols].fillna(0)
        rows_differ = not all(
            (tasso_vals.iloc[0] == tasso_vals.iloc[i]).all() for i in range(1, len(grp))
        )
        if rows_differ:
            print(f"\nComune={name[0]}, Specie={name[1]}, rows={len(grp)}")
            for idx, (_, row) in enumerate(grp.iterrows()):
                istat = row["codice ISTAT comune"]
                relevant = {c: row[c] for c in tasso_cols if pd.notna(row[c]) and row[c] != 0}
                print(f"  Row {idx}: ISTAT={istat}, n_tassi={len(relevant)}")
                for k, v in list(relevant.items())[:3]:
                    print(f"    {k}: {v}")
            count += 1
            if count >= 5:
                break

# Check: how many duplicates are just _ALTRI COMUNI entries
altri = df[df["Descrizione comune"].str.startswith("_ALTRI", na=False)]
print(f"\n\nRows starting with '_ALTRI': {len(altri)}")
print("Unique _ALTRI descriptions:", altri["Descrizione comune"].unique().tolist())
