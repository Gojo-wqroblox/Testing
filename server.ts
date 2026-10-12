import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize GoogleGenAI SDK with server-side API Key
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const SYSTEM_INSTRUCTION = `You are the elite AI Engine for the NULLG Zero Gravity Project, built for the NASA Space Apps Challenge. Your core purpose is to act as an expert aerospace combustion engineer and data analyst specializing in microgravity environments.

When analyzing data or answering questions, you must strictly follow these physics-based constraints:
1. Microgravity Combustion: Remember that in zero gravity, there is NO buoyant convection (hot air doesn't rise, cold air doesn't sink). Fire behaves fundamentally differently:
   - Flames become small, dim (chemiluminescent blue emission from OH* and CH* radicals), relatively cool (~1200-1400 K compared to ~1900-2100 K in 1g), and perfectly spherical.
   - Grashof number Gr = (g * beta * deltaT * L^3) / nu^2 and Rayleigh number Ra approach 0.
   - Oxygen replenishment happens purely via slow molecular diffusion (Fickian transport: J = -D * grad(C)) unless forced ventilation is applied.
   - Combustion products (CO2, H2O, carbonaceous soot) accumulate in a concentric, stagnant boundary layer around the spherical reaction zone, starving the flame and frequently leading to radiative quenching, self-extinguishment, or prolonged low-temperature smoldering.
   - Stefan flow (outward mass blowing from fuel vaporization) opposes the inward diffusion of oxidizer.
2. Fluid Dynamics: Assume surface tension dominates completely because gravity isn't pulling liquids downward (Bond/Eötvös number Bo = (deltaRho * g * L^2) / sigma << 1, Capillary length lambda_c -> infinity, Weber number We governs droplet impact).
   - Liquids naturally coalesce into floating spheres to minimize surface energy.
   - Fuel leaks do not form puddles on floors; they form floating droplets or creep along surfaces via capillary wetting.
   - Droplet combustion follows the d^2-law (d^2(t) = d0^2 - K*t) with concentric spherical soot shells, micro-explosions, and low-temperature "cool flame" burning regimes (~600-800 K) after warm-flame extinction.
3. Mission Grounding: Base your deep insights on configurations and empirical findings aligned with NASA space hazard research missions:
   - SoFIE (Solid Fuel Ignition and Extinction) aboard the ISS CIR (Combustion Integrated Rack): GEL (Growth and Extinction Limit), MIST (Material Ignition and Suppression Test), Narrow Channel Apparatus, Flat Flame.
   - Saffire (Spacecraft Fire Safety Demonstration) I through VI conducted inside uncrewed Cygnus resupply vehicles: large-scale material flammability (cotton-fiberglass blend SIBAL, PMMA slabs, Nomex), low-flow vs high-flow flame spread, spacecraft depressurization extinction, cleanup protocols.
   - FLEX (Flame Extinguishment Experiment) and BASS (Burning and Suppression of Solids).
   - Exploration Atmospheres: e.g., 34% O2 at 8.2 psi (56.5 kPa) used for NASA exploration/EVA prep vs standard ISS 21% O2 at 14.7 psi (101.3 kPa).

Tone and Output Style:
- Professional, analytical, and scientifically accurate. Use standard aerospace engineering terminology (e.g., Gr, Ra, Da, Pe, Le, Stefan velocity, chemiluminescence, pyrolyzate, equivalence ratio phi).
- Break down complex telemetry observations or combustion timelines using structured bullet points or step-by-step breakdowns.
- HAZARD PROTOCOL: If a data pattern looks dangerous (e.g., fuel ignition risk, unvented stagnant gas pocket accumulation, enriched O2 flammability limit breach, smoldering-to-flaming transition, floating fuel droplet near hot electronics), you MUST flag it immediately with the exact token:
[SPACE HABITAT HAZARD DETECTED]
Followed by:
- Hazard Classification & Severity Level (CRITICAL / HIGH / MODERATE)
- Physical Root Cause (e.g., absence of buoyant venting, localized stoichiometric pocket, Bo << 1 fuel coalescence)
- Immediate Habitat Containment & Mitigation Protocol (e.g., ventilation isolation, inert gas N2 purge, water mist flooding, emergency depressurization).`;

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    project: 'NULLG Zero Gravity AI Engine',
    mission: 'NASA Space Apps Challenge',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// NASA Telemetry Scenario Benchmarks
