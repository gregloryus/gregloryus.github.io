// WebGL Lava Lamp CA (Plan Scaffold)
// This is intentionally a scaffold. After you approve the plan, we’ll implement the real shader passes.
// For now: WebGL2 setup + ping-pong textures + init + display.

const canvas = document.getElementById("canvas");
const statusEl = document.getElementById("status");
const viewSel = document.getElementById("view");
const stepsInp = document.getElementById("steps");
const resetBtn = document.getElementById("reset");

// Start at 512 for stability; scale to 1000 after it looks good.
let SIM_W = 512;
let SIM_H = 512;

// WebGL2
const gl = canvas.getContext("webgl2", {
  antialias: false,
  depth: false,
  stencil: false,
  preserveDrawingBuffer: false,
});

if (!gl) {
  statusEl.textContent = "WebGL2 not available in this browser.";
  throw new Error("WebGL2 not available");
}

// Extensions
const extColorBufferFloat = gl.getExtension("EXT_color_buffer_float");
const extFloatLinear =
  gl.getExtension("OES_texture_float_linear") ||
  gl.getExtension("OES_texture_half_float_linear");

const USE_FLOAT = !!extColorBufferFloat;
const INTERNAL_FORMAT = USE_FLOAT ? gl.RGBA16F : gl.RGBA8;
const TEX_TYPE = USE_FLOAT ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;
const FILTER = extFloatLinear ? gl.LINEAR : gl.NEAREST;

statusEl.textContent = USE_FLOAT
  ? `WebGL2 OK · ${
      extFloatLinear ? "LINEAR" : "NEAREST"
    } sampling · sim ${SIM_W}×${SIM_H}`
  : `WebGL2 OK · RGBA8 fallback · sim ${SIM_W}×${SIM_H}`;

const params = {
  // velocity + heat
  dt: 0.15,
  dtAdvect: 0.6,
  kEnv: 0.06,
  kWax: 0.05,
  beta: 1.4,
  tRef: 0.62,
  damp: 0.99,
  nu: 0.22,
  uMax: 1.0,

  g: 0.35, // NEW: gravity baseline downward (wax)
  tMove0: 0.58, // NEW: mobility gate start
  tMove1: 0.72, // NEW: mobility gate full

  // blob keeper (Cahn–Hilliard, more stable / mass-preserving)
  chA: 1.2, // double-well strength
  chKappa: 0.9, // surface tension (penalizes gradients)
  chMCold: 0.03, // mobility (cold: holds shape)
  chMHot: 0.09, // mobility (hot: merges/coarsens faster)
  tHot0: 0.55,
  tHot1: 0.75,
};

function resizeCanvas() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const w = Math.floor(canvas.clientWidth * dpr);
  const h = Math.floor(canvas.clientHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  gl.viewport(0, 0, canvas.width, canvas.height);
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Fullscreen quad VAO/VBO
const vao = gl.createVertexArray();
gl.bindVertexArray(vao);

const vbo = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
gl.bufferData(
  gl.ARRAY_BUFFER,
  new Float32Array([
    -1, -1, 0, 0, 1, -1, 1, 0, -1, 1, 0, 1, -1, 1, 0, 1, 1, -1, 1, 0, 1, 1, 1,
    1,
  ]),
  gl.STATIC_DRAW
);

function compileShader(type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    console.error(log);
    console.error(src);
    throw new Error("Shader compile failed: " + log);
  }
  return sh;
}

function createProgram(vsSrc, fsSrc) {
  const prog = gl.createProgram();
  gl.attachShader(prog, compileShader(gl.VERTEX_SHADER, vsSrc));
  gl.attachShader(prog, compileShader(gl.FRAGMENT_SHADER, fsSrc));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(prog);
    console.error(log);
    throw new Error("Program link failed: " + log);
  }
  return prog;
}

