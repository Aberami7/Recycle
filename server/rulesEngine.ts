import type {
  ContaminationLevel,
  Phase2ServoTarget,
  RecyclabilityBreakdown,
  RecyclabilityCategory,
  WasteCategory,
} from '../src/types/recycleiq.ts';

export interface RecyclabilityRuleInput {
  waste_type: WasteCategory;
  contamination_level: ContaminationLevel;
  material_condition: 'intact' | 'crushed_or_deformed' | 'wet_or_oil_soaked' | 'mixed_components';
}

export interface RecyclabilityRuleResult {
  recyclability_score: number;
  recyclability_category: RecyclabilityCategory;
  sorting_recommendation: string;
  recyclability_breakdown: RecyclabilityBreakdown;
  phase2_servo_target: Phase2ServoTarget;
}

const BASE_SCORES: Record<WasteCategory, number> = {
  Metal: 94,
  Glass: 90,
  Plastic: 86,
  Paper: 84,
  Organic: 72,
  'Non-Recyclable': 12,
};

const CONTAMINATION_PENALTIES: Record<ContaminationLevel, number> = {
  Clean: 0,
  'Slightly Contaminated': 8,
  'Moderately Contaminated': 28,
  'Highly Contaminated': 58,
};

const SERVO_CHUTES: Record<string, { chute_id: string; chute_label: string; diverter_angle_deg: number }> = {
  'Send to Plastic Recycling': { chute_id: 'CHUTE_A_PLASTIC', chute_label: 'Plastic Bin (Chute A)', diverter_angle_deg: 25 },
  'Send to Paper & Cardboard Recycling': { chute_id: 'CHUTE_B_PAPER', chute_label: 'Paper Bin (Chute B)', diverter_angle_deg: 55 },
  'Send to Metal Recovery': { chute_id: 'CHUTE_C_METAL', chute_label: 'Metal Bin (Chute C)', diverter_angle_deg: 85 },
  'Send to Glass Recycling': { chute_id: 'CHUTE_D_GLASS', chute_label: 'Glass Bin (Chute D)', diverter_angle_deg: 115 },
  'Send to Organic Composting': { chute_id: 'CHUTE_E_ORGANIC', chute_label: 'Organic Compost Bin (Chute E)', diverter_angle_deg: 145 },
  'Send to Non-Recyclable Waste Stream': { chute_id: 'CHUTE_F_RESIDUAL', chute_label: 'Residual Waste Bin (Chute F)', diverter_angle_deg: 175 },
};

export function evaluateRecyclabilityAndSorting(input: RecyclabilityRuleInput): RecyclabilityRuleResult {
  const base_material_score = BASE_SCORES[input.waste_type];
  const contamination_penalty = CONTAMINATION_PENALTIES[input.contamination_level];

  let condition_adjustment = 0;
  const rule_notes: string[] = [
    `Base material recoverability for ${input.waste_type}: ${base_material_score}/100.`,
  ];

  if (contamination_penalty > 0) {
    rule_notes.push(
      `Visual contamination (${input.contamination_level}) applies a -${contamination_penalty} point recovery penalty.`
    );
  } else {
    rule_notes.push('No visible contamination penalty applied (Clean surface).');
  }

  if (input.material_condition === 'intact') {
    condition_adjustment = input.waste_type === 'Non-Recyclable' ? 0 : 2;
  } else if (input.material_condition === 'crushed_or_deformed') {
    condition_adjustment = -2;
    rule_notes.push('Deformed/crushed geometry slightly reduces automated optical sorting efficiency (-2).');
  } else if (input.material_condition === 'wet_or_oil_soaked') {
    condition_adjustment = input.waste_type === 'Paper' ? -14 : -6;
    rule_notes.push(
      input.waste_type === 'Paper'
        ? 'Moisture or grease weakens paper/cardboard cellulose fibers (-14).'
        : 'Surface moisture/oil reduces immediate baling readiness (-6).'
    );
  } else if (input.material_condition === 'mixed_components') {
    condition_adjustment = -6;
    rule_notes.push('Attached secondary component (e.g., cap, label, or lid) requires separation (-6).');
  }

  const rawScore = base_material_score - contamination_penalty + condition_adjustment;
  const recyclability_score = Math.max(0, Math.min(100, Math.round(rawScore)));

  let recyclability_category: RecyclabilityCategory;
  if (recyclability_score >= 75) {
    recyclability_category = 'Highly Recyclable';
  } else if (recyclability_score >= 45) {
    recyclability_category = 'Conditionally Recyclable';
  } else if (recyclability_score >= 20) {
    recyclability_category = 'Low Recyclability';
  } else {
    recyclability_category = 'Non-Recyclable';
  }

  let sorting_recommendation: string;
  const heavilySoiledPaper =
    input.waste_type === 'Paper' &&
    (input.contamination_level === 'Highly Contaminated' ||
      (input.contamination_level === 'Moderately Contaminated' &&
        input.material_condition === 'wet_or_oil_soaked'));

  if (input.waste_type === 'Non-Recyclable' || recyclability_score < 25 || heavilySoiledPaper) {
    sorting_recommendation = 'Send to Non-Recyclable Waste Stream';
    if (heavilySoiledPaper) {
      rule_notes.push(
        'Oil-saturated or heavily soiled paper cannot be repulped cleanly and is routed to residual waste.'
      );
    } else if (recyclability_score < 25 && input.waste_type !== 'Non-Recyclable') {
      rule_notes.push(
        'High contamination drops recoverability below the 25-point recycling threshold.'
      );
    }
  } else if (input.waste_type === 'Plastic') {
    sorting_recommendation = 'Send to Plastic Recycling';
  } else if (input.waste_type === 'Paper') {
    sorting_recommendation = 'Send to Paper & Cardboard Recycling';
  } else if (input.waste_type === 'Metal') {
    sorting_recommendation = 'Send to Metal Recovery';
  } else if (input.waste_type === 'Glass') {
    sorting_recommendation = 'Send to Glass Recycling';
  } else {
    sorting_recommendation = 'Send to Organic Composting';
  }

  const chute = SERVO_CHUTES[sorting_recommendation] ?? SERVO_CHUTES['Send to Non-Recyclable Waste Stream'];

  return {
    recyclability_score,
    recyclability_category,
    sorting_recommendation,
    recyclability_breakdown: {
      base_material_score,
      contamination_penalty,
      condition_adjustment,
      final_score: recyclability_score,
      rule_notes,
    },
    phase2_servo_target: {
      ...chute,
      hardware_executed: false,
    },
  };
}
