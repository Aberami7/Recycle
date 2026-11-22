import fs from 'fs';
import path from 'path';
import type {
  DashboardStats,
  WasteAnalysisRecord,
  WasteCategory,
} from '../src/types/recycleiq.ts';
import { evaluateRecyclabilityAndSorting } from './rulesEngine.ts';

export const IS_SERVERLESS = Boolean(
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NOW_REGION
);

const DATA_DIR = IS_SERVERLESS
  ? path.resolve('/tmp', 'recycleiq-data')
  : path.resolve(process.cwd(), 'data');
const UPLOADS_DIR = path.resolve(DATA_DIR, 'uploads');
const LOCAL_DB_FILE = path.resolve(DATA_DIR, 'waste_analysis.json');

function ensureLocalDirs(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

function buildDemoRecords(): WasteAnalysisRecord[] {
  const now = Date.now();

  const bottleRules = evaluateRecyclabilityAndSorting({
    waste_type: 'Plastic',
    contamination_level: 'Slightly Contaminated',
    material_condition: 'mixed_components',
  });

  const cardboardRules = evaluateRecyclabilityAndSorting({
    waste_type: 'Paper',
    contamination_level: 'Moderately Contaminated',
    material_condition: 'wet_or_oil_soaked',
  });

  const canRules = evaluateRecyclabilityAndSorting({
    waste_type: 'Metal',
    contamination_level: 'Clean',
    material_condition: 'crushed_or_deformed',
  });

  const jarRules = evaluateRecyclabilityAndSorting({
    waste_type: 'Glass',
    contamination_level: 'Slightly Contaminated',
    material_condition: 'mixed_components',
  });

  return [
    {
      id: 'RIQ-DEMO-1001',
      waste_type: 'Plastic',
      detected_item: 'Crushed clear PET water bottle with blue cap',
      confidence: 94.2,
      ...bottleRules,
      contamination_level: 'Slightly Contaminated',
      contamination_reason:
        'Minor internal water droplets and an attached blue polymer cap are visible; no food residue observed.',
      ai_explanation:
        'The bottle-like cylindrical contour, transparent smooth polymer surface, and ribbed wall structure match a PET beverage bottle.',
      visual_cues: [
        'Cylindrical bottle silhouette and neck threading',
        'Smooth translucent polymer surface reflections',
        'Attached blue HDPE bottle cap detected',
      ],
      attention_regions: [
        { label: 'PET bottle body & ribs', box_2d: [340, 190, 670, 760], weight: 0.94 },
        { label: 'Blue polymer cap', box_2d: [435, 745, 585, 835], weight: 0.72 },
      ],
      image_url: '/src/assets/images/sample_plastic_bottle_1795353214639.jpg',
      heatmap_url: null,
      weight: null,
      created_at: new Date(now - 1000 * 60 * 145).toISOString(),
      is_demo_data: true,
      prediction_source: 'Demo Seed Record · Prototype Reference',
      xai_method: 'Prototype Attention Map (Simulated Grad-CAM Focal Regions)',
      inference_time_ms: 420,
      storage_provider: 'local_database',
    },
    {
      id: 'RIQ-DEMO-1002',
      waste_type: 'Paper',
      detected_item: 'Corrugated cardboard takeout box with oil stain',
      confidence: 91.6,
      ...cardboardRules,
      contamination_level: 'Moderately Contaminated',
      contamination_reason:
        'A dark grease and food oil stain is clearly visible across the right folding flap of the corrugated fiberboard.',
      ai_explanation:
        'Fibrous matte brown texture, straight fold seams, and corrugated flute edges indicate cardboard packaging, with visible oil saturation on the right panel.',
      visual_cues: [
        'Matte fibrous brown kraft paperboard texture',
        'Corrugated box creases and folding flaps',
        'Visible dark oil absorption patch on right flap',
      ],
      attention_regions: [
        { label: 'Corrugated cardboard body', box_2d: [275, 240, 760, 775], weight: 0.85 },
        { label: 'Visible oil/food stain', box_2d: [280, 540, 690, 775], weight: 0.96 },
      ],
      image_url: '/src/assets/images/sample_cardboard_box_1795353214693.jpg',
      heatmap_url: null,
      weight: null,
      created_at: new Date(now - 1000 * 60 * 320).toISOString(),
      is_demo_data: true,
      prediction_source: 'Demo Seed Record · Prototype Reference',
      xai_method: 'Prototype Attention Map (Simulated Grad-CAM Focal Regions)',
      inference_time_ms: 465,
      storage_provider: 'local_database',
    },
    {
      id: 'RIQ-DEMO-1003',
      waste_type: 'Metal',
      detected_item: 'Crushed aluminum beverage can',
      confidence: 95.8,
      ...canRules,
      contamination_level: 'Clean',
      contamination_reason:
        'Metallic exterior and crimped rims appear dry and free of visible food or liquid buildup.',
      ai_explanation:
        'High-contrast specular reflections along crushed aluminum folds and rolled metallic rims strongly indicate a recyclable aluminum beverage can.',
      visual_cues: [
        'Specular metallic sheen along crushed creases',
        'Rolled aluminum can rim and base profile',
        'Printed beverage graphics on thin sheet metal',
      ],
      attention_regions: [
        { label: 'Crushed metallic surface', box_2d: [265, 270, 725, 720], weight: 0.95 },
      ],
      image_url: '/src/assets/images/sample_aluminum_can_1795353214437.jpg',
      heatmap_url: null,
      weight: null,
      created_at: new Date(now - 1000 * 60 * 780).toISOString(),
      is_demo_data: true,
      prediction_source: 'Demo Seed Record · Prototype Reference',
      xai_method: 'Prototype Attention Map (Simulated Grad-CAM Focal Regions)',
      inference_time_ms: 390,
      storage_provider: 'local_database',
    },
    {
      id: 'RIQ-DEMO-1004',
      waste_type: 'Glass',
      detected_item: 'Clear glass jar with detached metal screw lid',
      confidence: 92.4,
      ...jarRules,
      contamination_level: 'Slightly Contaminated',
      contamination_reason:
        'Glass jar interior appears clean and rinsed, though a separate metal screw lid sits beside it requiring stream separation.',
      ai_explanation:
        'Thick transparent rim threading, rigid glass wall refraction, and circular base thickness confirm a glass food jar alongside its detached lid.',
      visual_cues: [
        'Thick transparent glass jar neck and screw threads',
        'High optical clarity with circular base refraction',
        'Detached metal twist-off lid placed adjacent',
      ],
      attention_regions: [
        { label: 'Transparent glass jar', box_2d: [230, 335, 760, 650], weight: 0.92 },
        { label: 'Detached metal lid', box_2d: [455, 650, 720, 880], weight: 0.68 },
      ],
      image_url: '/src/assets/images/sample_glass_jar_1795353214465.jpg',
      heatmap_url: null,
      weight: null,
      created_at: new Date(now - 1000 * 60 * 1440).toISOString(),
      is_demo_data: true,
      prediction_source: 'Demo Seed Record · Prototype Reference',
      xai_method: 'Prototype Attention Map (Simulated Grad-CAM Focal Regions)',
      inference_time_ms: 410,
      storage_provider: 'local_database',
    },
  ];
}

function readLocalRecords(): WasteAnalysisRecord[] {
  try {
    ensureLocalDirs();
    if (!fs.existsSync(LOCAL_DB_FILE)) {
      const seeded = buildDemoRecords();
      fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(seeded, null, 2), 'utf-8');
      return seeded;
    }
    const raw = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return buildDemoRecords();
    return (parsed as WasteAnalysisRecord[]).map((item) => ({
      ...item,
      storage_provider: 'local_database',
    }));
  } catch {
    return buildDemoRecords();
  }
}

