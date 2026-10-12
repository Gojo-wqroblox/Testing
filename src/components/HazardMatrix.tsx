import React, { useState } from 'react';
import { sound } from '../utils/audioAlert';
import { ShieldAlert, AlertTriangle, Wind, Zap, CheckCircle, Send, Activity, Flame } from 'lucide-react';

interface HazardMatrixProps {
  onSendToChat: (query: string, context: any) => void;
  onSimulateHazard: () => void;
}

export const HazardMatrix: React.FC<HazardMatrixProps> = ({ onSendToChat, onSimulateHazard }) => {
  const [pocketVolume, setPocketVolume] = useState(0.8); // m^3
  const [o2Concentration, setO2Concentration] = useState(24.5); // %
  const [airVelocity, setAirVelocity] = useState(0.01); // m/s (stagnant)
  const [fuelMaterial, setFuelMaterial] = useState('Kapton_wire_pyrolysate');

  const isCriticalHazard = airVelocity < 0.03 && o2Concentration > 21.5;

  const testHazardWithAI = () => {
    sound.playTelemetryPing();
    const query = `EMERGENCY EVALUATION REQUESTED FOR SPACE HABITAT LIFE SUPPORT:
- Unvented Compartment Volume: ${pocketVolume} m³ (Avionics bay)
- Local Oxygen Fraction: ${o2Concentration}% O2 (Nominal cabin is 21.0%)
- Duct Ventilation Speed: ${airVelocity} m/s (Dead-air stagnant zone)
- Surrounding Fuel / Wire Harness: ${fuelMaterial}

Evaluate whether this condition triggers [SPACE HABITAT HAZARD DETECTED].
Detail:
1. Physical mechanism of unvented gas pocket accumulation in zero gravity (Fickian diffusion timescale vs reaction timescale).
2. Risk of smolder-to-flame transition when cabin ventilation resumes.
3. ECLSS emergency response procedure (ventilation isolation, N2 purge, depressurization curve).`;

    onSendToChat(query, { pocketVolume, o2Concentration, airVelocity, fuelMaterial });
  };

  return (
    <div className="space-y-6 font-mono text-slate-100">
      {/* Alert Banner */}
      <div className="bg-slate-950 border border-red-900/60 rounded-xl p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-950/80 border border-red-700 flex items-center justify-center text-red-400">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Space Habitat Hazard Matrix & ECLSS Intercept</span>
                <span className="text-xs bg-red-950 text-red-300 border border-red-700 px-2 py-0.5 rounded font-mono">
                  SAFETY CRITICAL
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Microgravity fire hazards differ fundamentally from terrestrial fire safety: lack of buoyancy enables dangerous stagnant pocket formation.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playHazardAlarm();
              onSimulateHazard();
            }}
            className="px-4 py-2 bg-red-900/40 hover:bg-red-800/60 border border-red-600 text-red-200 rounded-lg text-xs font-semibold flex items-center gap-2 transition shadow-lg shadow-red-950/40"
          >
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span>Simulate Alarm Condition</span>
          </button>
        </div>
      </div>

      {/* 5 Unique Spacecraft Fire Hazards in Microgravity */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Hazard 1 */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400">HAZARD 01 // ECLSS DUCT FAILURE</span>
            <span className="text-[10px] bg-amber-950/60 text-amber-300 border border-amber-800 px-1.5 py-0.2 rounded">HIGH</span>
          </div>
          <h3 className="font-semibold text-sm text-white">Unvented Stagnant Gas Pocket Accumulation</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Without gravity-driven buoyant plumes, dead-air zones behind avionics bays trap pyrolyzed gases and oxygen in stoichiometric ratios without dispersing.
          </p>
          <div className="text-[11px] text-slate-500 pt-1 font-mono">
            <strong>Physics:</strong> Rayleigh Ra = 0. Pure Fickian diffusion timescale t ~ L²/D is dangerously slow (hours vs seconds).
          </div>
        </div>

        {/* Hazard 2 */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-400">HAZARD 02 // SMOLDER PERSISTENCE</span>
            <span className="text-[10px] bg-red-950/60 text-red-300 border border-red-700 px-1.5 py-0.2 rounded font-bold">CRITICAL</span>
          </div>
          <h3 className="font-semibold text-sm text-white">Low-Airflow Smolder-to-Flame Transition</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            In microgravity, solids can undergo prolonged low-temperature smoldering with near-zero smoke plumes. When ventilation fans restart, the sudden oxygen surge ignites open spherical flames.
          </p>
          <div className="text-[11px] text-slate-500 pt-1 font-mono">
            <strong>SoFIE MIST Data:</strong> Smoldering front survives at airflows as low as 0.02 m/s.
          </div>
        </div>

        {/* Hazard 3 */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-400">HAZARD 03 // EXPLORATION ATMOSPHERE</span>
            <span className="text-[10px] bg-rose-950/60 text-rose-300 border border-rose-800 px-1.5 py-0.2 rounded">ELEVATED</span>
          </div>
          <h3 className="font-semibold text-sm text-white">Enriched Oxygen Flammability (34% O2 @ 8.2 psi)</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Lunar Gateway and Mars transit habitats operate under 34% O2 at 56.5 kPa (8.2 psi) for EVA efficiency. This dramatically lowers material ignition thresholds.
          </p>
          <div className="text-[11px] text-slate-500 pt-1 font-mono">
            <strong>Saffire-IV Finding:</strong> Standard fire-retardant polymers ignite rapidly in 34% O2.
          </div>
        </div>

        {/* Hazard 4 */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-400">HAZARD 04 // SURFACE TENSION FLUID</span>
            <span className="text-[10px] bg-cyan-950/60 text-cyan-300 border border-cyan-800 px-1.5 py-0.2 rounded">DYNAMIC</span>
          </div>
          <h3 className="font-semibold text-sm text-white">Floating Droplet Coalescence & Capillary Migration</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Liquid fuels or thermal cooling fluids (Bo ≪ 1) do not puddle on floors. They form floating spheres or creep along structural bulkheads via capillary wetting directly toward energized electronics.
          </p>
          <div className="text-[11px] text-slate-500 pt-1 font-mono">
            <strong>Fluid Dynamics:</strong> Bond Bo → 0. Capillary wetting angle governs liquid migration path.
          </div>
        </div>

        {/* Hazard 5 */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-400">HAZARD 05 // COOL-FLAME PHENOMENA</span>
            <span className="text-[10px] bg-purple-950/60 text-purple-300 border border-purple-800 px-1.5 py-0.2 rounded">STEALTH</span>
          </div>
          <h3 className="font-semibold text-sm text-white">Quasi-Steady Invisible Cool-Flame Burning</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            As observed in FLEX, hydrocarbon droplets experience warm-flame extinction due to radiative cooling, but continue burning in a second-stage invisible cool flame (~600–800 K).
          </p>
          <div className="text-[11px] text-slate-500 pt-1 font-mono">
            <strong>Detection Challenge:</strong> Emits zero visible soot luminescence; invisible to visual crew inspection.
          </div>
        </div>

        {/* Hazard 6 */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400">NASA MITIGATION MATRIX</span>
            <span className="text-[10px] bg-emerald-950/60 text-emerald-300 border border-emerald-800 px-1.5 py-0.2 rounded">PROTOCOLS</span>
          </div>
          <h3 className="font-semibold text-sm text-white">Spacecraft Fire Response Procedures</h3>
          <ul className="text-xs text-slate-400 space-y-1">
            <li>1. Immediate ventilation fan cutoff (isolate airflow)</li>
            <li>2. Nitrogen gas flooding (inert cabin O2 &lt; 12%)</li>
            <li>3. Fine water mist application (avoid free liquid droplets)</li>
            <li>4. Emergency module depressurization (Saffire proven)</li>
          </ul>
        </div>
      </div>

      {/* Interactive Stagnant Pocket Hazard Diagnostic Sandbox */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-xl space-y-5">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-2">
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Avionics Bay Dead-Air Hazard Diagnostic Sandbox</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Input specific compartment conditions to test whether the [SPACE HABITAT HAZARD DETECTED] threshold is breached.
            </p>
          </div>
          <button
            onClick={testHazardWithAI}
            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-lg shadow-cyan-950/40 transition"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Evaluate Pocket Hazard with Gemini</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-xs">
          <div>
            <label className="text-slate-400 block mb-1">Dead-Air Pocket Volume:</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0.1"
                max="5.0"
                step="0.1"
                value={pocketVolume}
                onChange={(e) => setPocketVolume(parseFloat(e.target.value))}
                className="w-full accent-cyan-500"
              />
              <span className="font-mono text-cyan-300 w-12 text-right">{pocketVolume.toFixed(1)} m³</span>
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Local Oxygen Fraction:</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="18"
                max="36"
                step="0.5"
                value={o2Concentration}
                onChange={(e) => setO2Concentration(parseFloat(e.target.value))}
                className="w-full accent-amber-500"
              />
              <span className="font-mono text-amber-300 w-12 text-right">{o2Concentration.toFixed(1)}%</span>
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Residual Airflow Speed:</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0.00"
                max="0.20"
                step="0.01"
                value={airVelocity}
                onChange={(e) => setAirVelocity(parseFloat(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <span className="font-mono text-emerald-300 w-16 text-right">{airVelocity.toFixed(2)} m/s</span>
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Pyrolyzate / Wire Material:</label>
            <select
              value={fuelMaterial}
              onChange={(e) => setFuelMaterial(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="Kapton_wire_pyrolysate">Kapton / Polyimide Wire Insulation</option>
              <option value="Tefzel_ETFE_jacket">Tefzel (ETFE) Cable Coating</option>
              <option value="Delrin_avionics_spacer">Delrin (POM) Mechanical Spacer</option>
              <option value="Nomex_crew_garment">Nomex Flight Suit Fibers</option>
            </select>
          </div>
        </div>

        {/* Hazard Evaluation Result Strip */}
        <div
          className={`p-3.5 rounded-lg border font-mono text-xs flex items-center justify-between flex-wrap gap-2 ${
            isCriticalHazard
              ? 'bg-red-950/60 border-red-500/80 text-red-200'
              : 'bg-emerald-950/40 border-emerald-700/60 text-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {isCriticalHazard ? (
              <ShieldAlert className="w-4 h-4 text-red-400 animate-pulse" />
            ) : (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            )}
            <span className="font-bold">
              {isCriticalHazard
                ? '[SPACE HABITAT HAZARD DETECTED] // Dead-air pocket exceeds flammability stagnation threshold!'
                : 'POCKET STABLE // Adequate dilution ventilation active (u >= 0.03 m/s)'}
            </span>
          </div>
          <span className="text-[11px] opacity-80">
            Fickian Diffusion Time: ~{Math.round((pocketVolume * 100) / 0.22)} minutes to passive equilibrium
          </span>
        </div>
      </div>
    </div>
  );
};
