export type MutationClassification = "Silenciosa" | "Missense" | "Nonsense";

export type MutationImpactLevel = "low" | "medium" | "high";

export type MutationDetail = {
  position: number;
  reference: string;
  sample: string;
  originalCodon: string;
  mutatedCodon: string;
  originalRnaCodon: string;
  mutatedRnaCodon: string;
  originalAminoAcid: string;
  mutatedAminoAcid: string;
  type: MutationClassification;
  impact: string;
  impactLevel: MutationImpactLevel;
};

export type MutationSummary = {
  silenciosa: number;
  missense: number;
  nonsense: number;
  potentiallyRelevant: number;
  functionalImpact: number;
};

const CODON_TABLE: Record<string, string> = {
  AUG: "Metionina",
  UUU: "Fenilalanina",
  UUC: "Fenilalanina",
  UUA: "Leucina",
  UUG: "Leucina",
  CUU: "Leucina",
  CUC: "Leucina",
  CUA: "Leucina",
  CUG: "Leucina",
  AUU: "Isoleucina",
  AUC: "Isoleucina",
  AUA: "Isoleucina",
  GUU: "Valina",
  GUC: "Valina",
  GUA: "Valina",
  GUG: "Valina",
  UCU: "Serina",
  UCC: "Serina",
  UCA: "Serina",
  UCG: "Serina",
  CCU: "Prolina",
  CCC: "Prolina",
  CCA: "Prolina",
  CCG: "Prolina",
  ACU: "Treonina",
  ACC: "Treonina",
  ACA: "Treonina",
  ACG: "Treonina",
  GCU: "Alanina",
  GCC: "Alanina",
  GCA: "Alanina",
  GCG: "Alanina",
  UAU: "Tirosina",
  UAC: "Tirosina",
  CAU: "Histidina",
  CAC: "Histidina",
  CAA: "Glutamina",
  CAG: "Glutamina",
  AAU: "Asparagina",
  AAC: "Asparagina",
  AAA: "Lisina",
  AAG: "Lisina",
  GAU: "Acido aspartico",
  GAC: "Acido aspartico",
  GAA: "Acido glutamico",
  GAG: "Acido glutamico",
  UGU: "Cisteina",
  UGC: "Cisteina",
  UGG: "Triptofano",
  CGU: "Arginina",
  CGC: "Arginina",
  CGA: "Arginina",
  CGG: "Arginina",
  AGU: "Serina",
  AGC: "Serina",
  AGA: "Arginina",
  AGG: "Arginina",
  GGU: "Glicina",
  GGC: "Glicina",
  GGA: "Glicina",
  GGG: "Glicina",
  UAA: "STOP",
  UAG: "STOP",
  UGA: "STOP",
};

function normalizeDnaSequence(value: string) {
  return value.toUpperCase().replace(/\s+/g, "").replace(/[^ACGT]/g, "");
}

export function transcribeDNAtoRNA(sequence: string) {
  return normalizeDnaSequence(sequence).replaceAll("T", "U");
}

export function getCodon(sequence: string, index: number) {
  const normalizedSequence = normalizeDnaSequence(sequence);
  const codonStart = Math.floor(index / 3) * 3;
  return normalizedSequence.slice(codonStart, codonStart + 3);
}

export function translateCodon(codon: string) {
  if (codon.length !== 3) {
    return "Codon incompleto";
  }

  const normalizedCodon = codon.toUpperCase();
  const rnaCodon = normalizedCodon.includes("T")
    ? transcribeDNAtoRNA(normalizedCodon)
    : normalizedCodon;

  return CODON_TABLE[rnaCodon] ?? "Desconocido";
}

export function classifyMutation(
  originalCodon: string,
  mutatedCodon: string
): MutationClassification {
  const mutatedAminoAcid = translateCodon(mutatedCodon);

  if (mutatedAminoAcid === "STOP") {
    return "Nonsense";
  }

  return translateCodon(originalCodon) === mutatedAminoAcid ? "Silenciosa" : "Missense";
}

export function analyzeMutations(reference: string, sample: string): MutationDetail[] {
  const normalizedReference = normalizeDnaSequence(reference);
  const normalizedSample = normalizeDnaSequence(sample);
  const mutations: MutationDetail[] = [];

  for (let index = 0; index < normalizedReference.length; index += 1) {
    if (normalizedReference[index] === normalizedSample[index]) {
      continue;
    }

    const originalCodon = getCodon(normalizedReference, index);
    const mutatedCodon = getCodon(normalizedSample, index);
    const originalRnaCodon = transcribeDNAtoRNA(originalCodon);
    const mutatedRnaCodon = transcribeDNAtoRNA(mutatedCodon);
    const originalAminoAcid = translateCodon(originalCodon);
    const mutatedAminoAcid = translateCodon(mutatedCodon);
    const type = classifyMutation(originalCodon, mutatedCodon);

    mutations.push({
      position: index + 1,
      reference: normalizedReference[index],
      sample: normalizedSample[index],
      originalCodon,
      mutatedCodon,
      originalRnaCodon,
      mutatedRnaCodon,
      originalAminoAcid,
      mutatedAminoAcid,
      type,
      impact:
        type === "Silenciosa"
          ? "Sin cambio en aminoacido; impacto funcional bajo."
          : type === "Nonsense"
            ? "Genera un STOP prematuro; posible truncamiento proteico."
            : "Cambio en aminoacido; posible efecto en la proteina.",
      impactLevel:
        type === "Silenciosa" ? "low" : type === "Nonsense" ? "high" : "medium",
    });
  }

  return mutations;
}

export function summarizeMutationImpact(mutations: MutationDetail[]): MutationSummary {
  return mutations.reduce<MutationSummary>(
    (summary, mutation) => {
      if (mutation.type === "Silenciosa") {
        summary.silenciosa += 1;
      }

      if (mutation.type === "Missense") {
        summary.missense += 1;
        summary.potentiallyRelevant += 1;
        summary.functionalImpact += 1;
      }

      if (mutation.type === "Nonsense") {
        summary.nonsense += 1;
        summary.potentiallyRelevant += 1;
        summary.functionalImpact += 1;
      }

      return summary;
    },
    {
      silenciosa: 0,
      missense: 0,
      nonsense: 0,
      potentiallyRelevant: 0,
      functionalImpact: 0,
    }
  );
}
