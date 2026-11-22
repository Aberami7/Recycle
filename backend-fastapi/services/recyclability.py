from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, List


BASE_SCORES: Dict[str, int] = {
    "Metal": 94,
    "Glass": 90,
    "Plastic": 86,
    "Paper": 84,
    "Organic": 72,
    "Non-Recyclable": 12,
}

CONTAMINATION_PENALTIES: Dict[str, int] = {
    "Clean": 0,
    "Slightly Contaminated": 8,
    "Moderately Contaminated": 28,
    "Highly Contaminated": 58,
}


@dataclass
class RecyclabilityOutput:
    recyclability_score: int
    recyclability_category: str
    sorting_recommendation: str
    rule_notes: List[str]


def assess_recyclability(
    waste_type: str,
    contamination_level: str,
    wet_or_oil_soaked: bool = False,
) -> RecyclabilityOutput:
    base = BASE_SCORES.get(waste_type, 12)
    penalty = CONTAMINATION_PENALTIES.get(contamination_level, 8)
    condition_adj = -14 if (waste_type == "Paper" and wet_or_oil_soaked) else 0

    score = max(0, min(100, base - penalty + condition_adj))

    if score >= 75:
        category = "Highly Recyclable"
    elif score >= 45:
        category = "Conditionally Recyclable"
    elif score >= 20:
        category = "Low Recyclability"
    else:
        category = "Non-Recyclable"

    if waste_type == "Non-Recyclable" or score < 25 or (waste_type == "Paper" and wet_or_oil_soaked and penalty >= 28):
        recommendation = "Send to Non-Recyclable Waste Stream"
    elif waste_type == "Plastic":
        recommendation = "Send to Plastic Recycling"
    elif waste_type == "Paper":
        recommendation = "Send to Paper & Cardboard Recycling"
    elif waste_type == "Metal":
        recommendation = "Send to Metal Recovery"
    elif waste_type == "Glass":
        recommendation = "Send to Glass Recycling"
    else:
        recommendation = "Send to Organic Composting"

    notes = [
        f"Base recoverability for {waste_type}: {base}/100",
        f"Contamination penalty ({contamination_level}): -{penalty}",
    ]
    if condition_adj:
        notes.append(f"Condition adjustment: {condition_adj}")

    return RecyclabilityOutput(
        recyclability_score=score,
        recyclability_category=category,
        sorting_recommendation=recommendation,
        rule_notes=notes,
    )
