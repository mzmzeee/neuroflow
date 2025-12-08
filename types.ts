
export enum ModelType {
  UGRNN = 'UGRNN',
  GRU = 'GRU',
  LSTM = 'LSTM'
}

export interface SimulationParams {
  vectorSize: number; // 1, 2, or 3 usually for visualization
  inputX: number[];     // Vector x_t
  hiddenH: number[];    // Vector h_t-1
  cellC?: number[];     // Vector c_t-1 (LSTM only)
  
  // Biases (Scalars for simplicity of control)
  biasGate1: number; 
  biasGate2: number;
  biasGate3: number;
}

export interface SimulationResult {
  finalH: number[];
  finalC?: number[];
  
  // Gate Activations (0-1)
  gate1: number[]; 
  gate2: number[];
  gate3: number[];
  
  // Intermediate Tanh values (-1 to 1)
  candidateState: number[]; 
  tanhC?: number[]; // LSTM specific
}
