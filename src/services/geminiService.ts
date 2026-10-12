import { ChatMessage, ScenarioPreset } from '../types';

export async function fetchScenarios(): Promise<ScenarioPreset[]> {
  try {
    const res = await fetch('/api/scenarios');
    if (!res.ok) throw new Error('Failed to load scenarios');
    const data = await res.json();
    return data.scenarios || [];
  } catch (err) {
    console.warn('Falling back to built-in presets:', err);
    return [
      {
        id: 'sofie-gel-pmma',
        name: 'SoFIE-GEL Fuel Rod Test (ISS CIR)',
        mission: 'SoFIE (Solid Fuel Ignition and Extinction)',
        chamber: 'Combustion Integrated Rack (ISS)',
        atmosphere: '21.0% O2, 79.0% N2, 101.3 kPa (14.7 psi)',
        ventSpeed: 0.05,
        fuel: 'Poly(methyl methacrylate) [PMMA] Rod (3.2mm dia)',
        hazardState: 'CONTROLLED_EXPERIMENTAL',
        telemetry: {
          timestamp_s: [0, 5, 10, 15, 20, 25, 30, 35, 40],
          radiometer_w_cm2: [0.0, 0.42, 0.88, 1.15, 1.22, 1.20, 1.18, 0.95, 0.40],
          flame_diameter_mm: [0.0, 6.2, 9.8, 12.4, 13.1, 13.0, 12.8, 10.5, 4.1],
          flame_temp_k: [298, 1150, 1340, 1410, 1425, 1415, 1390, 1280, 920],
          o2_ambient_pct: [21.0, 20.9, 20.8, 20.7, 20.6, 20.5, 20.4, 20.3, 20.3],
          co2_local_ppm: [450, 1200, 2600, 4100, 5300, 6100, 6800, 7200, 7300],
        },
        summary: 'SoFIE Growth and Extinction Limit run evaluating opposed-flow flame spread over thick PMMA in ISS CIR.',
      },
    ];
  }
}

export async function sendChatMessage(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  contextData?: any
): Promise<{ text: string; hasHazard: boolean }> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, contextData }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Server responded with status ${res.status}`);
  }

  return res.json();
}

export async function streamChatMessage(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  contextData: any,
  onChunk: (chunk: string) => void
): Promise<{ hasHazard: boolean }> {
  const res = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, contextData }),
  });

  if (!res.ok) {
    // If stream fails, fallback to unary
    const fallback = await sendChatMessage(messages, contextData);
    onChunk(fallback.text);
    return { hasHazard: fallback.hasHazard };
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error('Unable to read response stream');
  }

  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') {
          break;
        }
        try {
          const parsed = JSON.parse(payload);
          if (parsed.chunk) {
            fullText += parsed.chunk;
            onChunk(parsed.chunk);
          }
          if (parsed.error) {
            throw new Error(parsed.error);
          }
        } catch {
          // parse error ignored
        }
      }
    }
  }

  const hasHazard = fullText.includes('[SPACE HABITAT HAZARD DETECTED]');
  return { hasHazard };
}

export async function runTelemetryAnalysis(
  scenarioName: string,
  parameters: any,
  observations: string
): Promise<{ analysis: string; hasHazard: boolean }> {
  const res = await fetch('/api/analyze-telemetry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenarioName, parameters, observations }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to complete telemetry diagnostic.');
  }

  return res.json();
}
