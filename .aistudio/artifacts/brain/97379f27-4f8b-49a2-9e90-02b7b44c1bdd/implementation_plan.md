# NULLG Simple Mode & Gaseous Fuels Expansion

This plan outlines the design and implementation of a **Simple Mode** toggle with plain English explanations, an interactive beginner audio-guided tour, and expanded gaseous fuel models including **Hydrogen ($H_2$)**, **Methane ($CH_4$)**, **Propane ($C_3H_8$)**, and **Natural Gas** for curious learners without astronomy or aerospace backgrounds.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were confirmed by the user in Phase 1 clarification:
> - **Beginner Simplification**: Provide a global **"Simple Mode / Plain English" toggle** in the interface rather than destroying the advanced aerospace telemetry. In Simple Mode, complex metrics (Grashof, Rayleigh, Stefan velocity, Damköhler) are translated into intuitive concepts (e.g., "Air Movement / Buoyancy", "Flame Shape", "Suffocation Risk").
> - **Gaseous Fuels Selection**: Add **Hydrogen ($H_2$)**, **Methane ($CH_4$)**, **Propane ($C_3H_8$)**, and **Natural Gas (Methane/Ethane blend)** with realistic microgravity physics (pale blue/invisible hydrogen flame, clean blue methane flame, sooty propane envelope, and gas jet diffusion).
> - **Explanation Delivery**: Build an **Interactive Beginner Guided Tour** featuring step-by-step visual spotlight steps with audio narration powered by Gemini 3.8 Flash Lite TTS and real-world analogies (e.g., "What happens if you light a birthday candle inside a floating space station?").

---

## 1. Overview & Core Concept

- **What It Does**: Transforms the NULLG Zero Gravity Combustion Lab into an approachable, dual-mode application where anyone—students, educators, science enthusiasts, or aerospace engineers—can intuitively understand why fire behaves so strangely in space.
- **Target Audience**: Students, NASA Space Apps judges, science communicators, and general users without astronomy, thermodynamics, or aerospace degrees.
- **Key Value**: Demystifies microgravity combustion by translating abstract numbers ($Gr \to 0$, $Pe$, $Da$, $Bo \ll 1$) into everyday mental models, supplemented by an interactive voice tour and hands-on gas fuel experiments.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Simple Mode Activation**:
   - The user clicks the prominent **"Mode: Simple / Plain English"** toggle in the top control bar.
   - The interface smoothly shifts: technical labels swap to plain-language equivalents (e.g., "Grashof Number" $\to$ "Hot Air Rise Factor", "Limiting Oxygen Concentration" $\to$ "Minimum Air Needed to Burn").
   - Informative "Did You Know?" callout cards appear with animated microgravity flame illustrations.

2. **Interactive Beginner Guided Tour**:
   - The user clicks **"Start Beginner Tour"** from the header or welcome card.
   - An interactive 4-step modal spotlights key concepts:
     1. *Step 1: Why Earth flames point up* (hot air is light, cold air is heavy).
     2. *Step 2: Fire in Zero-G* (no hot air rising, fire becomes a gentle round blue ball).
     3. *Step 3: Space Hazards* (fire suffocates in its own smoke unless a fan blows air).
     4. *Step 4: Hydrogen & Gas Leaks* (how gas leaks burn in space vs on Earth).
   - Each step features a **"Listen with AI Voice"** button that plays a natural, friendly audio briefing.

3. **Gaseous Fuel Combustion Simulation**:
   - The user selects **Hydrogen**, **Methane**, **Propane**, or **Natural Gas** from the fuel dropdown.
   - The canvas renders distinct physical flame appearances:
     - **Hydrogen ($H_2$)**: Ultra-clean, pale lavender-blue / nearly invisible flame with wide flammability range.
     - **Methane ($CH_4$)**: Deep chemiluminescent blue sphere with rapid molecular diffusion.
     - **Propane ($C_3H_8$)**: Dense hydrocarbon flame with orange soot halo in 1G vs cool blue core in 0G.
     - **Natural Gas**: Stable blue flame with subtle yellow transition tips under ventilation.

### Visual Identity & Theme

- **Aesthetic Direction**: Clean educational laboratory aesthetic (grounded in `references/6_education_simulations.md`). Deep space canvas (`slate-950`) accented by clear semantic color tokens:
  - Nominal / Microgravity Blue: Cyan (`#06b6d4`)
  - Earth Combustion Yellow/Orange: Amber (`#f59e0b`)
  - Hydrogen Pale Glow: Indigo/Violet (`#818cf8`)
  - Gas Safety / Hazard Alert: Coral Red (`#ef4444`)
