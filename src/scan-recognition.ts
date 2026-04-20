export interface ScanRecognitionResult {
  tokens: string[];
  confidence: number;
  warnings: string[];
  usage: {
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
  };
  rawResponse?: unknown;
}

const allowedScanTokens = [
  ...Array.from({ length: 13 }, (_, value) => `number:${value}`),
  "modifier:+2",
  "modifier:+4",
  "modifier:+6",
  "modifier:+8",
  "modifier:+10",
  "modifier:x2"
] as const;

const allowedTokenSet = new Set<string>(allowedScanTokens);

const scanRecognitionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    tokens: {
      type: "array",
      items: {
        type: "string",
        enum: [...allowedScanTokens]
      }
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1
    },
    warnings: {
      type: "array",
      items: {
        type: "string"
      },
      maxItems: 5
    }
  },
  required: ["tokens", "confidence", "warnings"]
} as const;

const scanPrompt = [
  "You read Flip 7 card photos.",
  "Return only the visible cards in normalized token form.",
  "Use these exact token formats:",
  "- number:0 through number:12",
  "- modifier:+2, modifier:+4, modifier:+6, modifier:+8, modifier:+10, modifier:x2",
  "Do not calculate score.",
  "Do not invent cards that are not visible.",
  "If a card is unclear, omit it or keep confidence low.",
  "If no hand is visible, return an empty token list with low confidence."
].join(" ");

const normalizeToken = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const compact = trimmed.toLowerCase().replace(/\s+/g, "");

  if (allowedTokenSet.has(compact)) {
    return compact;
  }

  if (/^(?:number:)?(?:0|1|2|3|4|5|6|7|8|9|10|11|12)$/.test(compact)) {
    const number = compact.replace("number:", "");
    return `number:${Number(number)}`;
  }

  if (/^(?:modifier:)?(?:\+?2|\+?4|\+?6|\+?8|\+?10)$/.test(compact)) {
    const number = compact.replace("modifier:", "").replace("+", "");
    return `modifier:+${Number(number)}`;
  }

  if (/^(?:modifier:)?(?:x2|2x|times2)$/.test(compact)) {
    return "modifier:x2";
  }

  return null;
};

const normalizeTokens = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }

  const tokens: string[] = [];
  const seen = new Set<string>();

  for (const candidate of value) {
    const normalized = normalizeToken(candidate);
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    tokens.push(normalized);
  }

  return tokens;
};

const normalizeWarnings = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((candidate): candidate is string => typeof candidate === "string")
    .map((warning) => warning.trim())
    .filter(Boolean)
    .slice(0, 5);
};

const normalizeUsage = (value: unknown) => {
  if (!value || typeof value !== "object") {
    return {
      inputTokens: null,
      outputTokens: null,
      totalTokens: null
    };
  }

  const usage = value as {
    input_tokens?: unknown;
    output_tokens?: unknown;
    total_tokens?: unknown;
    prompt_tokens?: unknown;
    completion_tokens?: unknown;
  };

  const inputTokens = Number(usage.input_tokens ?? usage.prompt_tokens);
  const outputTokens = Number(usage.output_tokens ?? usage.completion_tokens);
  const totalTokens = Number(usage.total_tokens);

  return {
    inputTokens: Number.isFinite(inputTokens) ? inputTokens : null,
    outputTokens: Number.isFinite(outputTokens) ? outputTokens : null,
    totalTokens: Number.isFinite(totalTokens) ? totalTokens : null
  };
};

const extractResponseText = (payload: unknown) => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as {
    output_text?: unknown;
    output?: unknown;
  };

  if (typeof candidate.output_text === "string" && candidate.output_text.trim().length > 0) {
    return candidate.output_text.trim();
  }

  if (!Array.isArray(candidate.output)) {
    return null;
  }

  for (const item of candidate.output) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const outputItem = item as {
      content?: unknown;
      type?: unknown;
      parsed?: unknown;
      text?: unknown;
      value?: unknown;
    };

    if (outputItem.parsed && typeof outputItem.parsed === "object") {
      return JSON.stringify(outputItem.parsed);
    }

    if (typeof outputItem.text === "string" && outputItem.text.trim().length > 0) {
      return outputItem.text.trim();
    }

    if (typeof outputItem.value === "string" && outputItem.value.trim().length > 0) {
      return outputItem.value.trim();
    }

    if (!Array.isArray(outputItem.content)) {
      continue;
    }

    for (const contentItem of outputItem.content) {
      if (!contentItem || typeof contentItem !== "object") {
        continue;
      }

      const part = contentItem as {
        text?: unknown;
        value?: unknown;
        parsed?: unknown;
      };

      if (part.parsed && typeof part.parsed === "object") {
        return JSON.stringify(part.parsed);
      }

      if (typeof part.text === "string" && part.text.trim().length > 0) {
        return part.text.trim();
      }

      if (typeof part.value === "string" && part.value.trim().length > 0) {
        return part.value.trim();
      }
    }
  }

  return null;
};

const getErrorMessage = async (response: Response) => {
  try {
    const body = await response.text();
    return body.trim().length > 0 ? body.trim() : `${response.status} ${response.statusText}`.trim();
  } catch {
    return `${response.status} ${response.statusText}`.trim();
  }
};

export async function recognizeScanImage(options: {
  apiKey: string;
  imageDataUrl: string;
  model: string;
  includeRawResponse?: boolean;
}): Promise<ScanRecognitionResult> {
  const { apiKey, imageDataUrl, model, includeRawResponse = false } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: scanPrompt },
              { type: "input_image", image_url: imageDataUrl }
            ]
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "flip7_scan_recognition",
            strict: true,
            schema: scanRecognitionSchema
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(await getErrorMessage(response));
    }

    const payload = (await response.json()) as unknown;
    const extractedText = extractResponseText(payload);
    if (!extractedText) {
      throw new Error("OpenAI returned no scan output.");
    }

    const parsed = JSON.parse(extractedText) as {
      tokens?: unknown;
      confidence?: unknown;
      warnings?: unknown;
    };
    const usage = normalizeUsage(
      payload && typeof payload === "object" ? (payload as { usage?: unknown }).usage : null
    );

    const tokens = normalizeTokens(parsed.tokens);
    const confidence =
      typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence)
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0;
    const warnings = normalizeWarnings(parsed.warnings);

    return {
      tokens,
      confidence,
      warnings,
      usage,
      ...(includeRawResponse ? { rawResponse: payload } : {})
    };
  } finally {
    clearTimeout(timeout);
  }
}
