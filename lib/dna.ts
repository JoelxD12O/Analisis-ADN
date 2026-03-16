export type DnaCounts = {
  a: number;
  c: number;
  g: number;
  t: number;
};

export type Mutation = {
  position: number;
  reference: string;
  sample: string;
};

export type Translation = {
  codon: string;
  aminoAcid: string;
};

export type DnaAnalysis = {
  normalizedSequence: string;
  size: number;
  counts: DnaCounts;
  gcContent: number;
  rna: string;
  proteins: Translation[];
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

export function getAminoAcidFromRnaCodon(codon: string) {
  return CODON_TABLE[codon] ?? "Desconocido";
}

export function normalizeSequence(value: string) {
  return value.toUpperCase().replace(/\s+/g, "").replace(/[^ACGT]/g, "");
}

export function validateDnaSequence(value: string) {
  const normalized = value.toUpperCase().replace(/\s+/g, "");

  if (!normalized) {
    return {
      isValid: false,
      normalized: "",
      error: "Ingresa una secuencia con bases A, C, G y T.",
    };
  }

  if (!/^[ACGT]+$/.test(normalized)) {
    return {
      isValid: false,
      normalized,
      error: "Solo se permiten las letras A, C, G y T.",
    };
  }

  return {
    isValid: true,
    normalized,
    error: "",
  };
}

export function analyzeDna(sequence: string): DnaAnalysis {
  const normalizedSequence = normalizeSequence(sequence);
  const size = normalizedSequence.length;
  const counts = {
    a: normalizedSequence.split("A").length - 1,
    c: normalizedSequence.split("C").length - 1,
    g: normalizedSequence.split("G").length - 1,
    t: normalizedSequence.split("T").length - 1,
  };
  const gcContent = size === 0 ? 0 : ((counts.g + counts.c) / size) * 100;
  const rna = transcribeDna(normalizedSequence);
  const proteins = translateCodons(rna);

  return {
    normalizedSequence,
    size,
    counts,
    gcContent,
    rna,
    proteins,
  };
}

export function transcribeDna(sequence: string) {
  return normalizeSequence(sequence).replaceAll("T", "U");
}

export function translateCodons(rna: string) {
  const proteins: Translation[] = [];

  for (let index = 0; index < rna.length; index += 3) {
    const codon = rna.slice(index, index + 3);

    if (codon.length < 3) {
      break;
    }

    const aminoAcid = getAminoAcidFromRnaCodon(codon);

    if (aminoAcid === "STOP") {
      break;
    }

    proteins.push({ codon, aminoAcid });
  }

  return proteins;
}

export function detectMutations(reference: string, sample: string) {
  const normalizedReference = normalizeSequence(reference);
  const normalizedSample = normalizeSequence(sample);
  const mutations: Mutation[] = [];

  for (let index = 0; index < normalizedReference.length; index += 1) {
    if (normalizedReference[index] !== normalizedSample[index]) {
      mutations.push({
        position: index + 1,
        reference: normalizedReference[index],
        sample: normalizedSample[index],
      });
    }
  }

  return mutations;
}
