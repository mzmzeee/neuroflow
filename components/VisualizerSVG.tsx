import React, { useState, useEffect, useCallback } from 'react';
import { ModelType, SimulationParams, SimulationResult } from '../types';
import { fmtVec } from '../utils/math';

interface VisualizerProps {
  type: ModelType;
  params: SimulationParams;
  result: SimulationResult;
  onStepComplete?: () => void;
}

type StepState = 'pending' | 'active' | 'computing' | 'done';

const COLORS = {
  bg: '#0f172a',
  canvasBg: '#020617',
  nodePending: '#1e293b',
  nodeActive: '#3b82f6',
  nodeComputing: '#f59e0b',
  nodeDone: '#10b981',
  nodeStroke: '#475569',

  // New Semantic Colors
  flowData: '#3b82f6',     // Blue for Data (h, x, c, tanh)
  flowControl: '#f59e0b',  // Orange for Gates (sigmoid)

  // Legacy colors for GRU/LSTM until refactored
  line: '#475569',
  lineActive: '#60a5fa',

  text: '#f8fafc',
  textMuted: '#64748b',
  valueText: '#4ade80',
  labelText: '#fbbf24',
};

// Standard Line
const Line = ({ d, type = 'data', isActive = false, dashed = false }: { d: string; type?: 'data' | 'control'; isActive?: boolean; dashed?: boolean }) => (
  <path
    d={d}
    stroke={isActive ? (type === 'data' ? COLORS.flowData : COLORS.flowControl) : (type === 'data' ? COLORS.nodeStroke : '#4b5563')}
    strokeWidth={isActive ? 3 : 2}
    strokeDasharray={dashed ? "5,5" : undefined}
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    opacity={isActive ? 1 : 0.6}
  />
);

// Line with a "Jump" (Bridge) 
// Usage: provide segments. e.g. M start L bridgeStart Q bridgeControl bridgeEnd L end
// This helper assumes a simple vertical jump over a horizontal line.
// But for now, since paths are static, we might just hand-code the 'd' for complex jumps or use this helper for standard ones.
// A simple "Bridge" visual is just a small arc. 
const BridgeLine = ({ d, type = 'data', isActive = false }: { d: string; type?: 'data' | 'control'; isActive?: boolean }) => (
  <Line d={d} type={type} isActive={isActive} />
);

// Compute node
const Node = ({
  x, y, type, label, state, value, onClick, small = false
}: {
  x: number; y: number;
  type: 'σ' | 'tanh' | '×' | '+' | '1-' | 'c';
  label?: string;
  state?: StepState;
  value?: number[];
  onClick?: () => void;
  small?: boolean;
}) => {
  const isCircle = type === '×' || type === '+' || type === '1-' || type === 'c';
  const size = small ? 30 : (isCircle ? 40 : 54);
  const fontSize = small ? 14 : 18;

  let bgColor = COLORS.nodePending;
  if (state) {
    bgColor = {
      pending: COLORS.nodePending,
      active: COLORS.nodeActive,
      computing: COLORS.nodeComputing,
      done: COLORS.nodeDone,
    }[state];
  } else {
    // Static nodes (like '1-')
    bgColor = COLORS.nodePending;
  }

  // Override for specific types
  if (type === '1-') bgColor = '#1e293b';

  return (
    <g
      transform={`translate(${x}, ${y})`}
      style={{ cursor: (state === 'active' || onClick) ? 'pointer' : 'default' }}
      onClick={(state === 'active' || onClick) ? onClick : undefined}
    >
      {/* Pulse for active */}
      {state === 'active' && (
        <circle r={size / 2 + 10} fill="none" stroke={COLORS.nodeActive}
          strokeWidth={2} opacity={0.5} style={{ animation: 'pulse 1.5s ease-in-out infinite' }} />
      )}

      {/* Shape */}
      {isCircle ? (
        <circle r={size / 2} fill={bgColor} stroke={state === 'active' ? '#fff' : COLORS.nodeStroke} strokeWidth={2} />
      ) : (
        <rect x={-size / 2} y={-24} width={size} height={48} rx={8}
          fill={bgColor} stroke={state === 'active' ? '#fff' : COLORS.nodeStroke} strokeWidth={2} />
      )}

      {/* Symbol */}
      <text x={0} y={6} textAnchor="middle" fontSize={type === '1-' ? 14 : fontSize} fontWeight="bold"
        fill={state === 'pending' ? COLORS.textMuted : '#fff'}>{type}</text>

      {/* Label above */}
      {label && (
        <text x={0} y={isCircle ? -30 : -35} textAnchor="middle" fontSize={11} fontWeight="bold"
          fontStyle="italic" fill={COLORS.labelText}>{label}</text>
      )}

      {/* Value below when done */}
      {state === 'done' && value && (
        <g transform={`translate(0, ${isCircle ? 35 : 40})`}>
          <rect x={-50} y={-10} width={100} height={20} rx={4}
            fill="rgba(2,6,23,0.95)" stroke={COLORS.nodeDone} strokeWidth={1} />
          <text x={0} y={4} textAnchor="middle" fontSize={10} fontFamily="monospace"
            fontWeight="bold" fill={COLORS.valueText}>{fmtVec(value)}</text>
        </g>
      )}

      {/* Click hint */}
      {state === 'active' && (
        <text x={0} y={isCircle ? 45 : 55} textAnchor="middle" fontSize={9}
          fill={COLORS.nodeActive} fontWeight="bold">Click</text>
      )}
    </g>
  );
};

