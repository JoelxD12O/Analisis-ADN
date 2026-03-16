"use client";

import dynamic from "next/dynamic";
import { useDeferredValue, useState } from "react";
import { SectionCard } from "@/components/ui/section-card";
import { StatCard } from "@/components/ui/stat-card";
import { TranscriptionFlow } from "@/components/ui/transcription-flow";
import { useTranscriptionSimulation } from "@/hooks/use-transcription-simulation";
import {
  analyzeDna,
  detectMutations,
  normalizeSequence,
  validateDnaSequence,
} from "@/lib/dna";

const exampleSequence = "ATGGCTACCTTACGAGGTTAA";
const exampleSample = "ATGGCTTCCTTACGCGGTTAA";

const DNAHelixVisualizer = dynamic(
  () =>
    import("@/components/visualization/dna-helix-visualizer").then(
      (module) => module.DNAHelixVisualizer
    ),
  {
    ssr: false,
  }
);

import type { BaseDetail } from "@/components/visualization/dna-helix-visualizer";

const DNA_EXAMPLES = [
  {
    name: "Insulina (Fragmento)",
    sequence: "ATGGCCCTGTGGATGCGCCTCCTGCCCCTGCTGGCCCTGCTGGCCCTCTGGGGACCTGAC",
    description: "Codifica para una parte de la hormona insulina."
  },
  {
    name: "Hemoglobina (Beta)",
    sequence: "ATGGTGCACCTGACTCCTGAGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAGGTGAAC",
    description: "Parte de la proteína que transporta oxígeno."
  },
  {
    name: "TATA Box",
    sequence: "TATAAAAGGCGGGGGCGCGGCGCGGCA",
    description: "Secuencia promotora común en el genoma."
  },
  {
    name: "Anemia Falciforme (Mutación)",
    sequence: "ATGGTGCACCTGACTCCTGAGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAGGTGAAC",
    sample: "ATGGTGCACCTGACTCCTGTGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAGGTGAAC",
    description: "Comparación entre hemoglobina normal y mutada (Glu6Val)."
  },
  {
    name: "Colágeno (Fragmento)",
    sequence: "GGTCCCCCTGGACCCCCTGGTCCTCCTGGCCCCCCTGGTCCCCCTGGTCCTCCTGGCCCC",
    description: "Estructura repetitiva típica del colágeno."
  },
  {
    name: "Proteína Spike (Fragmento)",
    sequence: "ATGTTTGTTTTTCTTGTTTTATTGCCACTAGTCTCTAGTCAGTGTGTTAATCTTACAACC",
    sample: "ATGTTTGTTTTTCTTGTTTTGTTGCCACTAGTCTCTAGTCAGTGTGTTAATCTTACAACC",
    description: "Fragmento de la proteína con una mutación puntual."
  }
];

const MAX_SEQUENCE_LENGTH = 300;

