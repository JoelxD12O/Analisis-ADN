import argparse
import json
from pathlib import Path

import boto3


DEFAULT_JSON_PATH = (
    Path(__file__).resolve().parent.parent / "scripts_json" / "mutaciones.json"
)


def parse_args():
    parser = argparse.ArgumentParser(
        description="Importa mutaciones desde un archivo JSON a una tabla de DynamoDB."
    )
    parser.add_argument(
        "--json",
        default=str(DEFAULT_JSON_PATH),
        help="Ruta al archivo JSON de mutaciones.",
    )
    parser.add_argument(
        "--table",
        default="MutacionesTable",
        help="Nombre de la tabla DynamoDB destino.",
    )
    parser.add_argument(
        "--region",
        default="us-east-1",
        help="Region AWS donde vive la tabla.",
    )
    return parser.parse_args()


def load_mutations(json_path):
    path = Path(json_path)

    if not path.exists():
        raise FileNotFoundError(f"No existe el archivo JSON: {path}")

    with path.open(encoding="utf-8") as file:
        data = json.load(file)

    if not isinstance(data, list):
        raise ValueError("El archivo JSON debe contener una lista de mutaciones.")

    for index, item in enumerate(data, start=1):
        if not isinstance(item, dict):
            raise ValueError(f"La entrada #{index} no es un objeto JSON valido.")
        if not item.get("id"):
            raise ValueError(f"La entrada #{index} no tiene campo 'id'.")

    return data


def import_mutations(items, table_name, region_name):
    dynamodb = boto3.resource("dynamodb", region_name=region_name)
    table = dynamodb.Table(table_name)

    imported = 0
    with table.batch_writer() as batch:
        for item in items:
            batch.put_item(Item=item)
            imported += 1

    return imported


def main():
    args = parse_args()
    items = load_mutations(args.json)
    imported = import_mutations(items, args.table, args.region)

    print(
        f"Importacion completada: {imported} registros cargados en "
        f"'{args.table}' ({args.region})."
    )


if __name__ == "__main__":
    main()
