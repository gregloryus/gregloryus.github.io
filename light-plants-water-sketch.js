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

//SLIDERS
let redrawSpeed = 0; // speed that draw() executes (0)
let fadeOpacity = 15; // how quickly tails fade (3)

//turns off descriptive errors that add computing costs
p5.disableFriendlyErrors = true;

//P5 STUFF

// p5 setup, runs once when page loads
function setup() {
  // creates canvas with viewport dimensions
  createCanvas(vw, vh);

  //sets the background to black
  background(0);

  //establishes quadtree
  quadTree = new QuadTree(Infinity, 30, new Rect(0, 0, width, height));

  // creates the sun
  let sun = new Light(width / 2, height / 10 + 5);
  sun.sun = true;
  sun.size = 5;
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
    plant = new Plant(random(width), (height / 100) * 99);
    plant.seed = true;
    plant.size = 4;
    plant.leaf = true;
    lines.push(plant);
  }

  // creates the water
  for (i = 0; i < numOfWater; i++) {
    walker = new Water(random(width), random(height));
    lines.push(walker);
  }

  //sets the redraw speed, usually set to 0
  noLoop();
  setInterval(redraw, 0); // where 10 is the minimum time between frames in ms
}

// p5 draw, loops forever
function draw() {
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

  // turns off the light switch
  if (lightPulse) {
    lightPulse = false;
  }

  //applies the background / fade
  colorMode(RGB, 100, 100, 100, 100);
  stroke(color(100, 100, 100, 100));
  background(0, 0, 0, fadeOpacity);

  let fps = getFrameRate();

  // text(`${lines.length}`, 10, 10);
  // text(`${fps}`, 10, 30);
  // quadTree.debugRender();

  if (resetSketchWarning) {
  return
    text(`growth stops when plants reach mid-screen`, 10, 10);
    text(`tallest plant: ${tallestPlantHeight}% up-screen`, 10, 35);
  }

  if (resetSketch) {
    for (walker of lines) {
       walker.stuck = true
       }
  }
}
