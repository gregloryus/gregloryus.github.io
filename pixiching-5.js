document.addEventListener("DOMContentLoaded", async () => {
  const app = new PIXI.Application();
  await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x000000,
  });
  document.getElementById("canvas-div").appendChild(app.canvas);

  const fpsTextStyle = new PIXI.TextStyle({
    fontFamily: "Arial",
    fontSize: 24,
    fill: "white",
  });
  const fpsText = new PIXI.Text("FPS: 0", fpsTextStyle);
  fpsText.x = 10;
  fpsText.y = 10;
  app.stage.addChild(fpsText);

  // The rest of your PixiJS logic here
  let particles = [];
  let NUM_OF_STARTER_PARTICLES = 10000;
  let scaleSize = 2;
  let cols = Math.floor(window.innerWidth / scaleSize);
  let rows = Math.floor(window.innerHeight / scaleSize);
  let elapsed = 0;
  let quadTree = new QuadTree(Infinity, 30, new Rect(0, 0, cols + 1, rows + 1));

  const graphics = new PIXI.Graphics();
  graphics.rect(0, 0, scaleSize, scaleSize); // Assuming a 10x10 particle size
  graphics.fill(0xffff00); // Yellow color for the particle
  const texture = app.renderer.generateTexture(graphics);

  class Particle {
    constructor(x, y) {
      this.pos = { x, y };
      this.sprite = new PIXI.Sprite(texture);
      this.sprite.x = x * scaleSize;
      this.sprite.y = y * scaleSize;
      app.stage.addChild(this.sprite);

      // setInterval(() => {
      //   console.log(`Particle at x: ${this.sprite.x}, y: ${this.sprite.y}`);
      // }, 1000); // Logs every 5 seconds
    }

    update() {
      const dx = Math.floor(Math.random() * 3) - 1; // Results in -1, 0, or 1
      const dy = Math.floor(Math.random() * 3) - 1; // Results in -1, 0, or 1

      this.pos.x = Math.min(Math.max(this.pos.x + dx, 0), cols - 1);
      this.pos.y = Math.min(Math.max(this.pos.y + dy, 0), rows - 1);

      this.sprite.x = this.pos.x * scaleSize; // Ensure sprite position aligns with grid
      this.sprite.y = this.pos.y * scaleSize;
    }
  }

  // Generate 1000 particles in random positions
  for (let i = 0; i < NUM_OF_STARTER_PARTICLES; i++) {
    particles.push(
      new Particle(
        Math.floor((Math.random() * cols) / 2 + cols / 4),
        Math.floor((Math.random() * rows) / 2 + rows / 4)
      )
    );
  }

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
});
