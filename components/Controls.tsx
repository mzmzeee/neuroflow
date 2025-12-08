import React from 'react';
import { ModelType, SimulationParams } from '../types';
import { Play, RotateCcw, Settings2, ChevronRight, FastForward } from 'lucide-react';

interface ControlsProps {
  type: ModelType;
  params: SimulationParams;
  onChange: (newParams: SimulationParams) => void;
  onStep: () => void;
  onReset: () => void;
  canAdvance: boolean;
}

// Vector input component with better styling
const VectorInput = ({
  label,
  value,
  onChange,
  color
}: {
  label: string;
  value: number[];
  onChange: (v: number[]) => void;
  color: string;
}) => {
  const handleChange = (index: number, valStr: string) => {
    // Handle empty string as 0
    const val = valStr === '' || valStr === '-' ? 0 : parseFloat(valStr);
    if (!isNaN(val)) {
      const newVec = [...value];
      newVec[index] = val;
      onChange(newVec);
    }
  };

  const colorClasses: Record<string, string> = {
    green: 'border-emerald-500/50 focus:border-emerald-400 focus:ring-emerald-400/20',
    blue: 'border-blue-500/50 focus:border-blue-400 focus:ring-blue-400/20',
    purple: 'border-purple-500/50 focus:border-purple-400 focus:ring-purple-400/20',
  };

  return (
    <div className="mb-5">
      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
        {label}
      </label>
      <div className="flex gap-2">
        {value.map((v, i) => (
          <div key={i} className="relative flex-1">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">
              [{i}]
            </span>
            <input
              type="number"
              step="0.1"
              value={v}
              onChange={(e) => handleChange(i, e.target.value)}
              className={`w-full bg-slate-800/80 border-2 rounded-lg pl-8 pr-2 py-2.5 text-sm font-mono text-white 
                focus:outline-none focus:ring-2 transition-all ${colorClasses[color] || colorClasses.blue}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

// Bias slider with better visuals
const BiasSlider = ({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) => (
  <div className="mb-4">
    <div className="flex justify-between text-xs mb-2">
      <span className="text-slate-400 font-medium">{label}</span>
      <span className="font-mono text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
        {value.toFixed(1)}
      </span>
    </div>
    <input
      type="range"
      min="-5"
      max="5"
      step="0.1"
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer 
        accent-amber-500 hover:accent-amber-400 transition-all"
    />
  </div>
);

export const Controls: React.FC<ControlsProps> = ({
  type,
  params,
  onChange,
  onStep,
  onReset,
  canAdvance
}) => {

  const updateVec = (key: keyof SimulationParams, val: number[]) => {
    onChange({ ...params, [key]: val });
  };

  const updateScalar = (key: keyof SimulationParams, val: number) => {
    onChange({ ...params, [key]: val });
  };

  const changeDim = (dim: number) => {
    const resize = (v: number[]) => {
      if (v.length === dim) return v;
      if (v.length > dim) return v.slice(0, dim);
      return [...v, ...Array(dim - v.length).fill(0)];
    };

    onChange({
      ...params,
      vectorSize: dim,
      inputX: resize(params.inputX),
      hiddenH: resize(params.hiddenH),
      cellC: params.cellC ? resize(params.cellC) : Array(dim).fill(0)
    });
  };

  const gateLabels = {
    UGRNN: { gate1: 'Update Gate (u) Bias' },
    GRU: { gate1: 'Reset Gate (r) Bias', gate2: 'Update Gate (z) Bias' },
    LSTM: { gate1: 'Forget Gate (f) Bias', gate2: 'Input Gate (i) Bias', gate3: 'Output Gate (o) Bias' }
  };

  return (
    <div className="flex flex-col h-full gap-5">

      {/* Instructions */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <h3 className="text-sm font-bold text-blue-400 mb-2">📘 Interactive Guide</h3>
        <ol className="text-xs text-slate-400 space-y-2 list-decimal list-inside leading-relaxed">
          <li>Adjust input vectors and biases below.</li>
          <li>Click the <span className="text-blue-400 font-bold glow">blue pulsing circles</span> in the diagram to compute each step.</li>
          <li>Follow the path of data execution.</li>
          <li>Once all nodes are <span className="text-emerald-400 font-bold">green</span>, click <strong>"Next Time Step"</strong> to continue.</li>
        </ol>
      </div>

      {/* Configuration Panel */}
      <div className="bg-slate-800/50 border border-slate-700 p-5 rounded-xl">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Settings2 size={16} className="text-purple-400" />
          Configuration
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">Vector Dimension</span>
          <div className="flex gap-1">
            {[1, 2, 3].map(d => (
              <button
                key={d}
                onClick={() => changeDim(d)}
                className={`w-10 h-10 rounded-lg text-sm font-bold transition-all 
                  ${params.vectorSize === d
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                  }`}
              >
                {d}D
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Input Vectors Panel */}
      <div className="bg-slate-800/50 border border-slate-700 p-5 rounded-xl">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <ChevronRight size={16} className="text-emerald-400" />
          Input Vectors
        </h3>

        <VectorInput
          label="Input x_t"
          value={params.inputX}
          onChange={(v) => updateVec('inputX', v)}
          color="green"
        />
        <VectorInput
          label="Hidden h_{t-1}"
          value={params.hiddenH}
          onChange={(v) => updateVec('hiddenH', v)}
          color="blue"
        />
        {type === ModelType.LSTM && (
          <VectorInput
            label="Cell c_{t-1}"
            value={params.cellC || Array(params.vectorSize).fill(0)}
            onChange={(v) => updateVec('cellC', v)}
            color="purple"
          />
        )}
      </div>

      {/* Gate Biases Panel */}
      <div className="bg-slate-800/50 border border-slate-700 p-5 rounded-xl flex-grow">
        <h3 className="text-sm font-bold text-white mb-4">
          Gate Biases
        </h3>

        <BiasSlider
          label={gateLabels[type]?.gate1 || 'Gate 1 Bias'}
          value={params.biasGate1}
          onChange={(v) => updateScalar('biasGate1', v)}
        />

        {type !== 'UGRNN' && (
          <BiasSlider
            label={gateLabels[type]?.gate2 || 'Gate 2 Bias'}
            value={params.biasGate2}
            onChange={(v) => updateScalar('biasGate2', v)}
          />
        )}

        {type === 'LSTM' && (
          <BiasSlider
            label={gateLabels.LSTM.gate3}
            value={params.biasGate3}
            onChange={(v) => updateScalar('biasGate3', v)}
          />
        )}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onReset}
          className="py-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl 
            flex items-center justify-center gap-2 font-bold text-sm 
            transition-all border border-slate-700 hover:border-slate-600"
        >
          <RotateCcw size={16} />
          Reset
        </button>

        <button
          onClick={onStep}
          disabled={!canAdvance}
          className={`py-3.5 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all
            ${canAdvance
              ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg shadow-emerald-600/30 hover:from-emerald-500 hover:to-green-500'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700 opacity-50'
            }`}
        >
          {canAdvance ? <Play size={16} /> : <FastForward size={16} />}
          {canAdvance ? 'Next Time Step' : 'Computing...'}
        </button>
      </div>
    </div>
  );
};
