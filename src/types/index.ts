export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  hasHazard?: boolean;
  contextAttached?: string;
  isStreaming?: boolean;
}

export interface TelemetryData {
  timestamp_s: number[];
  radiometer_w_cm2: number[];
  flame_diameter_mm: number[];
  flame_temp_k: number[];
  o2_ambient_pct: number[];
  co2_local_ppm: number[];
}

export interface ScenarioPreset {
  id: string;
  name: string;
  mission: string;
  chamber: string;
  atmosphere: string;
  ventSpeed: number; // m/s
  fuel: string;
  hazardState: 'NORMAL' | 'CONTROLLED_EXPERIMENTAL' | 'ACTIVE_FIRE_SPREAD' | 'CRITICAL_HAZARD' | 'COOL_FLAME_REGIME';
  telemetry: TelemetryData;
  summary: string;
}

export type FuelType =
  | 'PMMA_solid'
  | 'heptane_droplet'
  | 'sibal_fabric'
  | 'methane_leak'
  | 'hydrogen_gas'
  | 'methane_gas'
  | 'propane_gas'
  | 'natural_gas';

export interface FuelEverydayUse {
  title: string;
  desc: string;
  emoji: string;
}

export interface FuelInfo {
  id: FuelType;
  name: string;
  simpleName: string;
  category: 'Gas' | 'Liquid Droplet' | 'Solid Plastic' | 'Fabric Sheet';
  formula: string;
  simpleExplanation: string;
  everydaySummary?: string;
  everydayUses?: FuelEverydayUse[];
  flameLookZeroG: string;
  flameLookOneG: string;
  dangerNotes: string;
}

export interface CombustionParams {
  gravity_g: number; // 0 = microgravity, 1 = earth, 0.166 = moon, 0.38 = mars
  o2_pct: number; // 10 to 40%
  pressure_atm: number; // 0.4 to 1.5 atm
  vent_speed_ms: number; // 0.0 to 1.0 m/s
  fuel_type: FuelType;
  fuel_radius_mm: number; // 1 to 25 mm
  ignition_energy_j: number;
}

export interface ComputedPhysics {
  grashof_number: number;
  rayleigh_number: number;
  peclet_number: number;
  damkohler_number: number;
  stefan_velocity_cms: number;
  flame_temp_k: number;
  flame_aspect_ratio: number; // 1.0 = spherical, > 1.0 = teardrop
  flame_color:
    | 'chemiluminescent_blue'
    | 'sooty_yellow_incandescent'
    | 'cool_flame_invisible'
    | 'smolder_infrared'
    | 'pale_hydrogen_violet'
    | 'bright_propane_orange';
  transport_regime: 'PURE_MOLECULAR_DIFFUSION' | 'MIXED_FORCED_DIFFUSION' | 'NATURAL_BUOYANT_CONVECTION';
  extinction_risk: 'STABLE' | 'RADIATIVE_QUENCHING' | 'BLOW_OFF' | 'UNVENTED_HAZARD';
  hazard_score: number; // 0 to 100
}
