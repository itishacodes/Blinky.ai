# 🤖 Blinky.ai — Neural Swarm Sandbox

**🟢 Play with the Live Sandbox Here:** [Blinky.ai Live Demo](https://itishacodes.github.io/Blinky.ai/)

Welcome to **Blinky.ai**, an interactive Artificial Intelligence playground built completely from scratch using pure JavaScript and Math. No external Machine Learning libraries (like TensorFlow) were used. 

The purpose of this project is to visually demonstrate how **Natural Selection** and **Evolution** work in code. You can draw walls, change settings, and watch the AI learn to navigate the maze in real-time!

---

## 🧠 What is the Purpose of this Project?
Imagine a group of blindfolded robots trying to find a target. At first, they will bump into walls and fail. But what if the ones that got the closest could pass their "smartness" to the next generation of robots? 

This project simulates exactly that using a **Genetic Algorithm**. It proves that complex AI behavior can be achieved simply by rewarding good performance and letting the system evolve over time.

---

## 🧬 How Does the AI Learn?

* **The Swarm (Blue Arrows):** These are our digital agents. Each one has a "DNA" made of random movement directions.
* **The Fitness Score:** When a generation ends (Lifespan Clock hits 400), every agent is given a score. The closer they are to the Green Target, the higher their score. If they hit a wall, they get a terrible score.
* **Evolution (Mating):** The agents with the highest scores get to combine their DNA to create the next generation. The bad performers are discarded.
* **The Elite Alpha (Yellow Arrow):** The single absolute best agent from the previous generation is kept exactly as it is, ensuring the AI never forgets its best path.
* **Mutation:** We introduce a tiny bit of random chaos (like a 2% mutation rate). This forces the agents to try new paths instead of just repeating the exact same steps.

---

## 🎮 How to Play with the Sandbox (Features)

This isn't just a video; it's a live laboratory. Here is what you can do using the Control Panel:

### 1. Live Vector Lab (Draw Walls)
* Use your mouse to **click and drag** anywhere on the black canvas to create red obstacle walls. 
* Watch the current swarm crash into them, and see how the *next* generation learns to go around your custom maze!

### 2. Model Deployment (Export/Import Brain)
* **Export Best Brain:** Once the AI has learned a perfect path, click this to download the Elite Alpha's DNA as a `.json` file.
* **Import Brain File:** You can refresh the page, upload your saved `.json` file, and watch the new swarm instantly inherit the smart brain you saved earlier.

### 3. Hyperparameter Sliders (Real-time tweaks)
* **Population Swarm:** Choose how many agents spawn (more agents = faster discovery, but uses more computer power).
* **Mutation Drift:** Increase this if the swarm gets "stuck" in a corner. It forces them to explore more wildly.
* **Engine Speed:** Fast-forward the simulation to see generations evolve quicker.

### 4. Analytics HUD
* Tracks the current generation number, how many agents successfully hit the target, and features a live line graph showing the AI getting smarter over time.

---

## 💻 Tech Stack
* **Language:** Vanilla JavaScript (ES6+), HTML5 Canvas API
* **Styling:** Tailwind CSS
* **Libraries:** None. 100% pure custom logic and math.
