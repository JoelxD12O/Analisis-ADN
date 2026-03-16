#---------------------ANÁLISIS GENERAL DEL ADN-----------------
def analisis_adn(adn):

    tamanio_adn = len(adn)

    a = adn.count('A')
    c = adn.count('C')
    t = adn.count('T')
    g = adn.count('G')

    contenido_gc = ((g+c)/tamanio_adn)*100

    return contenido_gc, a, c, t, g, tamanio_adn

#---------------------TRANSCRIPCIÓN ADN A ARN---------------------
def transcripcion_adn(adn):

    arn = adn.replace('T', 'U')

    return arn

#---------------------TRADUCIR CODONES ---------------------------
def traducir_codones(arn):
    tabla_codones = {

        "AUG": "Metionina",

        "UUU": "Fenilalanina",
        "UUC": "Fenilalanina",

        "UUA": "Leucina",
        "UUG": "Leucina",

        "CUU": "Leucina",
        "CUC": "Leucina",
        "CUA": "Leucina",
        "CUG": "Leucina",

        "AUU": "Isoleucina",
        "AUC": "Isoleucina",
        "AUA": "Isoleucina",

        "GUU": "Valina",
        "GUC": "Valina",
        "GUA": "Valina",
        "GUG": "Valina",

        "UCU": "Serina",
        "UCC": "Serina",
        "UCA": "Serina",
        "UCG": "Serina",

        "CCU": "Prolina",
        "CCC": "Prolina",
        "CCA": "Prolina",
        "CCG": "Prolina",

        "ACU": "Treonina",
        "ACC": "Treonina",
        "ACA": "Treonina",
        "ACG": "Treonina",

        "GCU": "Alanina",
        "GCC": "Alanina",
        "GCA": "Alanina",
        "GCG": "Alanina",

        "UAU": "Tirosina",
        "UAC": "Tirosina",

        "CAU": "Histidina",
        "CAC": "Histidina",

        "CAA": "Glutamina",
        "CAG": "Glutamina",

        "AAU": "Asparagina",
        "AAC": "Asparagina",

        "AAA": "Lisina",
        "AAG": "Lisina",

        "GAU": "Ácido aspártico",
        "GAC": "Ácido aspártico",

        "GAA": "Ácido glutámico",
        "GAG": "Ácido glutámico",

        "UGU": "Cisteína",
        "UGC": "Cisteína",

        "UGG": "Triptófano",

        "CGU": "Arginina",
        "CGC": "Arginina",
        "CGA": "Arginina",
        "CGG": "Arginina",

        "AGU": "Serina",
        "AGC": "Serina",

        "AGA": "Arginina",
        "AGG": "Arginina",

        "GGU": "Glicina",
        "GGC": "Glicina",
        "GGA": "Glicina",
        "GGG": "Glicina",

        "UAA": "STOP",
        "UAG": "STOP",
        "UGA": "STOP"
    }

    proteinas = []

    for i in range(0, len(arn), 3):

        codon = arn[i:i+3]             #CADA 3
        amino = tabla_codones.get(codon, "Desconocido")


        if amino == "STOP":
            break

        proteinas.append(amino)

    return proteinas

#-------------------RECONOCER MUTACIONES-----------------------
def detectar_mutaciones(ref, muestra):
    mutaciones = []

    for i in range (len(ref)):
        if ref[i] != muestra[i]:
            mutaciones.append((i+1, ref[i], muestra[i]))

    return mutaciones
