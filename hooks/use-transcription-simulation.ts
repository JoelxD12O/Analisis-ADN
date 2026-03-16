"use client";

import { useEffect, useMemo, useState } from "react";

const TRANSCRIPTION_MAP: Record<string, string> = {
  A: "U",
  T: "A",
  C: "G",
  G: "C",
};

export type TranscriptionSpeed = 80 | 200 | 500;

export function useTranscriptionSimulation(sequence: string) {
  const cleanedSequence = useMemo(
    () => sequence.toUpperCase().replace(/[^ACGT]/g, ""),
    [sequence]
  );
  const [generatedRna, setGeneratedRna] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState<TranscriptionSpeed>(200);

  const simulationActive = isRunning && generatedRna.length < cleanedSequence.length;

  useEffect(() => {
    // Reset when sequence changes
    setGeneratedRna("");
    setIsRunning(false);
  }, [cleanedSequence]);

  useEffect(() => {
    if (!simulationActive || !cleanedSequence) {
      if (isRunning && generatedRna.length === cleanedSequence.length) {
        setIsRunning(false);
      }
      return;
    }

    const nextIndex = generatedRna.length;
    if (nextIndex >= cleanedSequence.length) {
      setIsRunning(false);
      return;
    }

    const timer = window.setTimeout(() => {
      const dnaBase = cleanedSequence[nextIndex];
      const rnaBase = TRANSCRIPTION_MAP[dnaBase];

      if (rnaBase) {
        setGeneratedRna((current) => current + rnaBase);
      } else {
        // Stop if we hit an unknown base (safety fallback)
        setIsRunning(false);
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

    setGeneratedRna("");
    setIsRunning(true);
  };

  const stop = () => {
    setIsRunning(false);
  };

  return {
    cleanedSequence,
    currentIndex: simulationActive ? currentIndex : (isRunning && generatedRna.length === cleanedSequence.length ? null : null),
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
