-- RecycleIQ PostgreSQL / SQLite Database Schema

CREATE TABLE IF NOT EXISTS waste_analysis (
  id TEXT PRIMARY KEY,
  waste_type TEXT NOT NULL CHECK (
    waste_type IN ('Plastic', 'Paper', 'Metal', 'Glass', 'Organic', 'Non-Recyclable')
  ),
  detected_item TEXT NOT NULL,
  confidence NUMERIC(5,2) NOT NULL CHECK (confidence >= 0 AND confidence < 100),
  recyclability_score INTEGER NOT NULL CHECK (recyclability_score >= 0 AND recyclability_score <= 100),
  recyclability_category TEXT NOT NULL CHECK (
    recyclability_category IN ('Highly Recyclable', 'Conditionally Recyclable', 'Low Recyclability', 'Non-Recyclable')
  ),
  contamination_level TEXT NOT NULL CHECK (
    contamination_level IN ('Clean', 'Slightly Contaminated', 'Moderately Contaminated', 'Highly Contaminated')
  ),
  contamination_reason TEXT NOT NULL,
  ai_explanation TEXT NOT NULL,
  visual_cues TEXT NOT NULL DEFAULT '[]',
  attention_regions TEXT NOT NULL DEFAULT '[]',
  image_url TEXT NOT NULL,
  heatmap_url TEXT NULL,
  sorting_recommendation TEXT NOT NULL,
  is_demo_data INTEGER NOT NULL DEFAULT 0,
  prediction_source TEXT NOT NULL,
  xai_method TEXT NOT NULL,
  inference_time_ms INTEGER NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_waste_analysis_created_at
  ON waste_analysis (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_waste_analysis_waste_type
  ON waste_analysis (waste_type);