- **Typography**: Clean sans-serif with readable line height (`Plus Jakarta Sans` / `Inter` fallback) and tabular numerals for data metrics (`tabular-nums`).
- **Component Styling & Layout**:
  - Two-zone layout: Visual simulation stage on top/left, intuitive slider deck on bottom/right.
  - Zero-pill metadata: Plain typographic dividers (`·`) for labels and tags.
  - Clean cards with hairline slate borders (`border-slate-800`), avoiding nested card traps.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Dual-Mode Experience (Simple Mode vs Expert Mode)**:
  - *Chosen Approach*: Maintain a persistent `isSimpleMode` state across the app. Both beginner and expert views coexist seamlessly.
  - *Why*: Advanced NASA Space Apps challenge judges can still inspect authentic Grashof telemetry, while general users enjoy accessible, jargon-free explanations.
- **Decision 2: Expanded Gaseous Fuels in Physics Engine**:
  - *Chosen Approach*: Extend `FuelType` enum in `types/index.ts` with `'hydrogen_gas' | 'methane_gas' | 'propane_gas' | 'natural_gas'`, each with dedicated stoichiometric heat release, diffusion coefficients, flame temperatures, and visible color profiles.
  - *Why*: Directly satisfies user request for Hydrogen and gases while illustrating real space habitat hazards (fuel cells, life-support methane sabatier reactors).
- **Decision 3: Interactive Guided Tour Component**:
  - *Chosen Approach*: Lightweight modal tour (`BeginnerTourModal.tsx`) with 4 step-by-step visual slides, animated SVG flame comparisons, and one-click voice narration via the existing `/api/tts` endpoint.
  - *Why*: Engaging for visual and auditory learners without requiring any external dependencies.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                               App.tsx                                  │
│  State: [isSimpleMode: boolean] [activeTab] [gravityMode] [tourOpen]  │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
         ┌──────────┴──────────┐          ┌──────────┴──────────┐
         │     Header.tsx      │          │BeginnerTourModal.tsx│
         │ - Simple Mode Toggle│          │ - 4 Visual Steps    │
         │ - Tour Launch Button│          │ - AI Voice Narration│
         └─────────────────────┘          └─────────────────────┘
                    │
         ┌──────────┴────────────────────────────────┐
         │                                           │
┌────────┴──────────────┐                 ┌──────────┴─────────────┐
│CombustionSimulator.tsx│                 │   PhysicsMonitor.tsx   │
│ - Hydrogen, Methane,  │                 │ - Simple Mode Cards    │
│   Propane, Natural Gas│                 │ - Plain English Stats  │
│ - Simplified Sliders  │                 │ - Beginner Tooltips    │
└────────┬──────────────┘                 └────────────────────────┘
         │
┌────────┴──────────────┐
│   physicsEngine.ts    │
│ - Gas flame kinetics  │
│ - Stoichiometry & T_k │
└───────────────────────┘
```

### Data Model Additions

```typescript
// types/index.ts
export type FuelType =
  | 'PMMA_solid'
  | 'heptane_droplet'
  | 'sibal_fabric'
  | 'methane_leak'
  | 'hydrogen_gas'
  | 'methane_gas'
  | 'propane_gas'
  | 'natural_gas';

export interface FuelProperty {
  id: FuelType;
  name: string;
  simpleName: string;
  formula: string;
  state: 'gas' | 'liquid' | 'solid';
  description: string;
  simpleExplanation: string;
  flameColorZeroG: string;
  flameColorOneG: string;
  quenchRisk: string;
}
```

---

## 5. Implementation Steps (Planned for Approval)

1. **Update Data Types (`src/types/index.ts`)**: Add gaseous fuels and Simple Mode property interfaces.
2. **Expand Physics Engine (`src/utils/physicsEngine.ts`)**: Add gas combustion properties for Hydrogen, Methane, Propane, and Natural Gas (molecular diffusivity, stoichiometric flame temp, visual rendering parameters).
3. **Build Beginner Guided Tour Component (`src/components/BeginnerTourModal.tsx`)**: 4-step visual card walkthrough with animations and Gemini TTS audio narration.
4. **Update Combustion Simulator (`src/components/CombustionSimulator.tsx`)**:
   - Add gaseous fuel options with distinct canvas flame graphics.
   - Add Simple Mode view toggle with friendly labels (e.g. "Flame Height", "Air Flow", "Danger Level").
5. **Update Physics Monitor (`src/components/PhysicsMonitor.tsx`)**: Add beginner-friendly translations and visual explainer cards alongside charts.
6. **Update Header & App (`src/components/Header.tsx`, `src/App.tsx`)**: Global Simple Mode state switch and "Tour" button in header.
7. **Compile, Lint & Dev Server Verification**: Verify zero TypeScript errors and successful server response.
