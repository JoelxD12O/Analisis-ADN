import json
import uuid
import os
from datetime import datetime, timezone

import boto3
from boto3.dynamodb.conditions import Attr

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['TABLE_NAME'])
misses_table = dynamodb.Table(os.environ['MISSES_TABLE_NAME'])


CODON_TABLE = {
    "TTT": "Phe", "TTC": "Phe",
    "TTA": "Leu", "TTG": "Leu", "CTT": "Leu", "CTC": "Leu", "CTA": "Leu", "CTG": "Leu",
    "ATT": "Ile", "ATC": "Ile", "ATA": "Ile",
    "ATG": "Met",
    "GTT": "Val", "GTC": "Val", "GTA": "Val", "GTG": "Val",
    "TCT": "Ser", "TCC": "Ser", "TCA": "Ser", "TCG": "Ser", "AGT": "Ser", "AGC": "Ser",
    "CCT": "Pro", "CCC": "Pro", "CCA": "Pro", "CCG": "Pro",
    "ACT": "Thr", "ACC": "Thr", "ACA": "Thr", "ACG": "Thr",
    "GCT": "Ala", "GCC": "Ala", "GCA": "Ala", "GCG": "Ala",
    "TAT": "Tyr", "TAC": "Tyr",
    "TAA": "STOP", "TAG": "STOP", "TGA": "STOP",
    "CAT": "His", "CAC": "His",
    "CAA": "Gln", "CAG": "Gln",
    "AAT": "Asn", "AAC": "Asn",
    "AAA": "Lys", "AAG": "Lys",
    "GAT": "Asp", "GAC": "Asp",
    "GAA": "Glu", "GAG": "Glu",
    "TGT": "Cys", "TGC": "Cys",
    "TGG": "Trp",
    "CGT": "Arg", "CGC": "Arg", "CGA": "Arg", "CGG": "Arg", "AGA": "Arg", "AGG": "Arg",
    "GGT": "Gly", "GGC": "Gly", "GGA": "Gly", "GGG": "Gly",
}

CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
}


def _ok(data, status=200):
    return {"statusCode": status, "headers": CORS_HEADERS, "body": json.dumps(data)}


def _err(msg, status=400):
    return {"statusCode": status, "headers": CORS_HEADERS, "body": json.dumps({"error": str(msg)})}


def translate_codon(codon):
    if codon is None:
        return None
    return CODON_TABLE.get(str(codon).upper())


def classify_mutation(codon_o, codon_m):
    if codon_m is None:
        return "frameshift"
    if codon_o == codon_m:
        return "silent"
    aa_original = translate_codon(codon_o)
    aa_mutated = translate_codon(codon_m)
    if aa_mutated == "STOP":
        return "nonsense"
    if aa_original and aa_mutated and aa_original == aa_mutated:
        return "silent"
    return "missense"


def infer_effect(mutation_type):
    return {
        "missense": "amino_acid_change",
        "nonsense": "protein_truncated",
        "silent": "no_effect",
        "frameshift": "protein_disrupted",
        "expansion": "protein_disrupted",
    }.get(mutation_type, "unknown")


def normalize_nullable(value):
    if value in ("", "null", "None", None):
        return None
    return str(value)


def build_analysis_payload(mutation_type, result, codon_o, codon_m):
    aa_from = result.get("aa_original") if result else translate_codon(codon_o)
    aa_to = result.get("aa_mutated") if result else translate_codon(codon_m)
    effect = result.get("effect") if result else infer_effect(mutation_type)
    return {
        "mutation_type": mutation_type,
        "effect": effect,
        "aa_change": {"from": aa_from, "to": aa_to},
    }


def build_clinical_payload(result):
    if not result:
        return {"match_found": False, "disease": None, "significance": None}
    return {
        "match_found": True,
        "disease": result.get("disease"),
        "significance": result.get("clinical_significance"),
    }


def mutation_type_sentence(mutation_type):
    labels = {
        "missense": "Se trata de una mutacion missense, en la que un aminoacido es sustituido por otro.",
        "nonsense": "Se trata de una mutacion nonsense, que introduce una senal de terminacion prematura.",
        "silent": "Se trata de una mutacion silent, en la que cambia el codon pero no el aminoacido final.",
        "frameshift": "Se trata de una mutacion frameshift, que altera el marco de lectura de la secuencia.",
        "expansion": "Se trata de una mutacion por expansion, asociada al aumento anormal de repeticiones en la secuencia.",
    }
    return labels.get(mutation_type, "Se trata de una variante genetica cuyo tipo no pudo clasificarse con precision.")


