from dna_tookit import analisis_adn, transcripcion_adn, traducir_codones, detectar_mutaciones

#---------------------ANÁLISIS GENERAL DEL ADN-----------------
while True:
    adn = input("Ingrese la secuencia ADN: ").upper()

    if set(adn).issubset({"A","C","G","T"}):
        break
    else:
        print("Error: Ingresa solo A, C, G o T.")

print("Secuencia aceptada:", adn)

#--------CONTENIDO DE GC---------
contenido_gc, a, c, t, g, tamanio_adn = analisis_adn(adn)

print("Tamaño del ADN: ", tamanio_adn)
print("A: ", a)
print("C: ", c)
print("T: ", t)
print("G: ", g)
print("Contenido de GC: ", contenido_gc)


#---------------------TRANSCRIPCIÓN ADN A ARN---------------------
arn = transcripcion_adn(adn)
print("Transcripción del ADN: ", arn)


#---------------------TRADUCIR CODONES ---------------------------
proteina = traducir_codones(arn)
print("Proteínas: ", proteina)


#-------------------RECONOCER MUTACIONES-----------------------

ref = adn
print("Referencia: ", ref)

while True:
    muestra = input("Ingrese la secuencia a comparar: ").upper()

    if not set(muestra).issubset({"A","C","G","T"}):
        print("Error: Ingresa solo A, C, G o T.")
        continue

    if len(muestra) != len(ref):
        print("Error: Ingresa la misma cantidad de bases nitrogenadas que la referencia.")
        continue

    break

print("Secuencia a comparar:", muestra)


mutaciones = detectar_mutaciones(ref, muestra)

print("Mutaciones: ", mutaciones)
