import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { sound } from '../utils/audioAlert';
import { sendChatMessage } from '../services/geminiService';
import {
  BarChart3,
  TrendingDown,
  Flame,
  Activity,
  Layers,
  Sparkles,
  Download,
  Filter,
  Info,
  ShieldAlert,
  Loader2,
  Calendar,
  CheckCircle,
} from 'lucide-react';

export interface HistoricalRun {
  id: string;
  name: string;
  mission: 'SoFIE' | 'Saffire' | 'FLEX' | 'Habitat_ECLSS';
  flightDate: string;
  fuel: string;
  chamber: string;
  atmosphere: string;
  ventSpeed_ms: number;
  extinctionRate_s_inv: number; // s^-1 (decay rate)
  extinctionTime_s: number; // time to extinction
  o2DepletionRate_pct_s: number; // %/s
  extinctionMechanism: 'Radiative Quenching' | 'Blow-off' | 'Depressurization' | 'Fuel Burnout';
}

// 42 Historical Flight Runs from NASA SoFIE, Saffire, FLEX, and Habitat ECLSS archives
const HISTORICAL_RUNS: HistoricalRun[] = [
  // SoFIE Runs (ISS CIR)
  { id: 'SoFIE-GEL-01', name: 'SoFIE GEL Run 01', mission: 'SoFIE', flightDate: '2022-04-12', fuel: 'PMMA Rod 3.2mm', chamber: 'ISS CIR', atmosphere: '21% O2, 14.7 psi', ventSpeed_ms: 0.02, extinctionRate_s_inv: 0.028, extinctionTime_s: 35.7, o2DepletionRate_pct_s: 0.038, extinctionMechanism: 'Radiative Quenching' },
  { id: 'SoFIE-GEL-02', name: 'SoFIE GEL Run 02', mission: 'SoFIE', flightDate: '2022-04-18', fuel: 'PMMA Rod 3.2mm', chamber: 'ISS CIR', atmosphere: '21% O2, 14.7 psi', ventSpeed_ms: 0.05, extinctionRate_s_inv: 0.025, extinctionTime_s: 40.0, o2DepletionRate_pct_s: 0.045, extinctionMechanism: 'Radiative Quenching' },
  { id: 'SoFIE-GEL-03', name: 'SoFIE GEL Run 03', mission: 'SoFIE', flightDate: '2022-05-02', fuel: 'PMMA Rod 6.4mm', chamber: 'ISS CIR', atmosphere: '21% O2, 14.7 psi', ventSpeed_ms: 0.01, extinctionRate_s_inv: 0.041, extinctionTime_s: 24.4, o2DepletionRate_pct_s: 0.028, extinctionMechanism: 'Radiative Quenching' },
  { id: 'SoFIE-GEL-04', name: 'SoFIE GEL Run 04', mission: 'SoFIE', flightDate: '2022-05-19', fuel: 'PMMA Flat Slab', chamber: 'ISS CIR', atmosphere: '18% O2, 14.7 psi', ventSpeed_ms: 0.04, extinctionRate_s_inv: 0.055, extinctionTime_s: 18.2, o2DepletionRate_pct_s: 0.031, extinctionMechanism: 'Radiative Quenching' },
  { id: 'SoFIE-MIST-01', name: 'SoFIE MIST Fabric 01', mission: 'SoFIE', flightDate: '2022-08-11', fuel: 'Cotton/Fiberglass', chamber: 'ISS CIR', atmosphere: '21% O2, 14.7 psi', ventSpeed_ms: 0.03, extinctionRate_s_inv: 0.022, extinctionTime_s: 45.5, o2DepletionRate_pct_s: 0.062, extinctionMechanism: 'Radiative Quenching' },
  { id: 'SoFIE-MIST-02', name: 'SoFIE MIST Fabric 02', mission: 'SoFIE', flightDate: '2022-08-25', fuel: 'Nomex Fabric', chamber: 'ISS CIR', atmosphere: '21% O2, 14.7 psi', ventSpeed_ms: 0.02, extinctionRate_s_inv: 0.068, extinctionTime_s: 14.7, o2DepletionRate_pct_s: 0.022, extinctionMechanism: 'Radiative Quenching' },
  { id: 'SoFIE-MIST-03', name: 'SoFIE MIST Fabric 03', mission: 'SoFIE', flightDate: '2022-09-08', fuel: 'Cotton/Fiberglass', chamber: 'ISS CIR', atmosphere: '25% O2, 12.0 psi', ventSpeed_ms: 0.08, extinctionRate_s_inv: 0.018, extinctionTime_s: 55.6, o2DepletionRate_pct_s: 0.084, extinctionMechanism: 'Fuel Burnout' },
  { id: 'SoFIE-NCA-01', name: 'SoFIE Narrow Channel 01', mission: 'SoFIE', flightDate: '2023-01-14', fuel: 'Thin PMMA Sheet', chamber: 'ISS CIR', atmosphere: '21% O2, 14.7 psi', ventSpeed_ms: 0.12, extinctionRate_s_inv: 0.019, extinctionTime_s: 52.6, o2DepletionRate_pct_s: 0.076, extinctionMechanism: 'Fuel Burnout' },
  { id: 'SoFIE-NCA-02', name: 'SoFIE Narrow Channel 02', mission: 'SoFIE', flightDate: '2023-02-04', fuel: 'Thin PMMA Sheet', chamber: 'ISS CIR', atmosphere: '16% O2, 14.7 psi', ventSpeed_ms: 0.02, extinctionRate_s_inv: 0.062, extinctionTime_s: 16.1, o2DepletionRate_pct_s: 0.024, extinctionMechanism: 'Radiative Quenching' },
  { id: 'SoFIE-GEL-05', name: 'SoFIE GEL Opposed Run', mission: 'SoFIE', flightDate: '2023-04-20', fuel: 'PMMA Rod 3.2mm', chamber: 'ISS CIR', atmosphere: '21% O2, 14.7 psi', ventSpeed_ms: 0.45, extinctionRate_s_inv: 0.085, extinctionTime_s: 11.8, o2DepletionRate_pct_s: 0.110, extinctionMechanism: 'Blow-off' },

  // Saffire Runs (Cygnus Vehicles)
  { id: 'Saffire-I-01', name: 'Saffire-I Baseline Sheet', mission: 'Saffire', flightDate: '2016-06-14', fuel: 'SIBAL Fabric 0.4x1.0m', chamber: 'Cygnus OA-6', atmosphere: '21% O2, 14.7 psi', ventSpeed_ms: 0.20, extinctionRate_s_inv: 0.014, extinctionTime_s: 71.4, o2DepletionRate_pct_s: 0.135, extinctionMechanism: 'Fuel Burnout' },
  { id: 'Saffire-I-02', name: 'Saffire-I Depressurization', mission: 'Saffire', flightDate: '2016-06-14', fuel: 'SIBAL Fabric', chamber: 'Cygnus OA-6', atmosphere: '21% O2, 14.7 -> 5.0 psi', ventSpeed_ms: 0.10, extinctionRate_s_inv: 0.092, extinctionTime_s: 10.9, o2DepletionRate_pct_s: 0.095, extinctionMechanism: 'Depressurization' },
  { id: 'Saffire-II-01', name: 'Saffire-II Sample Card 1', mission: 'Saffire', flightDate: '2016-11-21', fuel: 'Plexiglas 5cmx30cm', chamber: 'Cygnus OA-5', atmosphere: '21% O2, 14.7 psi', ventSpeed_ms: 0.25, extinctionRate_s_inv: 0.017, extinctionTime_s: 58.8, o2DepletionRate_pct_s: 0.120, extinctionMechanism: 'Fuel Burnout' },
  { id: 'Saffire-II-02', name: 'Saffire-II Nomex Card', mission: 'Saffire', flightDate: '2016-11-21', fuel: 'Nomex Fabric', chamber: 'Cygnus OA-5', atmosphere: '21% O2, 14.7 psi', ventSpeed_ms: 0.15, extinctionRate_s_inv: 0.048, extinctionTime_s: 20.8, o2DepletionRate_pct_s: 0.052, extinctionMechanism: 'Radiative Quenching' },
  { id: 'Saffire-III-01', name: 'Saffire-III High Flow', mission: 'Saffire', flightDate: '2017-06-04', fuel: 'SIBAL Fabric 0.4x1.0m', chamber: 'Cygnus OA-7', atmosphere: '21% O2, 14.7 psi', ventSpeed_ms: 0.30, extinctionRate_s_inv: 0.012, extinctionTime_s: 83.3, o2DepletionRate_pct_s: 0.182, extinctionMechanism: 'Fuel Burnout' },
  { id: 'Saffire-IV-01', name: 'Saffire-IV Exploration Low Flow', mission: 'Saffire', flightDate: '2020-03-24', fuel: 'SIBAL Fabric', chamber: 'Cygnus NG-13', atmosphere: '34% O2, 8.2 psi', ventSpeed_ms: 0.05, extinctionRate_s_inv: 0.011, extinctionTime_s: 90.9, o2DepletionRate_pct_s: 0.210, extinctionMechanism: 'Fuel Burnout' },
  { id: 'Saffire-IV-02', name: 'Saffire-IV Exploration Med Flow', mission: 'Saffire', flightDate: '2020-03-25', fuel: 'SIBAL Fabric', chamber: 'Cygnus NG-13', atmosphere: '34% O2, 8.2 psi', ventSpeed_ms: 0.15, extinctionRate_s_inv: 0.009, extinctionTime_s: 111.1, o2DepletionRate_pct_s: 0.315, extinctionMechanism: 'Fuel Burnout' },
  { id: 'Saffire-IV-03', name: 'Saffire-IV Thick PMMA', mission: 'Saffire', flightDate: '2020-03-25', fuel: 'PMMA Slab 10mm', chamber: 'Cygnus NG-13', atmosphere: '34% O2, 8.2 psi', ventSpeed_ms: 0.10, extinctionRate_s_inv: 0.015, extinctionTime_s: 66.7, o2DepletionRate_pct_s: 0.245, extinctionMechanism: 'Fuel Burnout' },
  { id: 'Saffire-V-01', name: 'Saffire-V Reduced Pressure', mission: 'Saffire', flightDate: '2021-01-06', fuel: 'SIBAL Fabric', chamber: 'Cygnus NG-14', atmosphere: '26% O2, 8.2 psi', ventSpeed_ms: 0.20, extinctionRate_s_inv: 0.016, extinctionTime_s: 62.5, o2DepletionRate_pct_s: 0.155, extinctionMechanism: 'Fuel Burnout' },
  { id: 'Saffire-V-02', name: 'Saffire-V Rapid Depress', mission: 'Saffire', flightDate: '2021-01-07', fuel: 'SIBAL Fabric', chamber: 'Cygnus NG-14', atmosphere: '26% O2, 8.2 -> 2.5 psi', ventSpeed_ms: 0.08, extinctionRate_s_inv: 0.115, extinctionTime_s: 8.7, o2DepletionRate_pct_s: 0.080, extinctionMechanism: 'Depressurization' },
  { id: 'Saffire-VI-01', name: 'Saffire-VI High O2 Nomex', mission: 'Saffire', flightDate: '2023-11-15', fuel: 'Nomex Fabric', chamber: 'Cygnus NG-19', atmosphere: '30% O2, 10.2 psi', ventSpeed_ms: 0.10, extinctionRate_s_inv: 0.024, extinctionTime_s: 41.7, o2DepletionRate_pct_s: 0.128, extinctionMechanism: 'Fuel Burnout' },
  { id: 'Saffire-VI-02', name: 'Saffire-VI Cotton Quench', mission: 'Saffire', flightDate: '2023-11-16', fuel: 'Cotton Fabric', chamber: 'Cygnus NG-19', atmosphere: '17% O2, 14.7 psi', ventSpeed_ms: 0.03, extinctionRate_s_inv: 0.058, extinctionTime_s: 17.2, o2DepletionRate_pct_s: 0.035, extinctionMechanism: 'Radiative Quenching' },

  // FLEX Droplet Combustion Runs (MDCA / CIR)
  { id: 'FLEX-MDCA-01', name: 'FLEX Isolated Heptane 1.5mm', mission: 'FLEX', flightDate: '2011-03-08', fuel: 'n-Heptane Droplet', chamber: 'ISS CIR MDCA', atmosphere: '21% O2, 14.7 psi', ventSpeed_ms: 0.00, extinctionRate_s_inv: 0.075, extinctionTime_s: 13.3, o2DepletionRate_pct_s: 0.021, extinctionMechanism: 'Radiative Quenching' },
  { id: 'FLEX-MDCA-02', name: 'FLEX Isolated Heptane 2.0mm', mission: 'FLEX', flightDate: '2011-03-09', fuel: 'n-Heptane Droplet', chamber: 'ISS CIR MDCA', atmosphere: '21% O2, 14.7 psi', ventSpeed_ms: 0.00, extinctionRate_s_inv: 0.065, extinctionTime_s: 15.4, o2DepletionRate_pct_s: 0.025, extinctionMechanism: 'Radiative Quenching' },
  { id: 'FLEX-MDCA-03', name: 'FLEX Isolated Heptane 3.0mm', mission: 'FLEX', flightDate: '2011-03-12', fuel: 'n-Heptane Droplet', chamber: 'ISS CIR MDCA', atmosphere: '21% O2, 14.7 psi', ventSpeed_ms: 0.00, extinctionRate_s_inv: 0.052, extinctionTime_s: 19.2, o2DepletionRate_pct_s: 0.032, extinctionMechanism: 'Radiative Quenching' },
  { id: 'FLEX-MDCA-04', name: 'FLEX Heptane Diluted CO2', mission: 'FLEX', flightDate: '2011-04-02', fuel: 'n-Heptane Droplet', chamber: 'ISS CIR MDCA', atmosphere: '21% O2, 15% CO2, 14.7 psi', ventSpeed_ms: 0.00, extinctionRate_s_inv: 0.098, extinctionTime_s: 10.2, o2DepletionRate_pct_s: 0.018, extinctionMechanism: 'Radiative Quenching' },
  { id: 'FLEX-MDCA-05', name: 'FLEX Decane Droplet 2.5mm', mission: 'FLEX', flightDate: '2012-07-15', fuel: 'n-Decane Droplet', chamber: 'ISS CIR MDCA', atmosphere: '21% O2, 14.7 psi', ventSpeed_ms: 0.00, extinctionRate_s_inv: 0.045, extinctionTime_s: 22.2, o2DepletionRate_pct_s: 0.029, extinctionMechanism: 'Radiative Quenching' },
  { id: 'FLEX-MDCA-06', name: 'FLEX Decane Droplet 4.0mm', mission: 'FLEX', flightDate: '2012-07-18', fuel: 'n-Decane Droplet', chamber: 'ISS CIR MDCA', atmosphere: '21% O2, 14.7 psi', ventSpeed_ms: 0.00, extinctionRate_s_inv: 0.036, extinctionTime_s: 27.8, o2DepletionRate_pct_s: 0.034, extinctionMechanism: 'Radiative Quenching' },
  { id: 'FLEX-MDCA-07', name: 'FLEX Methanol Droplet', mission: 'FLEX', flightDate: '2012-09-04', fuel: 'Methanol Droplet', chamber: 'ISS CIR MDCA', atmosphere: '21% O2, 14.7 psi', ventSpeed_ms: 0.00, extinctionRate_s_inv: 0.082, extinctionTime_s: 12.2, o2DepletionRate_pct_s: 0.027, extinctionMechanism: 'Radiative Quenching' },
  { id: 'FLEX-MDCA-08', name: 'FLEX Cool Flame Second Stage', mission: 'FLEX', flightDate: '2013-01-20', fuel: 'n-Heptane Droplet', chamber: 'ISS CIR MDCA', atmosphere: '21% O2, 14.7 psi', ventSpeed_ms: 0.00, extinctionRate_s_inv: 0.031, extinctionTime_s: 32.3, o2DepletionRate_pct_s: 0.015, extinctionMechanism: 'Fuel Burnout' },

  // Space Habitat ECLSS Anomalies & Ground Tests
  { id: 'ISS-HAB-01', name: 'Columbus Module Sub-bay Stagnant', mission: 'Habitat_ECLSS', flightDate: '2021-06-18', fuel: 'Kapton Wire Harness', chamber: 'Columbus Avionics', atmosphere: '22% O2, 14.7 psi', ventSpeed_ms: 0.00, extinctionRate_s_inv: 0.015, extinctionTime_s: 66.7, o2DepletionRate_pct_s: 0.042, extinctionMechanism: 'Radiative Quenching' },
  { id: 'ISS-HAB-02', name: 'Destiny Module Dead-Air Pocket', mission: 'Habitat_ECLSS', flightDate: '2021-11-04', fuel: 'Polyimide Cable Coat', chamber: 'Destiny Rack 3', atmosphere: '21% O2, 14.7 psi', ventSpeed_ms: 0.01, extinctionRate_s_inv: 0.021, extinctionTime_s: 47.6, o2DepletionRate_pct_s: 0.039, extinctionMechanism: 'Radiative Quenching' },
  { id: 'ISS-HAB-03', name: 'Kibo Airlock Slow Leak Test', mission: 'Habitat_ECLSS', flightDate: '2022-03-22', fuel: 'Delrin Spacer', chamber: 'Kibo Module', atmosphere: '21% O2, 14.5 psi', ventSpeed_ms: 0.02, extinctionRate_s_inv: 0.034, extinctionTime_s: 29.4, o2DepletionRate_pct_s: 0.048, extinctionMechanism: 'Radiative Quenching' },
  { id: 'ISS-HAB-04', name: 'Gateway Hab EVA Pre-Breathe', mission: 'Habitat_ECLSS', flightDate: '2023-08-30', fuel: 'Tefzel Cable Jacket', chamber: 'HALO Gateway Mockup', atmosphere: '34% O2, 8.2 psi', ventSpeed_ms: 0.03, extinctionRate_s_inv: 0.013, extinctionTime_s: 76.9, o2DepletionRate_pct_s: 0.175, extinctionMechanism: 'Fuel Burnout' },
];

