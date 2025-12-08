import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { ModelType, SimulationParams, SimulationResult } from './types';
import { calculateModel } from './utils/math';
import { VisualizerSVG } from './components/VisualizerSVG';
import { Controls } from './components/Controls';
import { BrainCircuit, Info } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ModelType>(ModelType.UGRNN);
  const [timeStep, setTimeStep] = useState(0);
  const [canAdvance, setCanAdvance] = useState(false);

  // Initial Vector Size = 2 (matches the user's example)
  const [params, setParams] = useState<SimulationParams>({
    vectorSize: 2,
    inputX: [1.0, 0.0],
    hiddenH: [0.0, 0.0],
    cellC: [0.0, 0.0],
    biasGate1: 0,
    biasGate2: 0,
    biasGate3: 0
  });

  const result: SimulationResult = useMemo(() => {
    return calculateModel(activeTab, params);
  }, [activeTab, params]);

  // Reset when switching tabs
  useEffect(() => {
    setParams(p => ({
      ...p,
      biasGate1: 0,
      biasGate2: 0,
      biasGate3: 0,
      hiddenH: Array(p.vectorSize).fill(0),
      cellC: Array(p.vectorSize).fill(0)
    }));
    setTimeStep(0);
    setCanAdvance(false);
  }, [activeTab]);

  // Called when all nodes have been computed
  const handleStepComplete = useCallback(() => {
    setCanAdvance(true);
  }, []);

  // Advance to next time step
  const handleAdvance = useCallback(() => {
    setParams(prev => ({
      ...prev,
      hiddenH: result.finalH,
      cellC: activeTab === ModelType.LSTM ? result.finalC! : prev.cellC,
    }));
    setTimeStep(t => t + 1);
    setCanAdvance(false);
  }, [activeTab, result]);

  // Reset simulation
  const handleReset = useCallback(() => {
    setParams(prev => ({
      ...prev,
      hiddenH: Array(prev.vectorSize).fill(0),
      cellC: Array(prev.vectorSize).fill(0),
    }));
    setTimeStep(0);
    setCanAdvance(false);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-gray-200 flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-[1900px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/20">
              <BrainCircuit className="text-white" size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-100 tracking-tight">
                NeuroFlow
              </h1>
              <p className="text-xs text-slate-500">Interactive RNN Step-by-Step Visualizer</p>
            </div>
          </div>

          {/* Model Tabs */}
          <div className="flex bg-slate-900/80 rounded-xl p-1.5 border border-slate-800">
            {Object.values(ModelType).map((type) => (
              <button
                key={type}
                onClick={() => setActiveTab(type)}
                className={`px-8 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === type
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Time step indicator */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">Time Step:</span>
              <span className="font-mono text-xl font-bold text-blue-400 bg-blue-400/10 px-4 py-1.5 rounded-lg border border-blue-400/30">
                t = {timeStep}
              </span>
            </div>

            {/* Advance button - only shows when computation is complete */}
            {canAdvance && (
              <button
                onClick={handleAdvance}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white 
                  rounded-lg font-bold text-sm shadow-lg shadow-emerald-500/30
                  hover:from-emerald-500 hover:to-green-500 transition-all
                  animate-pulse"
              >
                → Next Time Step
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col lg:flex-row h-[calc(100vh-64px)]">

        {/* Visualizer Area */}
        <div className="flex-grow bg-slate-950 relative overflow-hidden flex items-center justify-center p-4">

          {/* Visualization */}
          <div className="w-full h-full max-w-[1200px] max-h-[700px] relative z-10">
            <VisualizerSVG
              type={activeTab}
              params={params}
              result={result}
              onStepComplete={handleStepComplete}
            />
          </div>

          {/* Info badge */}
          <div className="absolute bottom-4 left-4 flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/90 px-4 py-2 rounded-lg border border-slate-800">
              <Info size={14} />
              <span>{params.vectorSize}D Vectors • Click glowing nodes to compute</span>
            </div>
          </div>
        </div>

        {/* Controls Sidebar */}
        <div className="w-full lg:w-[380px] bg-slate-900/95 border-l border-slate-800 p-6 overflow-y-auto">
          <Controls
            type={activeTab}
            params={params}
            onChange={setParams}
            onStep={handleAdvance}
            onReset={handleReset}
            canAdvance={canAdvance}
          />
        </div>
      </main>
    </div>
  );
};

export default App;
