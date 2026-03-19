import json
import boto3
import os

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['TABLE_NAME'])


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


def translate_codon(codon):
    if codon is None:
        return None
    return CODON_TABLE.get(codon.upper())


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
    effect_map = {
        "missense": "amino_acid_change",
        "nonsense": "protein_truncated",
        "silent": "no_effect",
        "frameshift": "protein_disrupted",
        "expansion": "protein_disrupted"
    }
    return effect_map.get(mutation_type, "unknown")


def normalize_nullable(value):
    if value in ("", "null", "None"):
        return None
    return value


def build_analysis_payload(mutation_type, result, codon_o, codon_m):
    aa_from = result.get("aa_original") if result else translate_codon(codon_o)
    aa_to = result.get("aa_mutated") if result else translate_codon(codon_m)
    effect = result.get("effect") if result else infer_effect(mutation_type)

    return {
        "mutation_type": mutation_type,
        "effect": effect,
        "aa_change": {
            "from": aa_from,
            "to": aa_to
        }
    }


def build_clinical_payload(result):
    if not result:
        return {
            "match_found": False,
            "disease": None,
            "significance": None
        }

    return {
        "match_found": True,
        "disease": result.get("disease"),
        "significance": result.get("clinical_significance")
    }


def mutation_type_sentence(mutation_type):
    labels = {
        "missense": "Se trata de una mutacion missense, en la que un aminoacido es sustituido por otro.",
        "nonsense": "Se trata de una mutacion nonsense, que introduce una senal de terminacion prematura.",
        "silent": "Se trata de una mutacion silent, en la que cambia el codon pero no el aminoacido final.",
        "frameshift": "Se trata de una mutacion frameshift, que altera el marco de lectura de la secuencia.",
        "expansion": "Se trata de una mutacion por expansion, asociada al aumento anormal de repeticiones en la secuencia."
    }
    return labels.get(mutation_type, "Se trata de una variante genetica cuyo tipo no pudo clasificarse con precision.")


def molecular_sentence(mutation_type, effect, aa_change):
    aa_from = aa_change.get("from")
    aa_to = aa_change.get("to")

    if mutation_type == "missense":
        if aa_from and aa_to:
            return (
                f"El cambio de aminoacido de {aa_from} a {aa_to} puede modificar "
                "las propiedades fisicoquimicas de la proteina y afectar su estabilidad, "
                "plegamiento o funcion."
            )
        return "La sustitucion aminoacidica puede alterar la estructura o funcion de la proteina."

    if mutation_type == "nonsense" or effect == "protein_truncated":
        if aa_from:
            return (
                f"La sustitucion convierte el residuo original {aa_from} en un codon STOP, "
                "lo que produce una proteina truncada y potencial perdida de dominios funcionales."
            )
        return "La variante introduce un codon STOP prematuro y puede generar una proteina truncada."

    if mutation_type == "silent" or effect == "no_effect":
        if aa_from and aa_to:
            return (
                f"Aunque el codon cambia, el aminoacido se mantiene ({aa_from} a {aa_to}), "
                "por lo que el impacto directo sobre la secuencia proteica suele ser minimo."
            )
        return "Aunque existe un cambio nucleotidico, no se espera modificacion directa de la secuencia proteica."

    if mutation_type == "frameshift" or effect == "protein_disrupted":
        return (
            "La alteracion del marco de lectura modifica los codones aguas abajo y puede "
            "producir una proteina anomala o incompleta, con alta probabilidad de perdida funcional."
        )

    if mutation_type == "expansion":
        return (
            "La expansion de repeticiones puede alterar la expresion, la conformacion o la estabilidad "
            "de la proteina o del transcrito."
        )

    return "El efecto molecular exacto no puede definirse con seguridad con los datos disponibles."


def clinical_sentence(clinical):
    disease = clinical.get("disease")
    significance = clinical.get("significance")
    match_found = clinical.get("match_found")

    if not match_found:
        return (
            "No se encontro una asociacion clinica especifica en la base de datos para esta variante. "
            "Por ello, no hay evidencia suficiente para atribuirle una enfermedad concreta, aunque su "
            "impacto teorico depende del tipo de mutacion y del gen afectado."
        )

    significance_labels = {
        "pathogenic": "Se considera patogenica, lo que apoya una relevancia clinica directa.",
        "likely_pathogenic": "Se considera probablemente patogenica, por lo que tiene relevancia clinica importante.",
        "benign": "Se clasifica como benigna, por lo que no sugiere un impacto clinico significativo por si sola.",
        "uncertain": "Su significado clinico es incierto, por lo que la interpretacion debe hacerse con cautela.",
        "risk_factor": "Se interpreta como factor de riesgo y no necesariamente como causa unica de enfermedad."
    }

    disease_text = (
        f"Esta variante se ha asociado con {disease}. "
        if disease else
        "Existe una referencia clinica para esta variante, aunque no se especifica una enfermedad concreta. "
    )
    significance_text = significance_labels.get(
        significance,
        "La significancia clinica disponible no permite una conclusion firme."
    )

    return disease_text + significance_text


def build_report(analysis, clinical):
    summary = mutation_type_sentence(analysis["mutation_type"])
    molecular = molecular_sentence(
        analysis["mutation_type"],
        analysis["effect"],
        analysis["aa_change"]
    )
    clinical_text = clinical_sentence(clinical)

    return {
        "Resumen": summary,
        "Interpretacion molecular": molecular,
        "Relevancia clinica": clinical_text
    }


def analyze(event, context):
    try:
        body = json.loads(event['body'])

        codon_o = normalize_nullable(body.get("codon_original"))
        codon_m = normalize_nullable(body.get("codon_mutated"))

        mutation_type = classify_mutation(codon_o, codon_m)

        # Buscar en DynamoDB
        response = table.scan()
        items = response.get("Items", [])

        # Match simple
        result = None
        for item in items:
            if (
                item.get("codon_original") == codon_o and
                item.get("codon_mutated") == codon_m
            ):
                result = item
                break

        analysis = build_analysis_payload(mutation_type, result, codon_o, codon_m)
        clinical = build_clinical_payload(result)
        report = build_report(analysis, clinical)

        return {
            "statusCode": 200,
            "body": json.dumps({
                "input": {
                    "codon_original": codon_o,
                    "codon_mutated": codon_m
                },
                "analysis": analysis,
                "clinical": clinical,
                "report": report,
                "match": result
            })
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }
