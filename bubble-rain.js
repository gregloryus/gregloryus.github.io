



//DECLARATIONS

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

let quadTree

//SLIDERS

let numOfLines = 256
let releaseSpeed = 2;
let canvasSize = 333

let newVaporCount = 0
let vaporCount = 0
let rain = false

let rainStart = numOfLines * 1.3
let rainStop = numOfLines/4

let newOpacity = 100; // opacity of lines
let newSize = 1; // stroke size

//P5 STUFF

// p5 setup, runs once when page loads
function setup() {  
  createCanvas(vw, vh);
  background(0);
  
  quadTree = new QuadTree(Infinity, 30, new Rect(0, 0, width, height));
  
  noLoop();
  setInterval(redraw, 0); // where 10 is the minimum time between frames in ms
}



// p5 draw, loops forever
function draw() {
  quadTree.clear();
  for (const boid of lines) {
    quadTree.addItem(boid.pos.x, boid.pos.y, boid);
  }
  
  //releases a set number of lines from the center of screen
  if (frameCount % releaseSpeed === 1 && lines.length < numOfLines) {
    walker = new Walker(random(width), 0);
    lines.push(walker);
  }

  
  for (walker of lines) {
    if (this.vapor && this.pos.y < height/4) {
      newVaporCount++
    }
  }


 //determines when it rains
  if (newVaporCount > rainStart) {
    rain = true
  }
  if (newVaporCount < rainStop) {
    rain = false
  }
  
//if it's raining, for every line, check it against every line, and if both lines are vapor and in the upper 4th and the lines aren't the same line, then condensate
// if (rain) {
//   for (var i = 0; i < lines.length; i++) {
//     for (var j = 0; j < lines.length; j++) {
//       if (lines[j].vapor && lines[i].vapor && lines[i].pos.y < height/4 && lines[j].pos.y < height/4 && i !== j) {
//         if (checkDist(lines[i].pos, lines[j].pos)) {
//           lines[i].vapor = false
//           lines[i].temp = 0
//           lines.splice(j, 1)
//           console.log("vapor turned to water")
//           vaporCount = vaporCount -2
//         }
//       }
//     }
//   }
// }

//have each line update and show
  for (var walker of lines) {
    walker.rain()
    walker.update();
    walker.show();
  }

  newVaporCount = 0
  
  colorMode(RGB, 100, 100, 100, 100);
  stroke(color(100, 100, 100, 100));
  // textSize(50)
  // text(`${lines.length}`, width/2, height/2)
  // text(`${vaporCount}`, width/2, height/2 - 50)
  if (frameCount % 10 === 1) {
    background(0, 0, 0, 5);
  }
  // background(0,0,0,3)
  
  // quadTree.debugRender();
}


function checkDist(a, b) {
  var dx = b.x - a.x;
  var dy = b.y - a.y;
  if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
    return true;
  }
}
