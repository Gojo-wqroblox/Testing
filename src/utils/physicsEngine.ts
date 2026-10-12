import { CombustionParams, ComputedPhysics } from '../types';

export function computePhysics(params: CombustionParams): ComputedPhysics {
  const { gravity_g, o2_pct, pressure_atm, vent_speed_ms, fuel_type, fuel_radius_mm } = params;

  const L = (fuel_radius_mm * 2) / 1000; // characteristic length in meters
  const g = gravity_g * 9.80665; // acceleration in m/s^2

  // Gas properties adjusted for pressure and temperature
  const T_inf = 298.15; // K ambient
  const beta = 1 / T_inf; // thermal expansion coefficient ~ 1/T_inf (ideal gas)
  const nu = 1.5e-5 / pressure_atm; // kinematic viscosity (m^2/s) ~ inversely proportional to pressure
  const Pr = 0.71; // Prandtl number for air
  const D_diff = (2.2e-5 * Math.pow(T_inf / 298.15, 1.75)) / pressure_atm; // molecular diffusivity of O2 in N2

  // Expected delta T based on O2 concentration and gravity (buoyant heat removal vs diffusion radiative cooling)
  let deltaT = 950 + (o2_pct - 21) * 35;
  if (gravity_g > 0.1) {
    deltaT += 450; // In 1g, buoyant O2 flux raises flame temperature
  }
  deltaT = Math.max(300, deltaT);

  // Grashof Number Gr = (g * beta * deltaT * L^3) / nu^2
  const grashof_number = Math.max(0, (g * beta * deltaT * Math.pow(L, 3)) / Math.pow(nu, 2));

  // Rayleigh Number Ra = Gr * Pr
  const rayleigh_number = grashof_number * Pr;

  // Effective velocity
  const u_buoyant = gravity_g > 0.001 ? Math.sqrt(2 * g * L * (deltaT / T_inf)) : 0;
  const u_effective = Math.max(vent_speed_ms, u_buoyant);

  // Peclet Number Pe = (u * L) / D_diff
  const peclet_number = (u_effective * L) / D_diff;

  // Stefan blowing velocity at droplet/fuel interface (m/s converted to cm/s)
  const stefan_velocity_cms = Math.max(0.1, (D_diff / (L / 2)) * Math.log(1 + 0.15 * (o2_pct / 21)) * 100);

  // Damköhler Number Da = tau_flow / tau_chem
  const tau_flow = u_effective > 0.005 ? L / u_effective : Math.pow(L, 2) / D_diff;
  const tau_chem = 0.0008 / (Math.pow(o2_pct / 21, 1.5) * Math.pow(pressure_atm, 1.2));
  const damkohler_number = tau_flow / Math.max(1e-5, tau_chem);

  // Flame Temperature (K)
  let flame_temp_k = 298.15 + deltaT;
  if (gravity_g < 0.01 && vent_speed_ms < 0.02) {
    // Pure microgravity stagnation: radiative loss to CO2 shell drops temp
    flame_temp_k -= 120;
  }

  // Flame Aspect Ratio: 1.0 = perfect sphere (0g), 2.5 - 3.5 = buoyant teardrop (1g)
  let flame_aspect_ratio = 1.0;
  if (gravity_g > 0.01) {
    flame_aspect_ratio = 1.0 + Math.min(2.8, Math.pow(grashof_number, 0.22) * 0.22);
  } else if (vent_speed_ms > 0.01) {
    // In zero-g with forced ventilation, flame distorts into an ellipsoidal teardrop trailing downstream
    flame_aspect_ratio = 1.0 + Math.min(1.2, vent_speed_ms * 1.4);
  }

  // Flame color / emission regime
  let flame_color: ComputedPhysics['flame_color'] = 'chemiluminescent_blue';
  if (gravity_g > 0.1 && (fuel_type === 'PMMA_solid' || fuel_type === 'sibal_fabric' || fuel_type === 'heptane_droplet')) {
    flame_color = 'sooty_yellow_incandescent';
  } else if (o2_pct < 14) {
    flame_color = 'smolder_infrared';
  } else if (flame_temp_k < 800) {
    flame_color = 'cool_flame_invisible';
  } else {
    flame_color = 'chemiluminescent_blue';
  }

  // Transport Regime
  let transport_regime: ComputedPhysics['transport_regime'] = 'PURE_MOLECULAR_DIFFUSION';
  if (gravity_g > 0.1) {
    transport_regime = 'NATURAL_BUOYANT_CONVECTION';
  } else if (vent_speed_ms > 0.03) {
    transport_regime = 'MIXED_FORCED_DIFFUSION';
  } else {
    transport_regime = 'PURE_MOLECULAR_DIFFUSION';
  }

  // Extinction Risk Evaluation
  let extinction_risk: ComputedPhysics['extinction_risk'] = 'STABLE';
  if (gravity_g < 0.01 && vent_speed_ms < 0.01 && fuel_radius_mm > 15) {
    extinction_risk = 'RADIATIVE_QUENCHING'; // Large fuel in quiescent 0g accumulates soot & CO2
  } else if (vent_speed_ms > 0.6 && o2_pct <= 21) {
    extinction_risk = 'BLOW_OFF';
  } else if (gravity_g < 0.01 && vent_speed_ms < 0.01 && o2_pct > 28) {
    extinction_risk = 'UNVENTED_HAZARD';
  }

  // Calculate Hazard Score (0 to 100)
  let hazard_score = 15;
  if (o2_pct > 30) hazard_score += 35;
  if (gravity_g < 0.01 && vent_speed_ms < 0.02) hazard_score += 25; // stagnant accumulation
  if (fuel_type === 'methane_leak') hazard_score += 30;
  if (pressure_atm > 1.2) hazard_score += 10;
  if (flame_temp_k > 1700) hazard_score += 15;
  hazard_score = Math.min(100, Math.max(5, hazard_score));

  return {
    grashof_number,
    rayleigh_number,
    peclet_number,
    damkohler_number,
    stefan_velocity_cms,
    flame_temp_k,
    flame_aspect_ratio,
    flame_color,
    transport_regime,
    extinction_risk,
    hazard_score,
  };
}
