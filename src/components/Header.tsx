import React from 'react';
import { sound } from '../utils/audioAlert';
import { Volume2, VolumeX, ShieldAlert, Rocket, Flame, Orbit, Activity, BarChart3 } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  hazardDetected: boolean;
  gravityMode: number;
  setGravityMode: (g: number) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  soundEnabled,
  setSoundEnabled,
  hazardDetected,
  gravityMode,
  setGravityMode,
}) => {
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sound.enabled = next;
    if (next) sound.playTelemetryPing();
  };

  return (
    <header className="border-b border-cyan-900/60 bg-slate-950/90 backdrop-blur-md sticky top-0 z-50 text-slate-100">
      {/* Hazard Banner if active */}
      {hazardDetected && (
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 px-4 py-2 text-white font-mono text-xs flex items-center justify-between animate-pulse shadow-lg shadow-red-900/40">
          <div className="flex items-center gap-2 font-bold tracking-wider">
            <ShieldAlert className="w-4 h-4" />
            <span>[SPACE HABITAT HAZARD DETECTED] // UNVENTED STAGNANT REGIME / CRITICAL FLAMMABILITY LIMIT</span>
          </div>
          <span className="text-[11px] bg-black/40 px-2 py-0.5 rounded font-mono">
            ECLSS PROTOCOL 17-A ACTIVE
          </span>
        </div>
      )}

      {/* Main Header Row */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Title & Mission Branding */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-800 p-0.5 shadow-md shadow-cyan-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center">
              <Orbit className="w-6 h-6 text-cyan-400 animate-spin" style={{ animationDuration: '24s' }} />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-mono tracking-tight text-white flex items-center gap-1.5">
                NULL<span className="text-cyan-400">G</span>
                <span className="text-xs px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-700/60 text-cyan-300 font-sans font-medium uppercase tracking-widest">
                  AI ENGINE
                </span>
              </h1>
              <span className="text-[10px] text-amber-400 border border-amber-600/40 bg-amber-950/30 px-1.5 py-0.5 rounded font-mono">
                NASA SPACE APPS
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono tracking-wide">
              Zero-G Aerospace Combustion & Habitat Hazard Diagnostics (SoFIE & Saffire Grounded)
            </p>
          </div>
        </div>

        {/* Status Indicators & Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Gravity Pill Switcher */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-md text-xs font-mono">
            <span className="text-slate-500 text-[11px] px-1.5">ENVIRONMENT:</span>
            <button
              onClick={() => {
                setGravityMode(0);
                sound.playTelemetryPing();
              }}
              className={`px-2 py-0.5 rounded transition ${
                gravityMode === 0
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              0.00g (Micro-G)
            </button>
            <button
              onClick={() => {
                setGravityMode(1);
                sound.playTelemetryPing();
              }}
              className={`px-2 py-0.5 rounded transition ${
                gravityMode === 1
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              1.00g (Earth)
            </button>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            title={soundEnabled ? 'Disable Telemetry Sound' : 'Enable Telemetry Sound'}
            className="p-1.5 rounded-md bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-300 hover:border-cyan-700/60 transition"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Habitat Status Indicator */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-slate-900/90 border border-slate-800 text-xs font-mono">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                hazardDetected
                  ? 'bg-red-500 animate-ping'
                  : gravityMode === 0
                  ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]'
                  : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
              }`}
            />
            <span className="text-slate-300">
              {hazardDetected ? 'HAZARD ELEVATED' : gravityMode === 0 ? 'CIR ORBITAL' : 'TERRESTRIAL LAB'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 flex overflow-x-auto gap-2 border-t border-slate-900/80 pt-1 text-sm font-mono scrollbar-none">
        <button
          onClick={() => setActiveTab('chat')}
          className={`px-4 py-2 border-b-2 font-medium flex items-center gap-2 whitespace-nowrap transition ${
            activeTab === 'chat'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Rocket className="w-4 h-4" />
          <span>Gemini AI Engine & Chatbot</span>
        </button>

        <button
          onClick={() => setActiveTab('physics-monitor')}
          className={`px-4 py-2 border-b-2 font-medium flex items-center gap-2 whitespace-nowrap transition ${
            activeTab === 'physics-monitor'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Activity className="w-4 h-4 text-cyan-400" />
          <span>PhysicsMonitor (Recharts & Voice)</span>
        </button>

        <button
          onClick={() => setActiveTab('simulator')}
          className={`px-4 py-2 border-b-2 font-medium flex items-center gap-2 whitespace-nowrap transition ${
            activeTab === 'simulator'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Flame className="w-4 h-4" />
          <span>1G vs 0G Flame Lab</span>
        </button>

        <button
          onClick={() => setActiveTab('droplets')}
          className={`px-4 py-2 border-b-2 font-medium flex items-center gap-2 whitespace-nowrap transition ${
            activeTab === 'droplets'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Orbit className="w-4 h-4" />
          <span>Surface Tension (Bo ≪ 1)</span>
        </button>

        <button
          onClick={() => setActiveTab('missions')}
          className={`px-4 py-2 border-b-2 font-medium flex items-center gap-2 whitespace-nowrap transition ${
            activeTab === 'missions'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <span className="text-xs bg-slate-800 px-1.5 py-0.5 rounded text-cyan-400">NASA</span>
          <span>SoFIE & Saffire Archive</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 border-b-2 font-medium flex items-center gap-2 whitespace-nowrap transition ${
            activeTab === 'analytics'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          <span>Mission Analytics</span>
        </button>

        <button
          onClick={() => setActiveTab('hazard')}
          className={`px-4 py-2 border-b-2 font-medium flex items-center gap-2 whitespace-nowrap transition ${
            activeTab === 'hazard'
              ? 'border-red-400 text-red-300 bg-red-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-red-400" />
          <span>Habitat Hazard Monitor</span>
        </button>
      </div>
    </header>
  );
};
