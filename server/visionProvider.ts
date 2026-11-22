import type {
  AttentionRegion,
  ContaminationLevel,
  WasteAnalysisRecord,
  WasteCategory,
} from '../src/types/recycleiq.ts';

export interface VisionAnalysisOutput {
  waste_type: WasteCategory;
  detected_item: string;
  confidence: number;
  visual_cues: string[];
  ai_explanation: string;
  contamination_level: ContaminationLevel;
  contamination_reason: string;
  material_condition: 'intact' | 'crushed_or_deformed' | 'wet_or_oil_soaked' | 'mixed_components';
  attention_regions: AttentionRegion[];
  inference_time_ms: number;
  model_used: string;
}

const VALID_CATEGORIES: WasteCategory[] = [
  'Plastic',
  'Paper',
  'Metal',
  'Glass',
  'Organic',
  'Non-Recyclable',
];

const VALID_CONTAMINATION: ContaminationLevel[] = [
  'Clean',
  'Slightly Contaminated',
  'Moderately Contaminated',
  'Highly Contaminated',
];

const VALID_CONDITIONS = [
  'intact',
  'crushed_or_deformed',
  'wet_or_oil_soaked',
  'mixed_components',
] as const;

const PREFERRED_VISION_MODELS = [
  'qwen/qwen3.8-27b',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'meta-llama/llama-4-maverick-17b-128e-instruct',
  'llama-3.2-90b-vision-preview',
  'llama-3.2-11b-vision-preview',
];

const PREFERRED_TEXT_MODELS = [
  'openai/gpt-oss-120b',
  'llama-3.3-70b-versatile',
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-20b',
  'llama-3.1-8b-instant',
];

const EXCLUDED_NON_CHAT_PATTERNS = ['whisper', 'guard', 'orpheus', 'tts', 'safeguard'];

let cachedAccountModels: { ids: string[]; fetchedAt: number } | null = null;

function getGroqApiKey(): string {
  return (
    process.env.GROQ_API_KEY?.trim() ||
    process.env.groq_api?.trim() ||
    process.env.GROQ_API?.trim() ||
    ''
  );
}

export function isGroqConfigured(): boolean {
  return getGroqApiKey().length > 10;
}

export function getActiveProviderInfo(): {
  provider: 'groq' | 'none';
  groq_configured: boolean;
  active_models: string[];
} {
  const configured = isGroqConfigured();
  return {
    provider: configured ? 'groq' : 'none',
    groq_configured: configured,
    active_models: cachedAccountModels?.ids.length
      ? cachedAccountModels.ids
      : [...PREFERRED_VISION_MODELS],
  };
}

async function getAccountModels(apiKey: string): Promise<string[]> {
  if (cachedAccountModels && Date.now() - cachedAccountModels.fetchedAt < 5 * 60 * 1000) {
    return cachedAccountModels.ids;
  }

  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { data?: Array<{ id?: string; active?: boolean }> };
    const ids = (data.data ?? [])
      .filter((m) => m.id && m.active !== false)
      .map((m) => m.id as string);
    cachedAccountModels = { ids, fetchedAt: Date.now() };
    return ids;
  } catch {
    return [];
  }
}

function isChatCapable(id: string): boolean {
  const lower = id.toLowerCase();
  return !EXCLUDED_NON_CHAT_PATTERNS.some((p) => lower.includes(p));
}

async function resolveVisionModels(apiKey: string): Promise<string[]> {
  const available = (await getAccountModels(apiKey)).filter(isChatCapable);
  if (available.length === 0) return [...PREFERRED_VISION_MODELS];

  const visionCandidates = available.filter(
    (id) =>
      id.includes('qwen') ||
      id.includes('llama-4') ||
      id.includes('vision') ||
      id.includes('llava') ||
      id.includes('pixtral')
  );

  const ordered = [
    ...PREFERRED_VISION_MODELS.filter((m) => available.includes(m)),
    ...visionCandidates.filter((m) => !PREFERRED_VISION_MODELS.includes(m)),
    ...available.filter(
      (m) => !PREFERRED_VISION_MODELS.includes(m) && !visionCandidates.includes(m)
    ),
  ];

  return ordered.length > 0 ? ordered : [...PREFERRED_VISION_MODELS];
}

