// Ensure the document is fully loaded before executing
document.addEventListener("DOMContentLoaded", async () => {
  // Create a new PIXI.Application instance
  const app = new PIXI.Application();

  // Asynchronously initialize the application with specified options
  await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x000000, // Black background color
  });

  // Add the application's canvas to a specific element in the DOM
  document.getElementById("canvas-div").appendChild(app.canvas);

  // The rest of your PixiJS logic here
  let particles = [];
  let scaleSize = 1;
  let cols = Math.floor(window.innerWidth / scaleSize);
  let rows = Math.floor(window.innerHeight / scaleSize);
  let idCounter = 1;
  let quadTree = new QuadTree(Infinity, 30, new Rect(0, 0, cols + 1, rows + 1));

  class Particle {
    constructor(x, y) {
      this.id = idCounter++;
      this.pos = {
        x: Math.min(Math.max(x, 0), cols - 1),
        y: Math.min(Math.max(y, 0), rows - 1),
      };
      this.graphics = new PIXI.Graphics();
      this.color = 0xffff00; // Yellow color
      this.draw();
    }

    draw() {
      this.graphics.clear();
      // Updated to use the new fill method and rect method as per PixiJS v8
      this.graphics
        .fill({ color: this.color })
        .rect(
          this.pos.x * scaleSize,
          this.pos.y * scaleSize,
          scaleSize,
          scaleSize
        );
      app.stage.addChild(this.graphics);
    }

    update() {
      // Random movement logic
      this.pos.x += Math.floor(Math.random() * 3) - 1;
      this.pos.y += Math.floor(Math.random() * 3) - 1;
      this.pos.x = Math.min(Math.max(this.pos.x, 0), cols - 1);
      this.pos.y = Math.min(Math.max(this.pos.y, 0), rows - 1);
      this.draw();
    }
  }

  function addParticle(x, y) {
    let particle = new Particle(x, y);
    quadTree.addItem(x, y, particle);
    particles.push(particle);
  }

  // Setup FPS counter using the updated PixiJS v8 syntax
  let elapsed = 0;
  const fpsText = new PIXI.Text({
    text: "FPS: 0",
    style: { fontFamily: "Arial", fontSize: 24, fill: 0xffffff },
  });
  app.stage.addChild(fpsText);

  // Update and render loop
  app.ticker.add(() => {
    quadTree.clear();
    particles.forEach((particle) => {
      quadTree.addItem(particle.pos.x, particle.pos.y, particle);
      particle.update();
    });

    // Update FPS counter every second
    elapsed += app.ticker.deltaMS;
    if (elapsed >= 1000) {
      fpsText.text = `FPS: ${Math.round(app.ticker.FPS)}`;
      elapsed = 0;
    }
  });

  // Generate 100 particles in random positions
  for (let i = 0; i < 1000; i++) {
    const x = Math.random() * window.innerWidth;
    const y = Math.random() * window.innerHeight;
    addParticle(x / scaleSize, y / scaleSize);
  }
});
