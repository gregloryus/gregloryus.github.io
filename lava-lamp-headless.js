// Headless LBM simulation for debugging
// Run with: node lava-lamp-headless.js

const W = 50, H = 75; // Small grid for fast iteration
const SIZE = W * H;

// D2Q9 lattice
const cx = [0, 1, 0, -1, 0, 1, -1, -1, 1];
const cy = [0, 0, -1, 0, 1, -1, -1, 1, 1];
const w = [4/9, 1/9, 1/9, 1/9, 1/9, 1/36, 1/36, 1/36, 1/36];
const opposite = [0, 3, 4, 1, 2, 7, 8, 5, 6];

// Parameters
const P = {
    G_AA: -10.0,  // Stronger cohesion
    G_AB: 10.0,   // Stronger immiscibility
    G_BB: 0,
    RHO_WAX: 1.2,
    RHO_WATER: 1.0,
    WAX_HEIGHT_FRAC: 0.15,
    TAU_WAX_COLD: 1.4,
    TAU_WAX_HOT: 0.9,
    TAU_WATER: 1.0,
    TRANSITION_TEMP: 0.5,
    SHARPNESS: 15,
    BUOYANCY: 0.008,
    GRAVITY: 0.0003,
    BUOY_THRESHOLD: 0.5,
    BUOY_SHARPNESS: 20,
    THERMAL_EXP: 0.25,
    HEAT_RATE: 0.005,
    COOL_RATE: 0.004,
    TEMP_DIFFUSION: 0.02,
    INIT_WAX_TEMP: 0.2,
    INIT_WATER_TEMP: 0.35,
    HEAT_ZONE_START: 0.85,
    COOL_ZONE_END: 0.25,
    MIN_RHO: 0.15  // Density floor
};

// Arrays
let f_A = new Float32Array(SIZE * 9);
let f_A_temp = new Float32Array(SIZE * 9);
let f_B = new Float32Array(SIZE * 9);
let f_B_temp = new Float32Array(SIZE * 9);
let rho_A = new Float32Array(SIZE);
let rho_B = new Float32Array(SIZE);
let ux = new Float32Array(SIZE);
let uy = new Float32Array(SIZE);
let psi_A = new Float32Array(SIZE);
let psi_B = new Float32Array(SIZE);
let temp = new Float32Array(SIZE);
let newTemp = new Float32Array(SIZE);
let Fx_A = new Float32Array(SIZE);
let Fy_A = new Float32Array(SIZE);
let Fx_B = new Float32Array(SIZE);
let Fy_B = new Float32Array(SIZE);

let initialMassA = 0;

function sigmoid(x) {
    if (x > 15) return 1;
    if (x < -15) return 0;
    return 1 / (1 + Math.exp(-x));
}

function computePsi(rho) {
    return 1 - Math.exp(-rho);
}

function initEquilibrium(f, i, rho0, vx, vy) {
    const usq = vx * vx + vy * vy;
    const i9 = i * 9;
    for (let k = 0; k < 9; k++) {
        const cu = cx[k] * vx + cy[k] * vy;
        f[i9 + k] = w[k] * rho0 * (1 + 3 * cu + 4.5 * cu * cu - 1.5 * usq);
    }
}

function reset() {
    const waxTop = H - Math.floor(H * P.WAX_HEIGHT_FRAC);
    const interfaceWidth = 3;

    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const i = y * W + x;
            const distFromInterface = y - waxTop;
            const blend = 0.5 * (1 + Math.tanh(distFromInterface / interfaceWidth));
            const noise = (Math.random() - 0.5) * 0.02;

            rho_A[i] = blend * P.RHO_WAX * (1 + noise);
            rho_B[i] = (1 - blend) * P.RHO_WATER * (1 + noise);
            temp[i] = blend * P.INIT_WAX_TEMP + (1 - blend) * P.INIT_WATER_TEMP;

            initEquilibrium(f_A, i, rho_A[i], 0, 0);
            initEquilibrium(f_B, i, rho_B[i], 0, 0);
        }
    }

    initialMassA = rho_A.reduce((a, b) => a + b, 0);
}

