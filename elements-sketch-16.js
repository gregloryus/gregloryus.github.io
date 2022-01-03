//DECLARATIONS
// like the look of these settings
// note: good settings:
// water opacity = 0.2, shadow = 3 x 100f

let lines = [];
//Creates variables for the viewport w/h
const vw = Math.max(
  document.documentElement.clientWidth || 0,
  window.innerWidth || 0
);
const vh = Math.max(
  document.documentElement.clientHeight || 0,
  window.innerHeight || 0
);

let minDem = Math.min(vw, vh);

let quadTree;

let canvas;
let canvasContext;

//SLIDERS
let numOfLines = 1000;
let releaseSpeed = 2; // modulus for particle gen

let frameModulus = 100;
let shadowDegree = 3;
let waterOpacity = 0.2;

// let frameModulus = Math.floor(2 + Math.random() * 198);
// let shadowDegree = Math.floor(1 + Math.random() * 14);
// let waterOpacity = 0.01 + Math.random() * 0.39;
// console.log(
//   `
//   frames: ${frameModulus}
//   shadow: ${shadowDegree},
//   water: ${Math.floor(waterOpacity * 100) / 100}`
// );
let earthMin = 50;
let earthMax = 4;
let numOfEarth = 40;
//P5 STUFF

function restartDrawing() {
  lines = [];
  background(0);
}

// p5 setup, runs once when page loads
function setup() {
  // applyButton = createButton("Apply changes");
  // applyButton.mousePressed(restartDrawing);

  let p5canvas = createCanvas(vw, vh);

  // Add the canvas to the page
  p5canvas.parent("canvas-div");

  // Initialize native JS/HTML5 canvas object, since writing basic rectangles to it is faster than using p5
  let canvas = document.getElementById("defaultCanvas0");
  canvasContext = canvas.getContext("2d");
  background(0);
  // background(255, 204, 0);

  quadTree = new QuadTree(Infinity, 30, new Rect(0, 0, width, height));

  // let shadowSlider = createSlider();
  // let shadowSlider = createSlider(0, 50, 10, 5);

  // shadowSlider.position(0, 0);
  // shadowSlider.style("width", "80px");
  // shadowDegree = shadowSlider.value();

  noLoop();
  setInterval(redraw, 0); // where 10 is the minimum time between frames in ms

  for (i = 0; i < numOfEarth; i++) {
    let newEarth = new Earth(
      Math.floor(Math.random() * width),
      Math.floor(Math.random() * height)
    );
    lines.push(newEarth);
  }
}

// p5 draw, loops forever
function draw() {
  // line(mouseX, mouseY, pmouseX, pmouseY);
  pmouseX = mouseX;
  pmouseY = mouseY;
  quadTree.clear();
  for (const boid of lines) {
    quadTree.addItem(boid.pos.x, boid.pos.y, boid);
  }

  // releases a set number of lines from the center of screen
  if (frameCount % releaseSpeed === 1 && lines.length < numOfLines) {
    walker = new Walker(
      random(width),
      (height / 20) * 17 + random(height / 10)
    );

    //assigning each water a role of 1/2
    if (Math.random() > 0.5) {
      walker.role = 1;
    } else {
      walker.role = 2;
    }

    lines.push(walker);
  }

  //have each line update and show
  for (var walker of lines) {
    walker.update();
    walker.show();
  }

  colorMode(RGB, 100, 100, 100, 100);
  stroke(color(100, 100, 100, 100));
  // textSize(50);
  // text(`${lines.length}`, width / 2, height / 2);
  // background(0, 0, 0, 3);
  // //   if (Math.random() > 0.998) {

  // if (frameCount % 1000 === 500) {
  //   background(0, 0, 0, 25);
  // }
  if (frameCount % frameModulus === 1) {
    background(0, 0, 0, shadowDegree);
  }

  // quadTree.debugRender();
}

//FUNCTIONS

function checkDist(a, b) {
  var dx = b.x - a.x;
  var dy = b.y - a.y;
  if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
    return true;
  }
}

// QUADTREE FUNCTIONS

function mouseDragged() {
  let perceptionRadius = 100;
  let perceptionCount = 100;

  let mouseV = createVector(mouseX, mouseY);
  let pmouseV = createVector(pmouseX, pmouseY);
  // line(mouseV.x, mouseV.y, pmouseV.x, pmouseV.y)
  let dragForce = p5.Vector.sub(mouseV, pmouseV);
  dragForce.mult(0.2);
  // console.log(dragForce.mag())

  // noFill()

  // circle(mouseX, mouseY, 200)

  for (const other of quadTree.getItemsInRadius(
    mouseX,
    mouseY,
    perceptionRadius,
    perceptionCount
  )) {
    let d = dist(mouseX, mouseY, other.pos.x, other.pos.y);

    if (other.earth) {
      other.acc.add(dragForce);
      other.acc.mult((100 - d) / 100);

      other.acc.limit(10);
    }
  }
}

function findAvgTemp() {
  let tempCounter = 0;
  let cumTemp = 0;
  let temps = [];
  let perceptionRadius = 100;
  let perceptionCount = 100;

  let mouseV = createVector(mouseX, mouseY);
  let pmouseV = createVector(pmouseX, pmouseY);

  for (const other of quadTree.getItemsInRadius(
    mouseX,
    mouseY,
    perceptionRadius,
    perceptionCount
  )) {
    temps.push(other.temp);
    tempCounter++;
    cumTemp = cumTemp + other.temp;
  }

  let avgTemp = cumTemp / tempCounter;
  console.log(avgTemp);
}

function popEarth() {
  let perceptionRadius = 100;
  let perceptionCount = 100;

  let mouseV = createVector(mouseX, mouseY);
  let pmouseV = createVector(pmouseX, pmouseY);

  let popCounter = 0;

  for (const other of quadTree.getItemsInRadius(
    mouseX,
    mouseY,
    perceptionRadius,
    perceptionCount
  )) {
    if (other.earth && popCounter < 1) {
      other.popped = true;

      console.log("popped pt 1");
      popCounter++;
    }
  }
}

function mouseClicked() {}
