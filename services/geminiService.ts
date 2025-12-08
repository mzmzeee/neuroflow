import { GoogleGenAI } from "@google/genai";
import { ModelType, SimulationParams, SimulationResult } from '../types';
import { fmtVec } from '../utils/math';

export const explainSimulation = async (
  type: ModelType, 
  params: SimulationParams, 
  result: SimulationResult
): Promise<string> => {
  if (!process.env.API_KEY) {
    return "API Key not configured in environment.";
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    You are an expert in Deep Learning teaching a student.
    
    Context:
    The user is simulating a ${type} (Recurrent Neural Network) cell.
    
    Current Inputs:
    - Input x_t: ${fmtVec(params.inputX)}
    - Hidden h_{t-1}: ${fmtVec(params.hiddenH)}
    ${type === ModelType.LSTM ? `- Cell State c_{t-1}: ${fmtVec(params.cellC)}` : ''}
    
    Gate Settings (Manual Bias adjustments):
    - Gate 1 Bias: ${params.biasGate1}
    - Gate 2 Bias: ${params.biasGate2}
    - Gate 3 Bias: ${params.biasGate3}
    
    Resulting Activations:
    - Gate 1 Activation: ${fmtVec(result.gate1)}
    - Gate 2 Activation: ${fmtVec(result.gate2)}
    ${type === ModelType.LSTM ? `- Gate 3 Activation: ${fmtVec(result.gate3)}` : ''}
    - Final Hidden State: ${fmtVec(result.finalH)}
    
    Task:
    Briefly explain (in 2-3 sentences) why the output changed the way it did based on these specific gate values. 
    Focus on the "flow" of information. For example, if the forget gate is 0, mention that the memory was wiped.
    Do not mention the mathematical formulas explicitly, focus on intuition.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text || "Could not generate explanation.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Failed to fetch AI explanation. Please check your API key.";
  }
};