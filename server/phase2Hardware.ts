import type { Request, Response } from 'express';
import { analyzeWasteImage } from './visionProvider.ts';
import { evaluateRecyclabilityAndSorting } from './rulesEngine.ts';
import { saveAnalysisRecord, uploadImageToStorage } from './storageService.ts';
import type { WasteAnalysisRecord } from '../src/types/recycleiq.ts';

/**
 * Phase 2 Hardware Ingestion Endpoint (ESP32-CAM + Load Cell + IR + Ultrasonic)
 */
export async function handlePhase2HardwareIngest(req: Request, res: Response): Promise<void> {
  const {
    device_id,
    image_base64,
    mime_type = 'image/jpeg',
    weight_grams = null,
    ir_triggered = true,
    bin_levels_cm = null,
  } = req.body ?? {};

  if (!image_base64 || typeof image_base64 !== 'string') {
    res.status(400).json({
      error: 'Missing image_base64 payload from ESP32-CAM.',
    });
    return;
  }

  const parsedWeight =
    typeof weight_grams === 'number' && Number.isFinite(weight_grams) && weight_grams >= 0
      ? Number(weight_grams.toFixed(2))
      : null;

  try {
    const cleanBase64 = image_base64.replace(/^data:image\/\w+;base64,/, '');
    const vision = await analyzeWasteImage(cleanBase64, String(mime_type));
    const rules = evaluateRecyclabilityAndSorting({
      waste_type: vision.waste_type,
      contamination_level: vision.contamination_level,
      material_condition: vision.material_condition,
    });

    const id = `RIQ-HW-${Date.now().toString(36).toUpperCase()}`;
    const uploaded = await uploadImageToStorage(id, cleanBase64, String(mime_type), 'original');

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
      image_url: uploaded.url,
      heatmap_url: null,
      weight: parsedWeight,
      created_at: new Date().toISOString(),
      is_demo_data: false,
      prediction_source: `Phase 2 Hardware Stream (${String(device_id || 'ESP32-CAM')} · ${vision.model_used})`,
      xai_method: 'Prototype Attention Map (Simulated Grad-CAM Focal Regions)',
      inference_time_ms: vision.inference_time_ms,
      storage_provider: uploaded.provider,
    };

    const saved = await saveAnalysisRecord(record);

    res.status(201).json({
      analysis: saved,
      servo_command: {
        target_chute_id: saved.phase2_servo_target.chute_id,
        servo_angle_deg: saved.phase2_servo_target.diverter_angle_deg,
        action_label: saved.sorting_recommendation,
      },
      telemetry_ack: {
        device_id: device_id || 'ESP32-CAM-01',
        ir_triggered: Boolean(ir_triggered),
        weight_grams: parsedWeight,
        bin_levels_cm,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Phase 2 ingestion failed.';
    res.status(500).json({ error: message });
  }
}