def molecular_sentence(mutation_type, effect, aa_change):
    aa_from = aa_change.get("from")
    aa_to = aa_change.get("to")
    if mutation_type == "missense":
        if aa_from and aa_to:
            return (f"El cambio de aminoacido de {aa_from} a {aa_to} puede modificar "
                    "las propiedades fisicoquimicas de la proteina y afectar su estabilidad, plegamiento o funcion.")
        return "La sustitucion aminoacidica puede alterar la estructura o funcion de la proteina."
    if mutation_type == "nonsense" or effect == "protein_truncated":
        if aa_from:
            return (f"La sustitucion convierte el residuo original {aa_from} en un codon STOP, "
                    "lo que produce una proteina truncada y potencial perdida de dominios funcionales.")
        return "La variante introduce un codon STOP prematuro y puede generar una proteina truncada."
    if mutation_type == "silent" or effect == "no_effect":
        if aa_from and aa_to:
            return (f"Aunque el codon cambia, el aminoacido se mantiene ({aa_from} a {aa_to}), "
                    "por lo que el impacto directo sobre la secuencia proteica suele ser minimo.")
        return "Aunque existe un cambio nucleotidico, no se espera modificacion directa de la secuencia proteica."
    if mutation_type in ("frameshift", "expansion") or effect == "protein_disrupted":
        return ("La alteracion del marco de lectura modifica los codones aguas abajo y puede "
                "producir una proteina anomala o incompleta, con alta probabilidad de perdida funcional.")
    return "El efecto molecular exacto no puede definirse con seguridad con los datos disponibles."


def clinical_sentence(clinical):
    disease = clinical.get("disease")
    significance = clinical.get("significance")
    if not clinical.get("match_found"):
        return ("No se encontro una asociacion clinica especifica en la base de datos para esta variante. "
                "Por ello, no hay evidencia suficiente para atribuirle una enfermedad concreta, aunque su "
                "impacto teorico depende del tipo de mutacion y del gen afectado.")
    significance_labels = {
        "pathogenic": "Se considera patogenica, lo que apoya una relevancia clinica directa.",
        "likely_pathogenic": "Se considera probablemente patogenica, por lo que tiene relevancia clinica importante.",
        "benign": "Se clasifica como benigna, por lo que no sugiere un impacto clinico significativo por si sola.",
        "uncertain": "Su significado clinico es incierto, por lo que la interpretacion debe hacerse con cautela.",
        "risk_factor": "Se interpreta como factor de riesgo y no necesariamente como causa unica de enfermedad.",
    }
    disease_text = (f"Esta variante se ha asociado con {disease}. " if disease
                    else "Existe una referencia clinica para esta variante, aunque no se especifica una enfermedad concreta. ")
    return disease_text + significance_labels.get(significance, "La significancia clinica disponible no permite una conclusion firme.")


def build_report(analysis, clinical):
    return {
        "Resumen": mutation_type_sentence(analysis["mutation_type"]),
        "Interpretacion molecular": molecular_sentence(analysis["mutation_type"], analysis["effect"], analysis["aa_change"]),
        "Relevancia clinica": clinical_sentence(clinical),
    }


def _save_miss(codon_o, codon_m, mutation_type, aa_from, aa_to):
    """Guarda silenciosamente una comparacion sin match en la BD."""
    try:
        misses_table.put_item(Item={
            "id": str(uuid.uuid4()),
            "codon_original": codon_o or "",
            "codon_mutated": codon_m or "",
            "mutation_type": mutation_type,
            "aa_from": aa_from or "",
            "aa_to": aa_to or "",
            "submitted_at": datetime.now(timezone.utc).isoformat(),
            "notes": "",
        })
    except Exception:
        pass


# ── Endpoint principal ────────────────────────────────────────────────────────

def analyze(event, context):
    try:
        body = json.loads(event.get('body', '{}'))
        codon_o = normalize_nullable(body.get("codon_original"))
        codon_m = normalize_nullable(body.get("codon_mutated"))
        mutation_type = classify_mutation(codon_o, codon_m)

        # DynamoDB scan con filtro
        filter_expr = Attr("codon_original").eq(codon_o) & Attr("codon_mutated").eq(codon_m)
        response = table.scan(FilterExpression=filter_expr)
        items = response.get("Items", [])

        result = items[0] if items else None

        analysis = build_analysis_payload(mutation_type, result, codon_o, codon_m)
        clinical = build_clinical_payload(result)
        report = build_report(analysis, clinical)

        if result is None:
            _save_miss(
                codon_o, codon_m, mutation_type,
                analysis["aa_change"]["from"],
                analysis["aa_change"]["to"],
            )

        return _ok({
            "input": {"codon_original": codon_o, "codon_mutated": codon_m},
            "analysis": analysis,
            "clinical": clinical,
            "report": report,
            "match": result,
        })

    except Exception as e:
        return _err(e, 500)


# ── /misses  GET ──────────────────────────────────────────────────────────────

