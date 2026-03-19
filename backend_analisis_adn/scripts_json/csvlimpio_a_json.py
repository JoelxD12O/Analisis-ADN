
import csv
import json

INPUT_FILE = "mutaciones_backend.csv"
OUTPUT_FILE = "mutaciones.json"

data = []

with open(INPUT_FILE, encoding="utf-8") as csvfile:
    reader = csv.DictReader(csvfile)

    for row in reader:
        clean_row = {}

        for key, value in row.items():
            # convertir strings vacíos a null
            if value == "" or value is None:
                clean_row[key] = None
            else:
                clean_row[key] = value

        data.append(clean_row)

with open(OUTPUT_FILE, "w", encoding="utf-8") as jsonfile:
    json.dump(data, jsonfile, indent=2, ensure_ascii=False)

print("✅ JSON listo para DynamoDB:", OUTPUT_FILE)