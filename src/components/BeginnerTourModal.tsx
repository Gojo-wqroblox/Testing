import React, { useState, useRef } from 'react';
import { synthesizeSpeech } from '../services/geminiService';
import { sound } from '../utils/audioAlert';
import {
  X,
  Volume2,
  VolumeX,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Flame,
  Orbit,
  AlertTriangle,
  Wind,
  CheckCircle2,
  Loader2,
  HelpCircle,
} from 'lucide-react';

interface BeginnerTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFuel?: (fuel: any) => void;
}

interface TourStep {
  stepNumber: number;
  title: string;
  subtitle: string;
  analogy: string;
  explanation: string;
  voiceScript: string;
  keyTakeaway: string;
  visualType: 'earth_candle' | 'space_sphere' | 'co2_blanket' | 'gas_fuels';
}

const TOUR_STEPS: TourStep[] = [
  {
    stepNumber: 1,
    title: 'Why Fire on Earth Looks Like a Teardrop',
    subtitle: 'Hot air rises, pulling the flame upwards',
    analogy: 'Think of hot air like a pool float in water: it is lighter than cold air, so it naturally zooms upward!',
    explanation:
      'On Earth, gravity pulls heavy cold air downward. This pushes the hot, lightweight air inside the fire straight up at several miles per hour. This upward rush (called buoyant convection) pulls in fresh oxygen from the bottom and stretches the fire into the familiar flickering yellow teardrop shape.',
    voiceScript:
      'Welcome to NULLG Zero Gravity. Step one: Why does fire on Earth look like a teardrop? On Earth, gravity pulls cold air down, which pushes hot air up. This upward breeze feeds fresh oxygen to the bottom and stretches the flame into a flickering yellow cone.',
    keyTakeaway: 'Earth flames are yellow and pointy because gravity makes hot air rise.',
    visualType: 'earth_candle',
  },
  {
    stepNumber: 2,
    title: 'Fire in Space: The Glowing Blue Sphere',
    subtitle: 'Without gravity, hot air has nowhere to rise',
    analogy: 'Imagine dropping a drop of blue ink into calm water—it expands evenly into a round ball in all directions.',
    explanation:
      'In zero gravity, there is no "up" or "down". Because hot air doesn’t rise, fire behaves completely differently! Oxygen slowly seeps in equally from all directions (molecular diffusion). The flame doesn’t flicker; it turns into a calm, gentle, perfectly round blue sphere that burns much cooler than on Earth.',
    voiceScript:
      'Step two: Fire in zero gravity. In space, there is no up or down. Hot air cannot rise. Instead, oxygen drifts in from all sides at once. The flame becomes a calm, glowing blue sphere, like a tiny floating star.',
    keyTakeaway: 'Space flames are round, dim, and blue because oxygen drifts in evenly from all sides.',
    visualType: 'space_sphere',
  },
  {
    stepNumber: 3,
    title: 'The Space Fire Trap: Suffocating in Its Own Smoke',
    subtitle: 'Without air flow, fire chokes out',
    analogy: 'If you wrap yourself too tightly in a heavy blanket, you run out of fresh air. Fire in space does the exact same thing!',
    explanation:
      'On Earth, smoke and burnt gases float up and away immediately. But in space, burnt carbon dioxide gas has nowhere to go. It forms an invisible blanket trapped right around the flame. Unless a space station fan blows fresh air, the flame quickly eats all the nearby oxygen and chokes itself out!',
    voiceScript:
      'Step three: The space fire trap. On Earth, smoke floats away. But in space, burnt smoke forms an invisible blanket stuck right around the fire. Unless a fan blows air to clear the smoke, the flame suffocates itself and goes out.',
    keyTakeaway: 'In zero gravity, fire suffocates in its own stagnant smoke unless fans blow fresh air.',
    visualType: 'co2_blanket',
  },
  {
    stepNumber: 4,
    title: 'Hydrogen & Gas Fires: The Invisible Danger',
    subtitle: 'Hydrogen, Methane, and Propane in space habitats',
    analogy: 'Hydrogen burns so cleanly it is like an invisible ghost flame you can feel as heat before you can see it!',
    explanation:
      'Spacecraft use hydrogen for rocket engines and fuel cells, and produce methane in life-support systems. Hydrogen burns with an almost invisible pale violet flame with zero smoke. Methane burns with a clear blue sphere. Propane contains more carbon, so in space it creates a floating black smoke shell around a blue core.',
    voiceScript:
      'Step four: Gas fires and hydrogen. Hydrogen is rocket fuel that burns with an almost invisible, ghostly pale flame. Methane burns with a bright blue sphere, while propane traps its smoke in a floating dark shell. Now you understand how fire works in zero gravity!',
    keyTakeaway: 'Hydrogen fire is nearly invisible in space; gas leaks require constant ventilation to prevent silent accumulation.',
    visualType: 'gas_fuels',
  },
];

