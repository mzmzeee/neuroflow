
import { SimulationParams, SimulationResult, ModelType } from '../types';

// --- Vector Math Helpers ---

const matVecMul = (matrix: number[][], vector: number[]): number[] => {
  // M x N matrix dot N vector -> M vector
  if (!matrix || matrix.length === 0) return [];
  return matrix.map(row => {
    return row.reduce((sum, val, i) => sum + val * (vector[i] || 0), 0);
  });
};

const vecSigmoid = (v: number[], bias: number): number[] => {
  return v.map(x => 1 / (1 + Math.exp(-(x + bias))));
};

const vecTanh = (v: number[], bias: number = 0): number[] => {
  return v.map(x => Math.tanh(x + bias));
};

const vecAdd = (v1: number[], v2: number[]): number[] => {
  return v1.map((val, i) => val + (v2[i] || 0));
};

const vecMult = (v1: number[], v2: number[]): number[] => {
  return v1.map((val, i) => val * (v2[i] || 0));
};

const vecScalarMult = (s: number, v: number[]): number[] => {
  return v.map(val => val * s);
};

const vecMix = (u: number[], h: number[], s: number[]): number[] => {
  // h_t = u * h + (1-u) * s
  return h.map((val, i) => {
    const uVal = u[i];
    const sVal = s[i];
    return (uVal * val) + ((1 - uVal) * sVal);
  });
};

const vecConcat = (v1: number[], v2: number[]): number[] => {
  return [...v1, ...v2];
};

// Formatter for vector display
export const fmtVec = (v: number[] | undefined): string => {
  if (!v) return '';
  return `[${v.map(n => n.toFixed(2)).join(', ')}]`;
};

export const calculateModel = (type: ModelType, params: SimulationParams): SimulationResult => {
  const { 
    inputX, 
    hiddenH, 
    cellC, 
    biasGate1, 
    biasGate2, 
    biasGate3, 
    weightGate1 = [], 
    weightGate2 = [], 
    weightGate3 = [],
    weightCandidate = []
  } = params;

  // Common concatenation [h, x] (Hidden then Input)
  // User Requirement: "hidden are at the base of the array" -> [h_0, h_1, ..., x_0, x_1]
  const concatenated = vecConcat(hiddenH, inputX);

  if (type === ModelType.UGRNN) {
    // UGRNN Logic
    // u = sigmoid(W_u * (x + h) + b_u)
    // s = tanh(W_s * (x + h) + b_s)
    // h_new = u * h_old + (1 - u) * s
    
    // Gate 1 (Update Gate u)
    const lin_u = matVecMul(weightGate1, concatenated);
    const u_t = vecSigmoid(lin_u, biasGate1);
    
    // Candidate (s)
    // Note: Typically UGRNN candidate uses [x, h] directly
    const lin_s = matVecMul(weightCandidate, concatenated);
    const s_t = vecTanh(lin_s, 0); // Assuming 0 bias for candidate if not provided params
    
    const h_t = vecMix(u_t, hiddenH, s_t);

    return {
      finalH: h_t,
      gate1: u_t, // Update
      gate2: [],
      gate3: [],
      candidateState: s_t,
      concatenated: concatenated
    };
  } 
  else if (type === ModelType.GRU) {
    // GRU Logic
    // r = sigmoid(W_r * [x, h] + b_r)
    // z = sigmoid(W_z * [x, h] + b_z)
    // n = tanh(W_n * [x, r * h] + b_n)
    // h_new = (1 - z) * h + z * n
    
    // Gate 1 (Reset Gate r)
    const lin_r = matVecMul(weightGate1, concatenated);
    const r_t = vecSigmoid(lin_r, biasGate1);
    
    // Gate 2 (Update Gate z)
    const lin_z = matVecMul(weightGate2, concatenated);
    const z_t = vecSigmoid(lin_z, biasGate2);
    
    // Candidate Calculation
    // Apply reset gate to hidden state
    const r_h = vecMult(r_t, hiddenH);
    // User Requirement: "hidden at base" -> [r*h, x]
    const candConcat = vecConcat(r_h, inputX);
    
    const lin_n = matVecMul(weightCandidate, candConcat);
    const n_t = vecTanh(lin_n, 0); 

    // Final mix: h_t = (1-z)*h + z*n
    const h_t = hiddenH.map((h, i) => {
      const z = z_t[i];
      const n = n_t[i];
      return ((1 - z) * h) + (z * n);
    });

    return {
      finalH: h_t,
      gate1: r_t, // Reset
      gate2: z_t, // Update
      gate3: [],
      candidateState: n_t,
      concatenated: concatenated
    };
  } 
  else {
    // LSTM Logic
    // f = sigmoid(W_f * [x, h] + b_f)
    // i = sigmoid(W_i * [x, h] + b_i)
    // o = sigmoid(W_o * [x, h] + b_o)
    // c_tilde = tanh(W_c * [x, h])
    // c_new = f * c_old + i * c_tilde
    // h_new = o * tanh(c_new)

    // Gate 1 (Forget f)
    const lin_f = matVecMul(weightGate1, concatenated);
    const f_t = vecSigmoid(lin_f, biasGate1);
    
    // Gate 2 (Input i)
    const lin_i = matVecMul(weightGate2, concatenated);
    const i_t = vecSigmoid(lin_i, biasGate2);
    
    // Gate 3 (Output o)
    const lin_o = matVecMul(weightGate3, concatenated);
    const o_t = vecSigmoid(lin_o, biasGate3);

    // Candidate
    const lin_c = matVecMul(weightCandidate, concatenated);
    const c_tilde = vecTanh(lin_c, 0);

    const prevC = cellC || Array(hiddenH.length).fill(0);

    const term1 = vecMult(f_t, prevC);
    const term2 = vecMult(i_t, c_tilde);
    const c_t = vecAdd(term1, term2);
    
    const tanh_c = vecTanh(c_t);
    const h_t = vecMult(o_t, tanh_c);

    return {
      finalH: h_t,
      finalC: c_t,
      gate1: f_t,
      gate2: i_t,
      gate3: o_t,
      candidateState: c_tilde,
      tanhC: tanh_c,
      concatenated: concatenated
    };
  }
};
