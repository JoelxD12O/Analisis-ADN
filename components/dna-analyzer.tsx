"use client";

import dynamic from "next/dynamic";
import { useDeferredValue, useState } from "react";
import { DnaHelix } from "@/components/ui/dna-helix";
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

const DNAHelixVisualizer = dynamic(
  () =>
    import("@/components/visualization/dna-helix-visualizer").then(
      (module) => module.DNAHelixVisualizer
    ),
  {
    ssr: false,
    loading: () => <DnaHelix />,
  }
);

import type { BaseDetail } from "@/components/visualization/dna-helix-visualizer";

const DATABASE_DETECTION_EXAMPLES = [
  {
    name: "HBB Glu->Val",
    sequence: "ATGCCCGAGGAACTGCCCTAA",
    sample: "ATGCCCGTGGAACTGCCCTAA",
    badge: "Missense",
    description: "Detecta GAG -> GTG. Asociado en la BD a anemia falciforme.",
  },
  {
    name: "HBB Leu->His",
    sequence: "ATGCCCCTCGAACTGCCCTAA",
    sample: "ATGCCCCACGAACTGCCCTAA",
    badge: "Missense",
    description: "Detecta CTC -> CAC. Asociado en la BD a hemoglobinopatia variante.",
  },
  {
    name: "CFTR Gly->Val",
    sequence: "ATGCCCGGTGAACTGCCCTAA",
    sample: "ATGCCCGTTGAACTGCCCTAA",
    badge: "Missense",
    description: "Detecta GGT -> GTT. Variante de CFTR presente en la BD.",
  },
  {
    name: "PAH Glu->STOP",
    sequence: "ATGCCCGAAGAACTGCCCTAA",
    sample: "ATGCCCTAAGAACTGCCCTAA",
    badge: "Nonsense",
    description: "Detecta GAA -> TAA. Asociado en la BD a fenilcetonuria.",
  },
  {
    name: "BRCA1 Tyr->STOP",
    sequence: "ATGCCCTACGAACTGCCCTAA",
    sample: "ATGCCCTAAGAACTGCCCTAA",
    badge: "Nonsense",
    description: "Detecta TAC -> TAA. Asociado en la BD a cancer de mama hereditario.",
  },
  {
    name: "BRCA1 Lys->Arg",
    sequence: "ATGCCCAAAGAACTGCCCTAA",
    sample: "ATGCCCAGAGAACTGCCCTAA",
    badge: "Missense",
    description: "Detecta AAA -> AGA. Caso clinico registrado en la BD.",
  },
  {
    name: "TP53 Arg->STOP",
    sequence: "ATGCCCCGAGAACTGCCCTAA",
    sample: "ATGCCCTGAGAACTGCCCTAA",
    badge: "Nonsense",
    description: "Detecta CGA -> TGA. Asociado en la BD a cancer.",
  },
  {
    name: "BRCA2 Trp->STOP",
    sequence: "ATGCCCTGGGAACTGCCCTAA",
    sample: "ATGCCCTGAGAACTGCCCTAA",
    badge: "Nonsense",
    description: "Detecta TGG -> TGA. Asociado en la BD a cancer de mama/ovario.",
  },
  {
    name: "TP53 Arg->Gln",
    sequence: "ATGCCCCGGGAACTGCCCTAA",
    sample: "ATGCCCCAGGAACTGCCCTAA",
    badge: "Missense",
    description: "Detecta CGG -> CAG. Variante de TP53 presente en la BD.",
  },
  {
    name: "KRAS Gly->Asp",
    sequence: "ATGCCCGGTGAACTGCCCTAA",
    sample: "ATGCCCGATGAACTGCCCTAA",
    badge: "Missense",
    description: "Detecta GGT -> GAT. Asociado en la BD a cancer colorrectal.",
  },
  {
    name: "KRAS Gly->Val",
    sequence: "ATGCCCGGTGAACTGCCCTAA",
    sample: "ATGCCCGTTGAACTGCCCTAA",
    badge: "Missense",
    description: "Detecta GGT -> GTT. Asociado en la BD a cancer pancreatico.",
  },
  {
    name: "EGFR Leu->Met",
    sequence: "ATGCCCCTGGAACTGCCCTAA",
    sample: "ATGCCCATGGAACTGCCCTAA",
    badge: "Missense",
    description: "Detecta CTG -> ATG. Asociado en la BD a cancer de pulmon.",
  },
];

const MAX_SEQUENCE_LENGTH = 300;
const EXAMPLES_PER_PAGE = 4;
const DEFAULT_DATABASE_EXAMPLE = DATABASE_DETECTION_EXAMPLES[0];

function findMatchingExampleName(sequence: string, sample: string) {
  const match = DATABASE_DETECTION_EXAMPLES.find(
    (example) => example.sequence === sequence && example.sample === sample
  );

  return match?.name ?? null;
}

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
  report: {
    Resumen: string;
    "Interpretacion molecular": string;
    "Relevancia clinica": string;
  } | null;
  matchFound: boolean | null;
  error: string | null;
};

