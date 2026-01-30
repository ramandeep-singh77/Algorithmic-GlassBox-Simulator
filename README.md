# Glass Box Pathfinding Simulator

An interactive educational tool for visualizing and understanding pathfinding algorithms (BFS, DFS, Dijkstra, A*) with step-by-step explanations and live introspection.

## 🚀 Features

- **4 Pathfinding Algorithms**: BFS, DFS, Dijkstra, and A* with visual step-by-step execution
- **Multiple Environments**: Abstract grid, city maps, campus layouts, dungeons, custom graphs, and real-world Google Maps
- **Explainable AI**: Natural language explanations adapted to different learning levels
- **Algorithm Comparison**: Side-by-side comparison of different algorithms
- **Live Introspection**: Real-time visualization of data structures (queues, stacks, heaps)
- **Mobile Responsive**: Optimized for desktop, tablet, and mobile devices
- **Interactive Controls**: Draw walls, set start/goal points, adjust algorithm parameters

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: CSS with responsive design
- **Maps**: Google Maps API integration
- **Deployment**: Vercel-ready

## 📱 Mobile Optimizations

- Touch-friendly controls with 44px minimum touch targets
- Responsive grid layouts that stack on smaller screens
- Optimized button groupings and spacing for mobile
- Improved typography and contrast for mobile viewing
- Gesture-friendly interface elements

## 🚀 Quick Start

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:5173
```

### Build for Production

```bash
# Build the project
npm run build

# Preview the build
npm run preview
```

## 🌐 Deploy to Vercel

### Option 1: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow the prompts to configure your project
```

### Option 2: GitHub Integration

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your GitHub repository
4. Vercel will automatically detect the Vite configuration
5. Deploy with default settings

### Option 3: Manual Deploy

1. Run `npm run build`
2. Upload the `dist` folder to your hosting provider
3. Configure your server to serve `index.html` for all routes

## 🔧 Configuration

### Google Maps Setup (for Real-World Map mode)

If you see "This page can't load Google Maps correctly":

1. **Enable APIs**: In Google Cloud Console, enable:
   - Maps JavaScript API
   - Directions API (for route fetching)

2. **Check API key**: The key in `index.html` must:
   - Have HTTP referrer restrictions allowing `localhost` and your domain
   - Have billing enabled (Google Maps requires billing, but has free tier)

3. **Update key**: If needed, replace the key in `index.html` with your own.

## 📚 How to Use

1. **Choose Environment**: Select from grid, city, campus, dungeon, custom, or real-world maps
2. **Select Algorithm**: Pick BFS, DFS, Dijkstra, or A*
3. **Set Parameters**: Configure heuristics (for A*), learning level, and explanation mode
4. **Draw/Edit**: Add walls, set start and goal points
5. **Run**: Execute the algorithm and watch step-by-step visualization
6. **Learn**: Read explanations and analyze algorithm performance

### Detailed Controls

- **Environment**: Switch between `Abstract Grid` and real-world-style maps (City / Campus / Dungeon)
- **Draw walls**: Select `🧱 Walls`, click/drag on the grid
- **Erase**: Select `🧽 Erase`, click/drag
- **Set Start/Goal**: Select `🟢 Start` / `🎯 Goal`, then click a cell or node
- **Run**: Click `Run` to generate a full trace
- **Replay**: Use `▶️ Play/⏸️ Pause`, `⏮️ Previous`, `⏭️ Next` to step through execution
- **Explain Mode**: Toggle explanations and "why-not" comparisons
- **Learning Level**: Choose beginner (detailed), intermediate, or advanced (silent)
- **Comparison Mode**: Toggle ON, pick a second algorithm, run both simultaneously

## 🎯 Algorithm Details

- **BFS (Breadth-First Search)**: Explores nodes level by level, guarantees shortest path on unweighted graphs
- **DFS (Depth-First Search)**: Explores as far as possible before backtracking, fast but not optimal
- **Dijkstra**: Finds shortest path in weighted graphs, optimal but slower than A*
- **A***: Uses heuristics to guide search toward goal, optimal and efficient

## 🏗️ Architecture

The project follows a modular architecture:

- **UI Layer**: React components for visualization and controls
- **Explainable AI Layer**: Natural language generation and algorithm analysis
- **Core Engine**: Algorithm implementations and data structures

### Directory Structure

- `src/core/`: Algorithm engine, data structures, environments
  - `types.ts`: Shared contracts (grid, trace steps, frontier items)
  - `grid.ts`: Coordinate helpers + path reconstruction
  - `engine/buildTrace.ts`: Step-by-step trace generator
  - `environments/catalog.ts`: Built-in environments
  - `structures/MinHeap.ts`: Priority queue for Dijkstra/A*
- `src/xai/`: Explainable AI components
  - `narrator.ts`: Natural-language explanations per step
  - `dna.ts`: Algorithm DNA fingerprint + summaries
- `src/ui/`: React components and state management
  - `App.tsx`: Main layout + playback orchestration
  - `components/`: Grid canvas, graph canvas, controls, panels
  - `state/simulator.ts`: Reducer/state model

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Extensions (Future Ideas)

- Add diagonal movement + weighted terrain
- Add heap "swap animation" timeline (bubble-up/down events)
- Add quizzes ("Which node expands next?") driven from step analysis
- Add more algorithms (Greedy Best-First, Bidirectional BFS, Jump Point Search)