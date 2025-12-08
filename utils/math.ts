
import { SimulationParams, SimulationResult, ModelType } from '../types';

// --- Vector Math Helpers ---

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

// Formatter for vector display
export const fmtVec = (v: number[] | undefined): string => {
  if (!v) return '';
  return `[${v.map(n => n.toFixed(2)).join(', ')}]`;
};

export const calculateModel = (type: ModelType, params: SimulationParams): SimulationResult => {
  const { inputX, hiddenH, cellC, biasGate1, biasGate2, biasGate3 } = params;

  // Ensure all vectors match the requested size (sanity check)
  // In a real app we'd handle resizing more gracefully in the UI, but math assumes valid inputs.

  if (type === ModelType.UGRNN) {
    // UGRNN Logic
    // u = sigmoid(x + h + b_u)
    // s = tanh(x + h + b_s)
    // h_new = u * h_old + (1 - u) * s
    
    const sumXH = vecAdd(inputX, hiddenH);
    
    const u_t = vecSigmoid(sumXH, biasGate1);
    const s_t = vecTanh(sumXH, 0); // Assuming 0 bias for candidate in this simplified view
    
    // Interpolation
    // Note: The slide often shows (1-u)*s + u*h or similar. 
    // We follow standard UGRNN/GRU-like interpolation.
    // h_new = u * h + (1-u) * s
    const h_t = vecMix(u_t, hiddenH, s_t);

    return {
      finalH: h_t,
      gate1: u_t, // Update
      gate2: [],
      gate3: [],
      candidateState: s_t
    };
  } 
  else if (type === ModelType.GRU) {
    // GRU Logic
    // r = sigmoid(x + h + b_r)
    // z = sigmoid(x + h + b_z)
    // n = tanh(x + (r * h))  <-- Note: r is applied to h before mixing with x
    // h_new = (1 - z) * h + z * n
    
    const sumXH = vecAdd(inputX, hiddenH);
    
    const r_t = vecSigmoid(sumXH, biasGate1); // Reset
    const z_t = vecSigmoid(sumXH, biasGate2); // Update
    
    // Candidate calculation
    const r_h = vecMult(r_t, hiddenH);
    const sum_x_rh = vecAdd(inputX, r_h);
    const n_t = vecTanh(sum_x_rh, 0);
    
    // Final mix: h_t = (1-z)*h + z*n
    // Note: The generic vecMix is u*h + (1-u)s. 
    // If z is Update gate, typically h_new = (1-z)h + z*n.
    // Let's implement manually to be precise.
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
      candidateState: n_t
    };
  } 
  else {
    // LSTM Logic
    // f = sigmoid(x + h + b_f)
    // i = sigmoid(x + h + b_i)
    // o = sigmoid(x + h + b_o)
    // c_tilde = tanh(x + h)
    // c_new = f * c_old + i * c_tilde
    // h_new = o * tanh(c_new)

    const sumXH = vecAdd(inputX, hiddenH);

    const f_t = vecSigmoid(sumXH, biasGate1); // Forget
    const i_t = vecSigmoid(sumXH, biasGate2); // Input
    const o_t = vecSigmoid(sumXH, biasGate3); // Output

    const c_tilde = vecTanh(sumXH, 0);

    const prevC = cellC || Array(inputX.length).fill(0);

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
      tanhC: tanh_c
    };
  }
};
