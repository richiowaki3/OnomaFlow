# Onomatopoeia Matrix Lab

A high-density 3D particle simulation that visualizes linguistic input (onomatopoeia) as physical motion. Using an LLM-based analysis backend, words are converted into 12-dimensional physical vectors and visualized on a 60x60 particle grid.

## Features
- **Enriched 2,142-Word Dictionary**: Powered by [OnomaDict v4.0](https://github.com/richiowaki3/OnomaDict) with 3D Mocap Kinematics and multimodal physics grounding.
- **12D Physical & Acoustic Parameters**: Visualizes Weight, Time, Space, Flow, Hardness, Moisture, Frequency, Decay, Reynolds Number, Boyle Number, Temperature, and Color.
- **Procedural Web Audio Engine**: Real-time formant and modal acoustic synthesis synchronized with particle motion.
- **Aesthetic 3D Visualization**: Built with Three.js, featuring smooth transitions and auto-rotation.
- **Glassmorphism UI**: Minimalist, text-based dashboard for real-time monitoring.

## Tech Stack
- **Frontend**: HTML5, Vanilla CSS, Three.js, Web Audio API
- **Backend**: Node.js, Express
- **Dictionary & Physics**: OnomaDict enriched dataset (2,142 Japanese onomatopoeia entries)

## Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/richiowaki3/OnomaFlow.git
   cd OnomaFlow
   ```
2. (Optional) Re-synchronize dictionary from OnomaDict:
   ```bash
   python update_dict_from_onomadict.py
   ```
3. Install dependencies & start server:
   ```bash
   npm install
   npm start
   ```
4. Open your browser at `http://localhost:8082` (or visit the live deployment at [onomaflow.onrender.com](https://onomaflow.onrender.com/)).

## License
MIT