function writeLocalRecords(records: WasteAnalysisRecord[]): void {
  try {
    ensureLocalDirs();
    fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(records, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Unable to persist local records file:', err);
  }
}

export function saveLocalImage(
  id: string,
  base64Data: string,
  ext: 'jpg' | 'png' | 'webp',
  prefix: 'original' | 'heatmap'
): string {
  ensureLocalDirs();
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '');
  const filename = `${prefix}_${safeId}.${ext}`;
  const resolvedPath = path.resolve(UPLOADS_DIR, filename);
  if (!resolvedPath.startsWith(UPLOADS_DIR + path.sep)) {
    throw new Error('Invalid upload path.');
  }
  fs.writeFileSync(resolvedPath, Buffer.from(base64Data, 'base64'));
  return `/api/uploads/${filename}`;
}

export function getLocalUploadPath(filename: string): string | null {
  if (!/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(filename)) {
    return null;
  }
  ensureLocalDirs();
  const resolved = path.resolve(UPLOADS_DIR, filename);
  if (!resolved.startsWith(UPLOADS_DIR + path.sep)) {
    return null;
  }
  return fs.existsSync(resolved) ? resolved : null;
}

export async function uploadImageToStorage(
  id: string,
  base64Data: string,
  mimeType: string,
  prefix: 'original' | 'heatmap'
): Promise<{ url: string; provider: 'local_database' }> {
  // On stateless serverless platforms (e.g. Vercel), return the inline data URL
  // so images always render across independent function invocations.
  if (IS_SERVERLESS) {
    return {
      url: `data:${mimeType};base64,${base64Data}`,
      provider: 'local_database',
    };
  }

  const ext: 'jpg' | 'png' | 'webp' =
    mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
  const localUrl = saveLocalImage(id, base64Data, ext, prefix);
  return { url: localUrl, provider: 'local_database' };
}

