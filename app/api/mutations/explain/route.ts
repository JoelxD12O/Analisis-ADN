import { NextResponse } from "next/server";
import {
  generateMutationImpactExplanation,
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

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!isValidPayload(body)) {
      return NextResponse.json(
        { error: "Invalid mutation payload" },
        { status: 400 }
      );
    }

    const explanation = await generateMutationImpactExplanation(body);

    return NextResponse.json({ explanation });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to generate mutation explanation";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
