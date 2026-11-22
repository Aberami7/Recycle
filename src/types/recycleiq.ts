export type WasteCategory =
  | 'Plastic'
  | 'Paper'
  | 'Metal'
  | 'Glass'
  | 'Organic'
  | 'Non-Recyclable';

export type ContaminationLevel =
  | 'Clean'
  | 'Slightly Contaminated'
  | 'Moderately Contaminated'
  | 'Highly Contaminated';

export type RecyclabilityCategory =
  | 'Highly Recyclable'
  | 'Conditionally Recyclable'
  | 'Low Recyclability'
  | 'Non-Recyclable';

export interface AttentionRegion {
  label: string;
  /** Normalized bounding coordinates [ymin, xmin, ymax, xmax] from 0 to 1000 */
  box_2d: [number, number, number, number];
  /** Relative importance from 0.1 to 1.0 */
  weight: number;
}

export interface RecyclabilityBreakdown {
  base_material_score: number;
  contamination_penalty: number;
  condition_adjustment: number;
  final_score: number;
  rule_notes: string[];
}

export interface Phase2ServoTarget {
  chute_id: string;
  chute_label: string;
  diverter_angle_deg: number;
  hardware_executed: false;
}

export interface WasteAnalysisRecord {
  id: string;
  waste_type: WasteCategory;
  detected_item: string;
  confidence: number;
  recyclability_score: number;
  recyclability_category: RecyclabilityCategory;
  contamination_level: ContaminationLevel;
  contamination_reason: string;
  ai_explanation: string;
  visual_cues: string[];
  attention_regions: AttentionRegion[];
  image_url: string;
  heatmap_url: string | null;
  sorting_recommendation: string;
  weight: number | null;
  created_at: string;
  is_demo_data: boolean;
  prediction_source: string;
  xai_method: string;
  inference_time_ms: number | null;
  storage_provider: 'local_database';
  recyclability_breakdown: RecyclabilityBreakdown;
  phase2_servo_target: Phase2ServoTarget;
}

export interface DashboardStats {
  total_analyzed: number;
  demo_count: number;
  live_count: number;
  category_counts: Record<WasteCategory, number>;
  average_recyclability_score: number;
  clean_percentage: number;
  contaminated_percentage: number;
  highly_recyclable_percentage: number;
  non_recyclable_percentage: number;
}

export interface SystemHealth {
  status: 'ok';
  phase: 'Phase 1 Software Prototype';
  storage_provider: 'local_database';
  ai_provider: 'groq' | 'none';
  groq_configured: boolean;
  active_models: string[];
  phase2_endpoints_ready: boolean;
}
