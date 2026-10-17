import React, { useState, useEffect, useRef } from 'react';
import { CombustionParams, ComputedPhysics, FuelType } from '../types';
import { computePhysics, FUEL_CATALOG } from '../utils/physicsEngine';
import { sound } from '../utils/audioAlert';
import { SafetyMeter } from './SafetyMeter';
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
  Sparkles,
  HelpCircle,
  CheckCircle,
  AlertTriangle,
  BarChart2,
} from 'lucide-react';

interface CombustionSimulatorProps {
  onSendToChat: (query: string, context: any) => void;
  gravityMode: number;
  setGravityMode: (g: number) => void;
  isSimpleMode?: boolean;
}

export const CombustionSimulator: React.FC<CombustionSimulatorProps> = ({
  onSendToChat,
  gravityMode,
  setGravityMode,
  isSimpleMode = false,
}) => {
  const [params, setParams] = useState<CombustionParams>({
    gravity_g: gravityMode,
    o2_pct: 21,
    pressure_atm: 1.0,
    vent_speed_ms: 0.0,
    fuel_type: 'hydrogen_gas',
    fuel_radius_mm: 6,
    ignition_energy_j: 15,
  });

  const [hoveredFuel, setHoveredFuel] = useState<FuelType | null>(null);
  const [pinnedFuelTooltip, setPinnedFuelTooltip] = useState<FuelType | null>(null);
  const [telemetryView, setTelemetryView] = useState<'meter' | 'technical'>('meter');

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

          // Outer yellow/orange glowing envelope tailored to fuel type
          const gradOuter = ctx1.createLinearGradient(centerX, baseY, centerX, baseY - flameHeight);
          if (params.fuel_type === 'hydrogen_gas') {
            gradOuter.addColorStop(0, 'rgba(167, 139, 250, 0.2)');
            gradOuter.addColorStop(0.4, 'rgba(129, 140, 248, 0.4)');
            gradOuter.addColorStop(0.8, 'rgba(196, 181, 253, 0.15)');
            gradOuter.addColorStop(1, 'rgba(238, 242, 255, 0.0)');
          } else if (params.fuel_type === 'methane_gas' || params.fuel_type === 'natural_gas') {
            gradOuter.addColorStop(0, 'rgba(6, 182, 212, 0.7)');
            gradOuter.addColorStop(0.4, 'rgba(59, 130, 246, 0.8)');
            gradOuter.addColorStop(0.8, 'rgba(234, 179, 8, 0.85)');
            gradOuter.addColorStop(1, 'rgba(254, 240, 138, 0.0)');
          } else if (params.fuel_type === 'propane_gas') {
            gradOuter.addColorStop(0, 'rgba(59, 130, 246, 0.5)');
            gradOuter.addColorStop(0.3, 'rgba(249, 115, 22, 0.9)');
            gradOuter.addColorStop(0.7, 'rgba(234, 179, 8, 0.95)');
            gradOuter.addColorStop(1, 'rgba(120, 53, 15, 0.0)');
          } else {
            gradOuter.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
            gradOuter.addColorStop(0.3, 'rgba(249, 115, 22, 0.8)');
            gradOuter.addColorStop(0.7, 'rgba(234, 179, 8, 0.9)');
            gradOuter.addColorStop(1, 'rgba(254, 240, 138, 0.0)');
          }

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
          if (isSimpleMode) {
            ctx1.fillText('EARTH FIRE (NORMAL GRAVITY)', 12, 22);
            ctx1.fillStyle = '#94a3b8';
            ctx1.font = '10px monospace';
            ctx1.fillText('• Hot air rushes upward like a chimney', 12, 38);
            ctx1.fillText('• Flame stretches into a tall dancing cone', 12, 52);
            ctx1.fillText('• Fresh air is pulled into the base', 12, 66);
            ctx1.fillStyle = '#fbbf24';
            ctx1.fillText(`Flame Heat: ~${Math.round(physics.flame_temp_k)} K (Bright & Hot)`, 12, h - 14);
          } else {
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

          if (params.fuel_type === 'hydrogen_gas') {
            // Pale violet/blue almost invisible sphere
            gradFlame.addColorStop(0, 'rgba(167, 139, 250, 0.05)');
            gradFlame.addColorStop(0.6, 'rgba(129, 140, 248, 0.35)');
            gradFlame.addColorStop(0.85, 'rgba(196, 181, 253, 0.5)');
            gradFlame.addColorStop(1, 'rgba(99, 102, 241, 0.0)');
          } else if (params.fuel_type === 'propane_gas') {
            // Propane in 0G: blue center with amber/brown floating soot shell
            gradFlame.addColorStop(0, 'rgba(6, 182, 212, 0.1)');
            gradFlame.addColorStop(0.5, 'rgba(59, 130, 246, 0.6)');
            gradFlame.addColorStop(0.8, 'rgba(217, 119, 6, 0.6)');
            gradFlame.addColorStop(1, 'rgba(180, 83, 9, 0.0)');
          } else if (physics.flame_color === 'chemiluminescent_blue') {
            gradFlame.addColorStop(0, 'rgba(34, 211, 238, 0.05)');
            gradFlame.addColorStop(0.6, 'rgba(56, 189, 248, 0.4)');
            gradFlame.addColorStop(0.85, 'rgba(96, 165, 250, 0.85)');
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
          if (isSimpleMode) {
            ctx0.fillText('ZERO-G SPACE FIRE (MICROGRAVITY)', 12, 22);
            ctx0.fillStyle = '#94a3b8';
            ctx0.font = '10px monospace';
            ctx0.fillText('• Hot air has nowhere to rise (No up or down)', 12, 38);
            ctx0.fillText('• Fire stays in a quiet, glowing blue sphere', 12, 52);
            ctx0.fillText('• Fresh oxygen seeps in slowly from all sides', 12, 66);
            ctx0.fillText('• Trapped smoke and exhaust dome surrounds it', 12, 80);
            ctx0.fillStyle = '#38bdf8';
            ctx0.fillText(`Flame Heat: ~${Math.round(physics.flame_temp_k)} K (Cooler in space)`, 12, h - 14);
          } else {
            ctx0.fillText('0.00g MICROGRAVITY FLAME (NULLG)', 12, 22);
            ctx0.fillStyle = '#94a3b8';
            ctx0.font = '10px monospace';
            ctx0.fillText('• Zero hot air rising (Gr = 0.00)', 12, 38);
            ctx0.fillText('• Dim blue spherical glow (gas radical light)', 12, 52);
            ctx0.fillText('• Calm gas diffusion transport (J = -D ∇C)', 12, 66);
            ctx0.fillText('• Trapped smoke & CO2 exhaust cloud', 12, 80);
            ctx0.fillStyle = '#38bdf8';
            ctx0.fillText(`T_flame ~ ${Math.round(physics.flame_temp_k)} K (Radiative Cooling Limit)`, 12, h - 14);
          }
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
  }, [params, physics, isSimpleMode]);

  const selectedFuelInfo = FUEL_CATALOG.find((f) => f.id === params.fuel_type) || FUEL_CATALOG[0];

  const sendCurrentToEngine = () => {
    sound.playTelemetryPing();
    const query = isSimpleMode
      ? `Explain how ${selectedFuelInfo.simpleName} burns in simple plain English:
- Location: ${params.gravity_g === 0 ? 'Floating in Zero Gravity (Space Station)' : 'On Earth with gravity'}
- Oxygen: ${params.o2_pct}% in the cabin air
- Fan Breeze: ${params.vent_speed_ms === 0 ? 'No fan (completely still air)' : `${params.vent_speed_ms} m/s breeze`}
- Flame Shape: ${params.gravity_g === 0 ? 'Round Blue Ball' : 'Rising Teardrop Cone'}

Please explain for someone who does not know astronomy: Why does it look this way? What happens to the smoke? And is it dangerous for astronauts?`
      : `Please perform an exhaustive aerospace combustion diagnosis on our current laboratory simulation state:
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
      {/* Simple Mode Educational Guidance Banner */}
      {isSimpleMode && (
        <div className="bg-gradient-to-r from-cyan-950/70 via-blue-950/50 to-slate-900 border border-cyan-800/80 rounded-xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-3 font-sans">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-900/60 border border-cyan-700 flex items-center justify-center text-cyan-300 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm text-white">Simple Mode: Fire in Space vs Earth</h2>
                <span className="text-[10px] bg-cyan-900/80 text-cyan-200 border border-cyan-700 px-2 py-0.5 rounded-full font-bold">
                  Beginner View Active
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                On Earth (left), fire shoots upward because hot air rises. In space (right), there is no up or down, so fire becomes a peaceful, glowing blue ball!
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              const nextG = params.gravity_g === 0 ? 1 : 0;
              setParams({ ...params, gravity_g: nextG });
              setGravityMode(nextG);
            }}
            className="px-3.5 py-1.5 rounded-lg bg-cyan-900 hover:bg-cyan-800 text-cyan-200 border border-cyan-700 text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Switch to {params.gravity_g === 0 ? 'Earth Gravity (1g)' : 'Zero Gravity (0g)'}</span>
          </button>
        </div>
      )}

      {/* Visualizer Canvases (Side-by-Side Comparison) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: 1G Earth Gravity */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <h3 className="font-semibold text-sm text-slate-200">
                {isSimpleMode ? 'Normal Earth Fire (1.0g Gravity)' : '1.00g Terrestrial Buoyant Combustion'}
              </h3>
            </div>
            <span className="text-xs bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded font-mono">
              {isSimpleMode ? 'Hot Air Rises' : 'Gr ≈ 1.7×10⁵ (Convective)'}
            </span>
          </div>
          <canvas
            ref={canvas1gRef}
            width={480}
            height={280}
            className="w-full h-64 bg-slate-950 rounded-lg border border-slate-800 shadow-inner"
          />
          <div className="text-[11px] text-slate-400 mt-2 space-y-0.5 font-mono">
            {isSimpleMode ? (
              <>
                <p>• Hot air shoots upward, pulling the flame into a flickering teardrop cone.</p>
                <p>• Glowing yellow soot particles make Earth fire bright and smoky.</p>
              </>
            ) : (
              <>
                <p>• Buoyancy-driven chimney effect pulls fresh air continuously into reaction base.</p>
                <p>• Soot particles undergo high-temperature incandescence (bright yellow glow ~1900K).</p>
              </>
            )}
          </div>
        </div>

        {/* Right: 0G Microgravity (NULLG) */}
        <div className="bg-slate-950 border border-cyan-800/80 rounded-xl p-4 shadow-xl shadow-cyan-950/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <h3 className="font-semibold text-sm text-cyan-200">
                {isSimpleMode ? 'Zero-Gravity Fire (Space Station 0g)' : '0.00g Microgravity Spherical Combustion'}
              </h3>
            </div>
            <span className="text-xs bg-cyan-950 text-cyan-300 border border-cyan-700 px-2 py-0.5 rounded font-bold font-mono">
              {isSimpleMode ? 'Perfect Round Sphere' : 'Gr = 0.00 (Zero Buoyancy)'}
            </span>
          </div>
          <canvas
            ref={canvas0gRef}
            width={480}
            height={280}
            className="w-full h-64 bg-slate-950 rounded-lg border border-cyan-900/40 shadow-inner"
          />
          <div className="text-[11px] text-slate-400 mt-2 space-y-0.5 font-mono">
            {isSimpleMode ? (
              <>
                <p>• Hot air has nowhere to rise! Fire becomes a calm, glowing blue sphere.</p>
                <p>• Oxygen slowly seeps in from all sides like water soaking into a sponge.</p>
              </>
            ) : (
              <>
                <p>• Hot air does NOT rise. Fire forms a calm glowing blue sphere.</p>
                <p>• Fresh oxygen reaches the flame slowly through calm air spreading.</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Safety Meter & Simulation Telemetry Display */}
      <div className="space-y-3">
        {/* View Mode Toggle: Simple Safety Meter vs Technical Telemetry */}
        {!isSimpleMode && (
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Simulation Hazard Telemetry</span>
            </span>
            <div className="inline-flex rounded-lg bg-slate-900 p-0.5 border border-slate-800 text-xs font-mono">
              <button
                onClick={() => setTelemetryView('meter')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                  telemetryView === 'meter'
                    ? 'bg-cyan-950 text-cyan-200 border border-cyan-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Safety Meter (Safe → Critical Bar)
              </button>
              <button
                onClick={() => setTelemetryView('technical')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                  telemetryView === 'technical'
                    ? 'bg-cyan-950 text-cyan-200 border border-cyan-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Technical Metrics (Gr, Ra, Pe, Da)
              </button>
            </div>
          </div>
        )}

        {/* Primary View: New 'Safety Meter' Component with Simple Color-Coded Bar */}
        {(isSimpleMode || telemetryView === 'meter') && (
          <div className="space-y-3">
            <SafetyMeter
              score={physics.hazard_score}
              params={params}
              physics={physics}
              isSimpleMode={isSimpleMode}
              onSendToChat={onSendToChat}
              onApplyPreset={(newP) => {
                setParams((prev) => ({ ...prev, ...newP }));
                if (typeof newP.gravity_g === 'number') {
                  setGravityMode(newP.gravity_g);
                }
              }}
            />

            {/* Simple English Context Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 font-sans">
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                <span className="text-[11px] text-slate-400 block">Hot Air Rise (Buoyancy)</span>
                <span className="text-sm font-bold text-cyan-300 block mt-0.5">
                  {params.gravity_g === 0 ? '0% (No Rise)' : '100% (Rising fast)'}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {params.gravity_g === 0 ? 'In space, fire is calm' : 'Upward breeze on Earth'}
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                <span className="text-[11px] text-slate-400 block">Flame Shape</span>
                <span className="text-sm font-bold text-cyan-300 block mt-0.5">
                  {params.gravity_g === 0 ? 'Round Ball (Sphere)' : 'Teardrop Cone'}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {params.gravity_g === 0 ? 'Equal in all directions' : 'Gravity pulls it up'}
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                <span className="text-[11px] text-slate-400 block">How Air Feeds Fire</span>
                <span className="text-sm font-bold text-slate-200 block mt-0.5">
                  {params.vent_speed_ms > 0.02 ? 'Fan Breeze' : 'Quiet Drift (Diffusion)'}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {params.vent_speed_ms > 0.02 ? `${params.vent_speed_ms} m/s airflow` : 'Slow molecular drift'}
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                <span className="text-[11px] text-slate-400 block">Flame Heat</span>
                <span className="text-sm font-bold text-amber-300 block mt-0.5">
                  {Math.round(physics.flame_temp_k)} K ({Math.round(physics.flame_temp_k - 273.15)}°C)
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {params.gravity_g === 0 ? 'Gentle cooler flame' : 'Hot yellow fire'}
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                <span className="text-[11px] text-slate-400 block">Cabin Oxygen</span>
                <span className="text-sm font-bold text-amber-300 block mt-0.5">
                  {params.o2_pct}% O₂
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {params.o2_pct < 13 ? 'Suffocating (<13%)' : 'Normal Breathing Air'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Secondary View: Technical Dimensionless Numbers */}
        {!isSimpleMode && telemetryView === 'technical' && (
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
        )}
      </div>

      {/* Interactive Controls Sandbox */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-semibold text-slate-200 text-sm">
              {isSimpleMode ? 'Fire Lab Controls (Adjust & Experiment)' : 'Combustion Environment & Fuel Parameter Controls'}
            </h3>
          </div>
          <button
            onClick={sendCurrentToEngine}
            className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-cyan-950/40 transition"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSimpleMode ? 'Ask AI to Explain in Simple English' : 'Send Simulation Telemetry to Gemini AI Engine'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Gravity Control */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">
                {isSimpleMode ? 'Gravity (Space vs Earth):' : 'Gravitational Acceleration:'}
              </span>
              <span className="font-bold text-cyan-300">
                {params.gravity_g === 0 ? '0.00g (Space)' : `${params.gravity_g.toFixed(2)} g`}
              </span>
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
                0g (Space)
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
              <span className="text-slate-400">
                {isSimpleMode ? 'Oxygen in Air:' : 'Atmospheric Oxygen (O2):'}
              </span>
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
              <span>10% (Low air)</span>
              <button onClick={() => setParams({ ...params, o2_pct: 21 })} className="hover:text-amber-300">
                21% (Earth / ISS)
              </button>
              <button onClick={() => setParams({ ...params, o2_pct: 34 })} className="hover:text-red-400 text-red-500 font-bold">
                34% (Spacesuit air)
              </button>
              <span>40%</span>
            </div>
          </div>

          {/* Ambient Pressure */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">
                {isSimpleMode ? 'Air Pressure:' : 'Cabin Pressure:'}
              </span>
              <span className="font-bold text-cyan-300">
                {(params.pressure_atm * 14.696).toFixed(1)} psi
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
                8.2 psi (Spacecraft)
              </button>
              <button onClick={() => setParams({ ...params, pressure_atm: 1.0 })} className="hover:text-cyan-300">
                14.7 psi (Sea Level)
              </button>
              <span>1.5 atm</span>
            </div>
          </div>

          {/* Ventilation Duct Speed */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">
                {isSimpleMode ? 'Fan Breeze Speed:' : 'Forced Ventilation Flow:'}
              </span>
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
                0.0 m/s (Still Air)
              </button>
              <button onClick={() => setParams({ ...params, vent_speed_ms: 0.05 })} className="hover:text-emerald-300">
                0.05 m/s (Gentle Fan)
              </button>
              <span>1.0 m/s (Duct Fan)</span>
            </div>
          </div>
        </div>

        {/* Fuel Selection UI with Simple-Speak Hover Tooltips */}
        <div className="pt-3 border-t border-slate-900 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-200">
                  {isSimpleMode ? 'Choose Fuel to Burn:' : 'Fuel Material Selection:'}
                </label>
                <span className="text-[10px] bg-cyan-950/90 text-cyan-300 border border-cyan-800/80 px-2 py-0.5 rounded-full font-sans flex items-center gap-1 font-medium">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  Hover fuels below for Simple-Speak everyday uses!
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
                Select a fuel to observe zero-gravity fire physics. Hover over any gas to see how we use it in everyday life.
              </p>
            </div>
            {pinnedFuelTooltip && (
              <button
                type="button"
                onClick={() => setPinnedFuelTooltip(null)}
                className="text-[10px] text-slate-400 hover:text-cyan-300 border border-slate-800 px-2 py-0.5 rounded font-sans"
              >
                Close Pinned Tooltip ✕
              </button>
            )}
          </div>

          {/* Core Everyday Fuels: Hydrogen, Methane, Propane, Natural Gas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {[
              {
                id: 'hydrogen_gas' as FuelType,
                name: 'Hydrogen',
                formula: 'H₂',
                simpleTag: 'Rocket & Fuel-Cell Cars',
                icon: Zap,
                accentColor: 'border-cyan-500/80',
                glowColor: 'from-cyan-950/80 to-blue-950/60',
              },
              {
                id: 'methane_gas' as FuelType,
                name: 'Methane',
                formula: 'CH₄',
                simpleTag: 'Furnaces & Hot Water',
                icon: Flame,
                accentColor: 'border-blue-500/80',
                glowColor: 'from-blue-950/80 to-indigo-950/60',
              },
              {
                id: 'propane_gas' as FuelType,
                name: 'Propane',
                formula: 'C₃H₈',
                simpleTag: 'BBQ Grill & Camping',
                icon: Sparkles,
                accentColor: 'border-amber-500/80',
                glowColor: 'from-amber-950/80 to-orange-950/60',
              },
              {
                id: 'natural_gas' as FuelType,
                name: 'Natural Gas',
                formula: 'Pipeline',
                simpleTag: 'Kitchen Stove & Oven',
                icon: Wind,
                accentColor: 'border-teal-500/80',
                glowColor: 'from-teal-950/80 to-emerald-950/60',
              },
            ].map((fuel, index) => {
              const isSelected = params.fuel_type === fuel.id;
              const isTooltipActive = hoveredFuel === fuel.id || pinnedFuelTooltip === fuel.id;
              const fuelData = FUEL_CATALOG.find((f) => f.id === fuel.id);
              const IconComp = fuel.icon;

              // Smart alignment to avoid viewport cutoff
              const tooltipAlignClass =
                index === 0
                  ? 'left-0 sm:left-1/2 sm:-translate-x-1/2'
                  : index === 3
                  ? 'right-0 sm:left-1/2 sm:-translate-x-1/2'
                  : 'left-1/2 -translate-x-1/2';

              const arrowAlignClass =
                index === 0
                  ? 'left-8 sm:left-1/2 sm:-translate-x-1/2'
                  : index === 3
                  ? 'right-8 sm:left-1/2 sm:-translate-x-1/2'
                  : 'left-1/2 -translate-x-1/2';

              return (
                <div
                  key={fuel.id}
                  className="relative group"
                  onMouseEnter={() => setHoveredFuel(fuel.id)}
                  onMouseLeave={() => setHoveredFuel(null)}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setParams({ ...params, fuel_type: fuel.id });
                    }}
                    onFocus={() => setHoveredFuel(fuel.id)}
                    onBlur={() => setHoveredFuel(null)}
                    aria-describedby={`tooltip-${fuel.id}`}
                    className={`w-full p-2.5 rounded-lg border text-left transition-all relative ${
                      isSelected
                        ? `bg-gradient-to-br ${fuel.glowColor} ${fuel.accentColor} shadow-lg shadow-cyan-950/50 ring-1 ring-cyan-400/50`
                        : 'bg-slate-900/90 hover:bg-slate-800/90 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <IconComp
                          className={`w-4 h-4 ${isSelected ? 'text-cyan-300' : 'text-slate-400'}`}
                        />
                        <span
                          className={`text-xs font-bold font-sans ${
                            isSelected ? 'text-white' : 'text-slate-200'
                          }`}
                        >
                          {fuel.name}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-cyan-300/90 bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800">
                        {fuel.formula}
                      </span>
                    </div>

                    <div className="mt-1.5 flex items-center justify-between text-[10px]">
                      <span
                        className={`font-sans ${
                          isSelected ? 'text-cyan-200 font-medium' : 'text-slate-400'
                        }`}
                      >
                        {fuel.simpleTag}
                      </span>

                      {/* Tooltip trigger indicator */}
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setPinnedFuelTooltip(pinnedFuelTooltip === fuel.id ? null : fuel.id);
                        }}
                        className="text-slate-400 hover:text-cyan-300 p-0.5 rounded hover:bg-slate-800 cursor-help"
                        title="Click to lock tooltip open"
                      >
                        <Info className="w-3 h-3 text-cyan-400/80 hover:text-cyan-300" />
                      </span>
                    </div>

                    {isSelected && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                      </span>
                    )}
                  </button>

                  {/* Simple-Speak Hover Tooltip */}
                  {isTooltipActive && fuelData && fuelData.everydayUses && (
                    <div
                      id={`tooltip-${fuel.id}`}
                      role="tooltip"
                      className={`absolute bottom-full mb-2.5 ${tooltipAlignClass} w-72 sm:w-80 p-3.5 bg-slate-950/98 backdrop-blur-md border border-cyan-500/80 rounded-xl shadow-2xl shadow-cyan-950/90 z-50 text-left pointer-events-auto transition-all duration-150 animate-in fade-in zoom-in-95`}
                    >
                      {/* Tooltip Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <div className="flex items-center gap-1.5">
                          <IconComp className="w-4 h-4 text-cyan-400" />
                          <span className="text-xs font-bold text-white font-sans">
                            {fuelData.simpleName}
                          </span>
                        </div>
                        <span className="text-[9px] uppercase tracking-wider font-bold bg-amber-950 text-amber-300 border border-amber-800 px-1.5 py-0.5 rounded">
                          Everyday Uses
                        </span>
                      </div>

                      {/* Conversational Simple-Speak Summary */}
                      <p className="text-[11px] text-slate-300 pt-2 pb-2 leading-relaxed font-sans">
                        {fuelData.everydaySummary}
                      </p>

                      {/* Everyday Life Use Cases with Emojis */}
                      <div className="space-y-1.5 pt-1.5 border-t border-slate-800/80">
                        <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block font-mono">
                          Common Uses in Daily Life:
                        </span>
                        {fuelData.everydayUses.map((use, idx) => (
                          <div
                            key={idx}
                            className="bg-slate-900/80 border border-slate-800/80 rounded p-1.5 flex items-start gap-1.5 text-[10px]"
                          >
                            <span className="shrink-0 text-xs mt-0.5">{use.emoji}</span>
                            <div className="font-sans leading-snug">
                              <strong className="text-slate-100 font-semibold">{use.title}:</strong>{' '}
                              <span className="text-slate-300">{use.desc}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Zero-G Comparison Callout */}
                      <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-sans">
                        <span className="text-cyan-400 font-semibold">Zero-G Flame:</span>
                        <span className="text-slate-300 italic truncate max-w-[190px]">
                          {fuelData.flameLookZeroG}
                        </span>
                      </div>

                      {/* Caret / Pointer Arrow */}
                      <div
                        className={`absolute top-full ${arrowAlignClass} -mt-px w-0 h-0 border-x-[6px] border-x-transparent border-t-[6px] border-t-cyan-500/80`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Secondary Controls: Dropdown for All 8 Fuels + Fuel Radius Size Slider */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">
                {isSimpleMode ? 'All Fuels & Space Materials:' : 'Complete Fuel Catalog / Droplet & Solid Materials:'}
              </label>
              <select
                value={params.fuel_type}
                onChange={(e) => setParams({ ...params, fuel_type: e.target.value as FuelType })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-sans"
              >
                <optgroup label="💨 Gaseous Everyday Fuels (Hover Cards Above)">
                  <option value="hydrogen_gas">Hydrogen Gas (H₂ - Rocket Fuel & Fuel Cells)</option>
                  <option value="methane_gas">Methane Gas (CH₄ - Clean Blue Space Fire & Heating)</option>
                  <option value="propane_gas">Propane Gas (C₃H₈ - Barbecue Grill & Camping Gas)</option>
                  <option value="natural_gas">Natural Gas (Stovetop Cooking Fuel & City Grid)</option>
                </optgroup>
                <optgroup label="⚠️ Emergency Leaks & Liquid Droplets">
                  <option value="methane_leak">High-Pressure Gas Pipe Leak (Emergency)</option>
                  <option value="heptane_droplet">n-Heptane Droplet (Gasoline-like Liquid Ball)</option>
                </optgroup>
                <optgroup label="📦 Solid Plastics & Spacecraft Fabrics">
                  <option value="PMMA_solid">PMMA Acrylic Plastic Rod (NASA SoFIE)</option>
                  <option value="sibal_fabric">SIBAL Cotton/Fiberglass Fabric (NASA Saffire)</option>
                </optgroup>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">
                {isSimpleMode ? 'Fuel Size (Radius):' : 'Fuel Dimension / Droplet Radius:'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="2"
                  max="20"
                  value={params.fuel_radius_mm}
                  onChange={(e) => setParams({ ...params, fuel_radius_mm: parseInt(e.target.value) })}
                  className="w-full accent-cyan-500"
                />
                <span className="font-mono text-cyan-300 w-16 text-right">{params.fuel_radius_mm} mm</span>
              </div>
            </div>
          </div>
        </div>

        {/* Informative Selected Fuel Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 font-sans space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-white text-sm">
                {selectedFuelInfo.simpleName} ({selectedFuelInfo.formula})
              </span>
              <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-cyan-300 font-mono">
                Category: {selectedFuelInfo.category}
              </span>
            </div>
            <span className="text-[11px] text-amber-300 font-semibold font-mono">
              Flame Heat: ~{Math.round(physics.flame_temp_k)} K
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {selectedFuelInfo.simpleExplanation}
          </p>

          {/* Everyday Uses Simple-Speak Showcase (for Hydrogen, Methane, Propane, Natural Gas) */}
          {selectedFuelInfo.everydayUses && (
            <div className="bg-slate-950/80 border border-cyan-900/40 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Everyday Uses in Daily Life (Simple-Speak)</span>
                </div>
                <span className="text-[10px] text-slate-400">
                  {selectedFuelInfo.formula} in regular life
                </span>
              </div>

              {selectedFuelInfo.everydaySummary && (
                <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                  {selectedFuelInfo.everydaySummary}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {selectedFuelInfo.everydayUses.map((use, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-900/70 border border-slate-800/80 rounded-md p-2 flex items-start gap-2"
                  >
                    <span className="text-base shrink-0">{use.emoji}</span>
                    <div className="text-[11px]">
                      <span className="font-semibold text-slate-100 block">{use.title}</span>
                      <span className="text-slate-400 text-[10px] leading-tight block mt-0.5">
                        {use.desc}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs border-t border-slate-800/80">
            <div className="bg-slate-950 p-2.5 rounded-lg border border-cyan-900/50">
              <span className="text-[10px] text-cyan-400 font-bold block uppercase tracking-wider">
                In Zero Gravity (Space):
              </span>
              <span className="text-slate-300 text-[11px] block mt-0.5">
                {selectedFuelInfo.flameLookZeroG}
              </span>
            </div>

            <div className="bg-slate-950 p-2.5 rounded-lg border border-amber-900/50">
              <span className="text-[10px] text-amber-400 font-bold block uppercase tracking-wider">
                On Earth (Normal Gravity):
              </span>
              <span className="text-slate-300 text-[11px] block mt-0.5">
                {selectedFuelInfo.flameLookOneG}
              </span>
            </div>
          </div>

          <div className="bg-red-950/20 border border-red-900/50 p-2 rounded text-[11px] text-red-300 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span>
              <strong>Safety Note:</strong> {selectedFuelInfo.dangerNotes}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
