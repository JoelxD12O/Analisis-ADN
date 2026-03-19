import { NextResponse } from "next/server";
import {
  generateBackendDrivenMutationExplanation,
  type BackendMutationResponse,
  type MutationExplanationInput,
} from "@/lib/github-models";

function isValidPayload(body: unknown): body is MutationExplanationInput {
  if (!body || typeof body !== "object") {
    return false;
  }

  const candidate = body as Record<string, unknown>;

  return (
    typeof candidate.position === "number" &&
    typeof candidate.originalCodon === "string" &&
    typeof candidate.mutatedCodon === "string" &&
    typeof candidate.originalAA === "string" &&
    typeof candidate.mutatedAA === "string" &&
    typeof candidate.mutationType === "string"
  );
}

function getBackendAnalyzeUrl() {
  const value = process.env.MUTATION_BACKEND_URL?.trim();

  if (!value) {
    throw new Error("Missing required environment variable: MUTATION_BACKEND_URL");
  }

  return value;
}

function shouldUseAiForMutationExplanation() {
  return process.env.USE_GITHUB_MODELS_FOR_MUTATIONS?.trim() === "true";
}

function formatBackendReport(report: BackendMutationResponse["report"]) {
  return [
    `Resumen:\n${report.Resumen}`,
    `Interpretacion molecular:\n${report["Interpretacion molecular"]}`,
    `Relevancia clinica:\n${report["Relevancia clinica"]}`,
  ].join("\n\n");
}

async function fetchBackendAnalysis(
  payload: MutationExplanationInput
): Promise<BackendMutationResponse> {
  const response = await fetch(getBackendAnalyzeUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      codon_original: payload.originalCodon,
      codon_mutated: payload.mutatedCodon,
    }),
    cache: "no-store",
  });

  const data = (await response.json()) as BackendMutationResponse & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error || "Backend mutation analysis failed");
  }

  if (!data.analysis || !data.clinical || !data.report) {
    throw new Error("Backend mutation analysis returned an invalid payload");
  }

  return data;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!isValidPayload(body)) {
      return NextResponse.json(
        { error: "Invalid mutation payload" },
        { status: 400 }
      );
    }

    const backendResult = await fetchBackendAnalysis(body);

    const explanation = formatBackendReport(backendResult.report);
    let aiExplanation: string | null = null;

    if (
      shouldUseAiForMutationExplanation() &&
      process.env.GITHUB_TOKEN?.trim()
    ) {
      try {
        aiExplanation = await generateBackendDrivenMutationExplanation(backendResult);
      } catch {
        aiExplanation = null;
      }
    }

    return NextResponse.json({
      explanation,
      aiExplanation,
      backend: backendResult,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to generate mutation explanation";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