app.get('/api/scenarios', (req, res) => {
  const scenarios = [
    {
      id: 'sofie-gel-pmma',
      name: 'SoFIE-GEL Fuel Rod Test (ISS CIR)',
      mission: 'SoFIE (Solid Fuel Ignition and Extinction)',
      chamber: 'Combustion Integrated Rack (ISS)',
      atmosphere: '21.0% O2, 79.0% N2, 101.3 kPa (14.7 psi)',
      ventSpeed: 0.05, // m/s opposed flow
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
      summary: 'SoFIE Growth and Extinction Limit run evaluating opposed-flow flame spread over thick PMMA in ISS CIR. Low velocity (0.05 m/s) approaches radiative extinction boundary.',
    },
    {
      id: 'saffire-iv-exploration-o2',
      name: 'Saffire-IV Enriched Atmosphere Flammability',
      mission: 'Saffire (Spacecraft Fire Safety Demonstration)',
      chamber: 'Cygnus Resupply Vehicle (Post-ISS Uncrewed)',
      atmosphere: '34.0% O2, 66.0% N2, 56.5 kPa (8.2 psi)',
      ventSpeed: 0.15, // m/s concurrent flow
      fuel: 'SIBAL Fabric (75% cotton / 25% fiberglass) 0.4m x 1.0m sheet',
      hazardState: 'ACTIVE_FIRE_SPREAD',
      telemetry: {
        timestamp_s: [0, 10, 20, 30, 40, 50, 60, 70, 80],
        radiometer_w_cm2: [0.0, 1.1, 2.8, 4.6, 6.2, 7.8, 8.4, 8.2, 7.9],
        flame_diameter_mm: [0.0, 45, 110, 185, 260, 340, 390, 405, 400],
        flame_temp_k: [298, 1380, 1620, 1780, 1840, 1890, 1910, 1895, 1880],
        o2_ambient_pct: [34.0, 33.8, 33.4, 32.7, 31.8, 30.7, 29.5, 28.6, 27.8],
        co2_local_ppm: [520, 3200, 7800, 14200, 22100, 31500, 41200, 49000, 56200],
      },
      summary: 'Large-scale fire test inside Cygnus vehicle replicating NASA Exploration Atmosphere (34% O2 @ 8.2 psi). High spread velocity with concurrent ventilation.',
    },
    {
      id: 'columbus-stagnant-pocket',
      name: 'ISS Columbus Stagnant Dead-Air Pocket Anomaly',
      mission: 'ISS Habitat Environmental & Thermal Control (ECLSS)',
      chamber: 'Columbus Module Avionics Rack Sub-bay 4',
      atmosphere: '22.4% O2 (localized enrichment), 101.1 kPa',
      ventSpeed: 0.00, // zero flow stagnant dead-zone!
      fuel: 'Polyimide Wire Insulation & pyrolyzed particulate accumulation',
      hazardState: 'CRITICAL_HAZARD',
      telemetry: {
        timestamp_s: [0, 30, 60, 90, 120, 150, 180, 210, 240],
        radiometer_w_cm2: [0.02, 0.05, 0.12, 0.28, 0.65, 1.10, 1.75, 2.40, 3.10],
        flame_diameter_mm: [0.0, 0.0, 2.1, 5.4, 11.2, 18.0, 24.5, 31.0, 38.0],
        flame_temp_k: [315, 390, 580, 720, 910, 1150, 1320, 1450, 1510],
        o2_ambient_pct: [22.4, 22.2, 21.8, 21.1, 20.2, 19.1, 17.8, 16.2, 14.5],
        co2_local_ppm: [850, 1400, 3200, 6700, 12500, 22000, 36000, 54000, 78000],
      },
      summary: 'Stagnant unvented pocket behind avionics rack. Lack of buoyant circulation allowed localized O2/pyrolysate pocket to heat and undergo smolder-to-spherical-flame transition.',
    },
    {
      id: 'flex-droplet-cool-flame',
      name: 'FLEX Isolated Heptane Droplet Cool Flame',
      mission: 'FLEX (Flame Extinguishment Experiment)',
      chamber: 'Multi-user Droplet Combustion Apparatus (MDCA)',
      atmosphere: '21.0% O2, 101.3 kPa (14.7 psi), zero convective drift',
      ventSpeed: 0.00,
      fuel: 'n-Heptane Droplet (3.0mm dia) supported on SiC fiber',
      hazardState: 'COOL_FLAME_REGIME',
      telemetry: {
        timestamp_s: [0, 2, 4, 6, 8, 10, 12, 14, 16],
        radiometer_w_cm2: [0.0, 0.85, 1.30, 1.25, 0.35, 0.08, 0.07, 0.06, 0.0],
        flame_diameter_mm: [0.0, 8.5, 14.2, 13.8, 0.0, 0.0, 0.0, 0.0, 0.0],
        flame_temp_k: [298, 1350, 1420, 1380, 760, 680, 650, 630, 298],
        o2_ambient_pct: [21.0, 20.8, 20.6, 20.5, 20.5, 20.4, 20.4, 20.4, 20.4],
        co2_local_ppm: [400, 1100, 2400, 3100, 3300, 3400, 3450, 3500, 3520],
      },
      summary: 'Classic microgravity droplet combustion showing warm spherical flame extinction followed by second-stage quasi-steady "cool flame" burning at ~650 K, invisible in visible light.',
    },
  ];

  res.json({ scenarios });
});

