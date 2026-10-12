import React, { useState, useEffect, useRef } from 'react';
import { sound } from '../utils/audioAlert';
import { Orbit, Play, Pause, RotateCcw, Plus, Send, Flame, Sparkles, ShieldAlert } from 'lucide-react';

interface Droplet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  isBurning: boolean;
  coolFlame: boolean;
  burnRateK: number; // mm^2/s
}

interface DropletDynamicsProps {
  onSendToChat: (query: string, context: any) => void;
}

export const DropletDynamics: React.FC<DropletDynamicsProps> = ({ onSendToChat }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [liquidType, setLiquidType] = useState<'heptane' | 'water' | 'coolant'>('heptane');
  const [igniteAll, setIgniteAll] = useState(false);
  const [dropletsCount, setDropletsCount] = useState(6);

  const dropletsRef = useRef<Droplet[]>([]);

  // Initialize random floating droplets
  const initDroplets = () => {
    const list: Droplet[] = [];
    const colors = {
      heptane: '#38bdf8', // pale cyan hydrocarbon
      water: '#60a5fa', // deep blue
      coolant: '#34d399', // emerald green glycol
    };

    for (let i = 0; i < 6; i++) {
      list.push({
        id: i + 1,
        x: 100 + Math.random() * 400,
        y: 80 + Math.random() * 200,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        radius: 12 + Math.random() * 16,
        color: colors[liquidType],
        isBurning: false,
        coolFlame: false,
        burnRateK: 0.65, // mm^2/s typical for n-heptane in microgravity
      });
    }
    dropletsRef.current = list;
    setDropletsCount(list.length);
  };

  useEffect(() => {
    initDroplets();
  }, [liquidType]);

  // Spawn droplet on click or button
  const addDroplet = (customX?: number, customY?: number) => {
    sound.playTelemetryPing();
    const newDrop: Droplet = {
      id: Date.now(),
      x: customX || 250 + (Math.random() - 0.5) * 100,
      y: customY || 180 + (Math.random() - 0.5) * 100,
      vx: (Math.random() - 0.5) * 1.0,
      vy: (Math.random() - 0.5) * 1.0,
      radius: 14 + Math.random() * 10,
      color: liquidType === 'heptane' ? '#38bdf8' : liquidType === 'water' ? '#60a5fa' : '#34d399',
      isBurning: igniteAll,
      coolFlame: false,
      burnRateK: 0.65,
    };
    dropletsRef.current.push(newDrop);
    setDropletsCount(dropletsRef.current.length);
  };

  const toggleIgnition = () => {
    const next = !igniteAll;
    setIgniteAll(next);
    sound.playTelemetryPing();
    dropletsRef.current.forEach((d) => {
      d.isBurning = next;
      d.coolFlame = false;
    });
  };

  // Main Canvas Physics Loop
  useEffect(() => {
    let animId: number;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Microgravity background
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, w, h);

      // Faint grid
      ctx.strokeStyle = '#081729';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      if (isPlaying) {
        // Move droplets
        const list = dropletsRef.current;

        // Collision & Coalescence (Bo << 1 surface tension coalescence)
        for (let i = 0; i < list.length; i++) {
          for (let j = i + 1; j < list.length; j++) {
            const d1 = list[i];
            const d2 = list[j];
            const dx = d2.x - d1.x;
            const dy = d2.y - d1.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // If spheres touch, surface tension instantly coalesces them into a larger sphere!
            if (dist < d1.radius + d2.radius) {
              sound.playTelemetryPing();
              // Volume conservation: V_new = V1 + V2 => R_new = (R1^3 + R2^3)^(1/3)
              const newRadius = Math.cbrt(Math.pow(d1.radius, 3) + Math.pow(d2.radius, 3));
              // Momentum conservation
              const m1 = Math.pow(d1.radius, 3);
              const m2 = Math.pow(d2.radius, 3);
              const totalM = m1 + m2;
              d1.vx = (d1.vx * m1 + d2.vx * m2) / totalM;
              d1.vy = (d1.vy * m1 + d2.vy * m2) / totalM;
              d1.radius = Math.min(65, newRadius);
              d1.isBurning = d1.isBurning || d2.isBurning;

              // Remove d2
              list.splice(j, 1);
              setDropletsCount(list.length);
              break;
            }
          }
        }

        // Boundary reflection and burning d^2 law regression
        for (let i = list.length - 1; i >= 0; i--) {
          const d = list[i];
          d.x += d.vx;
          d.y += d.vy;

          // Bounce off container walls with surface repulsion
          if (d.x - d.radius < 10) {
            d.x = 10 + d.radius;
            d.vx = -d.vx * 0.95;
          }
          if (d.x + d.radius > w - 10) {
            d.x = w - 10 - d.radius;
            d.vx = -d.vx * 0.95;
          }
          if (d.y - d.radius < 10) {
            d.y = 10 + d.radius;
            d.vy = -d.vy * 0.95;
          }
          if (d.y + d.radius > h - 10) {
            d.y = h - 10 - d.radius;
            d.vy = -d.vy * 0.95;
          }

          // d^2-law regression: d(r^2)/dt = -K/4
          if (d.isBurning) {
            const rSq = Math.pow(d.radius, 2) - 0.04;
            if (rSq <= 4) {
              // Warm flame extinguishes, transition to cool flame or vanish
              if (!d.coolFlame) {
                d.coolFlame = true;
                d.radius = 4;
              } else {
                list.splice(i, 1);
                setDropletsCount(list.length);
                continue;
              }
            } else {
              d.radius = Math.sqrt(rSq);
            }
          }
        }
      }

      // Draw Droplets & Spherical Flames
      dropletsRef.current.forEach((d) => {
        // Outer concentric spherical flame if burning
        if (d.isBurning) {
          const flameR = d.radius * 2.8;

          // Spherical Flame Halo
          const grad = ctx.createRadialGradient(d.x, d.y, d.radius, d.x, d.y, flameR);
          if (d.coolFlame) {
            // Invisible/low-temp cool flame emission
            grad.addColorStop(0, 'rgba(168, 85, 247, 0.05)');
            grad.addColorStop(0.7, 'rgba(192, 132, 252, 0.3)');
            grad.addColorStop(1, 'rgba(147, 51, 234, 0.0)');
          } else {
            // Blue chemiluminescent microgravity flame
            grad.addColorStop(0, 'rgba(34, 211, 238, 0.1)');
            grad.addColorStop(0.65, 'rgba(56, 189, 248, 0.5)');
            grad.addColorStop(0.9, 'rgba(96, 165, 250, 0.8)');
            grad.addColorStop(1, 'rgba(37, 99, 235, 0.0)');
          }

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(d.x, d.y, flameR, 0, Math.PI * 2);
          ctx.fill();

          // Concentric Soot Ring
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 3]);
          ctx.beginPath();
          ctx.arc(d.x, d.y, flameR * 0.75, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Liquid Droplet Body (Floating perfect sphere due to surface tension)
        const dropGrad = ctx.createRadialGradient(
          d.x - d.radius * 0.3,
          d.y - d.radius * 0.3,
          d.radius * 0.1,
          d.x,
          d.y,
          d.radius
        );
        dropGrad.addColorStop(0, '#ffffff');
        dropGrad.addColorStop(0.5, d.color);
        dropGrad.addColorStop(1, '#0f172a');

        ctx.fillStyle = dropGrad;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      });

      // Canvas Status text
      ctx.fillStyle = '#38bdf8';
      ctx.font = '11px monospace';
      ctx.fillText('SURFACE TENSION DOMINATED REGIME (Bo ≪ 1)', 14, 24);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.fillText(`• Floating Spheres: ${dropletsRef.current.length} droplets`, 14, 40);
      ctx.fillText('• d²-Law Regression: d²(t) = d₀² - K·t', 14, 54);
      ctx.fillText('• Zero buoyancy: Coalescing liquids do NOT drain downward', 14, 68);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  const sendFluidHazardToAI = () => {
    sound.playTelemetryPing();
    const query = `Analyze the microgravity fluid dynamics and hazard profile of our liquid droplet simulator:
- Liquid Medium: ${liquidType.toUpperCase()}
- Current Droplet Count: ${dropletsCount} floating spheres
- Surface Tension Dominance: Bond number Bo = Δρ·g·L² / σ ≈ 0.000 (Bo ≪ 1)
- Combustion State: ${igniteAll ? 'Active spherical combustion / cool-flame regime' : 'Unignited floating liquid dispersion'}
- Burning Law: d²(t) = d₀² - K·t (K ≈ 0.65 mm²/s) with concentric soot shell formation

Assess the risk of liquid fuel droplets drifting into spacecraft avionics racks or hot surfaces, explain Rayleigh droplet coalescence mechanics, and trigger [SPACE HABITAT HAZARD DETECTED] if uncontained floating fuels threaten ECLSS or crew cabin.`;
    onSendToChat(query, { liquidType, dropletsCount, igniteAll });
  };

  return (
    <div className="space-y-6 font-mono text-slate-100">
      {/* Simulation Header */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Orbit className="w-5 h-5 text-cyan-400" />
            <h2 className="font-bold text-sm text-white">
              Zero-G Surface Tension & Floating Fuel Droplet Simulator
            </h2>
            <span className="text-xs bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded">
              Bond Number Bo ≪ 1
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            In microgravity, gravity does not pull liquids downward. Surface tension dominates completely,
            compelling free-floating liquids to coalesce into perfect spheres.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-200 hover:text-white flex items-center gap-1.5 text-xs"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Freeze' : 'Resume'}</span>
          </button>
          <button
            onClick={initDroplets}
            className="px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-200 hover:text-white flex items-center gap-1.5 text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <button
            onClick={() => addDroplet()}
            className="px-3 py-1.5 rounded bg-cyan-950 border border-cyan-700 text-cyan-300 hover:bg-cyan-900 flex items-center gap-1.5 text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Inject Droplet</span>
          </button>
          <button
            onClick={toggleIgnition}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 text-xs font-semibold transition ${
              igniteAll
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30'
                : 'bg-slate-900 border border-amber-600/40 text-amber-400'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>{igniteAll ? 'Extinguish All' : 'Ignite Spherical Flames'}</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Canvas */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-2xl relative">
        <canvas
          ref={canvasRef}
          width={840}
          height={400}
          onClick={(e) => {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (rect) {
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;
              addDroplet(x, y);
            }
          }}
          className="w-full h-80 bg-slate-950 rounded-lg border border-slate-800 cursor-crosshair shadow-inner"
        />
        <div className="absolute bottom-6 right-6 text-xs text-slate-500 font-mono bg-black/60 px-3 py-1 rounded border border-slate-800">
          Click canvas to inject floating droplet
        </div>
      </div>

      {/* Physics & Material Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Liquid Selection */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-2">
          <span className="text-xs font-semibold text-slate-300 block">Liquid Working Fluid:</span>
          <div className="space-y-1.5 text-xs">
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="radio"
                name="liquid"
                checked={liquidType === 'heptane'}
                onChange={() => setLiquidType('heptane')}
                className="accent-cyan-500"
              />
              <span>n-Heptane Hydrocarbon Fuel (σ = 20.1 mN/m)</span>
            </label>
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="radio"
                name="liquid"
                checked={liquidType === 'water'}
                onChange={() => setLiquidType('water')}
                className="accent-cyan-500"
              />
              <span>Water Coolant / Life Support (σ = 72.8 mN/m)</span>
            </label>
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="radio"
                name="liquid"
                checked={liquidType === 'coolant'}
                onChange={() => setLiquidType('coolant')}
                className="accent-cyan-500"
              />
              <span>Ethylene Glycol Thermal Loop (σ = 47.7 mN/m)</span>
            </label>
          </div>
        </div>

        {/* Surface Tension Metrics */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-2 text-xs">
          <span className="font-semibold text-slate-300 block">Microgravity Fluid Regimes:</span>
          <div className="space-y-1 text-slate-400">
            <p>• <span className="text-cyan-300">Bond Number Bo:</span> ~ 0.000 (Zero buoyancy)</p>
            <p>• <span className="text-cyan-300">Capillary Length λ_c:</span> → ∞ (Infinite wetting)</p>
            <p>• <span className="text-cyan-300">Weber Number We:</span> Governs droplet collision</p>
            <p>• <span className="text-cyan-300">Burning Regime:</span> d²(t) = d₀² - K·t</p>
          </div>
        </div>

        {/* AI Action Box */}
        <div className="bg-slate-900/90 border border-cyan-800/60 p-4 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-cyan-300 font-semibold mb-1">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Fluid Hazard Evaluation</span>
            </div>
            <p className="text-xs text-slate-400">
              Query Gemini 3.8 Flash to evaluate migration risk of uncontained floating fuel droplets toward avionics.
            </p>
          </div>
          <button
            onClick={sendFluidHazardToAI}
            className="w-full mt-3 px-3 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Analyze Liquid Fuel Hazard in Gemini</span>
          </button>
        </div>
      </div>
    </div>
  );
};
