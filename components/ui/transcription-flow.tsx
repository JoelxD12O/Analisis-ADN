import { TranscriptionSpeed } from "@/hooks/use-transcription-simulation";

type TranscriptionFlowProps = {
  dnaSequence: string;
  generatedRna: string;
  currentIndex: number | null;
  currentStep: { dnaBase: string; rnaBase: string; position: number } | null;
  progress: number;
  isRunning: boolean;
  isFinished: boolean;
  speed: TranscriptionSpeed;
  setSpeed: (speed: TranscriptionSpeed) => void;
  onStart: () => void;
  onStop: () => void;
};

export function TranscriptionFlow({
  dnaSequence,
  generatedRna,
  currentIndex,
  currentStep,
  progress,
  isRunning,
  isFinished,
  speed,
  setSpeed,
  onStart,
  onStop,
}: TranscriptionFlowProps) {
  const dnaBases = dnaSequence.split("");
  const rnaBases = generatedRna.split("");

  return (
    <div className="transcription-flow">
      <div className="transcription-flow__header">
        <div>
          <span>Transcripción biológica</span>
          <strong>ADN {"->"} ARN</strong>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-accent-soft/30 backdrop-blur-md rounded-full p-1 border border-accent/10 shadow-inner">
            {[500, 200, 80].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s as TranscriptionSpeed)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase transition-all duration-200 ${speed === s
                  ? "bg-accent text-white shadow-md scale-105"
                  : "text-accent-strong/60 hover:text-accent-strong hover:bg-white/40"
                  }`}
              >
                {s === 500 ? "Lento" : s === 200 ? "Normal" : "Rápido"}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="transcription-flow__button"
            onClick={isRunning ? onStop : onStart}
            disabled={!dnaSequence}
          >
            {isRunning ? "Detener" : isFinished ? "Reiniciar" : "Simular transcripción"}
          </button>
        </div>
      </div>

      <div className="relative">
        <div className="overflow-x-auto pb-4 custom-scrollbar">
          <div className="flex flex-col gap-2 min-w-max px-2">
            {/* Fila 1: ADN */}
            <div className="flex gap-1">
              {dnaBases.map((base, index) => (
                <div
                  key={`dna-${index}`}
                  className={`flex items-center justify-center w-8 h-8 rounded-lg font-mono text-sm font-bold border transition-all duration-300 ${currentIndex === index
                    ? "bg-accent text-white border-accent scale-110 shadow-lg z-10"
                    : "bg-white/90 text-accent-strong/80 border-black/10"
                    }`}
                >
                  {base}
                </div>
              ))}
            </div>

            {/* Fila 2: Indicador/Highlight */}
            <div className="flex gap-1 h-6 relative">
              {dnaBases.map((_, index) => (
                <div key={`indicator-${index}`} className="flex items-center justify-center w-8 h-full">
                  {currentIndex === index && (
                    <div className="w-1 h-full bg-accent/30 rounded-full animate-pulse flex items-center justify-center">
                      <div className="w-2 h-2 bg-accent rounded-full" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Fila 3: ARN */}
            <div className="flex gap-1">
              {dnaBases.map((_, index) => (
                <div
                  key={`rna-${index}`}
                  className={`flex items-center justify-center w-8 h-8 rounded-lg font-mono text-sm font-bold border transition-all duration-300 ${rnaBases[index]
                    ? "bg-white text-accent-strong border-accent/30 shadow-sm"
                    : "bg-black/5 text-black/20 border-transparent"
                    } ${currentIndex === index ? "scale-110 ring-2 ring-accent/30 bg-accent-soft" : ""}`}
                >
                  {rnaBases[index] || "·"}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="flex-1 overflow-hidden">
          {isRunning && currentStep ? (
            <p className="text-xs text-accent-strong/70 animate-in fade-in slide-in-from-left-2">
              Transcribiendo base {currentStep.position}: <strong>{currentStep.dnaBase} → {currentStep.rnaBase}</strong>
            </p>
          ) : isFinished ? (
            <p className="text-xs text-accent-strong font-medium">Transcripción completada ✓</p>
          ) : (
            <p className="text-xs text-black/40 italic">Listo para iniciar la transcripción</p>
          )}
        </div>

        <div className="w-48 h-1.5 bg-black/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent to-accent-strong transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
