import express from 'express';
import {
  analyzeWasteImage,
  askWasteAdvisor,
  getActiveProviderInfo,
} from './visionProvider.ts';
import { evaluateRecyclabilityAndSorting } from './rulesEngine.ts';
import {
  computeDashboardStats,
  deleteAnalysisRecord,
  getAnalysisRecordById,
  getLocalUploadPath,
  listAnalysisRecords,
  saveAnalysisRecord,
  uploadImageToStorage,
} from './storageService.ts';
import { handlePhase2HardwareIngest } from './phase2Hardware.ts';
import type { WasteAnalysisRecord } from '../src/types/recycleiq.ts';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

export function createApiApp(): express.Express {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  app.get('/api/uploads/:filename', (req, res) => {
    const filePath = getLocalUploadPath(req.params.filename);
    if (!filePath) {
      res.status(404).json({ error: 'Image not found.' });
      return;
    }
    res.sendFile(filePath);
  });

  app.get('/api/health', (_req, res) => {
    const providerInfo = getActiveProviderInfo();
    res.json({
      status: 'ok',
      phase: 'Phase 1 Software Prototype',
      storage_provider: 'local_database',
      ai_provider: providerInfo.provider,
      groq_configured: providerInfo.groq_configured,
      active_models: providerInfo.active_models,
      phase2_endpoints_ready: true,
    });
  });

  app.get('/api/stats', async (req, res) => {
    try {
      const scopeParam = req.query.scope;
      const scope = scopeParam === 'live' || scopeParam === 'demo' ? scopeParam : 'all';
      const records = await listAnalysisRecords();
      const stats = computeDashboardStats(records, scope);
      res.json(stats);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load statistics.';
      res.status(500).json({ error: msg });
    }
  });

  app.get('/api/analyses', async (_req, res) => {
    try {
      const records = await listAnalysisRecords();
      res.json({ records });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to list analyses.';
      res.status(500).json({ error: msg });
    }
  });

  app.get('/api/analyses/:id', async (req, res) => {
    try {
      const record = await getAnalysisRecordById(req.params.id);
      if (!record) {
        res.status(404).json({ error: 'Analysis record not found.' });
        return;
      }
      res.json({ record });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch record.';
      res.status(500).json({ error: msg });
    }
  });

  app.delete('/api/analyses/:id', async (req, res) => {
    try {
      const deleted = await deleteAnalysisRecord(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: 'Analysis record not found.' });
        return;
      }
      res.json({ deleted: true, id: req.params.id });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete record.';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/analyze', async (req, res) => {
    try {
      const { imageDataUrl, heatmapDataUrl } = req.body ?? {};
      if (typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image/')) {
        res.status(400).json({ error: 'Please upload a valid JPEG, PNG, or WebP image.' });
        return;
      }

      const match = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (!match) {
        res.status(400).json({ error: 'Invalid base64 image encoding.' });
        return;
      }

      const mimeType = match[1].toLowerCase();
      const base64Data = match[2];

      if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        res.status(400).json({ error: 'Unsupported image format. Use JPEG, PNG, or WebP.' });
        return;
      }

      const approxBytes = Math.ceil((base64Data.length * 3) / 4);
      if (approxBytes > MAX_IMAGE_BYTES) {
        res.status(400).json({ error: 'Image exceeds 10 MB size limit.' });
        return;
      }

      const vision = await analyzeWasteImage(base64Data, mimeType);

      const rules = evaluateRecyclabilityAndSorting({
        waste_type: vision.waste_type,
        contamination_level: vision.contamination_level,
        material_condition: vision.material_condition,
      });

      const id = `RIQ-${Date.now().toString(36).toUpperCase()}`;
      const originalUpload = await uploadImageToStorage(id, base64Data, mimeType, 'original');

      let heatmapUrl: string | null = null;
      if (typeof heatmapDataUrl === 'string' && heatmapDataUrl.startsWith('data:image/png;base64,')) {
        const hmBase64 = heatmapDataUrl.replace(/^data:image\/png;base64,/, '');
        const hmUpload = await uploadImageToStorage(id, hmBase64, 'image/png', 'heatmap');
        heatmapUrl = hmUpload.url;
      }

      const record: WasteAnalysisRecord = {
        id,
        waste_type: vision.waste_type,
        detected_item: vision.detected_item,
        confidence: vision.confidence,
        ...rules,
        contamination_level: vision.contamination_level,
        contamination_reason: vision.contamination_reason,
        ai_explanation: vision.ai_explanation,
        visual_cues: vision.visual_cues,
        attention_regions: vision.attention_regions,
        image_url: originalUpload.url,
        heatmap_url: heatmapUrl,
        weight: null,
        created_at: new Date().toISOString(),
        is_demo_data: false,
        prediction_source: `Multimodal Vision (${vision.model_used}) · MobileNetV2 Slot Ready`,
        xai_method: 'Prototype Attention Map (Simulated Grad-CAM Focal Regions)',
        inference_time_ms: vision.inference_time_ms,
        storage_provider: originalUpload.provider,
      };

      const saved = await saveAnalysisRecord(record);
      res.status(201).json({ record: saved });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Waste analysis failed.';
      const status = msg.includes('GROQ_API_KEY') ? 503 : 500;
      res.status(status).json({ error: msg });
    }
  });

  app.post('/api/ask', async (req, res) => {
    try {
      const { recordId, record: clientRecord, question } = req.body ?? {};
      if (typeof question !== 'string' || question.trim().length < 2) {
        res.status(400).json({ error: 'Please enter a valid question about the waste item.' });
        return;
      }
      if (question.trim().length > 500) {
        res.status(400).json({ error: 'Question must be under 500 characters.' });
        return;
      }

      let record =
        typeof recordId === 'string' ? await getAnalysisRecordById(recordId) : null;

      if (!record && clientRecord && typeof clientRecord === 'object') {
        const cr = clientRecord as Partial<WasteAnalysisRecord>;
        if (cr.detected_item && cr.waste_type && cr.sorting_recommendation) {
          record = cr as WasteAnalysisRecord;
        }
      }

      if (!record) {
        res.status(404).json({ error: 'Analysis record not found for question context.' });
        return;
      }

      const result = await askWasteAdvisor(record, question.trim());
      res.json(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to answer right now.';
      res.status(500).json({ error: msg });
    }
  });

  app.get('/api/hardware/phase2/schema', (_req, res) => {
    res.json({
      phase: 'Phase 2 Hardware Integration Contract (Not Active in Phase 1)',
      endpoint: '/api/hardware/phase2/ingest',
      method: 'POST',
      planned_sensors: [
        'ESP32-CAM (OV2640 JPEG frame capture)',
        'HX711 + Load Cell (weight_grams)',
        'IR Proximity Sensor (conveyor item trigger)',
        'HC-SR04 Ultrasonic Sensors (bin fill levels in cm)',
        'SG90 / MG996R Servo Diverter (chute angle execution)',
      ],
      sample_payload: {
        device_id: 'ESP32-CAM-STATION-01',
        image_base64: '<base64_jpeg_string>',
        mime_type: 'image/jpeg',
        weight_grams: 18.4,
        ir_triggered: true,
        bin_levels_cm: { plastic: 14.2, paper: 28.0, metal: 9.5 },
      },
    });
  });

  app.post('/api/hardware/phase2/ingest', handlePhase2HardwareIngest);

  // Always return JSON for unmatched /api/* routes instead of HTML/plain text 404
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  return app;
}