function tick() {
    // Step 1: Compute macroscopic quantities
    for (let i = 0; i < SIZE; i++) {
        const i9 = i * 9;
        let rA = 0, rB = 0, pxA = 0, pyA = 0, pxB = 0, pyB = 0;

        for (let k = 0; k < 9; k++) {
            const fA = f_A[i9 + k];
            const fB = f_B[i9 + k];
            rA += fA;
            rB += fB;
            pxA += fA * cx[k];
            pyA += fA * cy[k];
            pxB += fB * cx[k];
            pyB += fB * cy[k];
        }

        rho_A[i] = rA;
        rho_B[i] = rB;

        const rTotal = rA + rB;
        if (rTotal > 0.001) {
            ux[i] = (pxA + pxB) / rTotal;
            uy[i] = (pyA + pyB) / rTotal;
        } else {
            ux[i] = 0;
            uy[i] = 0;
        }

        psi_A[i] = rA > 0.001 ? computePsi(rA) : 0;
        psi_B[i] = rB > 0.001 ? computePsi(rB) : 0;
    }

    // Step 2: Compute forces
    Fx_A.fill(0);
    Fy_A.fill(0);
    Fx_B.fill(0);
    Fy_B.fill(0);

    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const i = y * W + x;
            const psiA = psi_A[i];
            const psiB = psi_B[i];
            const rA = rho_A[i];
            const t = temp[i];

            let sumA_x = 0, sumA_y = 0, sumB_x = 0, sumB_y = 0;

            for (let k = 1; k < 9; k++) {
                let nx = (x + cx[k] + W) % W;
                let ny = y + cy[k];
                if (ny < 0) ny = 0;
                else if (ny >= H) ny = H - 1;

                const ni = ny * W + nx;
                sumA_x += w[k] * psi_A[ni] * cx[k];
                sumA_y += w[k] * psi_A[ni] * cy[k];
                sumB_x += w[k] * psi_B[ni] * cx[k];
                sumB_y += w[k] * psi_B[ni] * cy[k];
            }

            // Shan-Chen forces
            Fx_A[i] = -psiA * (P.G_AA * sumA_x + P.G_AB * sumB_x);
            Fy_A[i] = -psiA * (P.G_AA * sumA_y + P.G_AB * sumB_y);
            Fx_B[i] = -psiB * (P.G_AB * sumA_x + P.G_BB * sumB_x);
            Fy_B[i] = -psiB * (P.G_AB * sumA_y + P.G_BB * sumB_y);

            // Gravity and buoyancy (Boussinesq)
            if (rA > 0.1) {
                const thermalFactor = 1 - P.THERMAL_EXP * t;
                const effectiveRho = rA * thermalFactor;
                Fy_A[i] += P.GRAVITY * effectiveRho; // Gravity down (+y is down in this coord)

                const buoyGate = sigmoid(P.BUOY_SHARPNESS * (t - P.BUOY_THRESHOLD));
                const excessT = Math.max(0, t - P.BUOY_THRESHOLD);
                const lift = P.BUOYANCY * rA * buoyGate * (1 + excessT * 3);
                Fy_A[i] -= lift; // Buoyancy up
            }
        }
    }

    // Step 3: Collision for wax
    for (let i = 0; i < SIZE; i++) {
        const rA = rho_A[i];
        if (rA < 0.001) continue;

        const t = temp[i];
        const softness = sigmoid(P.SHARPNESS * (t - P.TRANSITION_TEMP));
        const tau = P.TAU_WAX_COLD * (1 - softness) + P.TAU_WAX_HOT * softness;
        const invTau = 1 / tau;
        const forceFactor = 1 - 0.5 * invTau;

        let vx = ux[i] + Fx_A[i] / rA * 0.5;
        let vy = uy[i] + Fy_A[i] / rA * 0.5;

        const uMagSq = vx * vx + vy * vy;
        if (uMagSq > 0.01) {
            const scale = 0.1 / Math.sqrt(uMagSq);
            vx *= scale;
            vy *= scale;
        }

        const usq = vx * vx + vy * vy;
        const i9 = i * 9;

        for (let k = 0; k < 9; k++) {
            const cu = cx[k] * vx + cy[k] * vy;
            const feq = w[k] * rA * (1 + 3 * cu + 4.5 * cu * cu - 1.5 * usq);
            const Fi = w[k] * forceFactor * (
                (3 * (cx[k] - vx) + 9 * cu * cx[k]) * Fx_A[i] +
                (3 * (cy[k] - vy) + 9 * cu * cy[k]) * Fy_A[i]
            );
            f_A[i9 + k] += -(f_A[i9 + k] - feq) * invTau + Fi;
        }
    }

    // Step 4: Collision for water
    const invTauB = 1 / P.TAU_WATER;
    const forceFactorB = 1 - 0.5 * invTauB;

    for (let i = 0; i < SIZE; i++) {
        const rB = rho_B[i];
        if (rB < 0.001) continue;

        let vx = ux[i] + Fx_B[i] / rB * 0.5;
        let vy = uy[i] + Fy_B[i] / rB * 0.5;

        const uMagSq = vx * vx + vy * vy;
        if (uMagSq > 0.01) {
            const scale = 0.1 / Math.sqrt(uMagSq);
            vx *= scale;
            vy *= scale;
        }

        const usq = vx * vx + vy * vy;
        const i9 = i * 9;

        for (let k = 0; k < 9; k++) {
            const cu = cx[k] * vx + cy[k] * vy;
            const feq = w[k] * rB * (1 + 3 * cu + 4.5 * cu * cu - 1.5 * usq);
            const Fi = w[k] * forceFactorB * (
                (3 * (cx[k] - vx) + 9 * cu * cx[k]) * Fx_B[i] +
                (3 * (cy[k] - vy) + 9 * cu * cy[k]) * Fy_B[i]
            );
            f_B[i9 + k] += -(f_B[i9 + k] - feq) * invTauB + Fi;
        }
    }

    // Step 5: Streaming for wax WITH TEMPERATURE ADVECTION
    f_A_temp.fill(0);
    const tempAdvected = new Float32Array(SIZE);
    const massAtCell = new Float32Array(SIZE);

    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const i = y * W + x;
            const i9 = i * 9;

            for (let k = 0; k < 9; k++) {
                const nx = (x + cx[k] + W) % W;
                const ny = y + cy[k];

                if (ny < 0 || ny >= H) {
                    f_A_temp[i9 + opposite[k]] += f_A[i9 + k];
                    // Temperature stays local for bounce-back
                    tempAdvected[i] += f_A[i9 + k] * temp[i];
                    massAtCell[i] += f_A[i9 + k];
                } else {
                    const ni = ny * W + nx;
                    f_A_temp[ni * 9 + k] += f_A[i9 + k];
                    // Temperature advects with mass
                    tempAdvected[ni] += f_A[i9 + k] * temp[i];
                    massAtCell[ni] += f_A[i9 + k];
                }
            }
        }
    }
    // Compute advected temperature
    for (let i = 0; i < SIZE; i++) {
        if (massAtCell[i] > 0.01) {
            temp[i] = tempAdvected[i] / massAtCell[i];
        }
    }
    [f_A, f_A_temp] = [f_A_temp, f_A];

    // Step 6: Streaming for water
    f_B_temp.fill(0);
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const i = y * W + x;
            const i9 = i * 9;

            for (let k = 0; k < 9; k++) {
                const nx = (x + cx[k] + W) % W;
                const ny = y + cy[k];

                if (ny < 0 || ny >= H) {
                    f_B_temp[i9 + opposite[k]] += f_B[i9 + k];
                } else {
                    const ni = ny * W + nx;
                    f_B_temp[ni * 9 + k] += f_B[i9 + k];
                }
            }
        }
    }
    [f_B, f_B_temp] = [f_B_temp, f_B];

    // Step 7: Temperature evolution (simplified - no advection for now)
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const i = y * W + x;
            let t = temp[i];
            const rA = rho_A[i];

            // Diffusion
            let sum = t, count = 1;
            for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
                const nx = (x + dx + W) % W;
                const ny = y + dy;
                if (ny >= 0 && ny < H) {
                    const ni = ny * W + nx;
                    const wt = Math.min(rho_A[i], rho_A[ni]) / P.RHO_WAX;
                    sum += temp[ni] * wt;
                    count += wt;
                }
            }
            t += (sum / count - t) * P.TEMP_DIFFUSION;

            // Bottom heating
            const bottomZone = H * P.HEAT_ZONE_START;
            if (y > bottomZone && rA > 0.05) {
                const vertInt = (y - bottomZone) / (H - bottomZone);
                const centerDist = Math.abs(x - W / 2) / (W / 2);
                const horizInt = Math.pow(1 - centerDist, 2);
                t += P.HEAT_RATE * vertInt * horizInt;
            }

            // Top cooling
            const topZone = H * P.COOL_ZONE_END;
            if (y < topZone && rA > 0.05) {
                const intensity = 1 - y / topZone;
                t -= P.COOL_RATE * intensity;
            }

            newTemp[i] = Math.max(0, Math.min(1, t));
        }
    }
    [temp, newTemp] = [newTemp, temp];
}