export async function saveAnalysisRecord(
  record: WasteAnalysisRecord
): Promise<WasteAnalysisRecord> {
  const existing = readLocalRecords();
  const savedRecord: WasteAnalysisRecord = {
    ...record,
    storage_provider: 'local_database',
  };
  writeLocalRecords([savedRecord, ...existing]);
  return savedRecord;
}

export async function listAnalysisRecords(): Promise<WasteAnalysisRecord[]> {
  const local = readLocalRecords();
  return [...local].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function getAnalysisRecordById(id: string): Promise<WasteAnalysisRecord | null> {
  const all = await listAnalysisRecords();
  return all.find((item) => item.id === id) ?? null;
}

export async function deleteAnalysisRecord(id: string): Promise<boolean> {
  const existing = readLocalRecords();
  const filtered = existing.filter((item) => item.id !== id);
  if (filtered.length === existing.length) return false;
  writeLocalRecords(filtered);
  return true;
}

export function computeDashboardStats(
  records: WasteAnalysisRecord[],
  scope: 'all' | 'live' | 'demo' = 'all'
): DashboardStats {
  const scoped =
    scope === 'live'
      ? records.filter((r) => !r.is_demo_data)
      : scope === 'demo'
        ? records.filter((r) => r.is_demo_data)
        : records;

  const category_counts: Record<WasteCategory, number> = {
    Plastic: 0,
    Paper: 0,
    Metal: 0,
    Glass: 0,
    Organic: 0,
    'Non-Recyclable': 0,
  };

  let totalScore = 0;
  let cleanCount = 0;
  let contaminatedCount = 0;
  let highlyRecyclableCount = 0;
  let nonRecyclableCount = 0;

  for (const r of scoped) {
    category_counts[r.waste_type] = (category_counts[r.waste_type] ?? 0) + 1;
    totalScore += r.recyclability_score;
    if (r.contamination_level === 'Clean') {
      cleanCount += 1;
    } else {
      contaminatedCount += 1;
    }
    if (r.recyclability_category === 'Highly Recyclable') {
      highlyRecyclableCount += 1;
    }
    if (
      r.recyclability_category === 'Non-Recyclable' ||
      r.sorting_recommendation === 'Send to Non-Recyclable Waste Stream'
    ) {
      nonRecyclableCount += 1;
    }
  }

  const total = scoped.length;
  const pct = (n: number) => (total === 0 ? 0 : Number(((n / total) * 100).toFixed(1)));

  return {
    total_analyzed: total,
    demo_count: records.filter((r) => r.is_demo_data).length,
    live_count: records.filter((r) => !r.is_demo_data).length,
    category_counts,
    average_recyclability_score: total === 0 ? 0 : Number((totalScore / total).toFixed(1)),
    clean_percentage: pct(cleanCount),
    contaminated_percentage: pct(contaminatedCount),
    highly_recyclable_percentage: pct(highlyRecyclableCount),
    non_recyclable_percentage: pct(nonRecyclableCount),
  };
}
