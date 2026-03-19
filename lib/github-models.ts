import "server-only";

export type MutationExplanationInput = {
  position: number;
  originalCodon: string;
  mutatedCodon: string;
  originalAA: string;
  mutatedAA: string;
  mutationType: string;
};

export type BackendMutationAnalysis = {
  mutation_type: string;
  effect: string;
  aa_change: {
    from: string | null;
    to: string | null;
  };
};

export type BackendClinicalData = {
  match_found: boolean;
  disease: string | null;
  significance: string | null;
};

export type BackendMutationReport = {
  Resumen: string;
  "Interpretacion molecular": string;
  "Relevancia clinica": string;
};

export type BackendMutationResponse = {
  input: {
    codon_original: string | null;
    codon_mutated: string | null;
  };
  analysis: BackendMutationAnalysis;
  clinical: BackendClinicalData;
  report: BackendMutationReport;
  match: Record<string, unknown> | null;
};

const GITHUB_MODELS_URL = "https://models.github.ai/inference/chat/completions";
const GITHUB_MODELS_VERSION = "2026-03-10";
const DEFAULT_MODEL = "openai/gpt-4.1";

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function buildMutationPrompt(input: MutationExplanationInput) {
  return `Eres un experto en bioinformatica y biologia molecular.

Tu tarea es analizar una mutacion genetica puntual en una secuencia de ADN y explicar su posible impacto de forma clara, breve y precisa.

Contexto:

* Se ha detectado una mutacion en una secuencia de ADN.
* Ya se conoce el tipo de mutacion (silenciosa, missense o nonsense).
* Tambien se conocen los codones y aminoacidos antes y despues de la mutacion.

Debes generar una explicacion breve (maximo 2-3 lineas) enfocada en impacto biologico.

La explicacion debe ser MAS ESPECIFICA que una frase generica:

* Menciona si hay conservacion o cambio del aminoacido.
* Si cambia el aminoacido, indica que puede alterar propiedades fisicoquimicas o la interaccion local de la proteina.
* Si aparece STOP, menciona perdida potencial de dominios o truncamiento.
* Si no cambia el aminoacido, puedes indicar que el efecto directo sobre la secuencia proteica seria bajo.
* Si ayuda, puedes mencionar de forma breve la diferencia entre los aminoacidos implicados.

Datos de entrada:

* Posicion: ${input.position}
* Codon original: ${input.originalCodon}
* Codon mutado: ${input.mutatedCodon}
* Aminoacido original: ${input.originalAA}
* Aminoacido mutado: ${input.mutatedAA}
* Tipo de mutacion: ${input.mutationType}

Instrucciones:

1. Si la mutacion es SILENCIOSA:
   Explicar que no cambia el aminoacido y que probablemente no tiene impacto funcional.

2. Si es MISSENSE:
   Explicar que cambia el aminoacido y puede afectar la estructura o funcion de la proteina.

3. Si es NONSENSE:
   Explicar que introduce un codon STOP prematuro y puede generar una proteina truncada.

4. Mantener tono cientifico pero simple.

5. NO usar texto largo ni explicaciones extensas.

6. NO repetir los datos de entrada.

7. NO usar emojis.

8. Evitar frases vagas como "puede afectar la proteina" sin indicar de que manera.

9. Si es missense, intenta mencionar si el cambio podria modificar carga, polaridad, volumen o plegamiento local, pero sin inventar certeza experimental.

10. Usa un lenguaje prudente: "podria", "puede", "es compatible con".

Formato de salida esperado (solo texto):

Ejemplos:

"Mutacion sin efecto funcional, ya que no altera el aminoacido codificado."

"El cambio de aminoacido puede afectar la estructura de la proteina y su funcion."

"Se genera un codon de parada prematuro, lo que puede producir una proteina incompleta."

"El reemplazo por un aminoacido con propiedades distintas podria alterar el entorno local del sitio afectado y modificar la estabilidad o funcion de la proteina."

Genera solo una explicacion breve basada en los datos proporcionados.`;
}

function buildBackendDrivenPrompt(payload: BackendMutationResponse) {
  return `Eres un asistente experto en genetica molecular, bioinformatica y medicina. Analiza la mutacion usando SOLO los datos estructurados proporcionados.

Debes responder en 3 partes y con estos titulos exactos:

Resumen:
Interpretacion molecular:
Relevancia clinica:

Reglas:
- Explica el tipo de mutacion: missense, nonsense, silent, frameshift o expansion.
- Describe que ocurre a nivel molecular.
- Explica el posible impacto en la funcion de la proteina.
- Si hay enfermedad asociada, describela brevemente y relaciona la mutacion con ella.
- Si la significancia es "pathogenic" o "likely_pathogenic", enfatiza su relevancia clinica.
- Si match_found es false, indica que no hay evidencia suficiente y explica solo el impacto teorico.
- No inventes enfermedades ni exageres conclusiones.
- Usa lenguaje claro, cientifico y conciso.
- No repitas innecesariamente el JSON.

Datos:
${JSON.stringify(
    {
      analysis: payload.analysis,
      clinical: payload.clinical,
    },
    null,
    2
  )}`;
}

export async function generateMutationImpactExplanation(
  input: MutationExplanationInput
) {
  const token = getRequiredEnv("GITHUB_TOKEN");
  const model = process.env.GITHUB_MODELS_MODEL?.trim() || DEFAULT_MODEL;

  const response = await fetch(GITHUB_MODELS_URL, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": GITHUB_MODELS_VERSION,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 80,
      messages: [
        {
          role: "system",
          content:
            "Responde en espanol con una explicacion breve, cientifica, simple y especifica del impacto biologico. Prioriza mencionar el efecto probable del cambio de aminoacido o del STOP prematuro sin exagerar la certeza.",
        },
        {
          role: "user",
          content: buildMutationPrompt(input),
        },
      ],
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub Models request failed: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("GitHub Models response did not contain explanation text");
  }

  return content;
}

export async function generateBackendDrivenMutationExplanation(
  payload: BackendMutationResponse
) {
  const token = getRequiredEnv("GITHUB_TOKEN");
  const model = process.env.GITHUB_MODELS_MODEL?.trim() || DEFAULT_MODEL;

  const response = await fetch(GITHUB_MODELS_URL, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": GITHUB_MODELS_VERSION,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 220,
      messages: [
        {
          role: "system",
          content:
            "Responde en espanol, con tono biomedico profesional, usando solo la evidencia proporcionada y sin exagerar conclusiones.",
        },
        {
          role: "user",
          content: buildBackendDrivenPrompt(payload),
        },
      ],
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub Models request failed: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("GitHub Models response did not contain explanation text");
  }

  return content;
}
