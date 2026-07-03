## Celestial Simulation — Coding Plan (Milestone 1 Prototype)

### Architecture: Single HTML File

One file, zero build steps, hosted on GitHub Pages. Three external dependencies loaded via CDN:

| Dependency | Purpose | Size | CDN URL |
|---|---|---|---|
| **Three.js r183** | 3D rendering (inside-sphere view) | ~650KB | `cdn.jsdelivr.net/npm/three@0.183.2/build/three.module.js` |
| **OrbitControls** | Touch-drag rotation | (part of Three.js) | `cdn.jsdelivr.net/npm/three@0.183.2/examples/jsm/controls/OrbitControls.js` |
| **astronomy-engine** | Sun/Moon/planet positions, coord transforms | ~114KB min | `cdn.jsdelivr.net/npm/astronomy-engine@2.1.19/astronomy.browser.min.js` |

Loaded via an **importmap** for Three.js (ES modules) and a regular `<script>` tag for astronomy-engine (which exposes a global `Astronomy` object).

### Star Data

Use **`hipparcos_5_concise.js`** from `gmiller123456/hip2000` — ~1,600 stars brighter than magnitude 5, only ~70KB, format is `[HIP, Vmag, RAdeg, DEdeg, BV]` per star. J2000 epoch. We'll embed this directly as a JS array in the HTML file (or fetch it). Filter to ~1,000 brightest at runtime if desired.

---

### Scene Structure

```
Scene
├── Sky Sphere (r=500, BackSide material, dark blue/black)
├── Stars (Points geometry, ~1,000-1,600 points at r=490)
├── Sun marker (Sprite at r=490, yellow, larger)
├── Planet markers (Sprites at r=490, colored, labeled)
├── Ground hemisphere (r=495, BackSide, semi-transparent green/brown, opacity 0.2)
└── Camera (at origin, PerspectiveCamera, fov ~75°)
    └── OrbitControls (rotation only, no zoom/pan)
```

### Coordinate Pipeline

This is the core logic — converting celestial positions to 3D scene coordinates:

```
1. Star catalog (RA, Dec in J2000 degrees)
   → Astronomy.Horizon(date, observer, ra_hours, dec_deg)
   → (azimuth, altitude) in degrees

2. Planet/Sun/Moon
   → Astronomy.Equator(body, date, observer, true, true)
   → (ra, dec) → Astronomy.Horizon(...)
   → (azimuth, altitude) in degrees

3. (azimuth, altitude) → Three.js (x, y, z) on sphere interior:
   altitude: 0° = horizon, +90° = zenith, -90° = nadir
   azimuth: 0° = north, 90° = east, 180° = south, 270° = west

   Convert to Three.js coordinates (Y-up):
   phi = (90° - altitude) in radians  // 0=zenith, π/2=horizon, π=nadir
   theta = -azimuth in radians        // negate for inside view
   x = r * sin(phi) * sin(theta)
   y = r * cos(phi)
   z = r * sin(phi) * cos(theta)
```

### Implementation Steps (what goes in the file)

**Step 1: HTML shell + imports**
- Viewport meta for mobile
- Full-screen dark canvas, no scroll
- Importmap for Three.js + OrbitControls
- Script tag for astronomy-engine

**Step 2: Scene setup**
- `PerspectiveCamera` at origin, fov ~75, near 0.1, far 1000
- `WebGLRenderer` filling viewport, dark background
- Sky sphere mesh (r=500, BackSide, `MeshBasicMaterial` dark navy)
- OrbitControls: `enableZoom=false`, `enablePan=false`, `enableDamping=true`
- Resize handler

**Step 3: Star rendering**
- Embed/load star data array
- For each star: convert (RA, Dec) → horizontal (az, alt) for default observer (Evanston: 41.88°N, 87.68°W) and current time
- Map (az, alt) → (x, y, z) at r=490
- Build `BufferGeometry` with positions, colors (from B-V index), sizes (from magnitude)
- Create single `Points` object with `sizeAttenuation: false`
- Stars below horizon get dimmed (alpha reduced) — implemented by lowering their color brightness

**Step 4: Sun position**
- `Astronomy.Equator('Sun', date, observer, true, true)` → `Astronomy.Horizon(...)` → (az, alt)
- Render as a yellow Sprite at r=490, larger than stars

**Step 5: Ground/horizon plane**
- Semi-transparent hemisphere (lower half of a sphere, r=495, BackSide, opacity ~0.2, earthy color)
- Or: a flat `CircleGeometry` at y=0, `DoubleSide`, semi-transparent
- Start with the flat circle — simpler, still conveys the horizon

**Step 6: Time controls (minimal UI)**
- Display current date/time
- "Now" button to snap to current time
- Date/time input to pick any date
- Play/pause button that advances time (e.g., 1 minute per frame, or configurable speed)
- On time change: recompute all positions, update Points buffer + Sprite positions

**Step 7: Labels**
- Cardinal direction labels (N/S/E/W) at the horizon ring
- Optional: bright star names as HTML overlays or `CSS2DRenderer` labels

---

### Key Design Decisions for Prototype

| Decision | Choice | Rationale |
|---|---|---|
| Renderer | Three.js WebGL | You have Three.js experience; perfect for inside-sphere camera |
| Star rendering | Single `Points` object | 1 draw call for all stars, great mobile perf |
| Planet rendering | Individual `Sprite` objects | Only 5-10, need distinct colors/sizes |
| Coord transform | astronomy-engine `Horizon()` | Handles precession, refraction, observer location |
| Ground | Flat transparent circle at y=0 | Simplest; upgrade to hemisphere later |
| Time animation | `requestAnimationFrame` loop | Needed for play/pause time advancement |
| Below-horizon stars | Dimmed colors (not hidden) | Per the vision doc's 80% alpha reduction |
| Mobile input | OrbitControls touch | Built-in one-finger rotate, no config needed |

### What's Deferred (Milestones 2+)

- Moon position (hardest body — astronomy-engine handles it, but visual representation deferred)
- Planets beyond Sun (Milestone 2)
- Constellation lines and boundaries
- Ecliptic / celestial equator overlay
- Zodiac divisions
- Birth chart / personal astrology layer
- User-settable location
- Compass labels beyond N/S/E/W

---

### Performance Budget

| Item | Draw calls | Triangles |
|---|---|---|
| Sky sphere | 1 | ~8K |
| Stars (Points) | 1 | 0 (point primitives) |
| Ground circle | 1 | ~128 |
| Sun sprite | 1 | 2 |
| Cardinal labels (4) | 4 | 8 |
| **Total** | **~8** | **~8K** |

This is trivially light for any modern phone GPU.