const VS = `#version 300 es
precision highp float;
layout(location=0) in vec2 aPos;
layout(location=1) in vec2 aUv;
out vec2 vUv;
void main() {
  vUv = aUv;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
gl.enableVertexAttribArray(1);
gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);

function createTexture(w, h) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, FILTER);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, FILTER);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    INTERNAL_FORMAT,
    w,
    h,
    0,
    gl.RGBA,
    TEX_TYPE,
    null
  );
  gl.bindTexture(gl.TEXTURE_2D, null);
  return tex;
}

function createFbo(tex) {
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    tex,
    0
  );
  const ok =
    gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  if (!ok) throw new Error("Framebuffer incomplete");
  return fbo;
}

let texA = createTexture(SIM_W, SIM_H);
let texB = createTexture(SIM_W, SIM_H);
let fboA = createFbo(texA);
let fboB = createFbo(texB);

let ping = { tex: texA, fbo: fboA };
let pong = { tex: texB, fbo: fboB };

function swapPingPong() {
  const tmp = ping;
  ping = pong;
  pong = tmp;
}

function bindTex(program, uniformName, tex, unit) {
  gl.useProgram(program);
  const loc = gl.getUniformLocation(program, uniformName);
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.uniform1i(loc, unit);
}

function set1f(program, name, v) {
  const loc = gl.getUniformLocation(program, name);
  if (loc !== null) gl.uniform1f(loc, v);
}
function set1i(program, name, v) {
  const loc = gl.getUniformLocation(program, name);
  if (loc !== null) gl.uniform1i(loc, v);
}
function set2f(program, name, x, y) {
  const loc = gl.getUniformLocation(program, name);
  if (loc !== null) gl.uniform2f(loc, x, y);
}
function set2i(program, name, x, y) {
  const loc = gl.getUniformLocation(program, name);
  if (loc !== null) gl.uniform2i(loc, x, y);
}

// Shaders
const FS_INIT = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;

float hash12(vec2 p) {
  vec3 p3  = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  // Treat vUv.y=0 as bottom for simulation. If your visual feels inverted, we’ll flip in display later.
  float y = vUv.y;
  float Tamb = mix(1.0, 0.0, y);

  float reservoir = smoothstep(0.28, 0.0, y); // bottom ~28% wax
  float n = hash12(gl_FragCoord.xy);
  float C = clamp(reservoir + (n - 0.5) * 0.18, 0.0, 1.0);

  float Tw = (C > 0.01) ? Tamb : 0.0;
  vec2 u = vec2(0.0);

  outColor = vec4(C, Tw, u.x, u.y);
}
`;

const FS_PASS1 = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 outColor;

uniform sampler2D uState;
uniform ivec2 uSize;

// Params
uniform float uDt;
uniform float uKEnv;
uniform float uKWax;
uniform float uBeta;
uniform float uTRef;
uniform float uDamp;
uniform float uNu;
uniform float uUMax;

uniform float uG;
uniform float uTMove0;
uniform float uTMove1;

ivec2 clampCoord(ivec2 c) {
  return clamp(c, ivec2(0, 0), uSize - ivec2(1, 1));
}

vec4 S(ivec2 c) {
  return texelFetch(uState, clampCoord(c), 0);
}

float lap4(float c, float u, float d, float l, float r) {
  return (u + d + l + r) - 4.0 * c;
}

vec2 lap4v(vec2 c, vec2 u, vec2 d, vec2 l, vec2 r) {
  return (u + d + l + r) - 4.0 * c;
}

void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);

  vec4 s = S(p);
  float C  = s.r;
  float Tw = s.g;
  vec2 u   = vec2(s.b, s.a);

  // Ambient temperature (analytic vertical gradient; bottom hot, top cold)
  float y = (float(p.y) + 0.5) / float(uSize.y);
  float Tamb = mix(1.0, 0.0, y);

  // Wax-only heat inertia: relax Tw toward ambient (only meaningful where wax exists)
  Tw += uKEnv * (Tamb - Tw) * C;

  // Wax-only conduction (5-tap laplacian)
  float TwU = S(p + ivec2(0, 1)).g;
  float TwD = S(p + ivec2(0,-1)).g;
  float TwL = S(p + ivec2(-1,0)).g;
  float TwR = S(p + ivec2(1, 0)).g;
  float LTw = lap4(Tw, TwU, TwD, TwL, TwR);
  Tw += uKWax * LTw * C;
  Tw = clamp(Tw, 0.0, 1.0);

  // Buoyancy + gravity, gated by temperature-dependent mobility
  float mob = smoothstep(uTMove0, uTMove1, Tw);
  float Fy = (uBeta * (Tw - uTRef) - uG) * C * mob;
  u.y += uDt * Fy;

  // Cold wax settles instead of jittering
  u *= mix(0.90, 1.0, mob);

  // Viscosity / smoothing of velocity field (5-tap laplacian)
  vec2 uU = vec2(S(p + ivec2(0, 1)).b, S(p + ivec2(0, 1)).a);
  vec2 uD = vec2(S(p + ivec2(0,-1)).b, S(p + ivec2(0,-1)).a);
  vec2 uL = vec2(S(p + ivec2(-1,0)).b, S(p + ivec2(-1,0)).a);
  vec2 uR = vec2(S(p + ivec2(1, 0)).b, S(p + ivec2(1, 0)).a);
  vec2 Lu = lap4v(u, uU, uD, uL, uR);
  u += uNu * Lu;

  // Damping
  u *= uDamp;

  // Clamp velocity to keep the sim stable
  u = clamp(u, vec2(-uUMax), vec2(uUMax));

  outColor = vec4(C, Tw, u.x, u.y);
}
`;

const FS_PASS2 = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 outColor;

uniform sampler2D uState;
uniform ivec2 uSize;
uniform float uDtAdvect;

ivec2 clampCoord(ivec2 c) {
  return clamp(c, ivec2(0, 0), uSize - ivec2(1, 1));
}
vec4 S(ivec2 c) {
  return texelFetch(uState, clampCoord(c), 0);
}

void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  vec4 s = S(p);
  vec2 u = vec2(s.b, s.a);

  // Backtrace from pixel center in pixel coords
  vec2 pCenter = vec2(p) + vec2(0.5);
  vec2 pBack = pCenter - u * uDtAdvect;
  pBack = clamp(pBack, vec2(0.5), vec2(uSize) - vec2(0.5));

  // Base integer + frac
  vec2 q = pBack - vec2(0.5);
  ivec2 i0 = ivec2(floor(q));
  vec2 f = fract(q);

  ivec2 i1 = i0 + ivec2(1, 0);
  ivec2 j0 = i0 + ivec2(0, 1);
  ivec2 j1 = i0 + ivec2(1, 1);

  vec4 s00 = S(i0);
  vec4 s10 = S(i1);
  vec4 s01 = S(j0);
  vec4 s11 = S(j1);

  float Cb  = mix(mix(s00.r, s10.r, f.x), mix(s01.r, s11.r, f.x), f.y);
  float Twb = mix(mix(s00.g, s10.g, f.x), mix(s01.g, s11.g, f.x), f.y);

  // Keep Tw strictly wax temperature
  Twb *= Cb;

  outColor = vec4(Cb, Twb, u.x, u.y);
}
`;