async function resolveTextModels(apiKey: string): Promise<string[]> {
  const available = (await getAccountModels(apiKey)).filter(isChatCapable);
  if (available.length === 0) return [...PREFERRED_TEXT_MODELS];

  const ordered = [
    ...PREFERRED_TEXT_MODELS.filter((m) => available.includes(m)),
    ...available.filter((m) => !PREFERRED_TEXT_MODELS.includes(m)),
  ];

  return ordered.length > 0 ? ordered : [...PREFERRED_TEXT_MODELS];
}

function extractJsonObject(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start !== -1 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
    }
    throw new Error('The Groq vision model returned an unreadable response. Please retry.');
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGroqWithModels(
  models: string[],
  bodyBuilder: (model: string) => Record<string, unknown>
): Promise<{ content: string; modelUsed: string }> {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    throw new Error(
      'GROQ_API_KEY is not configured on the server. Add GROQ_API_KEY in Environment Variables / Settings > Secrets and redeploy.'
    );
  }

  let lastErrorMessage = 'Unable to reach Groq API.';

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bodyBuilder(model)),
        });

        if (response.ok) {
          const data = (await response.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const content = data.choices?.[0]?.message?.content?.trim();
          if (!content) {
            lastErrorMessage = 'Groq API returned an empty response.';
            continue;
          }
          return { content, modelUsed: model };
        }

        const errText = await response.text().catch(() => '');
        let parsedMsg = errText;
        try {
          const errJson = JSON.parse(errText) as { error?: { message?: string } };
          if (errJson?.error?.message) parsedMsg = errJson.error.message;
        } catch {
          // keep raw text
        }

        if (response.status === 401 || response.status === 403) {
          throw new Error(
            'Groq API key is invalid or unauthorized. Please verify GROQ_API_KEY in Environment Variables / Settings > Secrets.'
          );
        }

        // If a specific model ID isn't available (404/400) or rate-limited (429/503), move to next model
        const shouldTryNextModel =
          response.status === 404 ||
          response.status === 400 ||
          response.status === 429 ||
          response.status === 500 ||
          response.status === 502 ||
          response.status === 503;

        lastErrorMessage =
          response.status === 429 || response.status === 503
            ? 'Groq API is temporarily busy. Please try again in a few seconds.'
            : `Groq API error (${response.status}): ${parsedMsg.slice(0, 180)}`;

        if (!shouldTryNextModel) {
          throw new Error(lastErrorMessage);
        }

        // On 404 / 400 model mismatch, skip second retry on same model and move to next model immediately
        if (response.status === 404 || response.status === 400) {
          break;
        }

        if (attempt === 0) {
          await sleep(450);
        }
      } catch (err) {
        if (err instanceof Error && err.message.includes('invalid or unauthorized')) {
          throw err;
        }
        lastErrorMessage = err instanceof Error ? err.message : 'Network error calling Groq API.';
        if (attempt === 0) await sleep(450);
      }
    }
  }

  throw new Error(lastErrorMessage);
}