// I/O Label
const IOLabel = ({ x, y, label, subscript, value, align = 'middle', isInput = true }: {
  x: number; y: number; label: string; subscript: string;
  value?: number[]; align?: 'start' | 'middle' | 'end'; isInput?: boolean;
}) => (
  <g transform={`translate(${x}, ${y})`}>
    <text x={0} y={0} textAnchor={align} fontSize={20} fontWeight="bold" fontStyle="italic"
      fill={isInput ? '#60a5fa' : '#34d399'}>
      {label}<tspan fontSize={11} dy={3}>{subscript}</tspan>
    </text>
    {value && (
      <g transform={`translate(0, 25)`}>
        <rect x={align === 'end' ? -100 : align === 'start' ? 0 : -50} y={-10} width={100} height={20} rx={4}
          fill="rgba(2,6,23,0.95)" stroke={COLORS.line} strokeWidth={1} />
        <text x={align === 'end' ? -50 : align === 'start' ? 50 : 0} y={4} textAnchor="middle"
          fontSize={10} fontFamily="monospace" fontWeight="bold" fill={isInput ? '#93c5fd' : '#6ee7b7'}>
          {fmtVec(value)}
        </text>
      </g>
    )}
  </g>
);

const Styles = () => (
  <style>{`
    @keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.8; } }
  `}</style>
);