export const BeginnerTourModal: React.FC<BeginnerTourModalProps> = ({
  isOpen,
  onClose,
  onSelectFuel,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  if (!isOpen) return null;

  const currentStep = TOUR_STEPS[currentStepIndex];

  const handlePlayVoice = async () => {
    sound.playTelemetryPing();
    if (isPlayingVoice) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingVoice(false);
      return;
    }

    setIsSynthesizing(true);
    try {
      const audioUrl = await synthesizeSpeech(currentStep.voiceScript, 'Kore');
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        setIsPlayingVoice(true);
      }
    } catch (err) {
      console.warn('Backend TTS failed, using browser speech synthesis:', err);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(currentStep.voiceScript);
        utterance.rate = 1.0;
        utterance.pitch = 1.05;
        utterance.onend = () => setIsPlayingVoice(false);
        utterance.onerror = () => setIsPlayingVoice(false);
        window.speechSynthesis.speak(utterance);
        setIsPlayingVoice(true);
      }
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleNext = () => {
    if (isPlayingVoice) {
      if (audioRef.current) audioRef.current.pause();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
      setIsPlayingVoice(false);
    }
    sound.playTelemetryPing();
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (isPlayingVoice) {
      if (audioRef.current) audioRef.current.pause();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
      setIsPlayingVoice(false);
    }
    sound.playTelemetryPing();
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 text-slate-100 font-sans relative">
        <audio
          ref={audioRef}
          onEnded={() => setIsPlayingVoice(false)}
          onError={() => setIsPlayingVoice(false)}
          className="hidden"
        />

        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h2 className="font-bold text-base text-white">
                Space Fire for Beginners // Guided Interactive Tour
              </h2>
              <span className="text-xs text-slate-400">
                Step {currentStep.stepNumber} of {TOUR_STEPS.length}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              if (isPlayingVoice) {
                if (audioRef.current) audioRef.current.pause();
                if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
              }
              onClose();
            }}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Visual Illustration Box */}
        <div className="h-44 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-center p-4 overflow-hidden relative">
          {currentStep.visualType === 'earth_candle' && (
            <div className="flex items-center justify-center gap-8 w-full">
              <div className="flex flex-col items-center">
                <div className="relative w-20 h-28 flex items-center justify-center">
                  {/* Upward breeze arrows */}
                  <div className="absolute -left-6 top-6 flex flex-col items-center text-amber-400 text-[10px] animate-pulse">
                    <span>↑</span>
                    <span>↑ Hot Air</span>
                  </div>
                  <div className="absolute -right-6 top-6 flex flex-col items-center text-amber-400 text-[10px] animate-pulse">
                    <span>↑</span>
                    <span>↑ Rises</span>
                  </div>
                  {/* Candle Stick */}
                  <div className="absolute bottom-1 w-6 h-10 bg-slate-600 rounded-sm" />
                  {/* Teardrop yellow flame */}
                  <div className="w-10 h-18 bg-gradient-to-t from-blue-600 via-orange-500 to-yellow-300 rounded-[50%_50%_35%_35%/70%_70%_30%_30%] shadow-[0_0_24px_rgba(245,158,11,0.8)] animate-pulse" />
                </div>
                <span className="text-xs font-bold text-amber-300 mt-2">1G Earth Flame</span>
                <span className="text-[11px] text-slate-400">Pointy & Flickering</span>
              </div>
            </div>
          )}

          {currentStep.visualType === 'space_sphere' && (
            <div className="flex items-center justify-center gap-8 w-full">
              <div className="flex flex-col items-center">
                <div className="relative w-28 h-28 flex items-center justify-center">
                  {/* Inward diffusion ripples */}
                  <div className="absolute w-28 h-28 rounded-full border border-dashed border-cyan-700/50 animate-spin" style={{ animationDuration: '24s' }} />
                  <div className="absolute w-20 h-20 rounded-full border border-cyan-500/30" />
                  {/* Isotropic blue flame ball */}
                  <div className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-500 shadow-[0_0_28px_rgba(6,182,212,0.8)] flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full bg-slate-800" />
                  </div>
                </div>
                <span className="text-xs font-bold text-cyan-300 mt-2">0G Microgravity Flame</span>
                <span className="text-[11px] text-slate-400">Calm, Round & Blue Sphere</span>
              </div>
            </div>
          )}

          {currentStep.visualType === 'co2_blanket' && (
            <div className="flex items-center justify-center gap-8 w-full">
              <div className="flex flex-col items-center relative">
                {/* Suffocating CO2 Shell */}
                <div className="w-28 h-28 rounded-full bg-slate-800/90 border-2 border-dashed border-red-500/60 flex items-center justify-center shadow-inner">
                  {/* Choked flame inside */}
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-900 to-cyan-800 opacity-60 shadow-[0_0_12px_rgba(239,68,68,0.4)] flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-slate-900" />
                  </div>
                </div>
                <div className="absolute top-1 text-[10px] bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded font-mono">
                  CO₂ Smoke Blanket Trapped
                </div>
                <span className="text-xs font-bold text-red-400 mt-2">Suffocation Barrier</span>
                <span className="text-[11px] text-slate-400">Flame dies without fan ventilation</span>
              </div>
            </div>
          )}

          {currentStep.visualType === 'gas_fuels' && (
            <div className="flex items-center justify-around w-full px-4">
              {/* Hydrogen */}
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-indigo-500/30 border border-indigo-400/60 shadow-[0_0_15px_rgba(129,140,248,0.5)] flex items-center justify-center">
                  <span className="text-[10px] font-mono font-bold text-indigo-200">H₂</span>
                </div>
                <span className="text-[11px] font-bold text-indigo-300 mt-1">Hydrogen</span>
                <span className="text-[9px] text-slate-400">Almost Invisible</span>
              </div>

              {/* Methane */}
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-cyan-500/40 border border-cyan-400 shadow-[0_0_18px_rgba(6,182,212,0.6)] flex items-center justify-center">
                  <span className="text-[10px] font-mono font-bold text-cyan-200">CH₄</span>
                </div>
                <span className="text-[11px] font-bold text-cyan-300 mt-1">Methane</span>
                <span className="text-[9px] text-slate-400">Clean Blue Sphere</span>
              </div>

              {/* Propane */}
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-amber-600/30 border border-amber-500 shadow-[0_0_18px_rgba(245,158,11,0.6)] flex items-center justify-center">
                  <span className="text-[10px] font-mono font-bold text-amber-200">C₃H₈</span>
                </div>
                <span className="text-[11px] font-bold text-amber-300 mt-1">Propane</span>
                <span className="text-[9px] text-slate-400">Soot Smoke Shell</span>
              </div>
            </div>
          )}
        </div>

        {/* Content Box */}
        <div className="space-y-3">
          <div>
            <h3 className="text-lg font-bold text-white">{currentStep.title}</h3>
            <p className="text-xs text-cyan-400 font-medium">{currentStep.subtitle}</p>
          </div>

          {/* Everyday Analogy Callout */}
          <div className="bg-cyan-950/40 border border-cyan-800/70 p-3 rounded-xl text-xs text-cyan-200 flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-white text-[11px] uppercase tracking-wider">
                Everyday Analogy:
              </span>
              <span>{currentStep.analogy}</span>
            </div>
          </div>

          {/* Plain English Explanation */}
          <p className="text-xs text-slate-300 leading-relaxed">{currentStep.explanation}</p>

          {/* Key Takeaway */}
          <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg flex items-center gap-2 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-slate-200 font-medium">{currentStep.keyTakeaway}</span>
          </div>
        </div>

        {/* Action Controls & Navigation */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
          {/* Voice Narration Button */}
          <button
            onClick={handlePlayVoice}
            disabled={isSynthesizing}
            className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 text-xs font-semibold flex items-center gap-2 transition"
          >
            {isSynthesizing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isPlayingVoice ? (
              <VolumeX className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
            )}
            <span>{isSynthesizing ? 'Loading Voice...' : isPlayingVoice ? 'Pause Voice' : 'Listen with AI Voice'}</span>
          </button>

          {/* Step Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={currentStepIndex === 0}
              className="px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs text-slate-300 disabled:opacity-40 hover:text-white flex items-center gap-1 transition"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Back</span>
            </button>

            <button
              onClick={handleNext}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-cyan-950/50"
            >
              <span>{currentStepIndex === TOUR_STEPS.length - 1 ? 'Start Exploring!' : 'Next Concept'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