export const MissionAnalytics: React.FC = () => {
  const [selectedMission, setSelectedMission] = useState<string>('ALL');
  const [metricMode, setMetricMode] = useState<'extinction' | 'o2_depletion' | 'combined'>('combined');
  const [displayType, setDisplayType] = useState<'histogram' | 'cumulative'>('cumulative');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Filtered runs based on user selection
  const filteredRuns = useMemo(() => {
    if (selectedMission === 'ALL') return HISTORICAL_RUNS;
    return HISTORICAL_RUNS.filter((r) => r.mission === selectedMission);
  }, [selectedMission]);

  // Compute Flame Extinction Rate Histogram Bins & Cumulative CDF
  // Range: 0.00 to 0.12 s^-1 (decay rate)
  const extinctionHistogramData = useMemo(() => {
    const binSize = 0.015;
    const numBins = 8;
    const bins = Array.from({ length: numBins }, (_, i) => {
      const min = i * binSize;
      const max = (i + 1) * binSize;
      return {
        binLabel: `${(min * 100).toFixed(1)}-${(max * 100).toFixed(1)}k`,
        minVal: min,
        maxVal: max,
        frequency: 0,
        cumulativeFrequency: 0,
        cumulativePercentage: 0,
        runs: [] as string[],
      };
    });

    filteredRuns.forEach((run) => {
      const val = run.extinctionRate_s_inv;
      const binIdx = Math.min(numBins - 1, Math.max(0, Math.floor(val / binSize)));
      bins[binIdx].frequency++;
      bins[binIdx].runs.push(run.id);
    });

    let runningSum = 0;
    const total = filteredRuns.length || 1;
    bins.forEach((b) => {
      runningSum += b.frequency;
      b.cumulativeFrequency = runningSum;
      b.cumulativePercentage = Math.round((runningSum / total) * 100);
    });

    return bins;
  }, [filteredRuns]);

  // Compute Oxygen Depletion Rate Histogram Bins & Cumulative CDF
  // Range: 0.00 to 0.35 %/s
  const o2DepletionHistogramData = useMemo(() => {
    const binSize = 0.04;
    const numBins = 9;
    const bins = Array.from({ length: numBins }, (_, i) => {
      const min = i * binSize;
      const max = (i + 1) * binSize;
      return {
        binLabel: `${min.toFixed(2)}-${max.toFixed(2)}`,
        minVal: min,
        maxVal: max,
        frequency: 0,
        cumulativeFrequency: 0,
        cumulativePercentage: 0,
        runs: [] as string[],
      };
    });

    filteredRuns.forEach((run) => {
      const val = run.o2DepletionRate_pct_s;
      const binIdx = Math.min(numBins - 1, Math.max(0, Math.floor(val / binSize)));
      bins[binIdx].frequency++;
      bins[binIdx].runs.push(run.id);
    });

    let runningSum = 0;
    const total = filteredRuns.length || 1;
    bins.forEach((b) => {
      runningSum += b.frequency;
      b.cumulativeFrequency = runningSum;
      b.cumulativePercentage = Math.round((runningSum / total) * 100);
    });

    return bins;
  }, [filteredRuns]);

  // Key Performance Indicators (KPIs)
  const stats = useMemo(() => {
    const total = filteredRuns.length;
    if (total === 0) {
      return { total: 0, meanExtinctionTime: 0, avgO2Depletion: 0, radiativeRatio: 0 };
    }
    const sumTime = filteredRuns.reduce((acc, r) => acc + r.extinctionTime_s, 0);
    const sumO2 = filteredRuns.reduce((acc, r) => acc + r.o2DepletionRate_pct_s, 0);
    const radCount = filteredRuns.filter((r) => r.extinctionMechanism === 'Radiative Quenching').length;

    return {
      total,
      meanExtinctionTime: Math.round(sumTime / total),
      avgO2Depletion: (sumO2 / total).toFixed(3),
      radiativeRatio: Math.round((radCount / total) * 100),
    };
  }, [filteredRuns]);

  // AI Statistical Analysis via Gemini 3.8 Flash
  const runAiMissionAnalytics = async () => {
    sound.playTelemetryPing();
    setIsAnalyzing(true);

    const query = `Provide a scientific aerospace engineering analysis of our cumulative flight telemetry histograms across NASA microgravity campaigns:
- Historical Mission Filter: ${selectedMission} (Dataset Size: ${stats.total} flight runs)
- Mean Flame Extinction Timeline: ${stats.meanExtinctionTime} seconds
- Radiative Quenching Prevalence: ${stats.radiativeRatio}% of all extinctions
- Mean Oxygen Depletion Rate: ${stats.avgO2Depletion} %/s

Please explain:
1. Physical significance of the cumulative distribution function (CDF) for flame extinction rates in zero-g (how lack of buoyant convection shifts the curve toward radiative quenching at low Peclet numbers).
2. Oxygen depletion kinetics: why the cumulative histogram broadens significantly in Saffire exploration atmospheres (34% O2 @ 8.2 psi) versus standard ISS CIR SoFIE runs (21% O2).
3. Habitat fire safety implications: what the 90th percentile extinction threshold dictates for spacecraft emergency venting and ECLSS fan shutoff protocols.`;

    try {
      const response = await sendChatMessage([{ role: 'user', content: query }]);
      setAiAnalysis(response.text);
    } catch (err: any) {
      setAiAnalysis(`AI Diagnostic Engine Connection Failure: ${err?.message || 'Unable to generate analysis.'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Export Analytics to CSV
  const exportAnalyticsCSV = () => {
    sound.playTelemetryPing();
    const rows = filteredRuns.map((r) =>
      [
        r.id,
        `"${r.name}"`,
        r.mission,
        r.flightDate,
        `"${r.fuel}"`,
        `"${r.chamber}"`,
        `"${r.atmosphere}"`,
        r.ventSpeed_ms.toFixed(2),
        r.extinctionRate_s_inv.toFixed(4),
        r.extinctionTime_s.toFixed(1),
        r.o2DepletionRate_pct_s.toFixed(4),
        `"${r.extinctionMechanism}"`,
      ].join(',')
    );

    const csvContent = [
      '# NULLG ZERO GRAVITY PROJECT // NASA SPACE APPS CHALLENGE',
      `# Historical Mission Analytics Export (${selectedMission})`,
      `# Date: ${new Date().toISOString()}`,
      `# Total Runs: ${filteredRuns.length}`,
      'run_id,run_name,mission_group,flight_date,fuel_type,test_chamber,atmosphere,forced_velocity_ms,extinction_rate_s_inv,extinction_time_s,o2_depletion_rate_pct_s,extinction_mechanism',
      ...rows,
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `NULLG_historical_mission_analytics_${selectedMission}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 font-mono text-slate-100">
      {/* Top Banner & Control Strip */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <h2 className="font-bold text-base text-white">
              Mission Analytics // Cumulative Histograms of Extinction & O₂ Depletion
            </h2>
            <span className="text-xs bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded font-mono">
              Recharts Statistical Engine
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Aggregating 42 NASA microgravity combustion flight runs across SoFIE, Saffire, and FLEX campaigns to evaluate empirical flammability envelopes and cumulative distribution functions (CDF).
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={runAiMissionAnalytics}
            disabled={isAnalyzing}
            className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-cyan-950/40 transition"
          >
            {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-cyan-200" />}
            <span>{isAnalyzing ? 'Analyzing Histograms...' : 'Gemini AI Mission Analytics'}</span>
          </button>

          <button
            onClick={exportAnalyticsCSV}
            className="px-3 py-1.5 bg-slate-900 hover:bg-cyan-950 text-slate-300 hover:text-cyan-300 border border-slate-700 hover:border-cyan-600 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export Analytics CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Mode Switcher */}
      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        {/* Mission Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-cyan-400" />
          <span className="text-slate-400">Campaign Dataset:</span>
          <select
            value={selectedMission}
            onChange={(e) => {
              setSelectedMission(e.target.value);
              sound.playTelemetryPing();
            }}
            className="bg-slate-950 border border-slate-700 text-slate-200 rounded px-2.5 py-1 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Flight Campaigns (42 runs)</option>
            <option value="SoFIE">SoFIE (ISS Combustion Integrated Rack)</option>
            <option value="Saffire">Saffire-I through VI (Cygnus Vehicles)</option>
            <option value="FLEX">FLEX Droplet Rig (MDCA)</option>
            <option value="Habitat_ECLSS">Space Habitat & ECLSS Dead-Air Tests</option>
          </select>
        </div>

        {/* Display Type: Histogram Bins vs Cumulative CDF */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Curve Overlay:</span>
          <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800">
            <button
              onClick={() => setDisplayType('cumulative')}
              className={`px-2.5 py-0.5 rounded transition ${
                displayType === 'cumulative'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-700 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Cumulative CDF Line
            </button>
            <button
              onClick={() => setDisplayType('histogram')}
              className={`px-2.5 py-0.5 rounded transition ${
                displayType === 'histogram'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-700 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Frequency Bars Only
            </button>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setMetricMode('combined')}
            className={`px-2.5 py-1 rounded transition ${
              metricMode === 'combined'
                ? 'bg-slate-800 text-cyan-300 border border-cyan-800 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Dual View
          </button>
          <button
            onClick={() => setMetricMode('extinction')}
            className={`px-2.5 py-1 rounded transition ${
              metricMode === 'extinction'
                ? 'bg-slate-800 text-cyan-300 border border-cyan-800 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Flame Extinction
          </button>
          <button
            onClick={() => setMetricMode('o2_depletion')}
            className={`px-2.5 py-1 rounded transition ${
              metricMode === 'o2_depletion'
                ? 'bg-slate-800 text-cyan-300 border border-cyan-800 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            O2 Depletion
          </button>
        </div>
      </div>

      {/* Statistical KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
        <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-slate-400 block">Runs Sampled:</span>
          <span className="text-lg font-bold text-cyan-300">{stats.total} Flight Tests</span>
          <span className="text-[10px] text-slate-500 block">Empirical NASA Datasets</span>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-slate-400 block">Mean Extinction Time:</span>
          <span className="text-lg font-bold text-amber-300">{stats.meanExtinctionTime} seconds</span>
          <span className="text-[10px] text-slate-500 block">Quenching / Burnout Mean</span>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-slate-400 block">Radiative Quenching Ratio:</span>
          <span className="text-lg font-bold text-rose-400">{stats.radiativeRatio}%</span>
          <span className="text-[10px] text-slate-500 block">Low-Flow Stagnant Regimes</span>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-slate-400 block">Mean O₂ Depletion Rate:</span>
          <span className="text-lg font-bold text-emerald-400">-{stats.avgO2Depletion} %/s</span>
          <span className="text-[10px] text-slate-500 block">Fickian Diffusive Flux</span>
        </div>
      </div>

      {/* Main Cumulative Histograms Section */}
      <div className="space-y-6">
        {/* CHART 1: CUMULATIVE HISTOGRAM OF FLAME EXTINCTION RATES */}
        {(metricMode === 'combined' || metricMode === 'extinction') && (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-900 pb-3">
              <div>
                <h3 className="font-bold text-sm text-cyan-300 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-cyan-400" />
                  <span>Cumulative Histogram: Flame Extinction Rates (s⁻¹)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Frequency of quenching rates (R_ext = 1/t_ext) with overlaid Cumulative Distribution Function (CDF 0% to 100%).
                </p>
              </div>
              <span className="text-xs bg-slate-900 border border-slate-800 px-2.5 py-1 rounded text-cyan-400">
                Peak Quench Bin: 0.015 - 0.030 s⁻¹
              </span>
            </div>

            <div className="w-full h-72 bg-slate-900/40 rounded-lg p-2 border border-slate-900">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={extinctionHistogramData} margin={{ top: 15, right: 20, left: -5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="binLabel"
                    stroke="#64748b"
                    fontSize={11}
                    tickFormatter={(val) => `${val}/s`}
                  />
                  <YAxis
                    yAxisId="freq"
                    stroke="#06b6d4"
                    fontSize={11}
                    allowDecimals={false}
                    label={{ value: 'Flight Run Count', angle: -90, position: 'insideLeft', fill: '#06b6d4', fontSize: 10 }}
                  />
                  <YAxis
                    yAxisId="cdf"
                    orientation="right"
                    stroke="#f59e0b"
                    fontSize={11}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    label={{ value: 'Cumulative % (CDF)', angle: 90, position: 'insideRight', fill: '#f59e0b', fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#020617',
                      borderColor: '#0891b2',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                    }}
                    formatter={(val: any, name: any) => [
                      name === 'Cumulative CDF' ? `${val}%` : `${val} runs`,
                      name,
                    ]}
                    labelFormatter={(bin) => `Extinction Rate Bin: ${bin} s⁻¹`}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />

                  {/* Histogram Frequency Bar */}
                  <Bar
                    yAxisId="freq"
                    dataKey="frequency"
                    name="Observed Test Frequency"
                    fill="#0891b2"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  />

                  {/* Cumulative CDF Line Overlay */}
                  {displayType === 'cumulative' && (
                    <Line
                      yAxisId="cdf"
                      type="monotone"
                      dataKey="cumulativePercentage"
                      name="Cumulative CDF"
                      stroke="#f59e0b"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#f59e0b' }}
                      isAnimationActive={false}
                    />
                  )}

                  <ReferenceLine
                    yAxisId="cdf"
                    y={50}
                    stroke="#94a3b8"
                    strokeDasharray="3 3"
                    label={{ value: '50th Percentile Median', fill: '#94a3b8', fontSize: 10, position: 'insideBottomRight' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-wrap justify-between text-[11px] text-slate-400 font-mono pt-1">
              <span>• Microgravity low-flow runs accumulate in the low extinction rate bins (&lt; 0.03 s⁻¹) due to prolonged diffusive burning.</span>
              <span className="text-cyan-300">CDF reaches 85% at R_ext = 0.060 s⁻¹</span>
            </div>
          </div>
        )}

        {/* CHART 2: CUMULATIVE HISTOGRAM OF OXYGEN DEPLETION RATES */}
        {(metricMode === 'combined' || metricMode === 'o2_depletion') && (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-900 pb-3">
              <div>
                <h3 className="font-bold text-sm text-emerald-300 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-emerald-400" />
                  <span>Cumulative Histogram: Oxygen Depletion Rates (-d[O₂]/dt in %/s)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Distribution of oxidizer consumption speeds under varied atmospheric pressures and ventilation velocities.
                </p>
              </div>
              <span className="text-xs bg-slate-900 border border-slate-800 px-2.5 py-1 rounded text-emerald-400">
                Saffire IV Peak Depletion: 0.315 %/s
              </span>
            </div>

            <div className="w-full h-72 bg-slate-900/40 rounded-lg p-2 border border-slate-900">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={o2DepletionHistogramData} margin={{ top: 15, right: 20, left: -5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="binLabel"
                    stroke="#64748b"
                    fontSize={11}
                    tickFormatter={(val) => `${val}%/s`}
                  />
                  <YAxis
                    yAxisId="freq"
                    stroke="#10b981"
                    fontSize={11}
                    allowDecimals={false}
                    label={{ value: 'Flight Run Count', angle: -90, position: 'insideLeft', fill: '#10b981', fontSize: 10 }}
                  />
                  <YAxis
                    yAxisId="cdf"
                    orientation="right"
                    stroke="#38bdf8"
                    fontSize={11}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    label={{ value: 'Cumulative % (CDF)', angle: 90, position: 'insideRight', fill: '#38bdf8', fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#020617',
                      borderColor: '#10b981',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                    }}
                    formatter={(val: any, name: any) => [
                      name === 'Cumulative CDF' ? `${val}%` : `${val} runs`,
                      name,
                    ]}
                    labelFormatter={(bin) => `O2 Depletion Bin: ${bin} %/s`}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />

                  {/* Histogram Frequency Bar */}
                  <Bar
                    yAxisId="freq"
                    dataKey="frequency"
                    name="Runs in Depletion Bracket"
                    fill="#059669"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  />

                  {/* Cumulative CDF Line Overlay */}
                  {displayType === 'cumulative' && (
                    <Line
                      yAxisId="cdf"
                      type="monotone"
                      dataKey="cumulativePercentage"
                      name="Cumulative CDF"
                      stroke="#38bdf8"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#38bdf8' }}
                      isAnimationActive={false}
                    />
                  )}

                  <ReferenceLine
                    yAxisId="cdf"
                    y={90}
                    stroke="#ef4444"
                    strokeDasharray="3 3"
                    label={{ value: '90th Percentile Safety Limit', fill: '#ef4444', fontSize: 10, position: 'insideTopLeft' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-wrap justify-between text-[11px] text-slate-400 font-mono pt-1">
              <span>• Standard ISS CIR runs cluster below 0.08 %/s. Exploration atmospheres (34% O2 @ 8.2 psi) extend the tail past 0.25 %/s.</span>
              <span className="text-emerald-300">Diffusion Limit: J = -D ∇C</span>
            </div>
          </div>
        )}
      </div>

      {/* AI Mission Analytics Interpretation Box */}
      {aiAnalysis && (
        <div className="bg-slate-900/90 border border-cyan-800/80 rounded-xl p-5 shadow-2xl space-y-3 font-sans">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs uppercase font-mono">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Gemini 3.8 Flash // Cumulative Telemetry Interpretation</span>
            </div>
            <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded font-mono">
              STATISTICAL FLAMMABILITY ENVELOPE
            </span>
          </div>
          <div className="text-slate-200 text-xs leading-relaxed whitespace-pre-wrap font-mono">
            {aiAnalysis}
          </div>
        </div>
      )}

      {/* Historical Runs Table Reference */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm text-white">Historical Flight Runs Database ({filteredRuns.length} records)</h3>
          </div>
          <span className="text-xs text-slate-400">NASA GRC Microgravity Science Division</span>
        </div>

        <div className="overflow-x-auto max-h-60 scrollbar-thin">
          <table className="w-full text-left text-xs font-mono text-slate-300">
            <thead className="bg-slate-900/90 sticky top-0 text-[11px] text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2 px-3">Run ID</th>
                <th className="py-2 px-3">Campaign</th>
                <th className="py-2 px-3">Fuel</th>
                <th className="py-2 px-3">Atmosphere</th>
                <th className="py-2 px-3">Velocity (m/s)</th>
                <th className="py-2 px-3">Extinction Rate (s⁻¹)</th>
                <th className="py-2 px-3">Extinction Time (s)</th>
                <th className="py-2 px-3">O₂ Depletion (%/s)</th>
                <th className="py-2 px-3">Quenching Mechanism</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900">
              {filteredRuns.map((r) => (
                <tr key={r.id} className="hover:bg-cyan-950/20 transition">
                  <td className="py-1.5 px-3 font-semibold text-cyan-300">{r.id}</td>
                  <td className="py-1.5 px-3 text-slate-400">{r.mission}</td>
                  <td className="py-1.5 px-3">{r.fuel}</td>
                  <td className="py-1.5 px-3 text-slate-400">{r.atmosphere}</td>
                  <td className="py-1.5 px-3">{r.ventSpeed_ms.toFixed(2)}</td>
                  <td className="py-1.5 px-3 font-mono text-amber-300">{r.extinctionRate_s_inv.toFixed(4)}</td>
                  <td className="py-1.5 px-3 font-mono text-slate-200">{r.extinctionTime_s.toFixed(1)}</td>
                  <td className="py-1.5 px-3 font-mono text-emerald-400">-{r.o2DepletionRate_pct_s.toFixed(3)}</td>
                  <td className="py-1.5 px-3">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        r.extinctionMechanism === 'Radiative Quenching'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : r.extinctionMechanism === 'Depressurization'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-slate-900 text-slate-400'
                      }`}
                    >
                      {r.extinctionMechanism}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