// Real-time Chat API with Gemini 3.8 Flash
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, contextData } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    let contextualPrompt = '';
    if (contextData) {
      contextualPrompt = `\n[ATTACHED TELEMETRY & PHYSICAL CONTEXT]:\n${typeof contextData === 'string' ? contextData : JSON.stringify(contextData, null, 2)}\n\n`;
    }

    // Format chat contents for Gemini SDK
    // The last message is the current user query, previous messages form conversation history
    const contents: any[] = [];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const isLast = i === messages.length - 1;
      const role = msg.role === 'assistant' ? 'model' : 'user';
      let text = msg.content;
      if (isLast && contextualPrompt) {
        text = contextualPrompt + text;
      }
      contents.push({
        role,
        parts: [{ text }],
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.25, // low temperature for rigorous engineering accuracy
      },
    });

    const replyText = response.text || 'No response generated from engineering engine.';
    const hasHazard = replyText.includes('[SPACE HABITAT HAZARD DETECTED]');

    return res.json({
      text: replyText,
      hasHazard,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Gemini Chat Error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate aerospace combustion analysis.',
    });
  }
});

// Streaming Chat API (SSE)
app.post('/api/chat/stream', async (req, res) => {
  try {
    const { messages, contextData } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let contextualPrompt = '';
    if (contextData) {
      contextualPrompt = `\n[ATTACHED TELEMETRY & PHYSICAL CONTEXT]:\n${typeof contextData === 'string' ? contextData : JSON.stringify(contextData, null, 2)}\n\n`;
    }

    const contents: any[] = [];
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const isLast = i === messages.length - 1;
      const role = msg.role === 'assistant' ? 'model' : 'user';
      let text = msg.content;
      if (isLast && contextualPrompt) {
        text = contextualPrompt + text;
      }
      contents.push({
        role,
        parts: [{ text }],
      });
    }

    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.25,
      },
    });

    for await (const chunk of responseStream) {
      const chunkText = chunk.text || '';
      if (chunkText) {
        res.write(`data: ${JSON.stringify({ chunk: chunkText })}\n\n`);
      }
    }

    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (error: any) {
    console.error('Gemini Stream Error:', error);
    res.write(`data: ${JSON.stringify({ error: error?.message || 'Stream processing failure' })}\n\n`);
    res.end();
  }
});

// Dedicated Telemetry Analysis Endpoint
app.post('/api/analyze-telemetry', async (req, res) => {
  try {
    const { scenarioName, parameters, observations } = req.body;

    const analysisPrompt = `Perform an exhaustive microgravity combustion physics analysis of the following telemetry report:
SCENARIO / MISSION: ${scenarioName || 'Custom Orbital Experiment'}
ENVIRONMENT & PARAMETERS:
${JSON.stringify(parameters, null, 2)}
OBSERVATIONS / TIMELINE:
${observations || 'Real-time telemetry sensor array snapshot'}

Please structure your response with:
1. Executive Telemetry Diagnostic (Physics parameters: Grashof Gr, Rayleigh Ra, Damköhler Da, Peclet Pe, Lewis Le, Stefan blowing velocity, and dominant transport mechanism).
2. Flame Morphology & Behavior Analysis (explain why flame is spherical, dim blue chemiluminescent, cool, or if forced flow distorts it into an ellipsoid).
3. Fluid & Surface Tension Regimes (Bond number Bo, capillary wetting, droplet coalescence mechanics).
4. Mission Grounding Comparison (compare against SoFIE GEL/MIST and Saffire flight datasets).
5. Hazard Assessment (Evaluate ignition risk, stagnant pocket accumulation, smoldering-to-flame transition, or extinction. If dangerous, start with [SPACE HABITAT HAZARD DETECTED]).
6. Engineering Recommendations & Habitat Protocols.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ role: 'user', parts: [{ text: analysisPrompt }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.2,
      },
    });

    const replyText = response.text || '';
    const hasHazard = replyText.includes('[SPACE HABITAT HAZARD DETECTED]');

    return res.json({
      analysis: replyText,
      hasHazard,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Telemetry Analysis Error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to complete telemetry diagnostic.',
    });
  }
});

// Vite mounting in dev / static in prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`[NULLG AI Engine] NASA Space Apps server running on port ${PORT}`);
  });
}

startServer();
