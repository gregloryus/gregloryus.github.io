//DECLARATIONS

// creates the lines array where all particles will dwell
let lines = [];
let resetSketch = false;
let resetSketchWarning = false;

//Creates variables for the viewport w/h
const vw = Math.max(
  document.documentElement.clientWidth || 0,
  window.innerWidth || 0
);
const vh = Math.max(
  document.documentElement.clientHeight || 0,
  window.innerHeight || 0
);

// Declaring things
let quadTree;
let scaleNum = 1;
let noPlants = false;
//SLIDERS
let redrawSpeed = 0; // speed that draw() executes (0)
let fadeOpacity = 10; // how quickly tails fade (3)

//turns off descriptive errors that add computing costs
p5.disableFriendlyErrors = true;

//P5 STUFF

// p5 setup, runs once when page loads
function setup() {
  // creates canvas with viewport dimensions
  createCanvas(vw, vh);

  width = width / scaleNum;
  height = height / scaleNum;

  //sets the background to black
  background(0);

  //establishes quadtree
  quadTree = new QuadTree(Infinity, 30, new Rect(0, 0, width, height));

  // creates the sun
  let sun = new Light(width / 2, height / 10);
  sun.sun = true;
  sun.opacity = 100;
  sun.sat = 0;
  sun.size = 8;
  if (sunMoveMode) {
    sun.stuck = false;
  } else {
    sun.stuck = true;
  }
  sun.start = sun.pos.copy(); // saves the sun's first position

  //pushes the sun into the 0 index of lines array
  lines.push(sun);

  // creates the light
  for (i = 0; i < numOfLight; i++) {
    let light = new Light(lines[0].pos.x, lines[0].pos.y);
    light.return = true;
    lines.push(light);
  }

  // "creates the plants" will goes here

  for (i = 0; i < numOfPlants; i++) {
    //evenly spaces out plants, leaving the edges
    plant = new Plant(
      width / numOfPlants / 2 + (width / numOfPlants) * i,
      height * 0.9
    );
    plant.seed = true;
    plant.size = 10;
    plant.hue = 1;
    plant.leaf = true;
    plant.randomizeGenes();
    lines.push(plant);
  }

  // creates the water
  for (i = 0; i < numOfWater; i++) {
    walker = new Water(random(width), random(height));
    lines.push(walker);
  }

  //sets the redraw speed, usually set to 0
  noLoop();
  setInterval(redraw, redrawSpeed); // where 10 is the minimum time between frames in ms
}

// p5 draw, loops forever
function draw() {
  noPlants = true;
  scale(scaleNum);
  time++;
  //this saves the current mouse position to the previous variable
  pmouseX = mouseX;
  pmouseY = mouseY;

  //clears the quadtree and adds particles
  quadTree.clear();
  for (const boid of lines) {
    quadTree.addItem(boid.pos.x, boid.pos.y, boid);
  }

  //releases light from the sun
  if (lightPulseMode && frameCount % lightPulseRate <= 1) {
    lightPulse = true;
    // console.log("flash light");
    // console.log(lines);
  }

  //have each line update and show
  for (var walker of lines) {
    walker.update();
    walker.show();
  }

  //iterate backwards
  // for (let index = lines.length - 1; index >= 0; index--) {
  //   lines[index].update();
  //   lines[index].show();
  // }

  //if no plants, drop a new seed from the middle top
  if (noPlants === true) {
    let seed = new Plant(width / 2, 0);
    seed.seed = true;
    seed.size = 4;
    seed.hue = 13;
    seed.sat = 100;
    seed.fallLimit = 0.25 + random();
    seed.vel = p5.Vector.fromAngle(TWO_PI * 0.25, 1); //downwards
    seed.offset = random(1000000);
    seed.leaf = false;
    seed.stuck = false;
    seed.randomizeGenes();
    lines.push(seed);
  }

  // turns off the light switch
  if (lightPulse) {
    lightPulse = false;
  }

  // TURN BELOW ALL BACK ON

  //applies the background / fade
  colorMode(RGB, 100, 100, 100, 100);
  stroke(color(100, 100, 100, 100));
  background(0, 0, 0, fadeOpacity);

  // strokeWeight(1);
  // colorMode(HSB, 100, 100, 100, 100);
  // stroke((frameCount / 20) % 100, 100, 100, 100);

  // line(0, height * terminalHeight, width, height * terminalHeight);

  // stroke(17, 0, 100, 10);
  // line(0, height * terminalHeight + 1, width, height * terminalHeight + 1);
  // line(0, height * terminalHeight - 1, width, height * terminalHeight - 1);

  // text(`${lines.length}`, 10, 10);
  // stroke(17, 100, 100, 100);
  // textSize(20);
  // strokeWeight(0.5);
  // textSize(width / 50);
  // text(currentStatus, 10, 30);

  // if (newRecord) {
  //   text(
  //     `
  //   New record! Genes passed on!
  //   Red seeds are clones
  //   Purple seeds are mutants`,
  //     width / 2,
  //     30
  //   );
  // }
  // quadTree.debugRender();

  // TURN ABOVE ALL BACK ON

  // if (resetSketchWarning) {
  //   text(`everything resets when a plant reaches mid-screen`, 10, 10);
  //   text(`tallest plant: ${tallestPlantHeight}% up-screen`, 10, 35);
  // }
}
