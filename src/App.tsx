import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { AIChatEngine } from './components/AIChatEngine';
import { CombustionSimulator } from './components/CombustionSimulator';
import { DropletDynamics } from './components/DropletDynamics';
import { MissionsArchive } from './components/MissionsArchive';
import { HazardMatrix } from './components/HazardMatrix';
import { ScenarioPreset } from './types';
import { fetchScenarios } from './services/geminiService';
import { sound } from './utils/audioAlert';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('chat');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [hazardDetected, setHazardDetected] = useState<boolean>(false);
  const [gravityMode, setGravityMode] = useState<number>(0); // 0 = microgravity, 1 = earth
  const [scenarios, setScenarios] = useState<ScenarioPreset[]>([]);
  const [currentTelemetryContext, setCurrentTelemetryContext] = useState<any>(null);

  // Load NASA Mission Scenario Presets on mount
  useEffect(() => {
    fetchScenarios()
      .then((data) => setScenarios(data))
      .catch((err) => console.error('Error fetching scenarios:', err));
  }, []);

  // Handler to jump to AI chat with query and context
  const handleSendToChat = (query: string, context?: any) => {
    setCurrentTelemetryContext(context || null);
    setActiveTab('chat');
    // Give state a moment to switch tabs, then dispatch custom event or rely on state hook
    setTimeout(() => {
      const chatInput = document.querySelector('input[type="text"]') as HTMLInputElement;
      if (chatInput) {
        chatInput.value = query;
        // trigger form submit
        const form = chatInput.closest('form');
        if (form) {
          form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
      }
    }, 100);
  };

  const handleSelectScenario = (scenario: ScenarioPreset) => {
    const query = `Analyze the telemetry for NASA Mission Scenario: ${scenario.name} (${scenario.mission}).
Chamber: ${scenario.chamber}
Atmosphere: ${scenario.atmosphere}
Forced Flow Velocity: ${scenario.ventSpeed} m/s
Fuel: ${scenario.fuel}
Observation: ${scenario.summary}

Evaluate flame morphology (Grashof Gr, Peclet Pe, Damköhler Da), oxygen diffusion limitations, surface tension regimes, and flag if habitat hazard threshold is breached.`;
    handleSendToChat(query, scenario);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* NASA Mission Control Header Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        hazardDetected={hazardDetected}
        gravityMode={gravityMode}
        setGravityMode={setGravityMode}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {activeTab === 'chat' && (
          <AIChatEngine
            onHazardTriggered={setHazardDetected}
            currentTelemetryContext={currentTelemetryContext}
            presetScenarios={scenarios}
          />
        )}

        {activeTab === 'simulator' && (
          <CombustionSimulator
            onSendToChat={handleSendToChat}
            gravityMode={gravityMode}
            setGravityMode={setGravityMode}
          />
        )}

        {activeTab === 'droplets' && (
          <DropletDynamics onSendToChat={handleSendToChat} />
        )}

        {activeTab === 'missions' && (
          <MissionsArchive
            scenarios={scenarios}
            onSelectScenario={handleSelectScenario}
          />
        )}

        {activeTab === 'hazard' && (
          <HazardMatrix
            onSendToChat={handleSendToChat}
            onSimulateHazard={() => {
              setHazardDetected(true);
              sound.playHazardAlarm();
            }}
          />
        )}
      </main>

      {/* Footer Bar with NASA Space Apps & Physics Citation */}
      <footer className="border-t border-slate-900 bg-slate-950/90 text-slate-500 text-xs py-3 px-4 font-mono">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-bold">NULLG ZERO GRAVITY</span>
            <span>•</span>
            <span>NASA Space Apps Challenge</span>
            <span>•</span>
            <span>ISS CIR & Saffire Grounded</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span>Grashof Gr → 0.00</span>
            <span>•</span>
            <span>Bond Bo ≪ 1 (Surface Tension Dominant)</span>
            <span>•</span>
            <span>Fickian Transport J = -D ∇C</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