def get_misses(event, context):
    try:
        qs = event.get("queryStringParameters") or {}
        limit = int(qs.get("limit", 20))
        last_key_raw = qs.get("last_key")
        filter_type = str(qs.get("mutation_type", "")).strip().lower()
        filter_co = str(qs.get("codon_original", "")).strip().upper()
        filter_cm = str(qs.get("codon_mutated", "")).strip().upper()

        scan_kwargs = {"Limit": min(limit, 100)}

        conditions = []
        if filter_type:
            conditions.append(Attr("mutation_type").eq(filter_type))
        if filter_co:
            conditions.append(Attr("codon_original").eq(filter_co))
        if filter_cm:
            conditions.append(Attr("codon_mutated").eq(filter_cm))
        
        if conditions:
            expr = conditions[0]
            for c in conditions[1:]:
                expr = expr & c
            scan_kwargs["FilterExpression"] = expr

        if last_key_raw:
            try:
                scan_kwargs["ExclusiveStartKey"] = json.loads(last_key_raw)
            except Exception:
                pass

        response = misses_table.scan(**scan_kwargs)
        items = response.get("Items", [])
        items.sort(key=lambda x: x.get("submitted_at", ""), reverse=True)

        next_key = response.get("LastEvaluatedKey")
        return _ok({
            "items": items,
            "count": len(items),
            "next_key": json.dumps(next_key) if next_key else None,
        })
    except Exception as e:
        return _err(e, 500)


def create_miss(event, context):
    try:
        body = json.loads(event.get("body", "{}"))
        codon_o = normalize_nullable(body.get("codon_original", ""))
        codon_m = normalize_nullable(body.get("codon_mutated", ""))

        if not codon_o or not codon_m:
            return _err("codon_original y codon_mutated son requeridos.")

        mutation_type = classify_mutation(codon_o, codon_m)
        aa_from = translate_codon(codon_o)
        aa_to = translate_codon(codon_m)

        item = {
            "id": str(uuid.uuid4()),
            "codon_original": codon_o.upper(),
            "codon_mutated": codon_m.upper(),
            "mutation_type": mutation_type,
            "aa_from": aa_from or "",
            "aa_to": aa_to or "",
            "submitted_at": datetime.now(timezone.utc).isoformat(),
            "notes": str(body.get("notes", "")),
            "disease_hint": str(body.get("disease_hint", "")),
        }
        misses_table.put_item(Item=item)
        return _ok(item, 201)
    except Exception as e:
        return _err(e, 500)


# ── /db-entries  GET/POST ─────────────────────────────────────────────────────

def get_db_entries(event, context):
    try:
        qs = event.get("queryStringParameters") or {}
        limit = int(qs.get("limit", 20))
        last_key_raw = qs.get("last_key")
        filter_type = str(qs.get("mutation_type", "")).strip().lower()
        filter_co = str(qs.get("codon_original", "")).strip().upper()
        filter_cm = str(qs.get("codon_mutated", "")).strip().upper()
        filter_disease = str(qs.get("disease", "")).strip().lower()

        scan_kwargs = {"Limit": min(limit, 100)}

        conditions = []
        if filter_type:
            conditions.append(Attr("mutation_type").eq(filter_type))
        if filter_co:
            conditions.append(Attr("codon_original").eq(filter_co))
        if filter_cm:
            conditions.append(Attr("codon_mutated").eq(filter_cm))
        if filter_disease:
            conditions.append(Attr("disease").contains(filter_disease))
        
        if conditions:
            expr = conditions[0]
            for c in conditions[1:]:
                expr = expr & c
            scan_kwargs["FilterExpression"] = expr

        if last_key_raw:
            try:
                scan_kwargs["ExclusiveStartKey"] = json.loads(last_key_raw)
            except Exception:
                pass

        response = table.scan(**scan_kwargs)
        items = response.get("Items", [])
        next_key = response.get("LastEvaluatedKey")

        return _ok({
            "items": items,
            "count": len(items),
            "next_key": json.dumps(next_key) if next_key else None,
        })
    except Exception as e:
        return _err(e, 500)


def create_db_entry(event, context):
    try:
        body = json.loads(event.get("body", "{}"))
        codon_o = normalize_nullable(body.get("codon_original", ""))
        codon_m = normalize_nullable(body.get("codon_mutated", ""))
        disease = str(body.get("disease", "")).strip()

        if not codon_o or not codon_m or not disease:
            return _err("codon_original, codon_mutated y disease son requeridos.")

        mutation_type = body.get("mutation_type") or classify_mutation(codon_o, codon_m)
        co_up = (codon_o or "VAR").upper()
        cm_up = (codon_m or "VAR").upper()

        item = {
            "id": str(body.get("id") or f"{str(body.get('gene', 'VAR'))}_{co_up}_{cm_up}"),
            "gene": str(body.get("gene", "Desconocido")).strip(),
            "codon_original": co_up,
            "codon_mutated": cm_up,
            "aa_original": str(body.get("aa_original") or translate_codon(co_up)),
            "aa_mutated": str(body.get("aa_mutated") or translate_codon(cm_up)),
            "mutation_type": str(mutation_type),
            "effect": str(body.get("effect") or infer_effect(str(mutation_type))),
            "disease": disease,
            "clinical_significance": str(body.get("clinical_significance", "uncertain")),
            "notes": str(body.get("notes", "")).strip(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        table.put_item(Item=item)
        return _ok(item, 201)
    except Exception as e:
        return _err(e, 500)
