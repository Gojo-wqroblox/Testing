import React, { useState, useEffect, useRef } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { sound } from '../utils/audioAlert';
import { synthesizeSpeech } from '../services/geminiService';
import { SafetyMeter } from './SafetyMeter';
import {
  Activity,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Camera,
  Info,
  ShieldAlert,
  Flame,
  Radio,
  Layers,
  CheckCircle,
  Eye,
  Maximize2,
  X,
  Loader2,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  Clock,
  Send,
  Trash2,
  Filter,
  ArrowUpRight,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export interface TelemetryPoint {
  time: number;
  grashof: number;
  rayleigh: number;
  o2_pct: number;
  co2_ppm: number;
  flame_temp_k: number;
  stefan_velocity: number;
}

export interface ThresholdBreachLog {
  id: string;
  timestamp: string;
  flightTimeSec: number;
  type: 'GRASHOF_JITTER' | 'O2_LOC_BREACH' | 'CO2_SUFFOCATION' | 'BUOYANT_RUNAWAY';
  metricName: string;
  measuredValue: string;
  thresholdLimit: string;
  severity: 'CRITICAL' | 'WARNING' | 'ANOMALY';
  aiRationale: string;
  sourceMissionRef?: string;
}

interface NASAImage {
  id: string;
  title: string;
  mission: string;
  caption: string;
  imageUrl: string;
  fallbackSvgType: 'flame' | 'cir' | 'saffire' | 'droplet';
  category: 'Combustion Physics' | 'Flight Hardware' | 'Droplet Dynamics';
  year: string;
  details: string;
}

export const PhysicsMonitor: React.FC<{
  gravityMode: number;
  hazardActive: boolean;
  onSendToChat?: (query: string, context?: any) => void;
  isSimpleMode?: boolean;
}> = ({ gravityMode, hazardActive, onSendToChat, isSimpleMode = false }) => {
  // Real-time telemetry simulation stream
  const [dataStream, setDataStream] = useState<TelemetryPoint[]>([]);
  const [isLiveStreaming, setIsLiveStreaming] = useState(true);
  const [activeTab, setActiveTab] = useState<'charts' | 'photos' | 'voice'>('charts');
  const [activePhoto, setActivePhoto] = useState<NASAImage | null>(null);

  // Audio / Voice State
  const [voiceName, setVoiceName] = useState<'Kore' | 'Puck' | 'Fenrir' | 'Zephyr'>('Kore');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [audioTranscript, setAudioTranscript] = useState<string>(
    'NULLG Physics Monitor online. Currently tracking Grashof number fluctuations and oxygen concentration decay curves in microgravity.'
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // NASA Mission Photographic Archive Data
  const nasaPhotos: NASAImage[] = [
    {
      id: 'photo-01-flame-comparison',
      title: 'Microgravity Spherical Flame vs 1G Buoyant Flame',
      mission: 'NASA Glenn Research Center (GRC)',
      caption: 'Direct comparison showing 1g incandescent yellow teardrop flame with buoyant convection vs 0g dim blue spherical chemiluminescence from OH* and CH* radicals.',
      imageUrl: 'https://images.nasa.gov/details/GRC-2004-C-00072',
      fallbackSvgType: 'flame',
      category: 'Combustion Physics',
      year: 'ISS Flight Expedition',
      details: 'In 0g, the Grashof number Gr drops to 0, eliminating buoyant convection. Molecular diffusion supplies oxygen isotropically in all directions, yielding a perfect sphere. Flame temperature drops by ~500 K.',
    },
    {
      id: 'photo-02-cir-rack',
      title: 'ISS Combustion Integrated Rack (CIR)',
      mission: 'SoFIE (Solid Fuel Ignition and Extinction)',
      caption: 'The CIR facility inside the US Destiny Laboratory on the International Space Station, hosting the SoFIE chamber and multi-spectral radiometers.',
      imageUrl: 'https://images.nasa.gov/details/iss067e034789',
      fallbackSvgType: 'cir',
      category: 'Flight Hardware',
      year: 'Destiny Module, ISS',
      details: 'Hermetically sealed 100-liter chamber with optical windows, gas chromatographs, and precision forced airflow ducts from 0.01 to 0.50 m/s for opposed/concurrent solid fuel flame spread.',
    },
    {
      id: 'photo-03-saffire-module',
      title: 'Saffire Spacecraft Fire Safety Module',
      mission: 'Saffire-I through VI (Cygnus Vehicle)',
      caption: 'Autonomous combustion flow duct inside the uncrewed Cygnus resupply vehicle, measuring large-scale fabric flammability post-ISS departure.',
      imageUrl: 'https://images.nasa.gov/details/GRC-2016-C-04870',
      fallbackSvgType: 'saffire',
      category: 'Flight Hardware',
      year: 'Saffire Flight Demonstration',
      details: 'Tests large sample sheets (0.4 m x 1.0 m) under exploration atmospheres (up to 34% O2 at 8.2 psi). Proved that low convective airflow can accelerate flame spread across spacecraft fabrics.',
    },
    {
      id: 'photo-04-flex-droplet',
      title: 'FLEX Isolated Droplet Combustion & Soot Shell',
      mission: 'FLEX (Flame Extinguishment Experiment)',
      caption: 'Isolated burning n-heptane droplet exhibiting a concentric spherical soot shell and low-temperature cool-flame transition.',
      imageUrl: 'https://images.nasa.gov/details/iss031e041357',
      fallbackSvgType: 'droplet',
      category: 'Droplet Dynamics',
      year: 'MDCA / CIR Experiment',
      details: 'Surface tension dominates (Bond number Bo << 1), compelling fuel droplets to remain spherical. Demonstrates warm flame radiative extinction followed by quasi-steady cool flame burning at ~650 K.',
    },
  ];

  // Dedicated Threshold Breach Log state
  const [thresholdLogs, setThresholdLogs] = useState<ThresholdBreachLog[]>([
    {
      id: 'log-seed-01',
      timestamp: 'T+00:18s [08:52:14 UTC]',
      flightTimeSec: 18,
      type: 'O2_LOC_BREACH',
      metricName: 'Oxygen Concentration (O₂)',
      measuredValue: '12.8%',
      thresholdLimit: 'Safe Limit: ≤ 13.0%',
      severity: 'CRITICAL',
      aiRationale:
        'Oxygen dropped below the safe threshold (12.8%). In zero gravity, trapped smoke and carbon dioxide form an invisible dome around the flame, choking off incoming fresh air until the fire starves and dies.',
      sourceMissionRef: 'NASA SoFIE Space Fire Flight Test',
    },
    {
      id: 'log-seed-02',
      timestamp: 'T+00:34s [08:52:30 UTC]',
      flightTimeSec: 34,
      type: 'GRASHOF_JITTER',
      metricName: 'Air Disturbance / Spacecraft Motion',
      measuredValue: '0.064',
      thresholdLimit: 'Calm Zero-G Limit: ≤ 0.050',
      severity: 'WARNING',
      aiRationale:
        'Spacecraft motion or astronaut movement nudged the air. Because space fire is normally a calm, round sphere, this gentle wobble pulls the flame into an oval shape and alters how heat escapes.',
      sourceMissionRef: 'ISS Space Station Fire Sensor',
    },
    {
      id: 'log-seed-03',
      timestamp: 'T+00:52s [08:52:48 UTC]',
      flightTimeSec: 52,
      type: 'CO2_SUFFOCATION',
      metricName: 'Trapped Smoke (CO₂) Cloud',
      measuredValue: '18,450 ppm',
      thresholdLimit: 'Smoke Barrier: ≥ 15,000 ppm',
      severity: 'CRITICAL',
      aiRationale:
        'Heavy smoke and burnt carbon dioxide have gathered around the burning fuel. The gas cannot float away on its own, creating a barrier that slows down incoming fresh air and cools down the fire.',
      sourceMissionRef: 'NASA Saffire Spacecraft Run',
    },
  ]);
  const [sidebarFilter, setSidebarFilter] = useState<'ALL' | 'CRITICAL' | 'O2' | 'GRASHOF'>('ALL');
  const lastBreachTimeRef = useRef<{ grashof: number; o2: number; co2: number }>({
    grashof: 0,
    o2: 0,
    co2: 0,
  });

  // Manual breach simulation triggers for interactive verification
  const handleSimulateBreach = (type: 'grashof' | 'o2' | 'co2') => {
    sound.playTelemetryPing();
    const nowTime = dataStream.length > 0 ? dataStream[dataStream.length - 1].time + 2 : 45;
    let newEntry: ThresholdBreachLog;

    if (type === 'grashof') {
      newEntry = {
        id: `manual-gr-${Date.now()}`,
        timestamp: `T+${String(nowTime).padStart(3, '0')}s [${new Date().toLocaleTimeString()}]`,
        flightTimeSec: nowTime,
        type: 'GRASHOF_JITTER',
        metricName: 'Air Disturbance / Spacecraft Motion',
        measuredValue: '0.078',
        thresholdLimit: 'Calm Zero-G Limit: ≤ 0.050',
        severity: 'WARNING',
        aiRationale:
          'Simulated spacecraft motion. A slight acceleration nudges the calm air, warping the spherical space flame and causing uneven cooling on one side.',
        sourceMissionRef: 'NASA SoFIE Airflow Test',
      };
    } else if (type === 'o2') {
      newEntry = {
        id: `manual-o2-${Date.now()}`,
        timestamp: `T+${String(nowTime).padStart(3, '0')}s [${new Date().toLocaleTimeString()}]`,
        flightTimeSec: nowTime,
        type: 'O2_LOC_BREACH',
        metricName: 'Oxygen Level (O₂)',
        measuredValue: '12.4%',
        thresholdLimit: 'Safe Limit: ≤ 13.0%',
        severity: 'CRITICAL',
        aiRationale:
          'Simulated oxygen drop (12.4%). Without rising air to whisk smoke away, the flame gets suffocated by trapped exhaust gas and starves for air, causing the fire to shrink and extinguish.',
        sourceMissionRef: 'NASA Spacecraft Fire Protocol',
      };
    } else {
      newEntry = {
        id: `manual-co2-${Date.now()}`,
        timestamp: `T+${String(nowTime).padStart(3, '0')}s [${new Date().toLocaleTimeString()}]`,
        flightTimeSec: nowTime,
        type: 'CO2_SUFFOCATION',
        metricName: 'Trapped Smoke (CO₂) Cloud',
        measuredValue: '24,800 ppm',
        thresholdLimit: 'Smoke Limit: ≥ 15,000 ppm',
        severity: 'CRITICAL',
        aiRationale:
          'Thick cloud of burnt exhaust gas trapped around the flame. Because smoke does not rise in zero gravity, it forms a barrier that prevents fresh oxygen from reaching the fire.',
        sourceMissionRef: 'Space Station Life Support Diagnostic',
      };
    }

    setThresholdLogs((logs) => [newEntry, ...logs]);
  };

  // Initialize and update the real-time telemetry stream
  useEffect(() => {
    // Generate initial history
    const initial: TelemetryPoint[] = [];
    for (let i = 0; i < 20; i++) {
      const t = i * 2;
      const g = gravityMode;
      const gr = g === 0 ? Math.random() * 0.05 : 120000 + Math.sin(t * 0.2) * 15000 + (Math.random() - 0.5) * 5000;
      const o2 = Math.max(10, 21.0 - t * 0.22 - Math.sin(t * 0.1) * 0.1);
      const co2 = 450 + t * 140 + (Math.random() - 0.5) * 40;
      const temp = g === 0 ? 1340 + Math.sin(t * 0.15) * 20 : 1920 + Math.sin(t * 0.3) * 60;
      const stefan = 0.85 + Math.sin(t * 0.2) * 0.1;

      initial.push({
        time: t,
        grashof: Math.round(gr * 100) / 100,
        rayleigh: Math.round(gr * 0.71 * 100) / 100,
        o2_pct: Math.round(o2 * 10) / 10,
        co2_ppm: Math.round(co2),
        flame_temp_k: Math.round(temp),
        stefan_velocity: Math.round(stefan * 100) / 100,
      });
    }
    setDataStream(initial);
  }, [gravityMode]);

  // Live polling interval for fluctuating curves
  useEffect(() => {
    if (!isLiveStreaming) return;

    const interval = setInterval(() => {
      setDataStream((prev) => {
        const last = prev[prev.length - 1];
        const nextTime = last ? last.time + 2 : 0;
        const g = gravityMode;

        // Grashof fluctuations: in 0g it fluctuates slightly near 0 (microgravity g-jitter ~ 10^-5 g)
        // In 1g it fluctuates around 1.2 x 10^5 due to buoyant turbulent eddies
        let gr = 0;
        if (g === 0) {
          gr = Math.max(0, (Math.random() - 0.45) * 0.08); // orbital jitter
        } else {
          gr = 125000 + Math.sin(nextTime * 0.25) * 18000 + (Math.random() - 0.5) * 8000;
        }

        // Oxygen decay curve (exponential decay via Fickian diffusion)
        const decayRate = g === 0 ? 0.08 : 0.25; // 0g consumes slower due to diffusion limitation
        const nextO2 = Math.max(11.2, (last ? last.o2_pct : 21.0) - decayRate + (Math.random() - 0.5) * 0.04);

        // CO2 accumulation curve
        const co2Increase = g === 0 ? 95 : 190;
        const nextCO2 = Math.min(85000, (last ? last.co2_ppm : 450) + co2Increase + (Math.random() - 0.5) * 30);

        // Flame temp
        const temp = g === 0 ? 1320 + Math.sin(nextTime * 0.1) * 35 : 1940 + Math.sin(nextTime * 0.25) * 75;

        // Stefan blowing velocity
        const stefan = 0.75 + (nextO2 / 21) * 0.35 + (Math.random() - 0.5) * 0.05;

        const nextPoint: TelemetryPoint = {
          time: nextTime,
          grashof: Math.round(gr * 100) / 100,
          rayleigh: Math.round(gr * 0.71 * 100) / 100,
          o2_pct: Math.round(nextO2 * 10) / 10,
          co2_ppm: Math.round(nextCO2),
          flame_temp_k: Math.round(temp),
          stefan_velocity: Math.round(stefan * 100) / 100,
        };

        // Real-time Critical Threshold Breach Monitoring
        const nowSec = nextTime;
        const newBreaches: ThresholdBreachLog[] = [];

        // Check Grashof threshold in microgravity (Gr > 0.05) or in 1g turbulent runaway (> 140000)
        if (g === 0 && gr > 0.05 && nowSec - lastBreachTimeRef.current.grashof >= 10) {
          lastBreachTimeRef.current.grashof = nowSec;
          newBreaches.push({
            id: `gr-${nowSec}-${Date.now()}`,
            timestamp: `T+${String(nowSec).padStart(3, '0')}s [${new Date().toLocaleTimeString()}]`,
            flightTimeSec: nowSec,
            type: 'GRASHOF_JITTER',
            metricName: 'Air Disturbance / Spacecraft Motion',
            measuredValue: gr.toFixed(3),
            thresholdLimit: 'Calm Zero-G Limit: ≤ 0.050',
            severity: 'WARNING',
            aiRationale: `Spacecraft motion detected (${gr.toFixed(3)}). In zero gravity, hot air shouldn't rise at all. Thruster firings or astronaut movements are nudging the air, warping the calm spherical flame and causing uneven cooling.`,
            sourceMissionRef: 'NASA SoFIE Space Flight Standard',
          });
        } else if (g === 1 && gr > 140000 && nowSec - lastBreachTimeRef.current.grashof >= 12) {
          lastBreachTimeRef.current.grashof = nowSec;
          newBreaches.push({
            id: `gr-1g-${nowSec}-${Date.now()}`,
            timestamp: `T+${String(nowSec).padStart(3, '0')}s [${new Date().toLocaleTimeString()}]`,
            flightTimeSec: nowSec,
            type: 'BUOYANT_RUNAWAY',
            metricName: 'Earth Rising Air Current',
            measuredValue: `${Math.round(gr)}`,
            thresholdLimit: 'Normal Updraft: ≤ 140,000',
            severity: 'WARNING',
            aiRationale: `Strong Earth-gravity updraft detected (${Math.round(gr)}). Hot air is rushing upward like a chimney, feeding fresh oxygen to the flame and making it flicker yellow with soot.`,
            sourceMissionRef: 'Terrestrial Baseline Reference',
          });
        }

        // Check Oxygen Limiting Concentration (O2 <= 13.0%)
        if (nextO2 <= 13.0 && nowSec - lastBreachTimeRef.current.o2 >= 10) {
          lastBreachTimeRef.current.o2 = nowSec;
          newBreaches.push({
            id: `o2-${nowSec}-${Date.now()}`,
            timestamp: `T+${String(nowSec).padStart(3, '0')}s [${new Date().toLocaleTimeString()}]`,
            flightTimeSec: nowSec,
            type: 'O2_LOC_BREACH',
            metricName: 'Oxygen Level (O₂)',
            measuredValue: `${nextO2.toFixed(1)}%`,
            thresholdLimit: 'Safe Limit: ≤ 13.0%',
            severity: 'CRITICAL',
            aiRationale: `Oxygen dropped to a critical low (${nextO2.toFixed(1)}%). Without hot air rising to push smoke away, the flame is choking on its own trapped exhaust gases and running out of fresh air to stay lit.`,
            sourceMissionRef: 'NASA Spacecraft Fire Safety Standard',
          });
        }

        if (newBreaches.length > 0) {
          sound.playTelemetryPing();
          setThresholdLogs((logs) => [...newBreaches, ...logs].slice(0, 40));
        }

        const updated = [...prev.slice(1), nextPoint];
        return updated;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [isLiveStreaming, gravityMode]);

  // Voice Narration Function (calls /api/tts via Gemini 3.8 Flash Lite TTS with speech synthesis fallback)
  const explainWithVoice = async (customScript?: string) => {
    sound.playTelemetryPing();
    setIsGeneratingVoice(true);

    const latest = dataStream[dataStream.length - 1];
    const grVal = latest ? latest.grashof : 0;
    const o2Val = latest ? latest.o2_pct : 21.0;
    const co2Val = latest ? latest.co2_ppm : 450;
    const tempVal = latest ? latest.flame_temp_k : 1350;

    const explanationScript =
      customScript ||
      (isSimpleMode
        ? `Here is your plain-English space fire briefing: We are monitoring a flame burning in ${
            gravityMode === 0 ? 'zero gravity on a space station' : 'normal Earth gravity'
          }. The air currently has ${o2Val.toFixed(1)} percent oxygen left. ${
            gravityMode === 0
              ? 'Because there is no gravity, hot air cannot rise. The flame forms a calm, glowing blue ball. Without fresh air blowing in, the fire traps itself in its own exhaust smoke and slowly puts itself out.'
              : 'On Earth, hot air rises fast like a chimney, pulling fresh oxygen continuously into the flame so it flickers yellow and stays hot.'
          } Current flame heat is approximately ${Math.round(tempVal - 273.15)} degrees Celsius.`
        : `Aerospace Telemetry Assessment: At current time, Grashof air-rise value is recorded at ${
            gravityMode === 0 ? 'zero point zero zero, verifying pure zero gravity' : `${Math.round(grVal)}, indicating active rising air`
          }. Oxygen concentration has decayed to ${o2Val} percent, while local carbon dioxide smoke accumulation has risen to ${co2Val} parts per million around the spherical reaction zone. Flame core temperature is ${tempVal} Kelvin. In zero gravity, without rising air to blow exhaust away, fresh air only creeps in slowly from all directions, keeping the flame calm, spherical, and cool.`);

    setAudioTranscript(explanationScript);

    try {
      const audioUrl = await synthesizeSpeech(explanationScript, voiceName);
      setCurrentAudioUrl(audioUrl);

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        setIsSpeaking(true);
      }
    } catch (err) {
      console.warn('Backend TTS failed, using browser speech synthesis:', err);
      // Fallback to browser Web Speech API
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(explanationScript);
        utterance.rate = 1.0;
        utterance.pitch = 1.05;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
        setIsSpeaking(true);
      }
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  const stopVoice = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  // Export current session telemetry data to CSV file for post-mission analysis
  const downloadCSV = () => {
    sound.playTelemetryPing();
    if (!dataStream || dataStream.length === 0) return;

    const headers = [
      'timestamp_seconds',
      'grashof_number',
      'rayleigh_number',
      'oxygen_concentration_pct',
      'co2_stagnation_ppm',
      'flame_temperature_kelvin',
      'stefan_velocity_cms',
      'gravity_g',
      'transport_regime',
    ];

    const rows = dataStream.map((pt) => {
      const regime = gravityMode === 0 ? 'PURE_MOLECULAR_DIFFUSION' : 'NATURAL_BUOYANT_CONVECTION';
      return [
        pt.time,
        pt.grashof.toFixed(4),
        pt.rayleigh.toFixed(4),
        pt.o2_pct.toFixed(2),
        pt.co2_ppm,
        pt.flame_temp_k,
        pt.stefan_velocity.toFixed(3),
        gravityMode.toFixed(2),
        regime,
      ].join(',');
    });

    const csvContent = [
      '# NULLG ZERO GRAVITY PROJECT // NASA SPACE APPS CHALLENGE',
      `# Mission Flight Telemetry Session Log`,
      `# Generated: ${new Date().toISOString()}`,
      `# Target Environment: ${gravityMode === 0 ? '0.00g Microgravity (ISS CIR / SoFIE)' : '1.00g Terrestrial'}`,
      `# Data Points Count: ${dataStream.length}`,
      headers.join(','),
      ...rows,
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `NULLG_telemetry_flight_log_${gravityMode === 0 ? '0g' : '1g'}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 font-mono text-slate-100">
      {/* Top Monitor Bar */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
            <h2 className="font-bold text-sm text-white">
              {isSimpleMode
                ? 'PhysicsMonitor // Real-Time Fire Graphs & Voice Guide'
                : 'PhysicsMonitor // Real-Time Recharts Telemetry & Acoustic AI Synthesis'}
            </h2>
            <span className="text-xs bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded font-mono">
              {isSimpleMode ? 'Plain-English Guide Active' : 'Space Airflow & Oxygen Monitor'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isSimpleMode
              ? 'Watch how fire uses up oxygen and behaves when floating in space compared to on Earth, with AI voice explanations.'
              : 'Tracking dynamic Grashof number fluctuations (Gr = g·β·ΔT·L³ / ν²) and exponential oxygen decay curves with Gemini 3.8 voice commentary.'}
          </p>
        </div>

        {/* Live Stream & Voice Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsLiveStreaming(!isLiveStreaming)}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
              isLiveStreaming
                ? 'bg-emerald-950/80 border border-emerald-600/60 text-emerald-300'
                : 'bg-slate-900 border border-slate-700 text-slate-400'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${isLiveStreaming ? 'animate-ping' : ''}`} />
            <span>{isLiveStreaming ? 'Telemetry Live' : 'Telemetry Paused'}</span>
          </button>

          {/* Download CSV Button */}
          <button
            onClick={downloadCSV}
            title="Export session Grashof & O2 telemetry data as CSV"
            className="px-3 py-1.5 rounded text-xs font-semibold bg-slate-900 hover:bg-cyan-950 text-slate-300 hover:text-cyan-300 border border-slate-700 hover:border-cyan-600 flex items-center gap-1.5 transition shadow"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Download CSV</span>
          </button>

          <button
            onClick={() => (isSpeaking ? stopVoice() : explainWithVoice())}
            disabled={isGeneratingVoice}
            className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-lg shadow-cyan-950/40 transition"
          >
            {isGeneratingVoice ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isSpeaking ? (
              <VolumeX className="w-3.5 h-3.5" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-cyan-200" />
            )}
            <span>{isGeneratingVoice ? 'Synthesizing...' : isSpeaking ? 'Stop Voice' : 'AI Voice Briefing'}</span>
          </button>

          {/* Voice Selector */}
          <select
            value={voiceName}
            onChange={(e) => setVoiceName(e.target.value as any)}
            className="text-xs bg-slate-900 border border-slate-700 text-slate-300 rounded px-2.5 py-1.5 font-mono focus:outline-none focus:border-cyan-500"
          >
            <option value="Kore">Voice: Kore (Flight Dir)</option>
            <option value="Puck">Voice: Puck (Telemetry)</option>
            <option value="Fenrir">Voice: Fenrir (Analyst)</option>
            <option value="Zephyr">Voice: Zephyr (Capsule Comms)</option>
          </select>
        </div>
      </div>

      {/* Hidden Audio Tag for playback */}
      <audio
        ref={audioRef}
        onEnded={() => setIsSpeaking(false)}
        onError={() => setIsSpeaking(false)}
        className="hidden"
      />

      {/* Simple Mode Educational Guidance Card */}
      {isSimpleMode && (
        <div className="bg-gradient-to-r from-cyan-950/60 via-slate-900 to-blue-950/60 border border-cyan-800/80 rounded-xl p-4 font-sans text-xs shadow-lg space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-white text-sm">Beginner Quick Guide: What Are You Looking At?</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
              <span className="font-bold text-cyan-300 block mb-1">
                1. "Grashof Number" (Does Hot Air Rise?)
              </span>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                On Earth, hot smoke rushes up fast (values in the thousands). In zero-gravity space, hot air has no "up" or "down", so this stays near <strong>0.00</strong>. If it jumps up in space, it means a rocket thruster or astronaut jumped!
              </p>
            </div>
            <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
              <span className="font-bold text-amber-300 block mb-1">
                2. Oxygen Decay Curve (Fire Suffocation)
              </span>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                The green/amber line shows oxygen dropping as the fire drinks it up. Below <strong>13%</strong>, the fire will suffocate itself because without gravity to push smoke away, the exhaust traps the flame!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation sub-tabs */}
      <div className="flex border-b border-slate-800 gap-4 text-xs font-mono">
        <button
          onClick={() => setActiveTab('charts')}
          className={`pb-2 border-b-2 font-semibold flex items-center gap-1.5 transition ${
            activeTab === 'charts'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Real-Time Recharts (Gr & O2 Decay)</span>
        </button>

        <button
          onClick={() => setActiveTab('photos')}
          className={`pb-2 border-b-2 font-semibold flex items-center gap-1.5 transition ${
            activeTab === 'photos'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>NASA Missions Photo Gallery ({nasaPhotos.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('voice')}
          className={`pb-2 border-b-2 font-semibold flex items-center gap-1.5 transition ${
            activeTab === 'voice'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Volume2 className="w-4 h-4" />
          <span>AI Audio Flight Briefing & Transcript</span>
        </button>
      </div>

      {/* TAB 1: RECHARTS DUAL TELEMETRY PLOTS & DEDICATED SCROLLABLE SIDEBAR */}
      {activeTab === 'charts' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Main Charts & Telemetry Stream (8 cols on xl) */}
          <div className="xl:col-span-8 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart 1: Grashof Number Fluctuations */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm text-cyan-300 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                      <span>Grashof Number (Gr) Fluctuations vs Time</span>
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      Ratio of Buoyancy Forces to Viscous Forces // Gr → 0 in microgravity (μg)
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-cyan-400 block">
                      {dataStream[dataStream.length - 1]?.grashof.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {gravityMode === 0 ? 'Microgravity Regime' : 'Terrestrial Convection'}
                    </span>
                  </div>
                </div>

                <div className="w-full h-64 bg-slate-900/40 rounded-lg p-2 border border-slate-900">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dataStream} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="grashofGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#0891b2" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis
                        dataKey="time"
                        stroke="#64748b"
                        fontSize={10}
                        tickFormatter={(t) => `${t}s`}
                      />
                      <YAxis
                        stroke="#64748b"
                        fontSize={10}
                        domain={gravityMode === 0 ? [0, 0.2] : [0, 160000]}
                        tickFormatter={(val) => (gravityMode === 0 ? val.toFixed(2) : `${(val / 1000).toFixed(0)}k`)}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#020617',
                          borderColor: '#0891b2',
                          fontSize: '11px',
                          fontFamily: 'monospace',
                        }}
                        formatter={(val: any) => [`${val}`, 'Grashof (Gr)']}
                        labelFormatter={(t) => `t = ${t}s`}
                      />
                      <Area
                        type="monotone"
                        dataKey="grashof"
                        stroke="#22d3ee"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#grashofGrad)"
                        isAnimationActive={false}
                      />
                      {gravityMode === 0 && (
                        <ReferenceLine
                          y={0.05}
                          stroke="#f43f5e"
                          strokeDasharray="3 3"
                          label={{ value: 'Orbital g-jitter limit (0.05)', fill: '#f43f5e', fontSize: 10, position: 'top' }}
                        />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex justify-between text-[11px] text-slate-400 font-mono pt-1">
                  <span>• Natural Convection Cutoff: Gr &lt; 10³</span>
                  <span className="text-cyan-300">
                    Current Status: {gravityMode === 0 ? 'Zero Buoyant Plume' : 'Active Teardrop Updraft'}
                  </span>
                </div>
              </div>

              {/* Chart 2: Oxygen Decay & CO2 Stagnation Curves */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm text-amber-300 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <span>Oxygen (O₂) Decay & CO₂ Stagnation Curves</span>
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      {isSimpleMode
                        ? 'Oxygen Starvation & Trapped Smoke Cloud (How fire chokes in space)'
                        : 'Oxygen Depletion & Smoke Trapping in Zero Gravity'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-amber-400 block">
                      O₂: {dataStream[dataStream.length - 1]?.o2_pct}%
                    </span>
                    <span className="text-[10px] text-slate-500">
                      CO₂: {dataStream[dataStream.length - 1]?.co2_ppm} ppm
                    </span>
                  </div>
                </div>

                <div className="w-full h-64 bg-slate-900/40 rounded-lg p-2 border border-slate-900">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dataStream} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis
                        dataKey="time"
                        stroke="#64748b"
                        fontSize={10}
                        tickFormatter={(t) => `${t}s`}
                      />
                      <YAxis
                        yAxisId="left"
                        stroke="#f59e0b"
                        fontSize={10}
                        domain={[10, 24]}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#06b6d4"
                        fontSize={10}
                        domain={[0, 10000]}
                        tickFormatter={(v) => `${v / 1000}k`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#020617',
                          borderColor: '#d97706',
                          fontSize: '11px',
                          fontFamily: 'monospace',
                        }}
                        labelFormatter={(t) => `t = ${t}s`}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                      <ReferenceLine
                        yAxisId="left"
                        y={13.0}
                        stroke="#ef4444"
                        strokeDasharray="4 4"
                        label={{ value: 'LOC Limit (13%)', fill: '#ef4444', fontSize: 10, position: 'insideBottomLeft' }}
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="o2_pct"
                        name="O2 Fraction (%)"
                        stroke="#f59e0b"
                        strokeWidth={2.5}
                        dot={false}
                        isAnimationActive={false}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="co2_ppm"
                        name="Local CO2 (ppm)"
                        stroke="#06b6d4"
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex justify-between text-[11px] text-slate-400 font-mono pt-1">
                  <span>• Minimum Oxygen to Burn: ~13.0%</span>
                  <span className="text-amber-300">
                    {isSimpleMode ? 'Natural Air Mixing: Calm Spreading' : 'Gas Diffusion Flow (J = -D ∇C)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Real-time Telemetry Data Strip */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div>
                <span className="text-slate-400 block">
                  {isSimpleMode ? 'Fuel Vapor Push Speed:' : 'Gas Flow Speed (Stefan Flow):'}
                </span>
                <span className="text-base font-bold text-cyan-300">
                  {dataStream[dataStream.length - 1]?.stefan_velocity.toFixed(2)} cm/s
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {isSimpleMode ? 'Gas pushing outward from fuel' : 'Outward vapor flow'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block">Flame Core Temperature:</span>
                <span className="text-base font-bold text-amber-300">
                  {dataStream[dataStream.length - 1]?.flame_temp_k} K
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {gravityMode === 0 ? 'Radiative Quenching Bound' : 'Soot Incandescent Peak'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block">Rayleigh Number (Ra):</span>
                <span className="text-base font-bold text-slate-200">
                  {dataStream[dataStream.length - 1]?.rayleigh.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-500 block">Prandtl Pr = 0.71</span>
              </div>

              <div>
                <span className="text-slate-400 block">Hazard Threshold State:</span>
                <span
                  className={`text-base font-bold block ${
                    dataStream[dataStream.length - 1]?.o2_pct < 13
                      ? 'text-amber-400'
                      : hazardActive
                      ? 'text-red-400 animate-pulse'
                      : 'text-emerald-400'
                  }`}
                >
                  {hazardActive ? 'HAZARD ELEVATED' : 'NOMINAL DIFFUSION'}
                </span>
                <span className="text-[10px] text-slate-500 block">ECLSS Channel 04</span>
              </div>
            </div>

            {/* Export Telemetry Session Bar */}
            <div className="flex flex-wrap items-center justify-between bg-slate-900/70 border border-slate-800 px-4 py-3 rounded-xl text-xs font-mono gap-3">
              <div className="flex items-center gap-2 text-slate-300">
                <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                <span>Session Log: {dataStream.length} flight time points recorded (Sampling: 0.5 Hz)</span>
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-cyan-300">
                  Ready for Post-Mission Diagnostics
                </span>
              </div>
              <button
                onClick={downloadCSV}
                className="px-3.5 py-1.5 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700 rounded-lg font-semibold flex items-center gap-1.5 transition shadow"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Export Telemetry CSV</span>
              </button>
            </div>
          </div>

          {/* DEDICATED SCROLLABLE SIDEBAR: THRESHOLD BREACH LOG & AI RATIONALES */}
          <aside className="xl:col-span-4 bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col space-y-4">
            {/* Sidebar Header */}
            <div className="border-b border-slate-800/80 pb-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
                  <h3 className="font-bold text-xs text-white uppercase tracking-wider">
                    Critical Limit Log
                  </h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded-full font-bold">
                    {thresholdLogs.length} Events
                  </span>
                  <button
                    onClick={() => setThresholdLogs([])}
                    title="Clear Log History"
                    className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Autonomous real-time log tracking Grashof g-jitter (&gt;0.050) and Limiting Oxygen Concentration (LOC ≤13.0%) with aerospace AI rationales.
              </p>

              {/* Simulation Spike Injection Buttons */}
              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Inject:</span>
                <button
                  onClick={() => handleSimulateBreach('grashof')}
                  className="px-2 py-1 rounded text-[10px] bg-slate-900 hover:bg-cyan-950 border border-slate-800 hover:border-cyan-700 text-cyan-300 font-mono transition"
                >
                  + Gr Jitter
                </button>
                <button
                  onClick={() => handleSimulateBreach('o2')}
                  className="px-2 py-1 rounded text-[10px] bg-slate-900 hover:bg-red-950 border border-slate-800 hover:border-red-700 text-red-300 font-mono transition"
                >
                  + O₂ LOC
                </button>
                <button
                  onClick={() => handleSimulateBreach('co2')}
                  className="px-2 py-1 rounded text-[10px] bg-slate-900 hover:bg-amber-950 border border-slate-800 hover:border-amber-700 text-amber-300 font-mono transition"
                >
                  + CO₂ Blanket
                </button>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1 pt-1 overflow-x-auto text-[10px] scrollbar-none">
                <span className="text-slate-500">
                  <Filter className="w-3 h-3 inline mr-1" />
                </span>
                {(['ALL', 'CRITICAL', 'O2', 'GRASHOF'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setSidebarFilter(mode)}
                    className={`px-2 py-0.5 rounded transition ${
                      sidebarFilter === mode
                        ? 'bg-cyan-900/60 text-cyan-200 border border-cyan-600 font-bold'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {mode === 'ALL' ? 'All' : mode === 'CRITICAL' ? 'Critical' : mode === 'O2' ? 'O₂ LOC' : 'Grashof'}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Events Feed */}
            <div className="max-h-[560px] overflow-y-auto space-y-3 pr-1.5 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900/40">
              {thresholdLogs
                .filter((log) => {
                  if (sidebarFilter === 'CRITICAL') return log.severity === 'CRITICAL';
                  if (sidebarFilter === 'O2') return log.type === 'O2_LOC_BREACH';
                  if (sidebarFilter === 'GRASHOF') return log.type === 'GRASHOF_JITTER' || log.type === 'BUOYANT_RUNAWAY';
                  return true;
                })
                .map((log) => (
                  <div
                    key={log.id}
                    className={`p-3 rounded-lg border transition space-y-2 ${
                      log.severity === 'CRITICAL'
                        ? 'bg-red-950/20 border-red-800/60 hover:border-red-600'
                        : log.type === 'GRASHOF_JITTER'
                        ? 'bg-cyan-950/20 border-cyan-800/60 hover:border-cyan-600'
                        : 'bg-amber-950/20 border-amber-800/60 hover:border-amber-600'
                    }`}
                  >
                    {/* Event Header Row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span className="text-[11px] font-bold text-slate-300 font-mono">
                          {log.timestamp}
                        </span>
                      </div>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                          log.severity === 'CRITICAL'
                            ? 'bg-red-900/60 text-red-200 border border-red-700'
                            : 'bg-amber-900/60 text-amber-200 border border-amber-700'
                        }`}
                      >
                        {log.severity}
                      </span>
                    </div>

                    {/* Metric & Limit Readout */}
                    <div className="bg-slate-900/90 border border-slate-800/80 px-2.5 py-1.5 rounded flex items-center justify-between text-[11px] font-mono">
                      <div>
                        <span className="text-slate-400 block text-[10px]">{log.metricName}:</span>
                        <span
                          className={`font-bold text-sm ${
                            log.severity === 'CRITICAL' ? 'text-red-400' : 'text-amber-300'
                          }`}
                        >
                          {log.measuredValue}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 block">Boundary</span>
                        <span className="text-[10px] text-cyan-300 font-medium">
                          {log.thresholdLimit}
                        </span>
                      </div>
                    </div>

                    {/* AI-Generated Rationale */}
                    <div className="bg-slate-900/80 border border-slate-800/90 rounded p-2.5 space-y-1">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-cyan-300">
                        <Sparkles className="w-3 h-3 text-cyan-400" />
                        <span>AI Combustion Rationale</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                        {log.aiRationale}
                      </p>
                      {log.sourceMissionRef && (
                        <div className="text-[9px] text-slate-500 pt-1 font-mono flex items-center gap-1">
                          <span>Ref:</span>
                          <span className="text-slate-400">{log.sourceMissionRef}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions: Voice Explanation & Ingest to Chat */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => explainWithVoice(log.aiRationale)}
                        className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-[10px] text-cyan-300 border border-slate-700 flex items-center gap-1 transition"
                        title="Vocalize this AI rationale via Gemini TTS"
                      >
                        <Volume2 className="w-3 h-3 text-cyan-400" />
                        <span>Voice Explain</span>
                      </button>

                      {onSendToChat && (
                        <button
                          onClick={() =>
                            onSendToChat(
                              `Critical telemetry threshold breach detected at ${log.timestamp}:
Metric: ${log.metricName} = ${log.measuredValue}
Limit: ${log.thresholdLimit}
Severity: ${log.severity}
Observation: ${log.aiRationale}

As the NULLG aerospace combustion engineer, perform a deep-dive diagnostic of this anomaly, calculate radiative quenching risk, and advise immediate ECLSS hazard mitigation actions.`,
                              log
                            )
                          }
                          className="px-2 py-1 rounded bg-cyan-950 hover:bg-cyan-900 text-[10px] text-cyan-200 border border-cyan-700 flex items-center gap-1 transition font-semibold"
                          title="Forward this threshold event to Gemini AI Engine"
                        >
                          <Send className="w-3 h-3" />
                          <span>Chat Deep Dive</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}

              {thresholdLogs.length === 0 && (
                <div className="text-center py-8 text-xs text-slate-500 space-y-2">
                  <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto opacity-70" />
                  <p>All telemetry streams within quiescent flight limits.</p>
                  <p className="text-[10px] text-slate-600">
                    Monitoring for Gr &gt; 0.050 and O₂ ≤ 13.0%...
                  </p>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* TAB 2: NASA PHOTOS & SCIENTIFIC IMAGERY GALLERY */}
      {activeTab === 'photos' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-cyan-400" />
                <span>NASA Microgravity Flight Campaign Imagery & Hardware Archive</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Authentic photographic records from the NASA Combustion Integrated Rack (CIR), SoFIE, Saffire, and FLEX campaigns.
              </p>
            </div>
            <span className="text-xs bg-slate-900 border border-slate-700 px-3 py-1 rounded text-cyan-300">
              NASA Glenn Research Center Records
            </span>
          </div>

          {/* Photo Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {nasaPhotos.map((photo) => (
              <div
                key={photo.id}
                className="bg-slate-950 border border-slate-800 hover:border-cyan-700/80 rounded-xl overflow-hidden shadow-xl transition group flex flex-col justify-between"
              >
                <div>
                  {/* Photo Display / High-Fidelity Scientific Vector Simulation Visualizer */}
                  <div className="relative h-48 bg-slate-900 overflow-hidden border-b border-slate-800 flex items-center justify-center">
                    {photo.fallbackSvgType === 'flame' && (
                      <div className="w-full h-full flex items-center justify-around bg-gradient-to-b from-slate-950 to-slate-900 p-4">
                        {/* 1g side */}
                        <div className="flex flex-col items-center">
                          <div className="relative w-16 h-28 flex items-center justify-center">
                            <div className="absolute bottom-2 w-5 h-8 bg-slate-700 rounded-sm" />
                            {/* Teardrop flame */}
                            <div className="w-12 h-20 bg-gradient-to-t from-blue-500 via-orange-500 to-yellow-300 rounded-[50%_50%_35%_35%/70%_70%_30%_30%] shadow-[0_0_20px_rgba(251,191,36,0.6)] animate-pulse" />
                          </div>
                          <span className="text-[10px] text-amber-400 font-bold mt-1">1.00g (Earth)</span>
                          <span className="text-[9px] text-slate-500">Buoyant Teardrop</span>
                        </div>

                        <div className="h-28 w-px bg-slate-800" />

                        {/* 0g side */}
                        <div className="flex flex-col items-center">
                          <div className="relative w-20 h-28 flex items-center justify-center">
                            {/* Concentric outer diffusion blanket */}
                            <div className="absolute w-20 h-20 rounded-full border border-dashed border-cyan-800/60 animate-spin" style={{ animationDuration: '30s' }} />
                            {/* Blue spherical flame */}
                            <div className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-500 opacity-90 shadow-[0_0_25px_rgba(34,211,238,0.7)] flex items-center justify-center">
                              <div className="w-4 h-4 rounded-full bg-slate-700" />
                            </div>
                          </div>
                          <span className="text-[10px] text-cyan-400 font-bold mt-1">0.00g (Micro-G)</span>
                          <span className="text-[9px] text-slate-500">Isotropic Blue Sphere</span>
                        </div>
                      </div>
                    )}

                    {photo.fallbackSvgType === 'cir' && (
                      <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center p-4">
                        <div className="w-64 h-32 border-2 border-slate-700 rounded-lg bg-slate-900/90 relative p-3 flex flex-col justify-between shadow-inner">
                          <div className="flex justify-between items-center text-[10px] text-cyan-400 border-b border-slate-800 pb-1">
                            <span>ISS CIR // DESTINY LAB</span>
                            <span className="bg-cyan-950 px-1.5 py-0.5 rounded text-cyan-300">100-L CHAMBER</span>
                          </div>
                          <div className="flex items-center justify-center gap-4">
                            <div className="w-16 h-16 rounded-full border-2 border-cyan-500/60 flex items-center justify-center bg-black/60 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                              <div className="w-5 h-5 rounded-full bg-cyan-400 animate-ping opacity-75" />
                            </div>
                            <div className="text-[10px] text-slate-400 space-y-0.5">
                              <div>• Opposed-flow duct: 0.05 m/s</div>
                              <div>• Multi-spectral radiometers</div>
                              <div>• PMMA fuel insert ready</div>
                            </div>
                          </div>
                          <div className="text-[9px] text-slate-500 font-mono">SoFIE EXPEDITION TEST MATRIX</div>
                        </div>
                      </div>
                    )}

                    {photo.fallbackSvgType === 'saffire' && (
                      <div className="w-full h-full bg-slate-950 flex items-center justify-center p-4">
                        <div className="w-72 h-32 border border-slate-700 rounded bg-slate-900/80 p-2.5 flex flex-col justify-between">
                          <div className="flex justify-between items-center text-[10px] text-amber-400">
                            <span>CYGNUS SAFFIRE DUCT</span>
                            <span>34% O2 @ 8.2 psi</span>
                          </div>
                          <div className="flex items-center justify-between px-2">
                            <div className="w-4 h-14 bg-slate-700 rounded-sm" />
                            <div className="h-10 w-44 bg-gradient-to-r from-red-600 via-amber-500 to-transparent rounded opacity-80 flex items-center justify-center text-[10px] font-bold text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                              SIBAL FABRIC SPREAD
                            </div>
                            <div className="w-3 h-14 bg-slate-700 rounded-sm" />
                          </div>
                          <div className="flex justify-between text-[9px] text-slate-500">
                            <span>Flow: 0.15 m/s</span>
                            <span>Uncrewed Post-Departure</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {photo.fallbackSvgType === 'droplet' && (
                      <div className="w-full h-full bg-slate-950 flex items-center justify-center p-4">
                        <div className="relative w-28 h-28 flex items-center justify-center">
                          {/* Outer soot shell */}
                          <div className="absolute w-24 h-24 rounded-full border border-dashed border-slate-600" />
                          {/* Cool flame halo */}
                          <div className="absolute w-20 h-20 rounded-full bg-purple-600/20 shadow-[0_0_20px_rgba(168,85,247,0.4)]" />
                          {/* Inner liquid fuel droplet */}
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-300 to-blue-700 shadow-md" />
                          <div className="absolute text-[8px] text-cyan-300 font-mono bottom-1">d²-law K=0.65</div>
                        </div>
                      </div>
                    )}

                    {/* View Details Overlay Button */}
                    <button
                      onClick={() => setActivePhoto(photo)}
                      className="absolute top-2 right-2 p-1.5 rounded bg-black/70 hover:bg-cyan-600 text-white transition backdrop-blur-sm"
                      title="Inspect NASA Reference"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>

                    <span className="absolute bottom-2 left-2 text-[10px] bg-black/75 px-2 py-0.5 rounded font-mono text-cyan-300 border border-slate-800">
                      {photo.category}
                    </span>
                  </div>

                  {/* Caption & Metadata */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-cyan-400 font-bold">{photo.mission}</span>
                      <span className="text-[10px] text-slate-500">{photo.year}</span>
                    </div>
                    <h4 className="font-bold text-sm text-white group-hover:text-cyan-300 transition">
                      {photo.title}
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed">{photo.caption}</p>
                  </div>
                </div>

                <div className="p-4 pt-0">
                  <button
                    onClick={() => {
                      explainWithVoice(
                        `NASA Mission Archive Analysis for ${photo.title}, conducted by ${photo.mission}: ${photo.details}`
                      );
                    }}
                    className="w-full py-1.5 bg-slate-900 hover:bg-cyan-950 text-slate-300 hover:text-cyan-300 border border-slate-800 hover:border-cyan-700 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Explain Photograph with AI Voice</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: AI AUDIO FLIGHT BRIEFING & LIVE TRANSCRIPT */}
      {activeTab === 'voice' && (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-cyan-400" />
                <span>Gemini 3.8 Flash Lite TTS // Aerospace Flight Controller Voice Engine</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time vocalization of microgravity transport phenomena, flame extinction limits, and mission telemetry.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => (isSpeaking ? stopVoice() : explainWithVoice())}
                disabled={isGeneratingVoice}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-cyan-950/40"
              >
                {isGeneratingVoice ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isSpeaking ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                <span>{isGeneratingVoice ? 'Synthesizing Audio...' : isSpeaking ? 'Halt Audio' : 'Play Briefing'}</span>
              </button>
            </div>
          </div>

          {/* Transcript Display Box */}
          <div className="space-y-2">
            <span className="text-xs text-slate-400 font-semibold block">Active Audio Transcript:</span>
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl text-slate-200 text-xs leading-relaxed font-mono whitespace-pre-wrap">
              {audioTranscript}
            </div>
          </div>

          {/* Preset Voice Briefing Prompts */}
          <div className="space-y-2">
            <span className="text-xs text-slate-400 font-semibold block">Quick Aerospace Voice Explanations:</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <button
                onClick={() =>
                  explainWithVoice(
                    'In zero gravity, hot air does not rise because there is no up or down. Without rising air to form a teardrop, fire forms a calm, glowing blue sphere. Fresh oxygen slowly creeps in evenly from all sides, and the fire burns much cooler than on Earth.'
                  )
                }
                className="text-left p-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-700/60 text-slate-300 hover:text-cyan-300 transition"
              >
                <div className="font-bold text-white text-[11px] mb-1">
                  1. Why are Space Flames Round and Blue?
                </div>
                <div className="text-[10px] text-slate-400">
                  Explains why fire forms a sphere without flickers when hot air doesn't rise.
                </div>
              </button>

              <button
                onClick={() =>
                  explainWithVoice(
                    'In space, liquids float as round balls instead of puddling downward on the floor. Liquid fuels cling to walls and wires, which can cause dangerous fires if they reach electrical switches.'
                  )
                }
                className="text-left p-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-700/60 text-slate-300 hover:text-cyan-300 transition"
              >
                <div className="font-bold text-white text-[11px] mb-1">
                  2. How Floating Liquids Behave in Zero Gravity
                </div>
                <div className="text-[10px] text-slate-400">
                  Explains why liquid fuel crawls along walls and floats into wires.
                </div>
              </button>

              <button
                onClick={() =>
                  explainWithVoice(
                    'NASA space fire tests showed that spacecraft cabins with higher oxygen levels make fabrics catch fire and spread much faster, even when ventilation fans are blowing very gently.'
                  )
                }
                className="text-left p-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-700/60 text-slate-300 hover:text-cyan-300 transition"
              >
                <div className="font-bold text-white text-[11px] mb-1">
                  3. Spacecraft Fire Hazards in High-Oxygen Cabins
                </div>
                <div className="text-[10px] text-slate-400">
                  Explains how extra oxygen in space capsules makes materials burn rapidly.
                </div>
              </button>

              <button
                onClick={() =>
                  explainWithVoice(
                    'NASA experiments discovered that when a space flame appears to go out, it can sometimes keep burning as an invisible cool flame that human eyes cannot see, at about four hundred degrees Celsius.'
                  )
                }
                className="text-left p-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-700/60 text-slate-300 hover:text-cyan-300 transition"
              >
                <div className="font-bold text-white text-[11px] mb-1">
                  4. The Ghost "Cool Flame" That Keeps Burning Invisibly
                </div>
                <div className="text-[10px] text-slate-400">
                  Explains low-temperature burning that continues even after the visible flame vanishes.
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Photographic Inspection */}
      {activePhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-cyan-800/80 rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative font-mono">
            <button
              onClick={() => setActivePhoto(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded bg-slate-900 border border-slate-700"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs bg-cyan-950 text-cyan-300 border border-cyan-700 px-2 py-0.5 rounded">
                NASA ARCHIVE RECORD
              </span>
              <span className="text-xs text-slate-400">{activePhoto.year}</span>
            </div>

            <h3 className="text-lg font-bold text-white">{activePhoto.title}</h3>
            <div className="text-xs text-cyan-400 font-semibold">{activePhoto.mission}</div>

            <p className="text-xs text-slate-300 leading-relaxed">{activePhoto.caption}</p>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg space-y-2 text-xs">
              <span className="font-bold text-slate-200 block">Aerospace Engineering Analysis:</span>
              <p className="text-slate-400 leading-relaxed">{activePhoto.details}</p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  explainWithVoice(activePhoto.details);
                  setActivePhoto(null);
                }}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded text-xs font-semibold flex items-center gap-2"
              >
                <Volume2 className="w-4 h-4" />
                <span>Narrate with AI Voice</span>
              </button>
              <button
                onClick={() => setActivePhoto(null)}
                className="px-4 py-2 bg-slate-900 border border-slate-700 text-slate-300 hover:text-white rounded text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
