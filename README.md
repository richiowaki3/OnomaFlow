# Onomatopoeia Matrix Lab

A high-density 3D particle simulation that visualizes linguistic input (onomatopoeia) as physical motion. Using an LLM-based analysis backend, words are converted into 12-dimensional physical vectors and visualized on a 60x60 particle grid.

## Features
- **Real-time LLM Analysis**: Dynamics, texture, and acoustics are analyzed from any input word.
- **12D Physical Parameters**: Visualizes Weight, Time, Space, Flow, Hardness, Moisture, Frequency, Decay, Reynolds Number, and more.
- **Aesthetic 3D Visualization**: Built with Three.js, featuring smooth transitions and auto-rotation.
- **Glassmorphism UI**: Minimalist, text-based dashboard for real-time monitoring.

## Tech Stack
- **Frontend**: HTML5, Vanilla CSS, Three.js
- **Backend**: Node.js, Express
- **API Mapping**: LLM-driven vector mapping (Prompt-based)

## Setup
1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd matrix_demo
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```
4. Open your browser at `http://localhost:8082`.

## License
MIT
