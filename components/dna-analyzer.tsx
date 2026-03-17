"use client";

import dynamic from "next/dynamic";
import { useDeferredValue, useState } from "react";
import { SectionCard } from "@/components/ui/section-card";
import { StatCard } from "@/components/ui/stat-card";
import { TranscriptionFlow } from "@/components/ui/transcription-flow";
import { useTranscriptionSimulation } from "@/hooks/use-transcription-simulation";
import {
  analyzeDna,
  normalizeSequence,
  validateDnaSequence,
} from "@/lib/dna";
import {
  analyzeMutations,
  summarizeMutationImpact,
  type MutationClassification,
  type MutationDetail,
} from "@/utils/mutationAnalysis";

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

const mutationToneMap: Record<
  MutationClassification,
  { badge: string; accent: string; icon: string }
> = {
  Silenciosa: {
    badge: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    accent: "text-emerald-700",
    icon: "OK",
  },
  Missense: {
    badge: "bg-amber-100 text-amber-700 border border-amber-200",
    accent: "text-amber-700",
    icon: "!",
  },
  Nonsense: {
    badge: "bg-rose-100 text-rose-700 border border-rose-200",
    accent: "text-rose-700",
    icon: "!!",
  },
};

type MutationAiState = {
  loading: boolean;
  explanation: string | null;
  error: string | null;
};

function MutationInsightCard({ mutation }: { mutation: MutationDetail }) {
  const tone = mutationToneMap[mutation.type];
  const [aiState, setAiState] = useState<MutationAiState>({
    loading: false,
    explanation: null,
    error: null,
  });

  const loadAiExplanation = async () => {
    if (aiState.loading || aiState.explanation) {
      return;
    }

    setAiState({
      loading: true,
      explanation: null,
      error: null,
    });

    try {
      const response = await fetch("/api/mutations/explain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          position: mutation.position,
          originalCodon: mutation.originalCodon,
          mutatedCodon: mutation.mutatedCodon,
          originalAA: mutation.originalAminoAcid,
          mutatedAA: mutation.mutatedAminoAcid,
          mutationType: mutation.type.toUpperCase(),
        }),
      });

      const data = (await response.json()) as {
        explanation?: string;
        error?: string;
      };

      if (!response.ok || !data.explanation) {
        throw new Error(data.error || "No fue posible generar la explicacion.");
      }

      setAiState({
        loading: false,
        explanation: data.explanation,
        error: null,
      });
    } catch (error) {
      setAiState({
        loading: false,
        explanation: null,
        error:
          error instanceof Error
            ? error.message
            : "No fue posible generar la explicacion.",
      });
    }
  };

  return (
    <details
      className="rounded-[1.3rem] border border-black/8 bg-white/75 px-4 py-3 shadow-[0_14px_50px_rgba(15,23,42,0.05)]"
      onToggle={(event) => {
        if ((event.currentTarget as HTMLDetailsElement).open) {
          void loadAiExplanation();
        }
      }}
    >
      <summary className="flex cursor-pointer list-none flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <strong className="text-sm text-accent-strong">
            Posicion: {mutation.position}
          </strong>
          <span className="text-sm text-black/60">
            Cambio: {mutation.reference} {"->"} {mutation.sample}
          </span>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${tone.badge}`}>
            {mutation.type}
          </span>
        </div>
        <span className={`text-sm font-medium ${tone.accent}`}>
          {tone.icon} {mutation.impact}
        </span>
      </summary>

      <div className="mt-3 grid gap-2 border-t border-black/6 pt-3 text-sm md:grid-cols-2">
        <div className="rounded-2xl bg-black/[0.03] px-3 py-2">
          <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-black/35">
            Codon original
          </span>
          <code className="mt-1 block font-mono text-accent-strong">
            {mutation.originalCodon} / {mutation.originalRnaCodon}
          </code>
        </div>
        <div className="rounded-2xl bg-black/[0.03] px-3 py-2">
          <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-black/35">
            Codon mutado
          </span>
          <code className="mt-1 block font-mono text-accent-strong">
            {mutation.mutatedCodon} / {mutation.mutatedRnaCodon}
          </code>
        </div>
        <div className="rounded-2xl bg-black/[0.03] px-3 py-2">
          <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-black/35">
            Aminoacido original
          </span>
          <strong className="mt-1 block text-accent-strong">
            {mutation.originalAminoAcid}
          </strong>
        </div>
        <div className="rounded-2xl bg-black/[0.03] px-3 py-2">
          <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-black/35">
            Aminoacido mutado
          </span>
          <strong className="mt-1 block text-accent-strong">
            {mutation.mutatedAminoAcid}
          </strong>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-black/6 bg-black/[0.02] px-3 py-3">
        <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-black/35">
          Interpretacion IA
        </span>
        <p className="mt-2 text-sm leading-relaxed text-black/65">
          {aiState.loading
            ? "Generando explicacion biologica..."
            : aiState.explanation ||
              aiState.error ||
              "Abre este detalle para solicitar una interpretacion breve con IA."}
        </p>
      </div>
    </details>
  );
}

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
      ? analyzeMutations(analysis.normalizedSequence, sampleValidation.normalized)
      : [];
  const mutationSummary = summarizeMutationImpact(mutations);

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
              <div className="space-y-4">
                <div className="rounded-[1.4rem] border border-black/8 bg-white/70 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-black/35">
                    Resumen de impacto
                  </span>
                  <div className="mt-2 space-y-1 text-sm text-accent-strong">
                    <p className="font-semibold">
                      {mutationSummary.potentiallyRelevant} mutaci{mutationSummary.potentiallyRelevant === 1 ? "on" : "ones"} potencialmente relevante{mutationSummary.potentiallyRelevant === 1 ? "" : "s"} detectada{mutationSummary.potentiallyRelevant === 1 ? "" : "s"}.
                    </p>
                    <p className="text-black/55">
                      {mutationSummary.functionalImpact} mutaci{mutationSummary.functionalImpact === 1 ? "on" : "ones"} con impacto funcional.
                    </p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
                      Silenciosas: {mutationSummary.silenciosa}
                    </span>
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">
                      Missense: {mutationSummary.missense}
                    </span>
                    <span className="rounded-full bg-rose-100 px-3 py-1 text-rose-700">
                      Nonsense: {mutationSummary.nonsense}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {mutations.map((mutation) => (
                    <MutationInsightCard
                      key={mutation.position}
                      mutation={mutation}
                    />
                  ))}
                </div>
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