export function DnaAnalyzer() {
  const [dnaInput, setDnaInput] = useState(exampleSequence);
  const [sampleInput, setSampleInput] = useState(exampleSample);
  const [selectedBase, setSelectedBase] = useState<BaseDetail | null>(null);

  const deferredDnaInput = useDeferredValue(dnaInput);
  const deferredSampleInput = useDeferredValue(sampleInput);

  const dnaValidation = validateDnaSequence(deferredDnaInput);
  const sampleValidation = deferredSampleInput.trim()
    ? validateDnaSequence(deferredSampleInput)
    : { isValid: true, normalized: "", error: "" };

  const analysis = dnaValidation.isValid
    ? analyzeDna(dnaValidation.normalized)
    : null;

  const hasComparableSample =
    sampleValidation.isValid &&
    sampleValidation.normalized.length > 0 &&
    analysis &&
    sampleValidation.normalized.length === analysis.size;

  const mutations =
    analysis && hasComparableSample
      ? detectMutations(analysis.normalizedSequence, sampleValidation.normalized)
      : [];

  const sampleLengthError =
    sampleValidation.isValid &&
      sampleValidation.normalized.length > 0 &&
      analysis &&
      sampleValidation.normalized.length !== analysis.size
      ? "La muestra debe tener la misma longitud que la secuencia de referencia."
      : "";

  const gcProgress = analysis ? `${Math.min(100, analysis.gcContent)}%` : "0%";
  const completionProgress = analysis
    ? `${Math.min(100, (analysis.proteins.length / Math.max(1, Math.ceil(analysis.size / 3))) * 100)}%`
    : "0%";
  const mutationPositions = mutations.map((mutation) => mutation.position);
  const displayedSequence = analysis?.normalizedSequence ?? normalizeSequence(dnaInput);
  const transcriptionSimulation = useTranscriptionSimulation(displayedSequence);

  return (
    <main className="dna-page">
      <header className="topbar">
        <a href="#" className="brand">
          <span className="brand__dot" />
          Genome View
        </a>
        <nav className="topbar__nav">
          <a href="#workspace">Analisis</a>
          <a href="#resultados">Resultados</a>
        </nav>
      </header>

      <section className="hero">
        <div className="hero__copy">
          <span className="hero__badge">Plataforma interactiva de ADN</span>
          <h1>Explora secuencias geneticas de forma clara y visual.</h1>
          <p>
            Analiza secuencias, codones y mutaciones en una interfaz fluida y facil de leer.
          </p>
          <div className="hero__highlights">
            <span>Metricas en tiempo real</span>
            <span>Codones y proteinas</span>
            <span>Mutaciones</span>
          </div>
          <TranscriptionFlow
            dnaSequence={displayedSequence || exampleSequence}
            generatedRna={transcriptionSimulation.generatedRna}
            currentIndex={transcriptionSimulation.currentIndex}
            currentStep={transcriptionSimulation.currentStep}
            progress={transcriptionSimulation.progress}
            isRunning={transcriptionSimulation.isRunning}
            isFinished={transcriptionSimulation.isFinished}
            speed={transcriptionSimulation.speed}
            setSpeed={transcriptionSimulation.setSpeed}
            onStart={transcriptionSimulation.start}
            onStop={transcriptionSimulation.stop}
          />
          <div className="hero__actions">
            <a href="#workspace" className="button button--primary">
              Probar analisis
            </a>
            <a href="#resultados" className="button button--ghost">
              Ver resultados
            </a>
          </div>
        </div>

        <div className="hero__panel">
          <div className="hero__helix">
            <DNAHelixVisualizer
              sequence={displayedSequence}
              mutationPositions={mutationPositions}
              highlightedPosition={transcriptionSimulation.currentIndex}
              activeBaseId={selectedBase?.id}
              onSelect={setSelectedBase}
            />
          </div>

          {selectedBase ? (
            <div className="hero__base-detail animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg"
                  style={{ background: selectedBase.color }}
                >
                  {selectedBase.base}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-accent-strong m-0">{selectedBase.baseName}</h4>
                  <span className="text-[10px] uppercase tracking-wider text-black/40 font-medium">Posición {selectedBase.position}</span>
                </div>
                {selectedBase.isMutated && (
                  <span className="ml-auto px-2 py-0.5 bg-orange-100 text-orange-600 text-[9px] font-bold rounded-full uppercase tracking-tighter border border-orange-200">
                    Mutación
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/40 border border-white/60 rounded-lg p-2 backdrop-blur-sm">
                  <span className="block text-[9px] text-black/30 uppercase font-bold tracking-tight mb-0.5">Complemento</span>
                  <span className="text-sm font-mono font-bold text-accent-strong">{selectedBase.complement}</span>
                </div>
                <div className="bg-white/40 border border-white/60 rounded-lg p-2 backdrop-blur-sm">
                  <span className="block text-[9px] text-black/30 uppercase font-bold tracking-tight mb-0.5">Codón DNA</span>
                  <span className="text-sm font-mono font-bold text-accent-strong">{selectedBase.codon}</span>
                </div>
                <div className="bg-white/40 border border-white/60 rounded-lg p-2 backdrop-blur-sm col-span-2">
                  <span className="block text-[9px] text-black/30 uppercase font-bold tracking-tight mb-0.5">Aminoácido (RNA)</span>
                  <span className="text-xs font-bold text-accent-strong leading-none">{selectedBase.aminoAcid}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="hero__base-detail-empty">
              <p className="text-[11px] text-black/30 italic text-center px-4">
                Pasa el mouse sobre el ADN para ver detalles específicos de cada base.
              </p>
            </div>
          )}

          <div className="hero__panel-grid">
            <div>
              <span className="hero__panel-label">Secuencia base</span>
              <code>{normalizeSequence(dnaInput) || "ATG..."}</code>
            </div>
            <div>
              <span className="hero__panel-label">Transcripcion</span>
              <code>{analysis?.rna || "AUG..."}</code>
            </div>
            <div>
              <span className="hero__panel-label">Proteinas</span>
              <strong>{analysis?.proteins.length ?? 0}</strong>
            </div>
            <div>
              <span className="hero__panel-label">Mutaciones</span>
              <strong>{mutations.length}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="workspace" id="workspace">
        <SectionCard
          eyebrow="Entrada"
          title="Carga tus secuencias"
          description="Ingresa una secuencia principal o elige un ejemplo para empezar rápidamente."
        >
          <div className="mb-6">
            <span className="block text-xs font-bold text-accent-strong/60 uppercase tracking-widest mb-3">Carga rápida</span>
            <div className="flex flex-wrap gap-2">
              {DNA_EXAMPLES.map((ex) => (
                <button
                  key={ex.name}
                  onClick={() => {
                    setDnaInput(ex.sequence);
                    setSampleInput(ex.sample || "");
                    setSelectedBase(null);
                  }}
                  className="px-3 py-2 bg-white/60 hover:bg-accent hover:text-white border border-accent/10 rounded-xl text-xs font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                  title={ex.description}
                >
                  {ex.name}
                </button>
              ))}
            </div>
          </div>

          <div className="form-grid">
            <label className="field">
              <div className="flex justify-between items-center">
                <span>Secuencia de ADN</span>
                <span className={`text-[10px] font-bold ${dnaInput.length > MAX_SEQUENCE_LENGTH ? "text-danger" : "text-black/30"}`}>
                  {dnaInput.length}/{MAX_SEQUENCE_LENGTH}
                </span>
              </div>
              <textarea
                value={dnaInput}
                onChange={(event) => {
                  const val = event.target.value.toUpperCase();
                  if (val.length <= MAX_SEQUENCE_LENGTH + 50) { // Allow a bit over for typing but warn
                    setDnaInput(val);
                  }
                }}
                placeholder="Ejemplo: ATGGCTACCTTACGAGGTTAA"
                rows={5}
                className={dnaInput.length > MAX_SEQUENCE_LENGTH ? "border-danger/50" : ""}
              />
              <small>Solo se procesan bases A, C, G y T. Máximo {MAX_SEQUENCE_LENGTH} bases.</small>
              {dnaInput.length > MAX_SEQUENCE_LENGTH && (
                <p className="field__error text-[11px]">La secuencia es demasiado larga para la visualización fluida.</p>
              )}
              {!dnaValidation.isValid ? (
                <p className="field__error">{dnaValidation.error}</p>
              ) : null}
            </label>

            <label className="field">
              <div className="flex justify-between items-center">
                <span>Muestra para comparar</span>
                <span className="text-[10px] font-bold text-black/30">
                  {sampleInput.length} bases
                </span>
              </div>
              <textarea
                value={sampleInput}
                onChange={(event) => {
                  const val = event.target.value.toUpperCase();
                  if (val.length <= MAX_SEQUENCE_LENGTH + 50) {
                    setSampleInput(val);
                  }
                }}
                placeholder="Opcional: secuencia de igual longitud"
                rows={5}
              />
              <small>Usa la misma longitud que la referencia para detectar cambios.</small>
              {!sampleValidation.isValid ? (
                <p className="field__error">{sampleValidation.error}</p>
              ) : null}
              {sampleLengthError ? (
                <p className="field__error">{sampleLengthError}</p>
              ) : null}
            </label>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Resumen"
          title="Resumen de secuencia"
          description="Metricas clave para leer la secuencia de un vistazo."
        >
          <div className="stats-grid">
            <StatCard
              label="Tamano"
              value={analysis ? `${analysis.size} bases` : "--"}
              tone="accent"
            />
            <StatCard
              label="Contenido GC"
              value={analysis ? `${analysis.gcContent.toFixed(2)}%` : "--"}
            />
            <StatCard
              label="Adenina (A)"
              value={analysis ? String(analysis.counts.a) : "--"}
            />
            <StatCard
              label="Citosina (C)"
              value={analysis ? String(analysis.counts.c) : "--"}
            />
            <StatCard
              label="Guanina (G)"
              value={analysis ? String(analysis.counts.g) : "--"}
            />
            <StatCard
              label="Timina (T)"
              value={analysis ? String(analysis.counts.t) : "--"}
            />
          </div>

          <div className="insight-grid">
            <article className="insight-card">
              <div className="insight-card__head">
                <span>Balance GC</span>
                <strong>{analysis ? `${analysis.gcContent.toFixed(1)}%` : "--"}</strong>
              </div>
              <div className="meter">
                <span style={{ width: gcProgress }} />
              </div>
              <p>
                Estima la proporcion de guanina y citosina dentro de la secuencia.
              </p>
            </article>

            <article className="insight-card">
              <div className="insight-card__head">
                <span>Traduccion util</span>
                <strong>{analysis ? `${analysis.proteins.length} codones` : "--"}</strong>
              </div>
              <div className="meter meter--warm">
                <span style={{ width: completionProgress }} />
              </div>
              <p>
                Muestra cuantos bloques traducibles se estan interpretando en la lectura.
              </p>
            </article>
          </div>
        </SectionCard>
      </section>

      <section className="results" id="resultados">
        <SectionCard
          eyebrow="Salida"
          title="Transcripcion y traduccion"
          description="ARN y codones organizados para una lectura rapida."
        >
          <div className="result-block">
            <div className="result-helix">
              <DNAHelixVisualizer
                sequence={displayedSequence}
                mutationPositions={mutationPositions}
                highlightedPosition={transcriptionSimulation.currentIndex}
                compact
              />
            </div>

            <div className="sequence-box">
              <span>ARN mensajero</span>
              <code>
                {transcriptionSimulation.generatedRna || analysis?.rna || "Sin datos"}
              </code>
            </div>

            <div className="codon-strip">
              {analysis?.proteins.length ? (
                analysis.proteins.map((protein, idx) => (
                  <span className="codon-chip" key={`strip-${protein.codon}-${idx}`}>
                    {protein.codon}
                  </span>
                ))
              ) : (
                <span className="codon-chip codon-chip--muted">Esperando secuencia valida</span>
              )}
            </div>

            <div className="protein-list">
              {analysis?.proteins.length ? (
                analysis.proteins.map((protein, idx) => (
                  <article className="protein-pill" key={`pill-${protein.codon}-${idx}`}>
                    <span>{protein.codon}</span>
                    <strong>{protein.aminoAcid}</strong>
                  </article>
                ))
              ) : (
                <p className="empty-state">
                  No hay proteinas para mostrar todavia. Ingresa una secuencia valida.
                </p>
              )}
            </div>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Comparacion"
          title="Mutaciones detectadas"
          description="Comparacion base por base entre referencia y muestra."
        >
          {hasComparableSample ? (
            mutations.length ? (
              <div className="mutation-table">
                <div className="mutation-table__head">
                  <span>Posicion</span>
                  <span>Referencia</span>
                  <span>Muestra</span>
                </div>
                {mutations.map((mutation) => (
                  <div className="mutation-table__row" key={mutation.position}>
                    <strong>{mutation.position}</strong>
                    <span>{mutation.reference}</span>
                    <span>{mutation.sample}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-state">
                No se encontraron mutaciones entre la referencia y la muestra.
              </p>
            )
          ) : (
            <p className="empty-state">
              Agrega una muestra valida con la misma longitud para activar la comparacion.
            </p>
          )}
        </SectionCard>
      </section>
    </main>
  );
}
