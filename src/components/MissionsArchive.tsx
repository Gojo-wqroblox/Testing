import React, { useState } from 'react';
import { ScenarioPreset } from '../types';
import { sound } from '../utils/audioAlert';
import { Rocket, ShieldAlert, Activity, Send, CheckCircle2, FileText, ChevronRight, BarChart2 } from 'lucide-react';

interface MissionsArchiveProps {
  scenarios: ScenarioPreset[];
  onSelectScenario: (scenario: ScenarioPreset) => void;
}

export const MissionsArchive: React.FC<MissionsArchiveProps> = ({
  scenarios,
  onSelectScenario,
}) => {
  const [selectedId, setSelectedId] = useState<string>(scenarios[0]?.id || 'sofie-gel-pmma');

  const activeScenario = scenarios.find((s) => s.id === selectedId) || scenarios[0];

  const handleAnalyze = () => {
    sound.playTelemetryPing();
    if (activeScenario) {
      onSelectScenario(activeScenario);
    }
  };

  return (
    <div className="space-y-6 font-mono text-slate-100">
      {/* Top Banner */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-cyan-400" />
            <h2 className="font-bold text-base text-white">
              NASA Microgravity Research Grounding: SoFIE & Saffire Archive
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Empirical datasets from NASA Glenn Research Center (GRC) flight campaigns: ISS Combustion Integrated Rack (CIR) & Cygnus Fire Safety Demonstration vehicles.
          </p>
        </div>
        <button
          onClick={handleAnalyze}
          className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-lg shadow-cyan-950/40 transition"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Load Active Flight Telemetry into Gemini AI</span>
        </button>
      </div>

      {/* Two Column Layout: Scenario List & Detailed Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scenario List */}
        <div className="space-y-3">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block px-1">
            Flight Campaigns & Telemetry Datasets
          </span>
          {scenarios.map((sc) => {
            const isSelected = sc.id === selectedId;
            return (
              <button
                key={sc.id}
                onClick={() => {
                  setSelectedId(sc.id);
                  sound.playTelemetryPing();
                }}
                className={`w-full text-left p-3.5 rounded-xl border transition flex flex-col gap-1.5 ${
                  isSelected
                    ? 'bg-cyan-950/40 border-cyan-500/80 shadow-lg shadow-cyan-950/40'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-cyan-400 font-semibold">{sc.mission}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                      sc.hazardState === 'CRITICAL_HAZARD'
                        ? 'bg-red-950 text-red-300 border border-red-700 font-bold'
                        : sc.hazardState === 'ACTIVE_FIRE_SPREAD'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    {sc.hazardState.replace('_', ' ')}
                  </span>
                </div>
                <div className="font-bold text-sm text-white">{sc.name}</div>
                <div className="text-[11px] text-slate-400 line-clamp-2">{sc.summary}</div>
              </button>
            );
          })}
        </div>

        {/* Detailed Scenario Inspector */}
        <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-xl space-y-6">
          {activeScenario && (
            <>
              {/* Scenario Header */}
              <div className="border-b border-slate-800 pb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-xs text-cyan-400 font-semibold">{activeScenario.mission}</span>
                  <h3 className="text-lg font-bold text-white mt-0.5">{activeScenario.name}</h3>
                  <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    <span>Chamber: {activeScenario.chamber}</span>
                    <span>Atmosphere: {activeScenario.atmosphere}</span>
                    <span>Forced Flow: {activeScenario.ventSpeed} m/s</span>
                  </div>
                </div>
                <button
                  onClick={handleAnalyze}
                  className="px-3.5 py-1.5 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700 rounded text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Analyze with Gemini</span>
                </button>
              </div>

              {/* Sensor Telemetry Visual Graphs */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <span>Flight Telemetry Stream Channels (t = 0 to 80s)</span>
                  </span>
                  <span className="text-[10px] text-slate-500">Sampling Rate: 0.2 Hz</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Graph 1: Radiometer Flux & Flame Radius */}
                  <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-lg space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-semibold">Radiometer Heat Flux (W/cm²)</span>
                      <span className="text-amber-300 font-mono">
                        Peak: {Math.max(...activeScenario.telemetry.radiometer_w_cm2).toFixed(2)} W/cm²
                      </span>
                    </div>
                    {/* SVG Sparkline */}
                    <svg className="w-full h-24 overflow-visible" viewBox="0 0 300 70">
                      {/* Grid */}
                      <line x1="0" y1="65" x2="300" y2="65" stroke="#1e293b" strokeWidth="1" />
                      <line x1="0" y1="35" x2="300" y2="35" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
                      <line x1="0" y1="5" x2="300" y2="5" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />

                      {/* Path */}
                      <path
                        d={activeScenario.telemetry.radiometer_w_cm2
                          .map((val, idx, arr) => {
                            const x = (idx / (arr.length - 1)) * 300;
                            const maxVal = Math.max(...arr) || 1;
                            const y = 65 - (val / maxVal) * 55;
                            return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                          })
                          .join(' ')}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="2.5"
                      />
                    </svg>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>t = 0s</span>
                      <span>Radiometer Sensor R-01</span>
                      <span>t = {activeScenario.telemetry.timestamp_s.slice(-1)[0]}s</span>
                    </div>
                  </div>

                  {/* Graph 2: Flame Core Temperature */}
                  <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-lg space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-semibold">Thermocouple Flame Temp (K)</span>
                      <span className="text-red-300 font-mono">
                        Max: {Math.max(...activeScenario.telemetry.flame_temp_k)} K
                      </span>
                    </div>
                    {/* SVG Sparkline */}
                    <svg className="w-full h-24 overflow-visible" viewBox="0 0 300 70">
                      <line x1="0" y1="65" x2="300" y2="65" stroke="#1e293b" strokeWidth="1" />
                      <line x1="0" y1="35" x2="300" y2="35" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
                      <line x1="0" y1="5" x2="300" y2="5" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />

                      <path
                        d={activeScenario.telemetry.flame_temp_k
                          .map((val, idx, arr) => {
                            const x = (idx / (arr.length - 1)) * 300;
                            const minVal = 298;
                            const maxVal = Math.max(...arr);
                            const y = 65 - ((val - minVal) / (maxVal - minVal || 1)) * 55;
                            return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                          })
                          .join(' ')}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="2.5"
                      />
                    </svg>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>298 K (Ambient)</span>
                      <span>TC Array T1-T8</span>
                      <span>Peak Reaction Zone</span>
                    </div>
                  </div>

                  {/* Graph 3: Ambient O2 vs Local CO2 Accumulation */}
                  <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-lg space-y-2 md:col-span-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-semibold">Local CO2 Stagnation Concentration (ppm)</span>
                      <span className="text-cyan-300 font-mono">
                        Final CO2: {activeScenario.telemetry.co2_local_ppm.slice(-1)[0]} ppm
                      </span>
                    </div>
                    {/* SVG Sparkline */}
                    <svg className="w-full h-20 overflow-visible" viewBox="0 0 600 55">
                      <line x1="0" y1="50" x2="600" y2="50" stroke="#1e293b" strokeWidth="1" />
                      <path
                        d={activeScenario.telemetry.co2_local_ppm
                          .map((val, idx, arr) => {
                            const x = (idx / (arr.length - 1)) * 600;
                            const maxVal = Math.max(...arr) || 1;
                            const y = 50 - (val / maxVal) * 45;
                            return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                          })
                          .join(' ')}
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth="2.5"
                      />
                    </svg>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Baseline: 450 ppm</span>
                      <span>Notice rapid local CO2 blanket accumulation due to lack of buoyant convection</span>
                      <span>Peak: {Math.max(...activeScenario.telemetry.co2_local_ppm)} ppm</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Research Summary Breakdown */}
              <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-2 text-xs">
                <span className="font-semibold text-slate-200 block">Aerospace Engineering Context:</span>
                <p className="text-slate-300 leading-relaxed">{activeScenario.summary}</p>
                <div className="text-slate-400 text-[11px] pt-1">
                  <strong>NASA Safety Standard STD-6001 Test 1 Limitation:</strong> Standard upward flammability tests in 1g overestimate convective air supplies and fail to predict microgravity low-flow smoldering persistence.
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