// ============ UGRNN - Corrected Architecture ============
// Layout:
// Top Corridor: h_{t-1} flows through. Branch to U-Gate. Branch to Interpolation.
// Bottom Corridor: Data Bus (h + x).
// Interpolation: u * h_{t-1} + (1-u) * s_t
const UGRNNDiagram: React.FC<{
  params: SimulationParams; result: SimulationResult; onComplete: () => void;
}> = ({ params, result, onComplete }) => {
  // Steps: concat -> gates -> interp (calc terms) -> final add
  const [steps, setSteps] = useState({
    concat: 'active' as StepState,
    gates: 'pending' as StepState, // both u and s compute here
    interp: 'pending' as StepState, // multiply h*u and s*(1-u)
    add: 'pending' as StepState    // final add
  });

  useEffect(() => {
    setSteps({ concat: 'active', gates: 'pending', interp: 'pending', add: 'pending' });
  }, [params.inputX, params.hiddenH]);

  const computeStep = useCallback((step: string) => {
    setSteps(prev => ({ ...prev, [step]: 'computing' }));
    setTimeout(() => {
      setSteps(prev => {
        const n = { ...prev };
        if (step === 'concat') {
          n.concat = 'done';
          n.gates = 'active';
        } else if (step === 'gates') {
          n.gates = 'done';
          n.interp = 'active';
        } else if (step === 'interp') {
          n.interp = 'done';
          n.add = 'active';
        } else if (step === 'add') {
          n.add = 'done';
          setTimeout(onComplete, 400);
        }
        return n;
      });
    }, 500);
  }, [onComplete]);

  // Dimensions - taller to fit labels + value boxes
  const W = 1100, H = 560;

  // Coordinates
  const leftX = 150, rightX = W - 140;
  const topY = 150;    // h_{t-1} highway
  const bottomY = 350; // Data Bus (h+x)

  // Columns - shifted right by 70px
  const concatX = 270;
  const gateX = 420;
  const oneMinusX = 520;
  const multX = 620;
  const addX = 770;

  const sigmaY = 250;

  // Derived Data
  const concatVal = params.inputX.map((v, i) => v + (params.hiddenH[i] || 0));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
      <Styles />
      <rect width={W} height={H} fill={COLORS.canvasBg} />

      {/* Cell Box */}
      <rect x={150} y={80} width={650} height={350} rx={16}
        fill="rgba(30,41,59,0.3)" stroke="#334155" strokeWidth={2} />

      {/* === I/O LABELS (drawn first for z-order) === */}
      <IOLabel x={leftX - 10} y={topY} label="h" subscript="t-1" value={params.hiddenH} align="end" isInput={true} />
      <IOLabel x={concatX} y={480} label="x" subscript="t" value={params.inputX} align="middle" isInput={true} />
      <IOLabel x={rightX + 10} y={250} label="h" subscript="t" value={steps.add === 'done' ? result.finalH : undefined} align="start" isInput={false} />

      {/* === TOP HIGHWAY (h_{t-1}) === */}
      <Line d={`M ${leftX} ${topY} L ${multX} ${topY}`} type="data" isActive={true} />

      {/* Branch h_{t-1} down to merge node */}
      <Line d={`M ${concatX} ${topY} L ${concatX} ${bottomY - 20}`} type="data" isActive={steps.concat === 'active'} />

      {/* === DATA BUS (Bottom) === */}
      {/* x_t input coming from below to merge */}
      <Line d={`M ${concatX} 460 L ${concatX} ${bottomY + 20}`} type="data" isActive={steps.concat === 'active'} />

      {/* Merge node */}
      <Node x={concatX} y={bottomY} type="+" label="Merge" state={steps.concat}
        value={steps.concat === 'done' ? concatVal : undefined} onClick={() => computeStep('concat')} />

      {/* Bus Line running right from merge */}
      <Line d={`M ${concatX + 20} ${bottomY} L ${gateX} ${bottomY}`} type="data" isActive={steps.gates === 'active' || steps.gates === 'done'} />

      {/* === GATES === */}
      {/* To Sigma (up from bus) */}
      <Line d={`M ${gateX - 50} ${bottomY} L ${gateX - 50} ${sigmaY + 25} L ${gateX} ${sigmaY + 25}`}
        type="data" isActive={steps.gates === 'active' || steps.gates === 'done'} />
      <Node x={gateX} y={sigmaY} type="σ" label="Update (u)" state={steps.gates}
        value={steps.gates === 'done' ? result.gate1 : undefined} onClick={() => computeStep('gates')} />

      {/* To Tanh (continue along bus) */}
      <Line d={`M ${gateX - 50} ${bottomY} L ${gateX} ${bottomY}`}
        type="data" isActive={steps.gates === 'active' || steps.gates === 'done'} />
      <Node x={gateX} y={bottomY} type="tanh" label="Cand (s)" state={steps.gates}
        value={steps.gates === 'done' ? result.candidateState : undefined} onClick={() => computeStep('gates')} />

      {/* === INTERPOLATION LOGIC === */}

      {/* Path A: u * h_{t-1} */}
      <Line d={`M ${gateX} ${sigmaY - 25} L ${gateX} ${topY + 25} L ${multX} ${topY + 25}`} type="control" isActive={steps.interp === 'active' || steps.interp === 'done'} />
      <Node x={multX} y={topY} type="×" label="Keep" state={steps.interp} onClick={() => computeStep('interp')} small />

      {/* Path B: (1-u) * s */}
      <Line d={`M ${gateX} ${sigmaY - 25} L ${oneMinusX} ${sigmaY - 25}`} type="control" isActive={steps.interp === 'active' || steps.interp === 'done'} />
      <Node x={oneMinusX} y={sigmaY - 25} type="1-" state={steps.gates === 'done' ? 'active' : 'pending'} small />

      {/* (1-u) goes to bottom mult node */}
      <Line d={`M ${oneMinusX + 15} ${sigmaY - 25} L ${multX} ${sigmaY - 25} L ${multX} ${bottomY - 25}`} type="control" isActive={steps.interp === 'active' || steps.interp === 'done'} />

      {/* s output goes to bottom mult node */}
      <Line d={`M ${gateX + 25} ${bottomY} L ${multX - 20} ${bottomY}`} type="data" isActive={steps.interp === 'active' || steps.interp === 'done'} />
      <Node x={multX} y={bottomY} type="×" label="Add New" state={steps.interp} onClick={() => computeStep('interp')} small />

      {/* === FINAL SUM (+) === */}
      <Line d={`M ${multX + 20} ${topY} L ${addX} ${topY} L ${addX} ${250 - 20}`} type="data" isActive={steps.add === 'active' || steps.add === 'done'} />
      <Line d={`M ${multX + 20} ${bottomY} L ${addX} ${bottomY} L ${addX} ${250 + 20}`} type="data" isActive={steps.add === 'active' || steps.add === 'done'} />

      <Node x={addX} y={250} type="+" label="Blend" state={steps.add}
        value={steps.add === 'done' ? result.finalH : undefined} onClick={() => computeStep('add')} />

      {/* Output h_t */}
      <Line d={`M ${addX + 20} 250 L ${rightX} 250`} type="data" isActive={steps.add === 'done'} />

    </svg>
  );
};


