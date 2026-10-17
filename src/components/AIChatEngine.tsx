import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, ScenarioPreset } from '../types';
import { sound } from '../utils/audioAlert';
import { streamChatMessage } from '../services/geminiService';
import {
  Send,
  Sparkles,
  ShieldAlert,
  Terminal,
  Paperclip,
  Trash2,
  Copy,
  Check,
  Download,
  AlertTriangle,
  Flame,
  Info,
  Loader2,
} from 'lucide-react';

interface AIChatEngineProps {
  onHazardTriggered: (active: boolean) => void;
  currentTelemetryContext?: any;
  presetScenarios: ScenarioPreset[];
}

export const AIChatEngine: React.FC<AIChatEngineProps> = ({
  onHazardTriggered,
  currentTelemetryContext,
  presetScenarios,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content: `### NULLG Aerospace Combustion AI Engine Online
**NASA Space Apps Challenge — Microgravity Combustion & Space Habitat Hazard Specialist**

I am initialized to analyze microgravity transport phenomena, fluid dynamics, and spacecraft fire safety grounded in NASA research (**SoFIE** on ISS CIR and **Saffire-I through VI** on Cygnus vehicles).

**Core Physics Constraints Strictly Enforced:**
1. **Zero Buoyant Convection:** In $0g$, hot air does not rise. Flames become small, dim (blue chemiluminescent $OH^*/CH^*$), relatively cool (~1200–1400 K), and spherical.
2. **Diffusion-Dominated Oxidizer Transport:** $O_2$ replenishment is governed strictly by molecular diffusion ($J = -D \\nabla C$) and opposed by outward Stefan blowing velocity. Concentric $CO_2$ and soot layers promote radiative extinction.
3. **Surface Tension Dominance:** Bond number $Bo = \\frac{\\Delta\\rho g L^2}{\\sigma} \\ll 1$. Liquids naturally coalesce into floating spheres.
4. **Hazard Trigger Protocol:** Any unvented stagnant gas pockets, enriched oxygen flammability limit breaches, or smoldering transitions will immediately trigger:
\`[SPACE HABITAT HAZARD DETECTED]\`

You can ask aerospace combustion questions below or inject real flight telemetry from the NASA mission presets.`,
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachContext, setAttachContext] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    'Explain simply: Why is fire a round blue ball in space instead of a pointy flame?',
    'How do Hydrogen and Methane gas flames behave differently without gravity?',
    'What happens if an astronaut lights a match inside the space station?',
    'Why does a space fire suffocate itself if there is no ventilation fan?',
    'Analyze stagnant oxygen pocket in ISS Columbus avionics rack',
    'Evaluate Saffire-IV fabric burn rate at 34% O2 & 8.2 psi (Exploration Atmosphere)',
    'Assess fluid fuel leak: why surface tension (Bo ≪ 1) forms floating spheres',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const userQuery = (textToSend || input).trim();
    if (!userQuery || loading) return;

    sound.playTelemetryPing();

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: userQuery,
      timestamp: new Date().toLocaleTimeString(),
      contextAttached: attachContext && currentTelemetryContext ? JSON.stringify(currentTelemetryContext) : undefined,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    const assistantMsgId = `ast-${Date.now()}`;
    const initialAssistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString(),
      isStreaming: true,
    };

    setMessages([...newMessages, initialAssistantMsg]);

    try {
      // Build conversation payload
      const historyPayload = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const contextPayload = attachContext && currentTelemetryContext ? currentTelemetryContext : null;

      let accumulatedText = '';
      const result = await streamChatMessage(historyPayload, contextPayload, (chunk) => {
        accumulatedText += chunk;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId ? { ...m, content: accumulatedText, hasHazard: accumulatedText.includes('[SPACE HABITAT HAZARD DETECTED]') } : m
          )
        );
      });

      if (result.hasHazard || accumulatedText.includes('[SPACE HABITAT HAZARD DETECTED]')) {
        onHazardTriggered(true);
        sound.playHazardAlarm();
      } else {
        onHazardTriggered(false);
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === assistantMsgId ? { ...m, isStreaming: false } : m))
      );
    } catch (err: any) {
      console.error('Chat error:', err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                content: `**[DIAGNOSTIC ENGINE COMMUNICATION ERROR]**\n\nFailed to establish link with Gemini AI Engine: ${err.message || 'Unknown error'}.\n\nPlease ensure your Gemini API key is configured in the environment or retry telemetry transmission.`,
                isStreaming: false,
              }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClear = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: `### Telemetry Console Cleared\nReady for new microgravity combustion diagnostic queries.`,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
    onHazardTriggered(false);
  };

  const exportReport = () => {
    const reportText = messages
      .map((m) => `[${m.timestamp}] ${m.role.toUpperCase()}:\n${m.content}\n\n${'-'.repeat(40)}\n`)
      .join('\n');
    const blob = new Blob([`# NULLG ZERO GRAVITY PROJECT // MISSION TELEMETRY REPORT\nGenerated: ${new Date().toISOString()}\n\n${reportText}`], {
      type: 'text/markdown',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NULLG-Telemetry-Report-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadPresetIntoQuery = (preset: ScenarioPreset) => {
    const query = `Analyze the telemetry for NASA Mission Scenario: ${preset.name} (${preset.mission}).
Chamber: ${preset.chamber}
Atmosphere: ${preset.atmosphere}
Forced Flow Velocity: ${preset.ventSpeed} m/s
Fuel: ${preset.fuel}
Observation: ${preset.summary}

Evaluate flame morphology (Grashof Gr, Peclet Pe, Damköhler Da), oxygen diffusion limitations, surface tension regimes, and flag if habitat hazard threshold is breached.`;
    handleSend(query);
  };

  // Render message body with hazard detection banner highlighting
  const renderMessageContent = (content: string) => {
    const hazardToken = '[SPACE HABITAT HAZARD DETECTED]';
    if (!content.includes(hazardToken)) {
      return (
        <div className="prose prose-invert prose-sm max-w-none space-y-2 whitespace-pre-wrap leading-relaxed font-sans">
          {content}
        </div>
      );
    }

    const parts = content.split(hazardToken);
    return (
      <div className="space-y-3 font-sans">
        {parts[0] && <div className="whitespace-pre-wrap text-slate-200">{parts[0]}</div>}

        {/* Highlighted Space Habitat Hazard Alert Card */}
        <div className="bg-red-950/80 border-2 border-red-500/80 rounded-lg p-3 text-red-100 shadow-lg shadow-red-950/60 font-mono">
          <div className="flex items-center gap-2 text-red-300 font-bold tracking-wider text-xs uppercase mb-2">
            <ShieldAlert className="w-4 h-4 text-red-400 animate-pulse" />
            <span>CRITICAL HABITAT SAFETY INTERCEPT</span>
          </div>
          <div className="text-red-200 font-semibold text-sm">
            [SPACE HABITAT HAZARD DETECTED]
          </div>
        </div>

        {parts[1] && <div className="whitespace-pre-wrap text-slate-200">{parts[1]}</div>}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[580px] bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Top Console Bar */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono font-semibold text-slate-200 tracking-wider">
            GEMINI-3.8-FLASH // AEROSPACE COMBUSTION SPECIALIST
          </span>
          <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded font-mono">
            PHYSICS VERIFIED
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Preset Ingestion Dropdown */}
          <select
            onChange={(e) => {
              const found = presetScenarios.find((p) => p.id === e.target.value);
              if (found) loadPresetIntoQuery(found);
            }}
            defaultValue=""
            className="text-xs bg-slate-950 border border-slate-700 text-slate-300 rounded px-2 py-1 font-mono hover:border-cyan-500 focus:outline-none"
          >
            <option value="" disabled>
              + Ingest NASA Flight Scenario...
            </option>
            {presetScenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Context Attach Toggle */}
          <button
            onClick={() => setAttachContext(!attachContext)}
            title="Attach active simulation telemetry parameters to prompts"
            className={`px-2 py-1 rounded text-xs font-mono flex items-center gap-1 transition ${
              attachContext
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-700'
                : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            <Paperclip className="w-3.5 h-3.5" />
            <span>Telemetry Hook: {attachContext ? 'ON' : 'OFF'}</span>
          </button>

          {/* Export Report */}
          <button
            onClick={exportReport}
            title="Export mission diagnostic report as Markdown"
            className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-300 transition"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Clear Console */}
          <button
            onClick={handleClear}
            title="Clear diagnostic history"
            className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono scrollbar-thin">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.role === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div className="flex items-center gap-2 mb-1 text-[11px] text-slate-400">
              <span className="font-semibold tracking-wider text-slate-300">
                {msg.role === 'user' ? 'MISSION_ANALYST' : 'NULLG_AI_ENGINE'}
              </span>
              <span>{msg.timestamp}</span>
              {msg.contextAttached && (
                <span className="text-[10px] text-cyan-400 bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-800/60">
                  Telemetry Context Injected
                </span>
              )}
            </div>

            <div
              className={`max-w-[85%] rounded-lg p-4 relative group ${
                msg.role === 'user'
                  ? 'bg-blue-950/40 border border-blue-700/60 text-blue-100 shadow-md shadow-blue-950/20'
                  : 'bg-slate-900/90 border border-slate-800 text-slate-100 shadow-lg'
              }`}
            >
              {renderMessageContent(msg.content)}

              {msg.isStreaming && (
                <div className="flex items-center gap-1.5 mt-2 text-cyan-400 text-xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Computing microgravity transport equations...</span>
                </div>
              )}

              {/* Copy message button */}
              <button
                onClick={() => handleCopy(msg.id, msg.content)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition p-1 bg-slate-800/90 text-slate-300 hover:text-white rounded"
                title="Copy text"
              >
                {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Bar */}
      <div className="px-4 py-2 bg-slate-950 border-t border-slate-900 overflow-x-auto scrollbar-none flex gap-2">
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            disabled={loading}
            className="text-xs whitespace-nowrap bg-slate-900 hover:bg-cyan-950/60 text-slate-300 hover:text-cyan-300 border border-slate-800 hover:border-cyan-700/60 px-2.5 py-1 rounded transition font-mono"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="p-3 bg-slate-900/90 border-t border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Query NULLG combustion engine (e.g. 'Evaluate PMMA fuel ignition risk in 34% O2 with zero ventilation')..."
              disabled={loading}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono tracking-wide"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 text-white rounded-lg font-mono text-sm font-semibold flex items-center gap-2 shadow-lg shadow-cyan-950/40 transition"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>Analyze</span>
          </button>
        </form>
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono mt-2 px-1">
          <span>Engine Model: Gemini 3.8 Flash // System Persona: NASA Aerospace Combustion Engineer</span>
          <span>Zero-convection physics active • Bo ≪ 1 surface tension active</span>
        </div>
      </div>
    </div>
  );
};
