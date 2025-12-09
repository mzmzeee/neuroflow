# RNN Visualizer: UGRNN, GRU, & LSTM

A specialized educational tool for visualizing the internal arithmetic of Recurrent Neural Networks (RNNs). This project allows students to step through the computations of UGRNN, GRU, and LSTM cells interactively.

## Getting Started
## 🌐 Try it Live
**[Launch Interactive Demo →](https://your-app.vercel.app)**

No installation needed - runs directly in your browser!
### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher) installed.

### Installation

1.  Clone the repository or download the source code.
2.  Install dependencies:
    ```bash
    npm install
    ```

### Running the App

Start the development server:
```bash
npm run dev
```

Open your browser to:
`http://localhost:3000`

##  Interactive Modes

The application supports three common RNN architectures:

1.  **UGRNN (Update Gate RNN)**: A simplified GRU.
2.  **GRU (Gated Recurrent Unit)**: Standard gated unit.
3.  **LSTM (Long Short-Term Memory)**: Complex cell with forget/input/output gates.

### How to Use

1.  **Select a Model**: Use the tabs at the top (UGRNN, GRU, LSTM).
2.  **Configure Inputs**: Use the panel on the right to set input vector $x_t$ and hidden state $h_{t-1}$. You can also adjust gate biases.
3.  **Step-by-Step Compute**:
    - Click the **pulsing blue nodes** to perform operations (sigmoid $\sigma$, tanh, addition, multiplication).
    - Watch the data flow through the lines.
    - Vectors values are displayed at each step.
4.  **Advance Time**: Once all computations for the current step are complete (all nodes green), click **"Next Time Step"** to feed the new hidden state back into the next iteration.

## Key Features

- **Interactive Nodes**: Click to trigger matrix multiplications and activations.
- **Dynamic 1D-3D Vectors**: Toggle between 1, 2, or 3-dimensional vectors to see how element-wise operations work.
- **Visual Gating**: Explicitly visualize how gates (0 to 1) modulate information flow using the $1 - z$ and $\times$ operations.

## Technologies

- **React** with TypeScript
- **Vite** for fast tooling
- **SVG** for high-performance custom diagrams
- **Tailwind CSS** for styling
