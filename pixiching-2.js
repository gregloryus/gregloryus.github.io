document.addEventListener("DOMContentLoaded", () => {
  const app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x000000,
  });
  document.getElementById("canvas-div").appendChild(app.view);

  let particles = [];
  let scaleSize = 4;
  let cols = Math.floor(window.innerWidth / scaleSize);
  let rows = Math.floor(window.innerHeight / scaleSize);
  let idCounter = 1;
  let quadTree = new QuadTree(Infinity, 30, new Rect(0, 0, cols + 1, rows + 1));

  class Particle {
    constructor(x, y) {
      this.id = idCounter++;
      this.pos = { x, y };
      this.graphics = new PIXI.Graphics();
      this.draw();
    }

    draw() {
      this.graphics.beginFill(0xffffff); // Assuming white for all particles for now
      this.graphics.drawRect(
        this.pos.x * scaleSize,
        this.pos.y * scaleSize,
        scaleSize,
        scaleSize
      );
      this.graphics.endFill();
      app.stage.addChild(this.graphics);
    }

    update() {
      // Update logic here
    }
  }

  function addParticle(x, y) {
    let particle = new Particle(x, y);
    quadTree.addItem(x, y, particle);
    particles.push(particle);
  }

  app.ticker.add((delta) => {
    quadTree.clear();
    particles.forEach((particle) => {
      quadTree.addItem(particle.pos.x, particle.pos.y, particle);
      particle.update();
    });
    // Note: Pixi.js automatically handles the drawing
  });

  // Example usage
  addParticle(10, 10);
});
