# Plant Fitness Analysis: 3-Particle vs. 4-Particle Plants

## **System Overview**

This document details the energy consumption, energy absorption, and seed generation efficiency of simple plant structures in the **Unicorn Tapestry** project. Each plant consists of stem cells that consume energy to survive while absorbing energy from open neighboring cells.

### **Energy System Recap**

- **Plant Cell Energy Consumption:**
  - Each plant cell consumes **1 energy every 60 ticks** to stay alive.
- **Energy Absorption:**
  - A plant cell checks **three cardinal directions** (excluding its parent connection) for energy sources.
  - Any **empty adjacent space** has a **1 in 100 chance per tick** to generate energy.
  - Probability of absorbing energy:
    - **Cells with 2 open sides** → **1 - (99/100)² = ~1/50.3 per tick**
    - **Cells with 3 open sides** → **1 - (99/100)³ = ~1/33.7 per tick**

## **Comparison of 3-Particle and 4-Particle Plants**

We analyze two basic plant structures to evaluate their efficiency in energy balance and seed production rate.

### **1. Three-Particle Plant (1 seed + 2 stems in a straight line)**

```
  S  (Top Stem) - 3 open sides
  S  (Middle Stem) - 2 open sides
  O  (Seed)
```

#### **Energy Balance**

- **Top Stem (3 open sides):**
  - Absorbs energy at a **1-in-33.7 chance per tick**.
  - Expected energy over 60 ticks: **60/33.7 = 1.78 energy**.
  - Maintenance cost: **-1 energy per 60 ticks**.
  - **Net gain: +0.78 energy**.
- **Middle Stem (2 open sides):**
  - Absorbs energy at a **1-in-50.3 chance per tick**.
  - Expected energy over 60 ticks: **60/50.3 = 1.19 energy**.
  - Maintenance cost: **-1 energy per 60 ticks**.
  - **Net gain: +0.19 energy**.

#### **Total Net Energy per 60 Ticks:**

- **Top Stem:** +0.78 energy
- **Middle Stem:** +0.19 energy
- **Total:** **+0.97 energy per 60 ticks**

#### **Seed Generation Efficiency**

- **Seed cost:** 3 energy (equal to the number of plant cells).
- **Time required to generate a seed:**
  - **3 energy needed / 0.97 energy per cycle**
  - **~3.08 cycles (ticks per seed)**

---

### **2. Four-Particle Plant (1 seed + 3 stems in a straight line)**

```
  S  (Top Stem) - 3 open sides
  S  (Middle Stem 1) - 2 open sides
  S  (Middle Stem 2) - 2 open sides
  O  (Seed)
```

#### **Energy Balance**

- **Top Stem (3 open sides):**
  - **60/33.7 = 1.78 energy**.
  - Maintenance: **-1 energy**.
  - **Net gain: +0.78 energy**.
- **Middle Stem 1 (2 open sides):**
  - **60/50.3 = 1.19 energy**.
  - Maintenance: **-1 energy**.
  - **Net gain: +0.19 energy**.
- **Middle Stem 2 (2 open sides):**
  - **60/50.3 = 1.19 energy**.
  - Maintenance: **-1 energy**.
  - **Net gain: +0.19 energy**.

#### **Total Net Energy per 60 Ticks:**

- **Top Stem:** +0.78 energy
- **Middle Stem 1:** +0.19 energy
- **Middle Stem 2:** +0.19 energy
- **Total:** **+1.16 energy per 60 ticks**

#### **Seed Generation Efficiency**

- **Seed cost:** 4 energy (equal to the number of plant cells).
- **Time required to generate a seed:**
  - **4 energy needed / 1.16 energy per cycle**
  - **~3.43 cycles (ticks per seed)**

---

## **Final Comparison: Energy vs. Seed Production Rate**

| Plant Type     | Net Energy per 60 Ticks | Seed Cost | Ticks per Seed  |
| -------------- | ----------------------- | --------- | --------------- |
| **3-Particle** | **+0.97**               | 3         | **~3.08 ticks** |
| **4-Particle** | **+1.16**               | 4         | **~3.43 ticks** |

### **Key Takeaways**

1. **The 4-Particle Plant Generates More Net Energy**
   - With **+1.16 energy per 60 ticks**, it has a **higher absolute energy gain** than the 3-particle plant (+0.97 energy per 60 ticks).
2. **The 3-Particle Plant Produces Seeds Faster**
   - The **3-particle plant takes ~3.08 cycles to produce a seed**, while the **4-particle plant takes ~3.43 cycles**.
   - This means the **3-particle plant has an ~11% faster seed production rate**.