const FS_PASS3 = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 outColor;

uniform sampler2D uState;
uniform ivec2 uSize;

// Params
uniform float uChA;
uniform float uChKappa;
uniform float uChMCold;
uniform float uChMHot;
uniform float uTHot0;
uniform float uTHot1;

ivec2 clampCoord(ivec2 c) {
  return clamp(c, ivec2(0, 0), uSize - ivec2(1, 1));
}

vec4 S(ivec2 c) {
  return texelFetch(uState, clampCoord(c), 0);
}

float lap4(float c, float u, float d, float l, float r) {
  return (u + d + l + r) - 4.0 * c;
}

// Derivative of a double-well potential (keeps phases near 0/1)
float dW(float C) {
  // d/dC of C^2(1-C)^2 = 2C(1-C)(1-2C)
  return 2.0 * C * (1.0 - C) * (1.0 - 2.0 * C);
}

void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);

  vec4 s0 = S(p);
  float C  = s0.r;
  float Tw = s0.g;
  vec2 u   = vec2(s0.b, s0.a);

  // Neighbor C values
  float CU = S(p + ivec2(0, 1)).r;
  float CD = S(p + ivec2(0,-1)).r;
  float CL = S(p + ivec2(-1,0)).r;
  float CR = S(p + ivec2(1, 0)).r;

  // lap(C) at center
  float LC = lap4(C, CU, CD, CL, CR);

  // Compute mu at center: mu = a*dW(C) - kappa*lap(C)
  float muC = uChA * dW(C) - uChKappa * LC;

  // For lap(mu), compute mu at U/D/L/R. We approximate lap(C) for each neighbor using a 2-ring stencil.
  float CUU = S(p + ivec2(0, 2)).r;
  float CUD = C;
  float CUL = S(p + ivec2(-1,1)).r;
  float CUR = S(p + ivec2(1, 1)).r;
  float LCU = lap4(CU, CUU, CUD, CUL, CUR);
  float muU = uChA * dW(CU) - uChKappa * LCU;

  float CDU = C;
  float CDD = S(p + ivec2(0,-2)).r;
  float CDL = S(p + ivec2(-1,-1)).r;
  float CDR = S(p + ivec2(1,-1)).r;
  float LCD = lap4(CD, CDU, CDD, CDL, CDR);
  float muD = uChA * dW(CD) - uChKappa * LCD;

  float CLU = S(p + ivec2(-1,1)).r;
  float CLD = S(p + ivec2(-1,-1)).r;
  float CLL = S(p + ivec2(-2,0)).r;
  float CLR = C;
  float LCL = lap4(CL, CLU, CLD, CLL, CLR);
  float muL = uChA * dW(CL) - uChKappa * LCL;

  float CRU = S(p + ivec2(1, 1)).r;
  float CRD = S(p + ivec2(1,-1)).r;
  float CRL = C;
  float CRR = S(p + ivec2(2, 0)).r;
  float LCR = lap4(CR, CRU, CRD, CRL, CRR);
  float muR = uChA * dW(CR) - uChKappa * LCR;

  // lap(mu) at center
  float LMu = lap4(muC, muU, muD, muL, muR);

  // Mobility modulated by heat: hot coarsens/merges faster
  float hot = smoothstep(uTHot0, uTHot1, Tw);
  float M = mix(uChMCold, uChMHot, hot);

  // Concentrate mobility near interface to reduce bulk stippling/artifacts
  float iface = clamp(4.0 * C * (1.0 - C), 0.0, 1.0);
  M *= iface;

  float Cn = C + M * LMu;
  Cn = clamp(Cn, 0.0, 1.0);

  outColor = vec4(Cn, Tw, u.x, u.y);
}
`;

const FS_DISPLAY = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 outColor;

uniform sampler2D uState;
uniform int uView;

void main() {
  vec4 s = texture(uState, vUv);
  float C = s.r;
  float Tw = s.g;
  float ux = s.b;
  float uy = s.a;

  vec3 col = vec3(0.0);

  if (uView == 0) { // Composite: wax mask + heat tint
    float wax = smoothstep(0.15, 0.85, C);
    vec3 base = mix(vec3(0.02, 0.02, 0.04), vec3(0.9), wax);
    vec3 heat = vec3(1.0, 0.55, 0.05) * Tw * wax;
    col = base + heat;
  } else if (uView == 1) { // Tw
    col = vec3(Tw);
  } else if (uView == 2) { // |u|
    float m = length(vec2(ux, uy));
    col = vec3(m);
  } else if (uView == 3) { // ux
    col = vec3(ux * 0.5 + 0.5);
  } else if (uView == 4) { // uy
    col = vec3(uy * 0.5 + 0.5);
  }

  outColor = vec4(col, 1.0);
}
`;
const progInit = createProgram(VS, FS_INIT);
const prog1 = createProgram(VS, FS_PASS1);
const prog2 = createProgram(VS, FS_PASS2);
const prog3 = createProgram(VS, FS_PASS3);
const progDisplay = createProgram(VS, FS_DISPLAY);

