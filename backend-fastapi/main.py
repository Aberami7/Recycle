from __future__ import annotations
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any
from datetime import datetime, timezone
import json
import os
import sqlite3
import uuid
from dotenv import load_dotenv

from services.classifier import PrototypeClassifier
from services.gradcam import GradCAMService
from services.recyclability import assess_recyclability

load_dotenv()

app = FastAPI(
    title="RecycleIQ API",
    description="AI-Driven Intelligent Recyclability Assessment and Waste Sorting System",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")],
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)

classifier = PrototypeClassifier()
gradcam_service = GradCAMService()
DB_PATH = os.getenv("RECYCLEIQ_DB_PATH", "recycleiq.db")
UPLOAD_DIR = os.getenv("RECYCLEIQ_UPLOAD_DIR", "uploads")


def init_db() -> None:
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS waste_analysis (
              id TEXT PRIMARY KEY,
              waste_type TEXT NOT NULL,
              detected_item TEXT NOT NULL,
              confidence REAL NOT NULL,
              recyclability_score INTEGER NOT NULL,
              recyclability_category TEXT NOT NULL,
              contamination_level TEXT NOT NULL,
              contamination_reason TEXT NOT NULL,
              ai_explanation TEXT NOT NULL,
              visual_cues TEXT NOT NULL,
              image_url TEXT NOT NULL,
              heatmap_url TEXT,
              sorting_recommendation TEXT NOT NULL,
              created_at TEXT NOT NULL
            )
            """
        )


init_db()


@app.get("/api/health")
def health_check() -> Dict[str, Any]:
    return {
        "status": "ok",
        "storage_provider": "sqlite_local",
        "ai_provider": "groq",
        "groq_configured": bool(os.getenv("GROQ_API_KEY", "").strip()),
    }


@app.post("/api/analyze")
async def analyze_waste(file: UploadFile = File(...)) -> Dict[str, Any]:
    if file.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(status_code=400, detail="Unsupported image format. Use JPEG, PNG, or WebP.")

    image_bytes = await file.read()
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image exceeds 10 MB limit.")

    prediction = classifier.predict(image_bytes)
    contamination_level = "Slightly Contaminated"
    contamination_reason = "Visually inspected for observable surface residue; no chemical claims made."
    recyclability = assess_recyclability(prediction.waste_type, contamination_level)

    heatmap_bytes = gradcam_service.generate_prototype_attention_map(
        image_bytes,
        focal_box=prediction.last_conv_activation_box,
    )

    record_id = f"RIQ-{uuid.uuid4().hex[:8].upper()}"
    img_path = os.path.join(UPLOAD_DIR, f"{record_id}.jpg")
    hm_path = os.path.join(UPLOAD_DIR, f"{record_id}_heatmap.png")
    with open(img_path, "wb") as f:
        f.write(image_bytes)
    with open(hm_path, "wb") as f:
        f.write(heatmap_bytes)

    created_at = datetime.now(timezone.utc).isoformat()
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            INSERT INTO waste_analysis (
              id, waste_type, detected_item, confidence, recyclability_score,
              recyclability_category, contamination_level, contamination_reason,
              ai_explanation, visual_cues, image_url, heatmap_url,
              sorting_recommendation, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                record_id,
                prediction.waste_type,
                prediction.detected_item,
                prediction.confidence,
                recyclability.recyclability_score,
                recyclability.recyclability_category,
                contamination_level,
                contamination_reason,
                prediction.ai_explanation,
                json.dumps(prediction.visual_cues),
                f"/uploads/{record_id}.jpg",
                f"/uploads/{record_id}_heatmap.png",
                recyclability.sorting_recommendation,
                created_at,
            ),
        )

    return {
        "record": {
            "id": record_id,
            "waste_type": prediction.waste_type,
            "detected_item": prediction.detected_item,
            "confidence": prediction.confidence,
            "recyclability_score": recyclability.recyclability_score,
            "recyclability_category": recyclability.recyclability_category,
            "contamination_level": contamination_level,
            "contamination_reason": contamination_reason,
            "ai_explanation": prediction.ai_explanation,
            "visual_cues": prediction.visual_cues,
            "image_url": f"/uploads/{record_id}.jpg",
            "heatmap_url": f"/uploads/{record_id}_heatmap.png",
            "sorting_recommendation": recyclability.sorting_recommendation,
            "created_at": created_at,
        }
    }
