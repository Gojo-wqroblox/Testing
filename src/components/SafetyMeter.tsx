import React, { useEffect, useRef } from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, AlertCircle, Sparkles, Wind, Flame, Activity, Send, HelpCircle, CheckCircle2 } from 'lucide-react';
import { CombustionParams, ComputedPhysics } from '../types';
import { sound } from '../utils/audioAlert';

interface SafetyMeterProps {
  score: number; // 0 - 100 hazard score
  params?: CombustionParams;
  physics?: ComputedPhysics;
  isSimpleMode?: boolean;
  onSendToChat?: (query: string, context?: any) => void;
  onApplyPreset?: (partialParams: Partial<CombustionParams>) => void;
  className?: string;
}

export const SafetyMeter: React.FC<SafetyMeterProps> = ({
  score,
  params,
  physics,
  isSimpleMode = true,
  onSendToChat,
  onApplyPreset,
  className = '',
}) => {
  const prevCriticalRef = useRef(false);

  // Clamp score between 0 and 100
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));

  // Determine safety tier
  const getSafetyTier = (val: number) => {
    if (val < 30) {
      return {
        label: 'Safe',
        subLabel: 'Normal & Controlled',
        statusColor: 'text-emerald-400',
        borderColor: 'border-emerald-500/40',
        bgColor: 'bg-emerald-950/40',
        glowColor: 'shadow-emerald-500/20',
        barGradient: 'from-emerald-500 to-teal-400',
        icon: ShieldCheck,
        summary:
          'Fire is burning calmly and safely. Oxygen levels and air circulation are well within normal safety limits.',
        actionTip: 'Simulation parameters are safe for space habitat operations.',
      };
    }
    if (val < 55) {
      return {
        label: 'Guarded',
        subLabel: 'Low Hazard',
        statusColor: 'text-cyan-400',
        borderColor: 'border-cyan-500/40',
        bgColor: 'bg-cyan-950/40',
        glowColor: 'shadow-cyan-500/20',
        barGradient: 'from-emerald-500 via-cyan-400 to-teal-400',
        icon: CheckCircle2,
        summary:
          'Minor risk detected. Fire behavior is steady, but keep an eye on air movement to prevent smoke buildup.',
        actionTip: 'Maintain gentle fan circulation to keep fresh air moving over the flame.',
      };
    }
    if (val < 75) {
      return {
        label: 'Warning',
        subLabel: 'Elevated Risk',
        statusColor: 'text-amber-400',
        borderColor: 'border-amber-500/50',
        bgColor: 'bg-amber-950/40',
        glowColor: 'shadow-amber-500/25',
        barGradient: 'from-emerald-500 via-amber-400 to-orange-400',
        icon: AlertTriangle,
        summary:
          'Caution: Flammable gas or oxygen is higher than recommended. In zero gravity, unburned fuel can linger in the air.',
        actionTip: 'Increase cabin fan speed or decrease oxygen level to return to safe conditions.',
      };
    }
    return {
      label: 'Critical',
      subLabel: 'Severe Hazard Danger',
      statusColor: 'text-rose-400',
      borderColor: 'border-rose-500/60',
      bgColor: 'bg-rose-950/50',
      glowColor: 'shadow-rose-500/40',
      barGradient: 'from-emerald-500 via-amber-400 via-orange-500 to-rose-600',
      icon: ShieldAlert,
      summary:
        'DANGER: Extreme fire hazard! Flammable fuel vapors and high oxygen could trigger an uncontrolled flare or explosion.',
      actionTip: 'EMERGENCY: Cut oxygen levels, turn on emergency ventilation, or trigger chamber nitrogen purge!',
    };
  };

  const tier = getSafetyTier(clampedScore);
  const StatusIcon = tier.icon;
  const isCritical = clampedScore >= 75;

  // Sound alert when transitioning into Critical
  useEffect(() => {
    if (isCritical && !prevCriticalRef.current) {
      sound.playHazardAlarm();
    }
    prevCriticalRef.current = isCritical;
  }, [isCritical]);

  // Risk breakdown factors
  const getRiskBreakdown = () => {
    if (!params) return [];

    const factors = [];

    // Oxygen risk
    if (params.o2_pct > 25) {
      factors.push({
        name: 'High Oxygen in Air',
        status: `${params.o2_pct}% O₂ (High)`,
        impact: 'Critical Danger: Materials catch fire much faster and burn with intense heat.',
        isBad: true,
      });
    } else if (params.o2_pct < 14) {
      factors.push({
        name: 'Low Oxygen Starvation',
        status: `${params.o2_pct}% O₂ (Choking)`,
        impact: 'Smoldering Risk: Fire is suffocating on carbon dioxide and may produce toxic unburnt gases.',
        isBad: true,
      });
    } else {
      factors.push({
        name: 'Cabin Oxygen',
        status: `${params.o2_pct}% O₂ (Normal)`,
        impact: 'Safe: Standard breathable air mixture.',
        isBad: false,
      });
    }

    // Ventilation / Stagnation risk in Zero-G
    if (params.gravity_g === 0 && params.vent_speed_ms < 0.02) {
      factors.push({
        name: 'Trapped Gas (Zero-G)',
        status: 'Still Air (0.0 m/s)',
        impact: 'Hazard: Without gravity, hot smoke cannot rise away and collects in an invisible flammable bubble.',
        isBad: true,
      });
    } else if (params.vent_speed_ms > 0.3) {
      factors.push({
        name: 'Forced Fan Airflow',
        status: `${params.vent_speed_ms.toFixed(2)} m/s (Fast Breeze)`,
        impact: 'Active Air: Breeze supplies fresh oxygen to flame, blowing it downstream.',
        isBad: false,
      });
    } else {
      factors.push({
        name: 'Air Movement',
        status: params.gravity_g > 0 ? 'Natural Earth Updraft' : `${params.vent_speed_ms.toFixed(2)} m/s Fan Drift`,
        impact: 'Safe: Air moves sufficiently to disperse hot combustion exhaust.',
        isBad: false,
      });
    }

    // Fuel volatility
    const isVolatile = params.fuel_type === 'hydrogen_gas' || params.fuel_type === 'methane_leak';
    factors.push({
      name: 'Fuel Flammability',
      status: isVolatile ? 'Highly Explosive Gas' : 'Controlled Test Fuel',
      impact: isVolatile
        ? 'High Reactivity: Light gas ignites at low energy and burns with rapid flame velocity.'
        : 'Stable: Predictable burning rate under laboratory monitoring.',
      isBad: isVolatile,
    });

    return factors;
  };

  const breakdownFactors = getRiskBreakdown();

  const handleConsultAI = () => {
    if (!onSendToChat) return;
    sound.playTelemetryPing();
    const query = isSimpleMode
      ? `Safety Audit Request for Astronauts:
The current active simulation Safety Meter is reading "${tier.label.toUpperCase()} (${clampedScore}/100)".
- Safety Status: ${tier.subLabel}
- Why: ${tier.summary}
- Air conditions: ${params?.o2_pct || 21}% Oxygen, ${params?.gravity_g === 0 ? 'Zero-G in space' : 'Earth gravity'}, Airflow: ${params?.vent_speed_ms || 0} m/s
- Fuel: ${params?.fuel_type || 'Gas fuel'}

Please explain in plain, simple English:
1. Why is this rated "${tier.label}"?
2. What would happen inside a space station if this fire was left unattended?
3. How can the crew safely return the chamber to "Safe"?`
      : `ECLSS SAFETY HAZARD TELEMETRY AUDIT:
- Hazard Score: ${clampedScore}/100 (${tier.label})
- Atmosphere: ${params?.o2_pct}% O2 at ${params?.pressure_atm || 1.0} atm
- Microgravity Stagnation: ${params?.gravity_g === 0 ? 'TRUE (0.00g)' : `FALSE (${params?.gravity_g}g)`}
- Forced Convection Velocity: ${params?.vent_speed_ms || 0} m/s
- Fuel Specification: ${params?.fuel_type}
- Extinction Regime: ${physics?.extinction_risk || 'NOMINAL'}

Evaluate whether this condition violates NASA ISS CIR / SoFIE flammability safety thresholds and provide remediation protocol.`;

    onSendToChat(query, { score: clampedScore, tier: tier.label, params, physics });
  };

  return (
    <div
      className={`bg-slate-950 border ${tier.borderColor} rounded-xl p-4 sm:p-5 shadow-xl transition-all duration-300 font-sans ${className}`}
    >
      {/* Top Header Row: Title, Tier Badge, and Quick AI Check */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg ${tier.bgColor} border ${tier.borderColor} flex items-center justify-center ${tier.statusColor} shrink-0 shadow-lg ${tier.glowColor}`}
          >
            <StatusIcon className={`w-5 h-5 ${isCritical ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-white">Hazard Safety Meter</h3>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                  isCritical
                    ? 'bg-rose-950 text-rose-300 border-rose-600 animate-pulse'
                    : clampedScore >= 55
                    ? 'bg-amber-950 text-amber-300 border-amber-600'
                    : clampedScore >= 30
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                    : 'bg-emerald-950 text-emerald-300 border-emerald-700'
                }`}
              >
                {tier.label}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{tier.subLabel}</p>
          </div>
        </div>

        {/* Right side: Numerical Score and AI Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="text-right">
            <div className="flex items-baseline justify-end gap-1">
              <span className={`text-xl sm:text-2xl font-black font-mono ${tier.statusColor}`}>
                {clampedScore}
              </span>
              <span className="text-xs text-slate-500 font-mono">/100</span>
            </div>
            <span className="text-[10px] text-slate-400 block font-mono">Current Hazard Level</span>
          </div>

          {onSendToChat && (
            <button
              onClick={handleConsultAI}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-md border ${
                isCritical
                  ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400 shadow-rose-950/50'
                  : 'bg-slate-900 hover:bg-slate-800 text-cyan-300 border-slate-700'
              }`}
              title="Ask AI to analyze this safety level in simple words"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ask AI Safety Officer</span>
              <span className="sm:hidden">AI Audit</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Color-Coded Bar: 'Safe' to 'Critical' */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs font-semibold px-0.5">
          <span className="text-emerald-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Safe
          </span>
          <span className="text-cyan-400 hidden sm:inline">Nominal</span>
          <span className="text-amber-400">Caution / Warning</span>
          <span className="text-rose-400 flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full bg-rose-500 ${isCritical ? 'animate-ping' : ''}`} />
            Critical
          </span>
        </div>

        {/* The Track Container */}
        <div className="relative w-full h-5 sm:h-6 bg-slate-900 rounded-full p-1 border border-slate-800 shadow-inner overflow-visible">
          {/* Multi-step color gradient bar background */}
          <div className="w-full h-full rounded-full bg-gradient-to-r from-emerald-500 via-yellow-400 via-orange-500 to-rose-600 opacity-80" />

          {/* Scale zone markers/ticks */}
          <div className="absolute inset-0 flex justify-between px-3 items-center pointer-events-none opacity-40">
            <div className="w-0.5 h-3 bg-slate-950 rounded" />
            <div className="w-0.5 h-3 bg-slate-950 rounded" />
            <div className="w-0.5 h-3 bg-slate-950 rounded" />
            <div className="w-0.5 h-3 bg-slate-950 rounded" />
          </div>

          {/* Dynamic Needle Indicator Marker */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-300 pointer-events-none z-10"
            style={{ left: `${clampedScore}%` }}
          >
            {/* Indicator ring and vertical pointer */}
            <div className="relative flex flex-col items-center">
              {/* Top pointer arrow */}
              <div
                className={`w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] ${
                  isCritical ? 'border-t-rose-400' : 'border-t-white'
                } -mb-0.5`}
              />
              {/* Needle bead with pulsing glow */}
              <div
                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-slate-950 border-2 flex items-center justify-center shadow-xl ${
                  isCritical
                    ? 'border-rose-400 shadow-rose-500/80 ring-2 ring-rose-500/50'
                    : clampedScore >= 55
                    ? 'border-amber-400 shadow-amber-500/50'
                    : clampedScore >= 30
                    ? 'border-cyan-400 shadow-cyan-500/50'
                    : 'border-emerald-400 shadow-emerald-500/50'
                }`}
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    isCritical
                      ? 'bg-rose-500 animate-ping'
                      : clampedScore >= 55
                      ? 'bg-amber-400'
                      : clampedScore >= 30
                      ? 'bg-cyan-400'
                      : 'bg-emerald-400'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Scale labels under the bar */}
        <div className="flex justify-between text-[11px] text-slate-500 font-mono px-1">
          <span>0 (Zero Risk)</span>
          <span className="hidden sm:inline">25 (Normal)</span>
          <span>50 (Moderate)</span>
          <span className="hidden sm:inline">75 (Elevated)</span>
          <span className="text-rose-400 font-bold">100 (Max Danger)</span>
        </div>
      </div>

      {/* Plain-English Explanation & Recommendation Box */}
      <div
        className={`mt-4 p-3 sm:p-4 rounded-lg border ${
          isCritical
            ? 'bg-rose-950/30 border-rose-900/60 text-rose-200'
            : clampedScore >= 55
            ? 'bg-amber-950/30 border-amber-900/60 text-amber-200'
            : 'bg-slate-900/80 border-slate-800 text-slate-300'
        }`}
      >
        <div className="flex items-start gap-2.5">
          <HelpCircle
            className={`w-4 h-4 shrink-0 mt-0.5 ${
              isCritical ? 'text-rose-400' : clampedScore >= 55 ? 'text-amber-400' : 'text-cyan-400'
            }`}
          />
          <div className="space-y-1 text-xs">
            <p className="font-semibold text-white">{tier.summary}</p>
            <p className="text-slate-400 leading-relaxed">
              <strong className="text-slate-300">Safety Recommendation:</strong> {tier.actionTip}
            </p>
          </div>
        </div>
      </div>

      {/* Risk Factors Breakdown */}
      {breakdownFactors.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-900">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block mb-2">
            Why is the meter at this level? (Key Factors)
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {breakdownFactors.map((factor, idx) => (
              <div
                key={idx}
                className={`p-2 rounded-lg border text-xs ${
                  factor.isBad
                    ? 'bg-rose-950/20 border-rose-900/40 text-slate-200'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-medium text-slate-300 truncate">{factor.name}</span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono shrink-0 ${
                      factor.isBad ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {factor.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">{factor.impact}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preset Condition Testers (Safe vs Critical) */}
      {onApplyPreset && (
        <div className="mt-4 pt-3 border-t border-slate-900 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-slate-400 text-[11px]">Test Safety Scenarios:</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sound.playTelemetryPing();
                onApplyPreset({
                  o2_pct: 21,
                  vent_speed_ms: 0.05,
                  gravity_g: 0,
                  fuel_type: 'hydrogen_gas',
                });
              }}
              className="px-2.5 py-1 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-800 text-emerald-300 rounded text-[11px] font-medium transition"
            >
              Simulate Safe Condition
            </button>
            <button
              onClick={() => {
                sound.playHazardAlarm();
                onApplyPreset({
                  o2_pct: 35,
                  vent_speed_ms: 0.0,
                  gravity_g: 0,
                  fuel_type: 'methane_leak',
                });
              }}
              className="px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800 text-rose-300 rounded text-[11px] font-medium transition"
            >
              Simulate Critical Alarm
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