function drawPass(program, targetFbo, sourceTex, extraUniformsFn = null) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, targetFbo);
  gl.viewport(0, 0, SIM_W, SIM_H);
  gl.useProgram(program);
  gl.bindVertexArray(vao);

  if (sourceTex) bindTex(program, "uState", sourceTex, 0);
  if (extraUniformsFn) extraUniformsFn();

  gl.drawArrays(gl.TRIANGLES, 0, 6);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function resetSim() {
  drawPass(progInit, ping.fbo, null);
}
resetSim();
resetBtn.addEventListener("click", resetSim);

function viewIndex() {
  switch (viewSel.value) {
    case "C":
      return 0;
    case "Tw":
      return 1;
    case "U":
      return 2;
    case "Ux":
      return 3;
    case "Uy":
      return 4;
    default:
      return 0;
  }
}

function stepOnce() {
  // Pass1: Tw + u update
  drawPass(prog1, pong.fbo, ping.tex, () => {
    set2i(prog1, "uSize", SIM_W, SIM_H);
    set1f(prog1, "uDt", params.dt);
    set1f(prog1, "uKEnv", params.kEnv);
    set1f(prog1, "uKWax", params.kWax);
    set1f(prog1, "uBeta", params.beta);
    set1f(prog1, "uTRef", params.tRef);
    set1f(prog1, "uDamp", params.damp);
    set1f(prog1, "uNu", params.nu);
    set1f(prog1, "uUMax", params.uMax);
    set1f(prog1, "uG", params.g);
    set1f(prog1, "uTMove0", params.tMove0);
    set1f(prog1, "uTMove1", params.tMove1);
  });
  swapPingPong();

  // Pass2: advection (C, Tw only, no velocity advection)
  drawPass(prog2, pong.fbo, ping.tex, () => {
    set2i(prog2, "uSize", SIM_W, SIM_H);
    set1f(prog2, "uDtAdvect", params.dtAdvect);
  });
  swapPingPong();

  // Pass3: blob keeper (Cahn–Hilliard, more stable / mass-preserving)
  drawPass(prog3, pong.fbo, ping.tex, () => {
    set2i(prog3, "uSize", SIM_W, SIM_H);
    set1f(prog3, "uChA", params.chA);
    set1f(prog3, "uChKappa", params.chKappa);
    set1f(prog3, "uChMCold", params.chMCold);
    set1f(prog3, "uChMHot", params.chMHot);
    set1f(prog3, "uTHot0", params.tHot0);
    set1f(prog3, "uTHot1", params.tHot1);
  });
  swapPingPong();
}

function render() {
  resizeCanvas();

  const steps = Math.max(1, Math.min(32, parseInt(stepsInp.value || "1", 10)));
  for (let i = 0; i < steps; i++) stepOnce();

  // Display current state
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.useProgram(progDisplay);
  gl.bindVertexArray(vao);
  bindTex(progDisplay, "uState", ping.tex, 0);
  gl.uniform1i(gl.getUniformLocation(progDisplay, "uView"), viewIndex());
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  requestAnimationFrame(render);
}

requestAnimationFrame(render);
