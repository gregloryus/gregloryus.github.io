document.addEventListener("DOMContentLoaded", () => {
  // Get canvas and context
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  // Set cell size
  const cellSize = 5;

  // Calculate number of cells
  const numCellsX = Math.ceil(window.innerWidth / cellSize);
  const numCellsY = Math.ceil(window.innerHeight / cellSize);
  console.log(`Cell size, in pixels: ${cellSize}`);
  console.log(`Dimensions, in cells ${numCellsX}x${numCellsY}`);
  console.log(
    `Dimensions, in pixels: ${numCellsX * cellSize}x${numCellsY * cellSize}`
  );
  console.log(
    `Screen size, in pixels: ${numCellsX * cellSize}x${numCellsY * cellSize}`
  );

  // Create typed array of cells
  const cells = new Uint8Array(numCellsX * numCellsY);

  // Create array of sand particles
  let numSandParticles = 100;
  let sandParticles = new Uint16Array(numSandParticles * 3);
  let numPlacedSandParticles = 0;
  while (numPlacedSandParticles < numSandParticles) {
    const x = Math.floor(Math.random() * numCellsX);
    const y = Math.floor((Math.random() * numCellsY) / 2);
    if (cells[y * numCellsX + x] === 0) {
      sandParticles[numPlacedSandParticles * 3] = x;
      sandParticles[numPlacedSandParticles * 3 + 1] = y;
      sandParticles[numPlacedSandParticles * 3 + 2] = 1; // yellow
      cells[y * numCellsX + x] = 1;
      numPlacedSandParticles++;
    }
  }

  // Update canvas each frame
  function update() {
    // Set canvas background color to black
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update sand particles
    for (let i = 0; i < sandParticles.length; i += 3) {
      const x = sandParticles[i];
      let y = sandParticles[i + 1];
      if (y < numCellsY - 1 && cells[(y + 1) * numCellsX + x] === 0) {
        // Move sand particle down
        cells[y * numCellsX + x] = 0;
        y++;
        cells[y * numCellsX + x] = 1;
        sandParticles[i + 1] = y;
      }
    }

    // Draw cells
    for (let y = 0; y < numCellsY; y++) {
      for (let x = 0; x < numCellsX; x++) {
        const cell = cells[y * numCellsX + x];
        ctx.fillStyle = cell === 0 ? "black" : "yellow";
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }

    // Report location of sand particle
    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    ctx.fillText(
      `Sand particle location: (${sandParticles[0]}, ${sandParticles[1]})`,
      10,
      60
    );

    // Update FPS and particle counter
    let fps = Math.round(1000 / (Date.now() - lastFrameTime));
    let particleCount = sandParticles.length / 3;

    // Draw FPS and particle counter
    ctx.fillText(`FPS: ${fps}`, 10, 20);
    ctx.fillText(`Particles: ${particleCount}`, 10, 40);

    // Update last frame time
    lastFrameTime = Date.now();

    // Request next frame
    requestAnimationFrame(update);
  }

  // Start animation loop
  let lastFrameTime = Date.now();
  requestAnimationFrame(update);
});