function getStats() {
    let totalMassA = 0, totalMassB = 0;
    let cellsWithWax = 0;
    let minRhoA = Infinity, maxRhoA = 0;
    let avgRhoA = 0;
    let cellsBelow02 = 0, cellsBelow05 = 0, cellsAbove08 = 0;
    let maxTemp = 0;
    let highestWaxY = H;

    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const i = y * W + x;
            const rA = rho_A[i];
            const rB = rho_B[i];

            totalMassA += rA;
            totalMassB += rB;

            if (rA > 0.01) {
                cellsWithWax++;
                avgRhoA += rA;
                if (rA < minRhoA) minRhoA = rA;
                if (rA > maxRhoA) maxRhoA = rA;
                if (rA < 0.2) cellsBelow02++;
                if (rA < 0.5) cellsBelow05++;
                if (rA > 0.8) cellsAbove08++;
                if (y < highestWaxY) highestWaxY = y;
                if (temp[i] > maxTemp) maxTemp = temp[i];
            }
        }
    }

    avgRhoA = cellsWithWax > 0 ? avgRhoA / cellsWithWax : 0;

    return {
        massA: totalMassA.toFixed(1),
        massAPct: (totalMassA / initialMassA * 100).toFixed(1),
        massB: totalMassB.toFixed(1),
        cells: cellsWithWax,
        minRho: minRhoA === Infinity ? 0 : minRhoA.toFixed(3),
        maxRho: maxRhoA.toFixed(3),
        avgRho: avgRhoA.toFixed(3),
        below02: cellsBelow02,
        below05: cellsBelow05,
        above08: cellsAbove08,
        maxT: maxTemp.toFixed(2),
        height: ((H - highestWaxY) / H * 100).toFixed(0)
    };
}

// Run simulation
reset();
console.log(`Grid: ${W}x${H}, Initial wax mass: ${initialMassA.toFixed(1)}`);
console.log('Tick | Mass% | Cells | MinRho | MaxRho | AvgRho | <0.2 | <0.5 | >0.8 | MaxT | Ht%');
console.log('-'.repeat(85));

for (let t = 0; t <= 2000; t++) {
    if (t % 100 === 0) {
        const s = getStats();
        console.log(`${t.toString().padStart(4)} | ${s.massAPct.padStart(5)}% | ${s.cells.toString().padStart(5)} | ${s.minRho.padStart(6)} | ${s.maxRho.padStart(6)} | ${s.avgRho.padStart(6)} | ${s.below02.toString().padStart(4)} | ${s.below05.toString().padStart(4)} | ${s.above08.toString().padStart(4)} | ${s.maxT.padStart(4)} | ${s.height.padStart(3)}%`);
    }
    tick();
}