// ============ GRU - Corrected Architecture ============
const GRUDiagram: React.FC<{
  params: SimulationParams; result: SimulationResult; onComplete: () => void;
}> = ({ params, result, onComplete }) => {
  const [steps, setSteps] = useState({
    concat: 'active' as StepState,
    gates: 'pending' as StepState, // Reset and Update compute in parallel
    resetMult: 'pending' as StepState, // r * h
    candidate: 'pending' as StepState, // tanh(x + r*h)
    interp: 'pending' as StepState, // u*h and (1-u)*cand
    add: 'pending' as StepState
  });

  useEffect(() => {
    setSteps({ concat: 'active', gates: 'pending', resetMult: 'pending', candidate: 'pending', interp: 'pending', add: 'pending' });
  }, [params.inputX, params.hiddenH]);

  const computeStep = useCallback((step: string) => {
    setSteps(prev => ({ ...prev, [step]: 'computing' }));
    setTimeout(() => {
      setSteps(prev => {
        const n = { ...prev, [step]: 'done' as StepState };
        // Flow: concat -> gates -> resetMult -> candidate -> interp -> add
        if (step === 'concat') { n.gates = 'active'; }
        else if (step === 'gates') { n.resetMult = 'active'; }
        else if (step === 'resetMult') { n.candidate = 'active'; }
        else if (step === 'candidate') { n.interp = 'active'; }
        else if (step === 'interp') { n.add = 'active'; }
        else if (step === 'add') {
          setTimeout(onComplete, 400);
        }
        return n;
      });
    }, 500);
  }, [onComplete]);

  // Layout Constants
  const W = 1100, H = 560;

  // Vertical Levels
  const topY = 120;     // h_{t-1} highway
  const gateY = 220;    // Reset/Update gates
  const candY = 320;    // Candidate calc
  const bottomY = 450;  // Input x_t / Bus

  // Horizontal Columns
  const leftX = 150;    // Increased to show h_{t-1} value box
  const concatX = 250;
  const resetGateX = 370;
  const updateGateX = 490;
  const resetMultX = 370; // Aligned with reset gate
  const candX = 610;
  const interpX = 770;
  const addX = 890;
  const rightX = W - 140;

  const concatVal = params.inputX.map((v, i) => v + (params.hiddenH[i] || 0));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
      <Styles />
      <rect width={W} height={H} fill={COLORS.canvasBg} />

      <rect x={190} y={60} width={750} height={420} rx={16}
        fill="rgba(30,41,59,0.3)" stroke="#334155" strokeWidth={2} />

      {/* === I/O LABELS === */}
      {/* h_{t-1} label with enough left space */}
      <IOLabel x={leftX - 10} y={topY} label="h" subscript="t-1" value={params.hiddenH} align="end" isInput={true} />
      <IOLabel x={concatX} y={500} label="x" subscript="t" value={params.inputX} align="middle" isInput={true} />

      {/* === INPUTS === */}
      {/* x_t line */}
      <Line d={`M ${concatX} 490 L ${concatX} ${bottomY}`} type="data" isActive={steps.concat === 'active'} />

      {/* h_{t-1} line (Top Highway) - stops at interp mult node */}
      <Line d={`M ${leftX} ${topY} L ${interpX - 15} ${topY}`} type="data" isActive={true} />

      {/* Drawing h_{t-1} dropping to concat */}
      <Line d={`M ${concatX} ${topY} L ${concatX} ${bottomY}`} type="data" isActive={steps.concat === 'active'} />

      {/* Merge Node */}
      <Node x={concatX} y={bottomY} type="+" label="Merge" state={steps.concat}
        value={steps.concat === 'done' ? concatVal : undefined} onClick={() => computeStep('concat')} />

      {/* === GATES (Parallel) === */}
      {/* From Concat/Bus to Gates */}
      <Line d={`M ${concatX + 20} ${bottomY} L ${resetGateX} ${bottomY} L ${resetGateX} ${gateY + 25}`}
        type="data" isActive={steps.gates === 'active' || steps.gates === 'done'} />
      <Line d={`M ${resetGateX} ${bottomY} L ${updateGateX} ${bottomY} L ${updateGateX} ${gateY + 25}`}
        type="data" isActive={steps.gates === 'active' || steps.gates === 'done'} />

      <Node x={resetGateX} y={gateY} type="σ" label="Reset (r)" state={steps.gates}
        value={steps.gates === 'done' ? result.gate1 : undefined} onClick={() => computeStep('gates')} />
      <Node x={updateGateX} y={gateY} type="σ" label="Update (z)" state={steps.gates}
        value={steps.gates === 'done' ? result.gate2 : undefined} onClick={() => computeStep('gates')} />

      {/* === RESET LOGIC === */}
      {/* h_{t-1} branch to reset mult */}
      <Line d={`M ${resetMultX} ${topY} L ${resetMultX} ${gateY - 75}`} type="data" isActive={steps.gates === 'done'} />

      {/* r output goes to mult (bottom of node) */}
      <Line d={`M ${resetGateX} ${gateY - 25} L ${resetGateX} ${gateY - 45}`} type="control" isActive={steps.resetMult === 'active' || steps.resetMult === 'done'} />

      <Node x={resetGateX} y={gateY - 60} type="×" label="Reset" state={steps.resetMult} onClick={() => computeStep('resetMult')} small />

      {/* === CANDIDATE === */}
      {/* x_t flows from bottom bus to Candidate */}
      <Line d={`M ${updateGateX} ${bottomY} L ${candX} ${bottomY} L ${candX} ${candY + 25}`} type="data" isActive={steps.resetMult === 'done'} />

      {/* r*h flows to Candidate (top of node) */}
      <Line d={`M ${resetGateX + 15} ${gateY - 60} L ${candX} ${gateY - 60} L ${candX} ${candY - 25}`} type="data" isActive={steps.resetMult === 'done'} />

      <Node x={candX} y={candY} type="tanh" label="Cand (ñ)" state={steps.candidate}
        value={steps.candidate === 'done' ? result.candidateState : undefined} onClick={() => computeStep('candidate')} />

      {/* === INTERPOLATION (Update Gate) === */}
      {/* z goes up to (1-) node - stops at bottom */}
      <Line d={`M ${updateGateX} ${gateY - 25} L ${updateGateX} ${topY + 65}`} type="control" isActive={steps.interp === 'active' || steps.interp === 'done'} />
      <Node x={updateGateX} y={topY + 50} type="1-" state={steps.gates === 'done' ? 'active' : 'pending'} small />

      {/* (1-z) goes to Top Mult (h_{t-1}) - stops at bottom */}
      <Line d={`M ${updateGateX + 15} ${topY + 50} L ${interpX} ${topY + 50} L ${interpX} ${topY + 15}`} type="control" isActive={steps.interp === 'active' || steps.interp === 'done'} />
      <Node x={interpX} y={topY} type="×" label="Keep" state={steps.interp} onClick={() => computeStep('interp')} small />

      {/* Direct z to Bottom Mult (Candidate) - stops at top */}
      <Line d={`M ${updateGateX + 20} ${gateY} L ${interpX} ${gateY} L ${interpX} ${candY - 15}`} type="control" isActive={steps.interp === 'active' || steps.interp === 'done'} />

      {/* Candidate output to Bottom Mult - stops at left */}
      <Line d={`M ${candX + 25} ${candY} L ${interpX - 15} ${candY}`} type="data" isActive={steps.interp === 'active' || steps.interp === 'done'} />
      <Node x={interpX} y={candY} type="×" label="Update" state={steps.interp} onClick={() => computeStep('interp')} small />

      {/* === FINAL ADD === */}
      {/* Join Top and Bottom Mults */}
      <Line d={`M ${interpX + 15} ${topY} L ${addX} ${topY} L ${addX} ${gateY - 20}`} type="data" isActive={steps.add === 'active' || steps.add === 'done'} />
      <Line d={`M ${interpX + 15} ${candY} L ${addX} ${candY} L ${addX} ${gateY + 20}`} type="data" isActive={steps.add === 'active' || steps.add === 'done'} />

      <Node x={addX} y={gateY} type="+" label="Blend" state={steps.add}
        value={steps.add === 'done' ? result.finalH : undefined} onClick={() => computeStep('add')} />

      {/* Output */}
      <Line d={`M ${addX + 20} ${gateY} L ${rightX} ${gateY}`} type="data" isActive={steps.add === 'done'} />
      <IOLabel x={rightX + 10} y={gateY} label="h" subscript="t" value={steps.add === 'done' ? result.finalH : undefined} align="start" isInput={false} />

    </svg>
  );
};


