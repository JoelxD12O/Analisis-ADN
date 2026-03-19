# --------------------- DNA ANALYSIS -----------------
def dna_analysis(dna):
    dna_length = len(dna)
    a = dna.count('A')
    c = dna.count('C')
    t = dna.count('T')
    g = dna.count('G')

    gc_content = ((g + c) / dna_length) * 100
    return gc_content, a, c, t, g, dna_length


# --------------------- DNA TO RNA -----------------
def dna_transcription(dna):
    return dna.replace('T', 'U')


# --------------------- CODON TABLE -----------------
codon_table = {

    # Methionine (Start)
    "AUG": "Methionine",

    # Phenylalanine
    "UUU": "Phenylalanine", "UUC": "Phenylalanine",

    # Leucine
    "UUA": "Leucine", "UUG": "Leucine",
    "CUU": "Leucine", "CUC": "Leucine",
    "CUA": "Leucine", "CUG": "Leucine",

    # Isoleucine
    "AUU": "Isoleucine", "AUC": "Isoleucine", "AUA": "Isoleucine",

    # Valine
    "GUU": "Valine", "GUC": "Valine",
    "GUA": "Valine", "GUG": "Valine",

    # Serine
    "UCU": "Serine", "UCC": "Serine",
    "UCA": "Serine", "UCG": "Serine",
    "AGU": "Serine", "AGC": "Serine",

    # Proline
    "CCU": "Proline", "CCC": "Proline",
    "CCA": "Proline", "CCG": "Proline",

    # Threonine
    "ACU": "Threonine", "ACC": "Threonine",
    "ACA": "Threonine", "ACG": "Threonine",

    # Alanine
    "GCU": "Alanine", "GCC": "Alanine",
    "GCA": "Alanine", "GCG": "Alanine",

    # Tyrosine
    "UAU": "Tyrosine", "UAC": "Tyrosine",

    # Histidine
    "CAU": "Histidine", "CAC": "Histidine",

    # Glutamine
    "CAA": "Glutamine", "CAG": "Glutamine",

    # Asparagine
    "AAU": "Asparagine", "AAC": "Asparagine",

    # Lysine
    "AAA": "Lysine", "AAG": "Lysine",

    # Aspartic Acid
    "GAU": "Aspartic Acid", "GAC": "Aspartic Acid",

    # Glutamic Acid
    "GAA": "Glutamic Acid", "GAG": "Glutamic Acid",

    # Cysteine
    "UGU": "Cysteine", "UGC": "Cysteine",

    # Tryptophan
    "UGG": "Tryptophan",

    # Arginine
    "CGU": "Arginine", "CGC": "Arginine",
    "CGA": "Arginine", "CGG": "Arginine",
    "AGA": "Arginine", "AGG": "Arginine",

    # Glycine
    "GGU": "Glycine", "GGC": "Glycine",
    "GGA": "Glycine", "GGG": "Glycine",

    # STOP codons
    "UAA": "STOP", "UAG": "STOP", "UGA": "STOP"
}


# --------------------- TRANSLATE ONE CODON -----------------
def translate_codon(dna_codon):
    rna_codon = dna_transcription(dna_codon)
    return codon_table.get(rna_codon, "Unknown")


# --------------------- CLASSIFY SUBSTITUTION -----------------
def classify_substitution(codon_ref, codon_mut):
    aa_ref = translate_codon(codon_ref)
    aa_mut = translate_codon(codon_mut)

    if aa_ref == aa_mut:
        return "silent", aa_ref, aa_mut
    elif aa_mut == "STOP":
        return "nonsense", aa_ref, aa_mut
    else:
        return "missense", aa_ref, aa_mut


# --------------------- DETECT POINT MUTATIONS -----------------
def detect_point_mutations(reference, sample):

    if len(reference) != len(sample):
        return "Sequences must have the same length (not a substitution)"

    if len(reference) % 3 != 0:
        return "Sequence length must be multiple of 3"

    mutations = []

    for i in range(0, len(reference), 3):
        codon_ref = reference[i:i+3]
        codon_mut = sample[i:i+3]

        if codon_ref != codon_mut:
            mutation_type, aa_ref, aa_mut = classify_substitution(codon_ref, codon_mut)

            mutations.append({
                "codon_position": i//3 + 1,
                "codon_ref": codon_ref,
                "codon_mut": codon_mut,
                "aa_ref": aa_ref,
                "aa_mut": aa_mut,
                "type": mutation_type
            })

    return mutations