3. **Trade-off Between Energy Accumulation and Reproduction Rate**
   - The **3-particle plant may be more efficient in spreading**, as it replicates more quickly.
   - The **4-particle plant stores more energy over time**, potentially giving it an advantage in survival under different environmental conditions.

# **GENERAL OVERVIEW CONTEXT, MAY NOT BE 100% ACCURATE: Unicorn Tapestry Project: Full System Overview**

## **Project Purpose and Goals**

The Unicorn Tapestry project is a **2D grid-based plant evolution simulation**. The primary goal is to create a **self-sustaining ecosystem** where plant structures emerge, grow, compete, and reproduce **without direct intervention**. Instead of predefining plant behaviors, the system is designed so that **natural selection** drives adaptation, allowing novel solutions to emerge over time.

## **Core Simulation Structure**

### **Grid-Based World**

- The environment is a **2D grid (lattice)** where each cell represents a discrete unit of space.
- The **grid is finite** but may be configured to wrap (toroidal world) or have boundary conditions.
- Each cell may be **empty or occupied** by a plant structure (stem, leaf, root, seed, etc.).
- Cells interact **only with their immediate neighbors** using a **Moore neighborhood** (8 adjacent cells).

### **Time and Events**

- The world progresses in **ticks** (discrete time steps).
- Some processes (like energy absorption) **happen every tick**, while others (like growth or death) **operate on longer intervals**.
- Event propagation is asynchronous, but a global tick-based clock ensures movement and growth are limited to defined rates.

## **Plant Structure and Growth**

### **Plant Components**

Each plant consists of **cells** with specific roles:

- **Stem Cells**: Provide structure and allow vertical growth.
- **Leaf Cells** (Future Implementation): Specialize in efficient energy absorption.
- **Root Cells** (Future Implementation): Absorb underground resources like water/nutrients.
- **Seed Cells**: The reproductive unit—new plants begin from a seed.

### **Growth Rules**

- New cells are created **adjacent to existing plant cells**, following **genetically encoded rules**.
- Growth is **energy-limited**—cells must gather sufficient energy before expanding.
- **Branching structures** may develop based on environmental constraints.

## **Energy System and Competition**

### **Energy Consumption**

- Every **plant cell consumes 1 energy every 60 ticks** to stay alive.
- If a cell **fails to meet its energy demand**, it dies, freeing space for other plants.

### **Energy Absorption**

- Each plant cell can absorb energy from its **adjacent empty spaces**.
- **Empty spaces** have a **1 in 100 chance per tick** to generate energy.
- Cells with **more open sides** collect energy **faster**, making placement strategic.
- Light and energy competition between plants can **influence growth patterns**.

### **Resource Sharing and Internal Energy Flow**

- Energy can **flow between connected plant cells**, allowing plants to **prioritize growth, repair, or reproduction**.
- Energy allocation **may evolve dynamically** as plants adapt to competition.

## **Reproduction and Natural Selection**

### **Seed Generation**

- Plants reproduce by **creating seeds**, which act as starting points for new plants.
- A **seed’s cost** is equal to the **total number of cells in the mature plant**.
- Energy **must be stored** to generate a seed, introducing **evolutionary trade-offs** between growth and reproduction.

### **Mutation and Evolution**

- Plants inherit **genetic growth patterns** from their parent.
- Small mutations **alter growth behavior**, allowing **natural selection** to shape plant evolution.
- Over time, plants that **optimize energy balance, survival, and reproduction** will become dominant.

## **Environmental Adaptation and Competition**

### **Density-Dependent Growth**

- Plants compete for limited energy.
- Taller plants may **shade others**, blocking their energy absorption.
- Sparse environments may favor **fast-reproducing plants**, while crowded conditions may favor **energy-efficient structures**.

### **Dynamic Selection Pressures**

- If environmental factors change (e.g., light variation), plants must adapt.
- Some conditions may favor **short-lived, fast-seeding plants**, while others may favor **sturdy, slow-growing structures**.

## **Future Features and Enhancements**

- **Leaf Specialization**: Efficient energy absorption with trade-offs in maintenance cost.
- **Root Systems**: Below-ground interactions for water/nutrient absorption.
- **Environmental Factors**: Variable light, nutrient availability, and seasonal cycles.
- **Symbiosis and Cooperation**: Multi-plant interactions where species may support one another.

## **Conclusion**

The Unicorn Tapestry project creates an evolving, competitive, and self-balancing plant ecosystem. By structuring energy absorption, reproduction, and mutation around **natural selection principles**, plants will organically adapt to their environment, producing unexpected and novel growth patterns over time. This system provides the foundation for studying emergent complexity in simulated ecosystems.
