"use client";

import { useEffect, useMemo, useState } from "react";

const TRANSCRIPTION_MAP: Record<string, string> = {
  A: "U",
  T: "A",
  C: "G",
  G: "C",
};

export type TranscriptionSpeed = 80 | 200 | 500;

type SimulationState = {
  sourceSequence: string;
  generatedRna: string;
  isRunning: boolean;
};

export function useTranscriptionSimulation(sequence: string) {
  const cleanedSequence = useMemo(
    () => sequence.toUpperCase().replace(/[^ACGT]/g, ""),
    [sequence]
  );
  const [simulationState, setSimulationState] = useState<SimulationState>({
    sourceSequence: cleanedSequence,
    generatedRna: "",
    isRunning: false,
  });
  const [speed, setSpeed] = useState<TranscriptionSpeed>(200);

  const generatedRna =
    simulationState.sourceSequence === cleanedSequence ? simulationState.generatedRna : "";
  const isRunning =
    simulationState.sourceSequence === cleanedSequence && simulationState.isRunning;
  const simulationActive = isRunning && generatedRna.length < cleanedSequence.length;

  useEffect(() => {
    if (!simulationActive || !cleanedSequence) {
      return;
    }

    const nextIndex = generatedRna.length;
    if (nextIndex >= cleanedSequence.length) {
      return;
    }

    const timer = window.setTimeout(() => {
      const dnaBase = cleanedSequence[nextIndex];
      const rnaBase = TRANSCRIPTION_MAP[dnaBase];

      if (rnaBase) {
        setSimulationState((current) => {
          if (current.sourceSequence !== cleanedSequence || !current.isRunning) {
            return current;
          }

          return {
            ...current,
            generatedRna: current.generatedRna + rnaBase,
          };
        });
      } else {
        // Stop if we hit an unknown base (safety fallback)
        setSimulationState((current) => ({
          ...current,
          isRunning: false,
        }));
      }
    }, speed);

    return () => window.clearTimeout(timer);
  }, [cleanedSequence, generatedRna, simulationActive, speed, isRunning]);

  const progress = cleanedSequence.length
    ? (generatedRna.length / cleanedSequence.length) * 100
    : 0;

  const currentIndex = generatedRna.length;
  const currentStep = currentIndex < cleanedSequence.length ? {
    dnaBase: cleanedSequence[currentIndex],
    rnaBase: TRANSCRIPTION_MAP[cleanedSequence[currentIndex]],
    position: currentIndex + 1
  } : null;

  const start = () => {
    if (!cleanedSequence) {
      return;
    }

    setSimulationState({
      sourceSequence: cleanedSequence,
      generatedRna: "",
      isRunning: true,
    });
  };

  const stop = () => {
    setSimulationState((current) => ({
      ...current,
      isRunning: false,
    }));
  };

  return {
    cleanedSequence,
    currentIndex: simulationActive ? currentIndex : null,
    currentStep: simulationActive ? currentStep : null,
    generatedRna,
    isRunning: simulationActive || (isRunning && generatedRna.length < cleanedSequence.length),
    isFinished: generatedRna.length === cleanedSequence.length && cleanedSequence.length > 0,
    progress,
    speed,
    setSpeed,
    start,
    stop,
  };
}
