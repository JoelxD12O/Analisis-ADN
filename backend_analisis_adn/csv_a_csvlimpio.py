import csv

INPUT_FILE = "Dataset.csv"
OUTPUT_FILE = "mutaciones_backend.csv"

# Tipos de mutación (estandarizados en inglés)
mutation_map = {
    "missense": "missense",
    "nonsense": "nonsense",
    "silenciosa": "silent",
    "silent": "silent",
    "frameshift": "frameshift",
    "expansion": "expansion"
}

# Significancia clínica (normalizada)
clinical_map = {
    "patogénica": "pathogenic",
    "probablemente patogénica": "likely_pathogenic",
    "benigna": "benign",
    "factor de riesgo": "risk_factor",
    "riesgo": "risk_factor",  # 🔥 FIX importante
    "variable": "uncertain"
}

# Efecto biológico (clave para IA)
effect_map = {
    "missense": "amino_acid_change",
    "nonsense": "protein_truncated",
    "silent": "no_effect",
    "frameshift": "protein_disrupted",
    "expansion": "protein_disrupted"
}

def clean_value(value):
    if value is None:
        return None

    value = value.strip()

    # 🔥 limpieza importante
    if value.lower() in ["", "---", "deleción", "deletion"]:
        return None

    return value

with open(INPUT_FILE, newline='', encoding='utf-8') as infile, \
     open(OUTPUT_FILE, mode='w', newline='', encoding='utf-8') as outfile:

    reader = csv.reader(infile)

    # Saltar encabezado original (aunque esté mal)
    next(reader)

    fieldnames = [
        "id",
        "gene",
        "codon_original",
        "codon_mutated",
        "aa_original",
        "aa_mutated",
        "mutation_type",
        "effect",
        "disease",
        "clinical_significance"
    ]

    writer = csv.DictWriter(outfile, fieldnames=fieldnames)
    writer.writeheader()

    for row in reader:
        # 🔧 corregir si hay columna vacía al inicio
        if row[0] == "":
            row = row[1:]

        if len(row) < 8:
            continue  # fila inválida

        gene, codon_o, codon_m, aa_o, aa_m, mut_type, disease, clinical = row

        # Normalizar valores
        mut_type = mutation_map.get(mut_type.strip().lower(), mut_type.strip().lower())
        clinical = clinical_map.get(clinical.strip().lower(), clinical.strip().lower())
        effect = effect_map.get(mut_type, "unknown")

        # Limpiar datos
        gene = clean_value(gene)
        codon_o = clean_value(codon_o)
        codon_m = clean_value(codon_m)
        aa_o = clean_value(aa_o)
        aa_m = clean_value(aa_m)
        disease = clean_value(disease)

        # 🔥 ID limpio (sin None)
        codon_o_safe = codon_o if codon_o else "null"
        codon_m_safe = codon_m if codon_m else "null"
        unique_id = f"{gene}_{codon_o_safe}_{codon_m_safe}"

        cleaned_row = {
            "id": unique_id,
            "gene": gene,
            "codon_original": codon_o,
            "codon_mutated": codon_m,
            "aa_original": aa_o,
            "aa_mutated": aa_m,
            "mutation_type": mut_type,
            "effect": effect,
            "disease": disease,
            "clinical_significance": clinical
        }

        writer.writerow(cleaned_row)

print("✅ CSV backend listo:", OUTPUT_FILE)