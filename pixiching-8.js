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

  let scaleSize = 1;
  let cols = Math.floor(window.innerWidth / scaleSize);
  let rows = Math.floor(window.innerHeight / scaleSize);
  let NUM_OF_STARTER_PARTICLES = Math.floor((cols * rows) / 10);
  let elapsed = 0;
  let idCounter = 1;
  let quadTree = new QuadTree(Infinity, 30, new Rect(0, 0, cols + 1, rows + 1));

  const graphics = new PIXI.Graphics();
  graphics.rect(0, 0, scaleSize, scaleSize); // Assuming a 10x10 particle size
  graphics.fill(0xffff00); // Yellow color for the particle
  const texture = app.renderer.generateTexture(graphics);

  function isOccupied(x, y) {
    let items = quadTree.getItemsInRadius(x, y, 0.5, 10);
    for (const item of items) {
      if (item.pos.x === x && item.pos.y === y) {
        return true;
      }
    }
    return false;
  }

  class Particle {
    constructor(x, y) {
      this.pos = { x, y };
      this.id = idCounter++;
      this.static = false; // Add static flag
      this.sprite = new PIXI.Sprite(texture);
      this.sprite.x = x * scaleSize;
      this.sprite.y = y * scaleSize;
      app.stage.addChild(this.sprite);
    }

    update() {
      if (this.static == true) {
        return;
      }

      let dx = Math.floor(Math.random() * 3) - 1; // Results in -1, 0, or 1
      let dy = Math.floor(Math.random() * 3) - 1; // Results in -1, 0, or 1

      this.pos.x = Math.min(Math.max(this.pos.x + dx, 0), cols - 1);
      this.pos.y = Math.min(Math.max(this.pos.y + dy, 0), rows - 1);

      this.sprite.x = this.pos.x * scaleSize; // Ensure sprite position aligns with grid
      this.sprite.y = this.pos.y * scaleSize;

      // Check for nearby particles
      let items = quadTree.getItemsInRadius(
        this.pos.x,
        this.pos.y,
        scaleSize,
        10
      );
      for (const item of items) {
        if (
          item.static == true && // Ensure it's a static particle
          item.id !== this.id && // Ensure it's not the same particle
          Math.abs(item.pos.x - this.pos.x) <= 1 && // Check x within +/- 1
          Math.abs(item.pos.y - this.pos.y) <= 1 // Check y within +/- 1
        ) {
          this.static = true;
        }
      }
    }
  }

  // Generate 1 particle placed in the center
  let centerParticle = new Particle(Math.floor(cols / 2), Math.floor(rows / 2));
  centerParticle.static = true;
  particles.push(centerParticle);

  // Generate four static particles randomly placed
  for (let i = 0; i < 4; i++) {
    let x = Math.floor(Math.random() * cols);
    let y = Math.floor(Math.random() * rows);
    let staticParticle = new Particle(x, y);
    staticParticle.static = true;
    particles.push(staticParticle);
  }

  // Generate 1000 particles in random positions
  for (let i = 0; i < NUM_OF_STARTER_PARTICLES; i++) {
    particles.push(
      new Particle(
        Math.floor(Math.random() * cols),
        Math.floor(Math.random() * rows)
      )
    );
  }

  // Update and render loop
  app.ticker.add(() => {
    quadTree.clear();
    particles.forEach((particle) => {
      // Add each particle to the quadtree with updated position
      quadTree.addItem(particle.pos.x, particle.pos.y, particle);
    });
    particles.forEach((particle) => {
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