export async function analyzeWasteImage(
  base64Data: string,
  mimeType: string
): Promise<VisionAnalysisOutput> {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    throw new Error(
      'GROQ_API_KEY is not configured on the server. Add GROQ_API_KEY in Environment Variables / Settings > Secrets and redeploy.'
    );
  }

  const startedAt = Date.now();
  const visionModels = await resolveVisionModels(apiKey);

  const prompt = [
    'You are the RecycleIQ Phase 1 waste inspection vision model.',
    'Analyze the waste photograph and return ONLY a valid JSON object matching these exact fields:',
    '{',
    '  "waste_type": "Plastic" | "Paper" | "Metal" | "Glass" | "Organic" | "Non-Recyclable",',
    '  "detected_item": "short plain description of the object",',
    '  "confidence": number between 55.0 and 97.5 (never 100),',
    '  "visual_cues": ["3 to 4 concise plain-English observations"],',
    '  "ai_explanation": "1-2 plain sentences explaining why it belongs to that category",',
    '  "contamination_level": "Clean" | "Slightly Contaminated" | "Moderately Contaminated" | "Highly Contaminated",',
    '  "contamination_reason": "description of visually observable surface residue only (never claim chemical detection)",',
    '  "material_condition": "intact" | "crushed_or_deformed" | "wet_or_oil_soaked" | "mixed_components",',
    '  "attention_regions": [{"label": "region name", "box_2d": [ymin, xmin, ymax, xmax], "weight": 0.2 to 1.0}]',
    '}',
    'Note: box_2d values must be integers from 0 to 1000.',
  ].join('\n');

  const { content, modelUsed } = await callGroqWithModels(visionModels, (model) => ({
    model,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${base64Data}`,
            },
          },
        ],
      },
    ],
    max_tokens: 900,
  }));

  const elapsed = Date.now() - startedAt;
  const parsed = extractJsonObject(content);

  const wasteType = VALID_CATEGORIES.includes(parsed.waste_type as WasteCategory)
    ? (parsed.waste_type as WasteCategory)
    : 'Non-Recyclable';

  const contaminationLevel = VALID_CONTAMINATION.includes(
    parsed.contamination_level as ContaminationLevel
  )
    ? (parsed.contamination_level as ContaminationLevel)
    : 'Slightly Contaminated';

  const condition = VALID_CONDITIONS.includes(
    parsed.material_condition as (typeof VALID_CONDITIONS)[number]
  )
    ? (parsed.material_condition as (typeof VALID_CONDITIONS)[number])
    : 'intact';

  const rawConfidence = Number(parsed.confidence ?? 84.0);
  const confidence = Number(Math.max(50, Math.min(97.9, rawConfidence)).toFixed(1));

  const rawRegions = Array.isArray(parsed.attention_regions) ? parsed.attention_regions : [];
  const attention_regions: AttentionRegion[] = rawRegions.slice(0, 4).map((r: unknown) => {
    const reg = r as Record<string, unknown>;
    const box =
      Array.isArray(reg.box_2d) && reg.box_2d.length === 4
        ? (reg.box_2d.map((n) => Math.max(0, Math.min(1000, Number(n) || 0))) as [
            number,
            number,
            number,
            number,
          ])
        : ([220, 220, 780, 780] as [number, number, number, number]);
    return {
      label: String(reg.label || 'Primary object region'),
      box_2d: box,
      weight: Math.max(0.2, Math.min(1.0, Number(reg.weight) || 0.8)),
    };
  });

  if (attention_regions.length === 0) {
    attention_regions.push({
      label: 'Primary object silhouette',
      box_2d: [220, 220, 780, 780],
      weight: 0.85,
    });
  }

  const visualCues = Array.isArray(parsed.visual_cues)
    ? parsed.visual_cues.slice(0, 4).map((c) => String(c))
    : ['Object silhouette and surface reflectance analyzed'];

  return {
    waste_type: wasteType,
    detected_item: String(parsed.detected_item || `${wasteType} waste item`),
    confidence,
    visual_cues: visualCues,
    ai_explanation: String(
      parsed.ai_explanation ||
        `The Groq vision model identified visible cues consistent with ${wasteType.toLowerCase()}.`
    ),
    contamination_level: contaminationLevel,
    contamination_reason: String(
      parsed.contamination_reason ||
        'Visually inspected surface shows minimal observable residue.'
    ),
    material_condition: condition,
    attention_regions,
    inference_time_ms: elapsed,
    model_used: `Groq · ${modelUsed}`,
  };
}

export async function askWasteAdvisor(
  record: Pick<
    WasteAnalysisRecord,
    | 'detected_item'
    | 'waste_type'
    | 'confidence'
    | 'recyclability_score'
    | 'recyclability_category'
    | 'contamination_level'
    | 'contamination_reason'
    | 'sorting_recommendation'
  >,
  question: string
): Promise<{ answer: string; modelUsed: string }> {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    throw new Error(
      'GROQ_API_KEY is not configured on the server. Add GROQ_API_KEY in Environment Variables / Settings > Secrets and redeploy.'
    );
  }

  const textModels = await resolveTextModels(apiKey);
  const { content, modelUsed } = await callGroqWithModels(textModels, (model) => ({
    model,
    messages: [
      {
        role: 'system',
        content:
          'You are the RecycleIQ Waste Sorting Advisor. Answer concisely (2-4 sentences) in plain everyday language based strictly on the provided waste inspection result. Do not invent sensor data or claim chemical testing.',
      },
      {
        role: 'user',
        content: [
          `Inspected Item: ${record.detected_item}`,
          `Category: ${record.waste_type} (${Number(record.confidence).toFixed(1)}% confidence)`,
          `Recyclability Score: ${record.recyclability_score}/100 (${record.recyclability_category})`,
          `Visual Contamination: ${record.contamination_level} — ${record.contamination_reason}`,
          `Sorting Recommendation: ${record.sorting_recommendation}`,
          `Question: ${question}`,
        ].join('\n'),
      },
    ],
    max_tokens: 300,
  }));

  return {
    answer: content,
    modelUsed: `Groq · ${modelUsed}`,
  };
}
