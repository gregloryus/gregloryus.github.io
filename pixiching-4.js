document.addEventListener("DOMContentLoaded", async () => {
  const app = new PIXI.Application();
  await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x000000,
  });
  document.getElementById("canvas-div").appendChild(app.canvas);

  // The rest of your PixiJS logic here
  let particles = [];
  let scaleSize = 1;
  let cols = Math.floor(window.innerWidth / scaleSize);
  let rows = Math.floor(window.innerHeight / scaleSize);
  let idCounter = 1;
  let quadTree = new QuadTree(Infinity, 30, new Rect(0, 0, cols + 1, rows + 1));

  // Generate a texture for the particles
  const graphics = new PIXI.Graphics();
  graphics.fill(0xffff00); // Yellow
  graphics.rect(0, 0, scaleSize, scaleSize); // Match particle size
  const texture = app.renderer.generateTexture(graphics);

  // Initialize ParticleContainer
  const particleContainer = new PIXI.ParticleContainer(1000, {
    scale: true,
    position: true,
    rotation: false,
    uvs: false,
    tint: false,
  });
  app.stage.addChild(particleContainer);

  // Adjust Particle class to use sprites with the generated texture
  class Particle {
    constructor(x, y) {
      this.sprite = new PIXI.Sprite(texture);
      this.sprite.x = x;
      this.sprite.y = y;
      particleContainer.addChild(this.sprite);
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

  // Populate the container with particles
  for (let i = 0; i < 1000; i++) {
    new Particle(
      Math.random() * app.screen.width,
      Math.random() * app.screen.height
    );
  }

  // Update and render loop
  app.ticker.add((delta) => {
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

  // Your existing FPS counter and other logic
});
