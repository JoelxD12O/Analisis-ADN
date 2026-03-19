from dna_tookit import dna_analysis, dna_transcription, detect_point_mutations

# --------------------- GENERAL DNA ANALYSIS -----------------
while True:
    dna = input("Enter the DNA sequence: ").upper()

    if set(dna).issubset({"A", "C", "G", "T"}):
        break
    else:
        print("Error: Enter only A, C, G, or T.")

print("\nAccepted sequence:", dna)

# -------- GC CONTENT ---------
gc_content, a, c, t, g, dna_length = dna_analysis(dna)

print("\nDNA length:", dna_length)
print("A:", a)
print("C:", c)
print("T:", t)
print("G:", g)
print("GC Content:", round(gc_content, 2), "%")


# --------------------- DNA TO RNA ---------------------
rna = dna_transcription(dna)
print("\nRNA transcription:", rna)


# --------------------- MUTATION ANALYSIS ---------------------
reference = dna
print("\nReference sequence:", reference)

while True:
    sample = input("Enter the sequence to compare: ").upper()

    if not set(sample).issubset({"A", "C", "G", "T"}):
        print("Error: Enter only A, C, G, or T.")
        continue

    if len(sample) != len(reference):
        print("Error: Sequence must have the same length as reference.")
        continue

    if len(sample) % 3 != 0:
        print("Error: Sequence length must be multiple of 3.")
        continue

    break

print("\nSequence to compare:", sample)

results = detect_point_mutations(reference, sample)

print("\n=== MUTATION ANALYSIS ===")

if isinstance(results, str):
    print(results)
else:
    print("Total mutations:", len(results))

    for m in results:
        print(f"\nCodon {m['codon_position']}:")
        print(f"{m['codon_ref']} → {m['codon_mut']}")
        print(f"{m['aa_ref']} → {m['aa_mut']}")
        print(f"Type: {m['type']}")