// ============ LSTM - Corrected Architecture ============
const LSTMDiagram: React.FC<{
  params: SimulationParams; result: SimulationResult; onComplete: () => void;
}> = ({ params, result, onComplete }) => {
  const [steps, setSteps] = useState({
    concat: 'active' as StepState,
    gates: 'pending' as StepState,
    gating: 'pending' as StepState,
    cellUpdate: 'pending' as StepState,
    outputCalc: 'pending' as StepState
  });

  useEffect(() => {
    setSteps({ concat: 'active', gates: 'pending', gating: 'pending', cellUpdate: 'pending', outputCalc: 'pending' });
  }, [params.inputX, params.hiddenH, params.cellC]);

  const computeStep = useCallback((step: string) => {
    setSteps(prev => ({ ...prev, [step]: 'computing' }));
    setTimeout(() => {
      setSteps(prev => {
        const n = { ...prev, [step]: 'done' as StepState };
        if (step === 'concat') { n.gates = 'active'; }
        else if (step === 'gates') { n.gating = 'active'; }
        else if (step === 'gating') { n.cellUpdate = 'active'; }
        else if (step === 'cellUpdate') { n.outputCalc = 'active'; }
        else if (step === 'outputCalc') {
          setTimeout(onComplete, 400);
        }
        return n;
      });
    }, 500);
  }, [onComplete]);

  // Layout - Wide enough to fit all elements
  const W = 1200, H = 600;

  // Levels
  const cellY = 100;     // Top Highway (C)
  const gateMultY = 180; // Multiplications above gates
  const gateY = 280;     // Gates Level
  const busY = 440;      // Data Bus
  const inputY = 520;    // Input Source

  // Columns
  const leftX = 140;
  const concatX = 260;

  const forgetX = 380;
  const inputX = 500;
  const candX = 620;
  const outputX = 740;

  const fMultX = 380; // Align with Forget
  const iMultX = 560; // (500 + 620) / 2 -> Exact center
  const addX = 680;   // On Cell Highway

  const finalTanhX = 840;
  const finalMultX = 940;
  const rightX = W - 150;

  const concatVal = params.inputX.map((v, i) => v + (params.hiddenH[i] || 0));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
      <Styles />
      <rect width={W} height={H} fill={COLORS.canvasBg} />

      <rect x={120} y={60} width={930} height={420} rx={16}
        fill="rgba(30,41,59,0.3)" stroke="#334155" strokeWidth={2} />

      {/* === I/O LABELS === */}
      <IOLabel x={leftX - 10} y={cellY} label="C" subscript="t-1" value={params.cellC} align="end" isInput={true} />
      <IOLabel x={leftX - 10} y={busY} label="h" subscript="t-1" value={params.hiddenH} align="end" isInput={true} />
      <IOLabel x={concatX} y={inputY + 40} label="x" subscript="t" value={params.inputX} align="middle" isInput={true} />

      {/* === I/O SOURCES === */}
      {/* C_{t-1} Top Highway */}
      <Line d={`M ${leftX} ${cellY} L ${fMultX} ${cellY}`} type="data" isActive={true} />

      {/* h_{t-1} to Bus */}
      <Line d={`M ${leftX} ${busY} L ${concatX} ${busY}`} type="data" isActive={true} />

      {/* x_t to Bus */}
      <Line d={`M ${concatX} ${inputY} L ${concatX} ${busY}`} type="data" isActive={steps.concat === 'active'} />

      {/* Merge Node */}
      <Node x={concatX} y={busY} type="+" label="Merge" state={steps.concat}
        value={steps.concat === 'done' ? concatVal : undefined} onClick={() => computeStep('concat')} />

      {/* === DATA BUS === */}
      <Line d={`M ${concatX + 20} ${busY} L ${outputX} ${busY}`} type="data" isActive={steps.gates === 'active' || steps.gates === 'done'} />

      {/* === FOUR HEADS (Vertical Taps) === */}

      {/* 1. Forget Gate */}
      <Line d={`M ${forgetX} ${busY} L ${forgetX} ${gateY + 25}`} type="data" isActive={steps.gates === 'active' || steps.gates === 'done'} />
      <Node x={forgetX} y={gateY} type="σ" label="Forget (f)" state={steps.gates}
        value={steps.gates === 'done' ? result.gate1 : undefined} onClick={() => computeStep('gates')} />

      {/* 2. Input Gate */}
      <Line d={`M ${inputX} ${busY} L ${inputX} ${gateY + 25}`} type="data" isActive={steps.gates === 'active' || steps.gates === 'done'} />
      <Node x={inputX} y={gateY} type="σ" label="Input (i)" state={steps.gates}
        value={steps.gates === 'done' ? result.gate2 : undefined} onClick={() => computeStep('gates')} />

      {/* 3. Candidate */}
      <Line d={`M ${candX} ${busY} L ${candX} ${gateY + 25}`} type="data" isActive={steps.gates === 'active' || steps.gates === 'done'} />
      <Node x={candX} y={gateY} type="tanh" label="Cand (C̃)" state={steps.gates}
        value={steps.gates === 'done' ? result.candidateState : undefined} onClick={() => computeStep('gates')} />

      {/* 4. Output Gate */}
      <Line d={`M ${outputX} ${busY} L ${outputX} ${gateY + 25}`} type="data" isActive={steps.gates === 'active' || steps.gates === 'done'} />
      <Node x={outputX} y={gateY} type="σ" label="Output (o)" state={steps.gates}
        value={steps.gates === 'done' ? result.gate3 : undefined} onClick={() => computeStep('gates')} />

      {/* === CELL UPDATE LOGIC === */}

      {/* Forget * C_{t-1} */}
      {/* f goes up to Cell Highway */}
      <Line d={`M ${forgetX} ${gateY - 25} L ${forgetX} ${cellY + 25} L ${fMultX} ${cellY + 25}`} type="control" isActive={steps.gating === 'active' || steps.gating === 'done'} />
      <Node x={fMultX} y={cellY} type="×" label="Forget" state={steps.gating} onClick={() => computeStep('gating')} small />

      {/* Input * Candidate */}
      {/* Grouping: i and C~ meet at iMultX */}
      <Line d={`M ${inputX} ${gateY - 25} L ${inputX} ${gateMultY} L ${iMultX - 15} ${gateMultY}`} type="control" isActive={steps.gating === 'active' || steps.gating === 'done'} />
      <Line d={`M ${candX} ${gateY - 25} L ${candX} ${gateMultY} L ${iMultX + 15} ${gateMultY}`} type="data" isActive={steps.gating === 'active' || steps.gating === 'done'} />
      <Node x={iMultX} y={gateMultY} type="×" label="New Info" state={steps.gating} onClick={() => computeStep('gating')} small />

      {/* Add New Info to Cell */}
      <Line d={`M ${fMultX + 20} ${cellY} L ${addX} ${cellY}`} type="data" isActive={steps.cellUpdate === 'active' || steps.cellUpdate === 'done'} />
      <Line d={`M ${iMultX} ${gateMultY - 25} L ${iMultX} ${cellY + 25} L ${addX} ${cellY + 25}`} type="data" isActive={steps.cellUpdate === 'active' || steps.cellUpdate === 'done'} />

      <Node x={addX} y={cellY} type="+" label="Add" state={steps.cellUpdate}
        value={steps.cellUpdate === 'done' ? result.finalC : undefined} onClick={() => computeStep('cellUpdate')} />

      {/* Cell State Output */}
      <Line d={`M ${addX + 20} ${cellY} L ${rightX} ${cellY}`} type="data" isActive={steps.cellUpdate === 'done'} />
      <IOLabel x={rightX + 10} y={cellY} label="C" subscript="t" value={steps.cellUpdate === 'done' ? result.finalC : undefined} align="start" isInput={false} />

      {/* === FINAL HIDDEN OUTPUT === */}

      {/* Drop from C_t to Tanh */}
      <Line d={`M ${finalTanhX} ${cellY} L ${finalTanhX} ${gateMultY - 25}`} type="data" isActive={steps.outputCalc === 'active' || steps.outputCalc === 'done'} />
      <Node x={finalTanhX} y={gateMultY} type="tanh" state={steps.outputCalc}
        value={steps.outputCalc === 'done' ? result.tanhC : undefined} onClick={() => computeStep('outputCalc')} small />

      {/* Path from Tanh to Mult */}
      <Line d={`M ${finalTanhX + 15} ${gateMultY} L ${finalMultX} ${gateMultY} L ${finalMultX} ${gateY - 20}`} type="data" isActive={steps.outputCalc === 'active' || steps.outputCalc === 'done'} />

      {/* Path from Output Gate to Mult */}
      <Line d={`M ${outputX + 25} ${gateY} L ${finalMultX - 20} ${gateY}`} type="control" isActive={steps.outputCalc === 'active' || steps.outputCalc === 'done'} />

      <Node x={finalMultX} y={gateY} type="×" label="Out" state={steps.outputCalc}
        value={steps.outputCalc === 'done' ? result.finalH : undefined} onClick={() => computeStep('outputCalc')} small />

      {/* Final h_t output */}
      <Line d={`M ${finalMultX + 20} ${gateY} L ${rightX} ${gateY}`} type="data" isActive={steps.outputCalc === 'done'} />
      <IOLabel x={rightX + 10} y={gateY} label="h" subscript="t" value={steps.outputCalc === 'done' ? result.finalH : undefined} align="start" isInput={false} />

    </svg>
  );
};

export const VisualizerSVG: React.FC<VisualizerProps> = ({ type, params, result, onStepComplete }) => {
  const handleComplete = useCallback(() => { onStepComplete?.(); }, [onStepComplete]);

  switch (type) {
    case ModelType.UGRNN: return <UGRNNDiagram params={params} result={result} onComplete={handleComplete} />;
    case ModelType.GRU: return <GRUDiagram params={params} result={result} onComplete={handleComplete} />;
    case ModelType.LSTM: return <LSTMDiagram params={params} result={result} onComplete={handleComplete} />;
    default: return null;
  }
};
