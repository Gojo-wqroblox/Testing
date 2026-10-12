import React, { useState, useEffect, useRef } from 'react';
import { CombustionParams, ComputedPhysics } from '../types';
import { computePhysics } from '../utils/physicsEngine';
import { sound } from '../utils/audioAlert';
import {
  Flame,
  Wind,
  Gauge,
  Sliders,
  Send,
  RefreshCw,
  Info,
  ShieldAlert,
  Zap,
  Activity,
} from 'lucide-react';

interface CombustionSimulatorProps {
  onSendToChat: (query: string, context: any) => void;
  gravityMode: number;
  setGravityMode: (g: number) => void;
}

export const CombustionSimulator: React.FC<CombustionSimulatorProps> = ({
  onSendToChat,
  gravityMode,
  setGravityMode,
}) => {
  const [params, setParams] = useState<CombustionParams>({
    gravity_g: gravityMode,
    o2_pct: 21,
    pressure_atm: 1.0,
    vent_speed_ms: 0.0,
    fuel_type: 'PMMA_solid',
    fuel_radius_mm: 6,
    ignition_energy_j: 15,
  });

  // Sync with global gravity
  useEffect(() => {
    setParams((p) => ({ ...p, gravity_g: gravityMode }));
  }, [gravityMode]);

  const physics: ComputedPhysics = computePhysics(params);

  const canvas1gRef = useRef<HTMLCanvasElement>(null);
  const canvas0gRef = useRef<HTMLCanvasElement>(null);
  const animFrameId = useRef<number | null>(null);

  // Animation state
  useEffect(() => {
    let tick = 0;

    const render = () => {
      tick++;

      // Render 1G Canvas (Earth gravity buoyant flame)
      const c1 = canvas1gRef.current;
      if (c1) {
        const ctx1 = c1.getContext('2d');
        if (ctx1) {
          const w = c1.width;
          const h = c1.height;
          ctx1.clearRect(0, 0, w, h);

          // Dark background with faint grid
          ctx1.fillStyle = '#060a12';
          ctx1.fillRect(0, 0, w, h);

          // Grid lines
          ctx1.strokeStyle = '#0e1e32';
          ctx1.lineWidth = 1;
          for (let x = 0; x < w; x += 25) {
            ctx1.beginPath();
            ctx1.moveTo(x, 0);
            ctx1.lineTo(x, h);
            ctx1.stroke();
          }
          for (let y = 0; y < h; y += 25) {
            ctx1.beginPath();
            ctx1.moveTo(0, y);
            ctx1.lineTo(w, y);
            ctx1.stroke();
          }

          const centerX = w / 2;
          const baseY = h * 0.72;

          // Fuel base
          ctx1.fillStyle = '#475569';
          ctx1.fillRect(centerX - 12, baseY, 24, 45);
          ctx1.fillStyle = '#94a3b8';
          ctx1.fillRect(centerX - 10, baseY, 20, 4);

          // Rising hot buoyant updraft vectors (arrows)
          ctx1.strokeStyle = 'rgba(234, 179, 8, 0.25)';
          ctx1.lineWidth = 1.5;
          for (let i = -2; i <= 2; i++) {
            const arrX = centerX + i * 28;
            const offsetY = (tick * 2.5 + i * 20) % 80;
            ctx1.beginPath();
            ctx1.moveTo(arrX, baseY - offsetY);
            ctx1.lineTo(arrX, baseY - offsetY - 18);
            ctx1.stroke();
            // Arrowhead
            ctx1.beginPath();
            ctx1.moveTo(arrX - 3, baseY - offsetY - 12);
            ctx1.lineTo(arrX, baseY - offsetY - 18);
            ctx1.lineTo(arrX + 3, baseY - offsetY - 12);
            ctx1.stroke();
          }

          // Buoyant teardrop flame shape
          const flameHeight = 70 + Math.sin(tick * 0.25) * 6;
          const flameWidth = 26 + Math.sin(tick * 0.15) * 3;

          // Outer yellow/orange glowing envelope
          const gradOuter = ctx1.createLinearGradient(centerX, baseY, centerX, baseY - flameHeight);
          gradOuter.addColorStop(0, 'rgba(59, 130, 246, 0.4)'); // blue anchor base
          gradOuter.addColorStop(0.3, 'rgba(249, 115, 22, 0.8)'); // orange
          gradOuter.addColorStop(0.7, 'rgba(234, 179, 8, 0.9)'); // bright yellow
          gradOuter.addColorStop(1, 'rgba(254, 240, 138, 0.0)'); // soot tip

          ctx1.fillStyle = gradOuter;
          ctx1.beginPath();
          ctx1.moveTo(centerX - flameWidth / 2, baseY);
          ctx1.bezierCurveTo(
            centerX - flameWidth * 0.9,
            baseY - flameHeight * 0.4,
            centerX - flameWidth * 0.4,
            baseY - flameHeight * 0.8,
            centerX + Math.sin(tick * 0.3) * 3,
            baseY - flameHeight
          );
          ctx1.bezierCurveTo(
            centerX + flameWidth * 0.4,
            baseY - flameHeight * 0.8,
            centerX + flameWidth * 0.9,
            baseY - flameHeight * 0.4,
            centerX + flameWidth / 2,
            baseY
          );
          ctx1.closePath();
          ctx1.fill();

          // Inner high-temp core
          const gradInner = ctx1.createLinearGradient(centerX, baseY, centerX, baseY - flameHeight * 0.7);
          gradInner.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
          gradInner.addColorStop(0.5, 'rgba(254, 240, 138, 0.8)');
          gradInner.addColorStop(1, 'rgba(249, 115, 22, 0.0)');

          ctx1.fillStyle = gradInner;
          ctx1.beginPath();
          ctx1.moveTo(centerX - flameWidth * 0.3, baseY);
          ctx1.quadraticCurveTo(centerX - flameWidth * 0.4, baseY - flameHeight * 0.35, centerX, baseY - flameHeight * 0.7);
          ctx1.quadraticCurveTo(centerX + flameWidth * 0.4, baseY - flameHeight * 0.35, centerX + flameWidth * 0.3, baseY);
          ctx1.closePath();
          ctx1.fill();

          // Rising soot particles
          for (let p = 0; p < 5; p++) {
            const py = baseY - flameHeight - ((tick * 1.8 + p * 25) % 50);
            const px = centerX + Math.sin(tick * 0.1 + p) * 8;
            ctx1.fillStyle = 'rgba(100, 116, 139, 0.4)';
            ctx1.beginPath();
            ctx1.arc(px, py, 2.5, 0, Math.PI * 2);
            ctx1.fill();
          }

          // Annotations on canvas
          ctx1.fillStyle = '#e2e8f0';
          ctx1.font = '11px monospace';
          ctx1.fillText('1.00g TERRESTRIAL FLAME', 12, 22);
          ctx1.fillStyle = '#94a3b8';
          ctx1.font = '10px monospace';
          ctx1.fillText('• Strong buoyant convection (u ~ 2 m/s)', 12, 38);
          ctx1.fillText('• Elongated incandescent teardrop', 12, 52);
          ctx1.fillText('• Continuous O2 entrainment at base', 12, 66);
          ctx1.fillStyle = '#fbbf24';
          ctx1.fillText('T_flame ~ 1950 K (High Soot Radiation)', 12, h - 14);
        }
      }

      // Render 0G Canvas (NULLG microgravity spherical flame)
      const c0 = canvas0gRef.current;
      if (c0) {
        const ctx0 = c0.getContext('2d');
        if (ctx0) {
          const w = c0.width;
          const h = c0.height;
          ctx0.clearRect(0, 0, w, h);

          // Dark background
          ctx0.fillStyle = '#030712';
          ctx0.fillRect(0, 0, w, h);

          // Grid lines
          ctx0.strokeStyle = '#081729';
          ctx0.lineWidth = 1;
          for (let x = 0; x < w; x += 25) {
            ctx0.beginPath();
            ctx0.moveTo(x, 0);
            ctx0.lineTo(x, h);
            ctx0.stroke();
          }
          for (let y = 0; y < h; y += 25) {
            ctx0.beginPath();
            ctx0.moveTo(0, y);
            ctx0.lineTo(w, y);
            ctx0.stroke();
          }

          const centerX = w / 2 + params.vent_speed_ms * 35; // moves slightly if ventilation blows
          const centerY = h / 2;

          // Fuel sphere (floating droplet or rod section in microgravity)
          const fuelR = params.fuel_radius_mm * 1.6;
          ctx0.fillStyle = '#475569';
          ctx0.beginPath();
          ctx0.arc(centerX, centerY, fuelR, 0, Math.PI * 2);
          ctx0.fill();
          ctx0.strokeStyle = '#64748b';
          ctx0.stroke();

          // Stagnant CO2 / H2O Diffusion Boundary Layer (Outer blanket)
          const diffR = fuelR * 3.6 + Math.sin(tick * 0.05) * 2;
          const gradBlanket = ctx0.createRadialGradient(centerX, centerY, fuelR, centerX, centerY, diffR);
          gradBlanket.addColorStop(0, 'rgba(30, 58, 138, 0.0)');
          gradBlanket.addColorStop(0.5, 'rgba(15, 23, 42, 0.4)');
          gradBlanket.addColorStop(1, 'rgba(56, 189, 248, 0.0)');

          ctx0.fillStyle = gradBlanket;
          ctx0.beginPath();
          ctx0.arc(centerX, centerY, diffR, 0, Math.PI * 2);
          ctx0.fill();

          // Microgravity Spherical Reaction Zone (Dim Blue Chemiluminescence OH*/CH*)
          const flameR = fuelR * 2.3 + Math.sin(tick * 0.08) * 1.5;

          // If forced ventilation speed > 0, distort into an ellipsoid trailing rightward
          const aspect = physics.flame_aspect_ratio;
          const radX = flameR * (1 + params.vent_speed_ms * 0.4);
          const radY = flameR;

          const gradFlame = ctx0.createRadialGradient(
            centerX,
            centerY,
            fuelR * 1.1,
            centerX,
            centerY,
            radX
          );

          if (physics.flame_color === 'chemiluminescent_blue') {
            gradFlame.addColorStop(0, 'rgba(34, 211, 238, 0.05)'); // inner gap
            gradFlame.addColorStop(0.6, 'rgba(56, 189, 248, 0.4)');
            gradFlame.addColorStop(0.85, 'rgba(96, 165, 250, 0.85)'); // chemiluminescent peak
            gradFlame.addColorStop(1, 'rgba(37, 99, 235, 0.0)');
          } else if (physics.flame_color === 'cool_flame_invisible') {
            gradFlame.addColorStop(0, 'rgba(147, 51, 234, 0.02)');
            gradFlame.addColorStop(0.8, 'rgba(192, 132, 252, 0.2)');
            gradFlame.addColorStop(1, 'rgba(147, 51, 234, 0.0)');
          } else {
            // enriched or high pressure slight soot
            gradFlame.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
            gradFlame.addColorStop(0.7, 'rgba(251, 146, 60, 0.6)');
            gradFlame.addColorStop(1, 'rgba(234, 179, 8, 0.0)');
          }

          ctx0.fillStyle = gradFlame;
          ctx0.beginPath();
          ctx0.ellipse(centerX, centerY, radX, radY, 0, 0, Math.PI * 2);
          ctx0.fill();

          // Spherical Soot Shell ring (FLEX / SoFIE characteristic)
          ctx0.strokeStyle = 'rgba(148, 163, 184, 0.3)';
          ctx0.lineWidth = 1.2;
          ctx0.setLineDash([3, 4]);
          ctx0.beginPath();
          ctx0.ellipse(centerX, centerY, radX * 0.8, radY * 0.8, 0, 0, Math.PI * 2);
          ctx0.stroke();
          ctx0.setLineDash([]);

          // Inward molecular diffusion vectors (Fickian transport: J = -D grad C)
          ctx0.strokeStyle = 'rgba(56, 189, 248, 0.4)';
          ctx0.lineWidth = 1;
          const numVectors = 8;
          for (let i = 0; i < numVectors; i++) {
            const angle = (i * 2 * Math.PI) / numVectors + (tick * 0.01);
            const outerDist = diffR * 0.95;
            const innerDist = radX * 1.05;
            const x1 = centerX + Math.cos(angle) * outerDist;
            const y1 = centerY + Math.sin(angle) * outerDist;
            const x2 = centerX + Math.cos(angle) * innerDist;
            const y2 = centerY + Math.sin(angle) * innerDist;

            ctx0.beginPath();
            ctx0.moveTo(x1, y1);
            ctx0.lineTo(x2, y2);
            ctx0.stroke();
          }

          // Outward Stefan blowing velocity arrows
          ctx0.strokeStyle = 'rgba(244, 63, 94, 0.4)';
          for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI) / 2 + Math.PI / 4;
            const x1 = centerX + Math.cos(angle) * (fuelR + 2);
            const y1 = centerY + Math.sin(angle) * (fuelR + 2);
            const x2 = centerX + Math.cos(angle) * (fuelR + 10);
            const y2 = centerY + Math.sin(angle) * (fuelR + 10);
            ctx0.beginPath();
            ctx0.moveTo(x1, y1);
            ctx0.lineTo(x2, y2);
            ctx0.stroke();
          }

          // Annotations on Canvas
          ctx0.fillStyle = '#38bdf8';
          ctx0.font = '11px monospace';
          ctx0.fillText('0.00g MICROGRAVITY FLAME (NULLG)', 12, 22);
          ctx0.fillStyle = '#94a3b8';
          ctx0.font = '10px monospace';
          ctx0.fillText('• Zero buoyant convection (Gr = 0.00)', 12, 38);
          ctx0.fillText('• Dim blue spherical chemiluminescence (OH*/CH*)', 12, 52);
          ctx0.fillText('• Fickian molecular diffusion: J = -D ∇C', 12, 66);
          ctx0.fillText('• Concentric CO2/H2O product blanket', 12, 80);

          ctx0.fillStyle = '#38bdf8';
          ctx0.fillText(`T_flame ~ ${Math.round(physics.flame_temp_k)} K (Radiative Cooling Limit)`, 12, h - 14);
        }
      }

      animFrameId.current = requestAnimationFrame(render);
    };

    animFrameId.current = requestAnimationFrame(render);

    return () => {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
    };
  }, [params, physics]);

  const sendCurrentToEngine = () => {
    sound.playTelemetryPing();
    const query = `Please perform an exhaustive aerospace combustion diagnosis on our current laboratory simulation state:
- Gravity Regime: ${params.gravity_g.toFixed(2)} g (${params.gravity_g === 0 ? 'Microgravity 0g' : 'Terrestrial 1g'})
- Atmospheric Composition: ${params.o2_pct}% O2, ${(100 - params.o2_pct).toFixed(1)}% N2 @ ${params.pressure_atm} atm (${(params.pressure_atm * 14.696).toFixed(1)} psi)
- Forced Duct Ventilation: ${params.vent_speed_ms} m/s
- Fuel Specification: ${params.fuel_type.replace('_', ' ')} (${params.fuel_radius_mm * 2}mm dimension)
- Computed Physics: Grashof Gr = ${physics.grashof_number.toFixed(1)}, Rayleigh Ra = ${physics.rayleigh_number.toFixed(1)}, Peclet Pe = ${physics.peclet_number.toFixed(1)}, Damköhler Da = ${physics.damkohler_number.toFixed(1)}, Flame Temp = ${Math.round(physics.flame_temp_k)} K, Aspect Ratio = ${physics.flame_aspect_ratio.toFixed(2)}

Evaluate flammability envelope, self-extinction / radiative quenching risk, and flag [SPACE HABITAT HAZARD DETECTED] if any safety margins are compromised.`;
    onSendToChat(query, { params, physics });
  };

  return (
    <div className="space-y-6 font-mono text-slate-100">
      {/* Visualizer Canvases (Side-by-Side Comparison) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: 1G Earth Gravity */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <h3 className="font-semibold text-sm text-slate-200">1.00g Terrestrial Buoyant Combustion</h3>
            </div>
            <span className="text-xs bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded">
              Gr ≈ 1.7×10⁵ (Convective)
            </span>
          </div>
          <canvas
            ref={canvas1gRef}
            width={480}
            height={280}
            className="w-full h-64 bg-slate-950 rounded-lg border border-slate-800 shadow-inner"
          />
          <div className="text-[11px] text-slate-400 mt-2 space-y-0.5 font-mono">
            <p>• Buoyancy-driven chimney effect pulls fresh air continuously into reaction base.</p>
            <p>• Soot particles undergo high-temperature incandescence (bright yellow glow ~1900K).</p>
          </div>
        </div>

        {/* Right: 0G Microgravity (NULLG) */}
        <div className="bg-slate-950 border border-cyan-800/80 rounded-xl p-4 shadow-xl shadow-cyan-950/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <h3 className="font-semibold text-sm text-cyan-200">0.00g Microgravity Spherical Combustion</h3>
            </div>
            <span className="text-xs bg-cyan-950 text-cyan-300 border border-cyan-700 px-2 py-0.5 rounded font-bold">
              Gr = 0.00 (Zero Buoyancy)
            </span>
          </div>
          <canvas
            ref={canvas0gRef}
            width={480}
            height={280}
            className="w-full h-64 bg-slate-950 rounded-lg border border-cyan-900/40 shadow-inner"
          />
          <div className="text-[11px] text-slate-400 mt-2 space-y-0.5 font-mono">
            <p>• Hot air does NOT rise. Flame forms an isotropic chemiluminescent blue sphere.</p>
            <p>• Oxygen replenishment governed by slow molecular diffusion (Fickian transport).</p>
          </div>
        </div>
      </div>

      {/* Physics Dimensionless Telemetry Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
          <span className="text-[11px] text-slate-400 block">Grashof Number (Gr)</span>
          <span className="text-base font-bold text-cyan-300 font-mono">
            {params.gravity_g === 0 ? '0.00 (Zero-G)' : physics.grashof_number.toExponential(2)}
          </span>
          <span className="text-[10px] text-slate-500 block">Buoyancy / Viscous Ratio</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
          <span className="text-[11px] text-slate-400 block">Rayleigh Number (Ra)</span>
          <span className="text-base font-bold text-cyan-300 font-mono">
            {params.gravity_g === 0 ? '0.00' : physics.rayleigh_number.toExponential(2)}
          </span>
          <span className="text-[10px] text-slate-500 block">Convective Instability</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
          <span className="text-[11px] text-slate-400 block">Peclet Number (Pe)</span>
          <span className="text-base font-bold text-slate-200 font-mono">
            {physics.peclet_number.toFixed(2)}
          </span>
          <span className="text-[10px] text-slate-500 block">Forced / Diffusive Ratio</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
          <span className="text-[11px] text-slate-400 block">Damköhler Number (Da)</span>
          <span className="text-base font-bold text-slate-200 font-mono">
            {physics.damkohler_number.toFixed(1)}
          </span>
          <span className="text-[10px] text-slate-500 block">Chem / Flow Time Ratio</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
          <span className="text-[11px] text-slate-400 block">Flame Temperature</span>
          <span className="text-base font-bold text-amber-300 font-mono">
            {Math.round(physics.flame_temp_k)} K
          </span>
          <span className="text-[10px] text-slate-500 block">{physics.flame_color.replace('_', ' ')}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
          <span className="text-[11px] text-slate-400 block">Hazard Index</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`text-base font-bold font-mono ${
                physics.hazard_score > 60 ? 'text-red-400' : 'text-emerald-400'
              }`}
            >
              {physics.hazard_score}/100
            </span>
          </div>
          <span className="text-[10px] text-slate-500 block">{physics.extinction_risk}</span>
        </div>
      </div>

      {/* Interactive Controls Sandbox */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-semibold text-slate-200 text-sm">
              Combustion Environment & Fuel Parameter Controls
            </h3>
          </div>
          <button
            onClick={sendCurrentToEngine}
            className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-cyan-950/40 transition"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Simulation Telemetry to Gemini AI Engine</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Gravity Control */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Gravitational Acceleration:</span>
              <span className="font-bold text-cyan-300">{params.gravity_g.toFixed(2)} g</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={params.gravity_g}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setParams({ ...params, gravity_g: val });
                setGravityMode(val);
              }}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <button
                onClick={() => {
                  setParams({ ...params, gravity_g: 0 });
                  setGravityMode(0);
                }}
                className="hover:text-cyan-300"
              >
                0g (Micro-G)
              </button>
              <button
                onClick={() => {
                  setParams({ ...params, gravity_g: 0.166 });
                  setGravityMode(0.166);
                }}
                className="hover:text-cyan-300"
              >
                Moon (0.17g)
              </button>
              <button
                onClick={() => {
                  setParams({ ...params, gravity_g: 0.38 });
                  setGravityMode(0.38);
                }}
                className="hover:text-cyan-300"
              >
                Mars (0.38g)
              </button>
              <button
                onClick={() => {
                  setParams({ ...params, gravity_g: 1 });
                  setGravityMode(1);
                }}
                className="hover:text-cyan-300"
              >
                Earth (1.0g)
              </button>
            </div>
          </div>

          {/* Oxygen Concentration */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Atmospheric Oxygen (O2):</span>
              <span className="font-bold text-amber-300">{params.o2_pct}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="40"
              step="1"
              value={params.o2_pct}
              onChange={(e) => setParams({ ...params, o2_pct: parseInt(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>10% (Hypoxic)</span>
              <button onClick={() => setParams({ ...params, o2_pct: 21 })} className="hover:text-amber-300">
                21% (ISS Std)
              </button>
              <button onClick={() => setParams({ ...params, o2_pct: 34 })} className="hover:text-red-400 text-red-500 font-bold">
                34% (Exploration/EVA)
              </button>
              <span>40%</span>
            </div>
          </div>

          {/* Ambient Pressure */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Cabin Pressure:</span>
              <span className="font-bold text-cyan-300">
                {params.pressure_atm.toFixed(2)} atm ({(params.pressure_atm * 14.696).toFixed(1)} psi)
              </span>
            </div>
            <input
              type="range"
              min="0.4"
              max="1.5"
              step="0.05"
              value={params.pressure_atm}
              onChange={(e) => setParams({ ...params, pressure_atm: parseFloat(e.target.value) })}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <button onClick={() => setParams({ ...params, pressure_atm: 0.56 })} className="hover:text-cyan-300">
                8.2 psi (Gateway)
              </button>
              <button onClick={() => setParams({ ...params, pressure_atm: 1.0 })} className="hover:text-cyan-300">
                14.7 psi (ISS)
              </button>
              <span>1.5 atm</span>
            </div>
          </div>

          {/* Ventilation Duct Speed */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Forced Ventilation Flow:</span>
              <span className="font-bold text-emerald-300">{params.vent_speed_ms.toFixed(2)} m/s</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.02"
              value={params.vent_speed_ms}
              onChange={(e) => setParams({ ...params, vent_speed_ms: parseFloat(e.target.value) })}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <button onClick={() => setParams({ ...params, vent_speed_ms: 0.0 })} className="hover:text-emerald-300">
                0.0 m/s (Stagnant Dead-Air)
              </button>
              <button onClick={() => setParams({ ...params, vent_speed_ms: 0.05 })} className="hover:text-emerald-300">
                0.05 m/s (ISS Cabin)
              </button>
              <span>1.0 m/s (High Duct)</span>
            </div>
          </div>
        </div>

        {/* Fuel Type & Geometry Selector */}
        <div className="pt-2 border-t border-slate-900 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="text-slate-400 block mb-1">Fuel Material (NASA Flight Grade):</label>
            <select
              value={params.fuel_type}
              onChange={(e) => setParams({ ...params, fuel_type: e.target.value as any })}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="PMMA_solid">PMMA Rod (SoFIE GEL Experiment)</option>
              <option value="sibal_fabric">SIBAL Fabric 75/25 Cotton-Fiberglass (Saffire)</option>
              <option value="heptane_droplet">n-Heptane Droplet (FLEX Droplet Rig)</option>
              <option value="methane_leak">Methane Vent Gas Leak (Hazardous)</option>
            </select>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Fuel Dimension / Droplet Radius:</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="2"
                max="20"
                value={params.fuel_radius_mm}
                onChange={(e) => setParams({ ...params, fuel_radius_mm: parseInt(e.target.value) })}
                className="w-full accent-cyan-500"
              />
              <span className="font-mono text-cyan-300 w-12 text-right">{params.fuel_radius_mm} mm</span>
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Stefan Mass Blowing Velocity:</label>
            <div className="bg-slate-900 px-3 py-1.5 rounded border border-slate-800 text-slate-300 font-mono">
              v_stefan = {physics.stefan_velocity_cms.toFixed(2)} cm/s (Outward)
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Dominant Transport Regime:</label>
            <div className="bg-slate-900 px-3 py-1.5 rounded border border-slate-800 text-cyan-400 font-mono">
              {physics.transport_regime}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