function MutationInsightCard({ mutation }: { mutation: MutationDetail }) {
  const tone = mutationToneMap[mutation.type];
  const [aiState, setAiState] = useState<MutationAiState>({
    loading: false,
    explanation: null,
    report: null,
    matchFound: null,
    error: null,
  });

  const loadAiExplanation = async () => {
    if (aiState.loading || aiState.explanation) {
      return;
    }

    setAiState({
      loading: true,
      explanation: null,
      report: null,
      matchFound: null,
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
        backend?: {
          clinical?: {
            match_found?: boolean;
          };
          report?: {
            Resumen: string;
            "Interpretacion molecular": string;
            "Relevancia clinica": string;
          };
        };
        error?: string;
      };

      if (!response.ok || !data.explanation) {
        throw new Error(data.error || "No fue posible generar la explicacion.");
      }

      setAiState({
        loading: false,
        explanation: data.explanation,
        report: data.backend?.report ?? null,
        matchFound: data.backend?.clinical?.match_found ?? null,
        error: null,
      });
    } catch (error) {
      setAiState({
        loading: false,
        explanation: null,
        report: null,
        matchFound: null,
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
        {aiState.loading ? (
          <p className="mt-2 text-sm leading-relaxed text-black/65">
            Generando explicacion biologica...
          </p>
        ) : aiState.report ? (
          <div className="mt-2 space-y-3 text-sm leading-relaxed text-black/65">
            <div>
              <strong className="block text-accent-strong">Resumen</strong>
              <p>{aiState.report.Resumen}</p>
            </div>
            <div>
              <strong className="block text-accent-strong">Interpretacion molecular</strong>
              <p>{aiState.report["Interpretacion molecular"]}</p>
            </div>
            <div>
              <strong className="block text-accent-strong">Relevancia clinica</strong>
              <p>{aiState.report["Relevancia clinica"]}</p>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm leading-relaxed text-black/65">
            {aiState.explanation ||
              aiState.error ||
              "Abre este detalle para solicitar una interpretacion breve con IA."}
          </p>
        )}
      </div>

      {aiState.matchFound === false ? (
        <div className="mt-3 rounded-2xl border border-amber-200/80 bg-amber-50/80 px-3 py-3 text-sm leading-relaxed text-amber-900/80">
          <strong className="block text-[11px] uppercase tracking-[0.18em] text-amber-700">
            Nota
          </strong>
          <p className="mt-2">
            No encontramos esta variante exacta en la base de datos clinica. Por eso la
            interpretacion mostrada corresponde a un analisis molecular inferido a partir
            del cambio de codon y aminoacido, sin una asociacion clinica especifica cargada
            en la BD.
          </p>
        </div>
      ) : null}
    </details>
  );
}

export function DnaAnalyzer() {
  const [dnaInput, setDnaInput] = useState(DEFAULT_DATABASE_EXAMPLE.sequence);
  const [sampleInput, setSampleInput] = useState(DEFAULT_DATABASE_EXAMPLE.sample);
  const [selectedBase, setSelectedBase] = useState<BaseDetail | null>(null);
  const [examplesPage, setExamplesPage] = useState(0);
  const [selectedExampleName, setSelectedExampleName] = useState<string | null>(
    DEFAULT_DATABASE_EXAMPLE.name
  );

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
  const totalExamplePages = Math.ceil(
    DATABASE_DETECTION_EXAMPLES.length / EXAMPLES_PER_PAGE
  );
  const paginatedExamples = DATABASE_DETECTION_EXAMPLES.slice(
    examplesPage * EXAMPLES_PER_PAGE,
    (examplesPage + 1) * EXAMPLES_PER_PAGE
  );

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
            dnaSequence={displayedSequence || DEFAULT_DATABASE_EXAMPLE.sequence}
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
              key={`hero-${displayedSequence}`}
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
          description="Ingresa una secuencia principal o usa ejemplos clínicos que sí existen en la base de datos."
        >
          <div className="mb-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="block text-xs font-bold text-accent-strong/60 uppercase tracking-widest">
              Ejemplos detectables en la BD
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setExamplesPage((page) => Math.max(0, page - 1))}
                  disabled={examplesPage === 0}
                  className="rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs font-semibold text-accent-strong disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Anterior
                </button>
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-black/35">
                  {examplesPage + 1} / {totalExamplePages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setExamplesPage((page) => Math.min(totalExamplePages - 1, page + 1))
                  }
                  disabled={examplesPage >= totalExamplePages - 1}
                  className="rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs font-semibold text-accent-strong disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {paginatedExamples.map((example) => (
                <button
                  key={example.name}
                  onClick={() => {
                    setDnaInput(example.sequence);
                    setSampleInput(example.sample);
                    setSelectedBase(null);
                    setSelectedExampleName(example.name);
                  }}
                  className={`rounded-2xl border px-4 py-3 text-left shadow-[0_14px_40px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-[1px] hover:bg-white ${
                    selectedExampleName === example.name
                      ? "border-emerald-400 bg-emerald-50/80 ring-2 ring-emerald-200"
                      : "border-black/8 bg-white/70 hover:border-accent/25"
                  }`}
                  title={example.description}
                >
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-sm text-accent-strong">{example.name}</strong>
                    <span className="rounded-full bg-accent/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-accent-strong">
                      {example.badge}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-black/55">
                    {example.description}
                  </p>
                  <div className="mt-3 flex flex-col gap-1 text-[11px] font-mono text-black/55">
                    <span>REF: {example.sequence}</span>
                    <span>SAMPLE: {example.sample}</span>
                  </div>
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
                    setSelectedExampleName(findMatchingExampleName(val, sampleInput));
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
                    setSelectedExampleName(findMatchingExampleName(dnaInput, val));
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
                key={`results-${displayedSequence}`}
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
