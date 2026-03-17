#  PDA Simulator

> **Visualize & Simulate Pushdown Automata in Real-Time**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-pdasimulator.vercel.app-6366F1?style=for-the-badge&logo=vercel)](https://pdasimulator.vercel.app)
[![GitHub](https://img.shields.io/badge/GitHub-abhinav--phi-22C55E?style=for-the-badge&logo=github)](https://github.com/abhinav-phi/pushdown-automata-simulator)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)

---

## 📌 About

**PDA Simulator** is an interactive web-based tool for visualizing and simulating **Pushdown Automata (PDA)** — a fundamental concept in the Theory of Computation.

Built for students and educators, this tool makes it easy to:
- Define a PDA visually
- Run step-by-step simulations
- Understand stack operations in real-time
- Test multiple input strings instantly

---

## ✨ Features

| Feature | Description |
|--------|-------------|
|  **PDA Definition Panel** | Add states, transitions, alphabets visually |
|  **Step-by-Step Simulation** | Walk through each transition one at a time |
|  **Auto Run** | Run the entire simulation instantly |
|  **State Diagram** | Live Cytoscape.js graph that updates as you build |
|  **Stack Visualization** | See the stack contents change in real-time |
|  **Execution Log** | Detailed log of every transition applied |
|  **Input Testing Panel** | Test multiple strings and see Accept/Reject instantly |
|  **Preloaded Examples** | aⁿbⁿ, Balanced Parentheses, Palindromes, 0ⁿ1ⁿ |
|  **Dark / Light Mode** | Toggle between themes |
|  **Responsive Design** | Works on desktop and mobile |

---

## 🖥️ Screenshots

> *3-column layout: PDA Definition | State Diagram | Stack + Simulation*

![PDA Simulator Screenshot](public/pda.png)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/abhinav-phi/pushdown-automata-simulator.git

# Navigate to project
cd pushdown-automata-simulator

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
```

---

## 🧠 How It Works

A **Pushdown Automaton** is a computational model that uses a **stack** to process input strings. It extends finite automata with stack memory, making it powerful enough to recognize **context-free languages**.

### Simulation Engine
- Uses **Depth-First Search (DFS)** with backtracking
- Supports **nondeterministic** PDAs — explores all possible paths
- Finds the accepting path and replays it step-by-step

### Acceptance Modes
- **Final State** — accepts if input is consumed and current state is an accept state
- **Empty Stack** — accepts if input is consumed and stack is empty

---

## 🛠️ Tech Stack

- **Frontend:** React 18 + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Graph Visualization:** Cytoscape.js
- **Build Tool:** Vite
- **Deployment:** Vercel

---

## 📂 Project Structure

```
src/
├── components/
│   ├── PDADefinitionPanel.tsx   # Left panel — define states & transitions
│   ├── StateDiagram.tsx         # Center — Cytoscape.js graph
│   ├── StackVisualization.tsx   # Right — stack display
│   ├── SimulationControls.tsx   # Start / Step / Run All / Reset
│   ├── ExecutionLog.tsx         # Step-by-step log
│   ├── InputTestingPanel.tsx    # Batch input testing
│   ├── AppHeader.tsx            # Sticky header with theme toggle
│   └── AppFooter.tsx            # Footer with contact links
├── lib/
│   ├── pda-engine.ts            # Core simulation logic (DFS)
│   ├── pda-examples.ts          # Preloaded PDA examples
│   └── pda-types.ts             # TypeScript type definitions
└── pages/
    └── Index.tsx                # Main layout
```

---

## 📖 Preloaded Examples

| Example | Description | Sample Input |
|---------|-------------|--------------|
| **aⁿbⁿ** | Equal a's followed by b's | `aabb`, `aaabbb` |
| **Balanced Parentheses** | Matching brackets | `(())`, `(()())` |
| **Palindrome (even)** | Even-length palindromes | `abba`, `aabbaa` |
| **0ⁿ1ⁿ** | Equal 0's followed by 1's | `0011`, `000111` |

---

## 👨‍💻 Author

**Abhinav**

[![GitHub](https://img.shields.io/badge/GitHub-abhinav--phi-181717?style=flat&logo=github)](https://github.com/abhinav-phi)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=flat&logo=linkedin)](https://linkedin.com/in/YOUR_LINKEDIN)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<div align="center">
  Made with ❤️ by <strong>Abhinav</strong>
</div>