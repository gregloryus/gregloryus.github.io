window.onload = () => {
  var tree = document.getElementById("tree");
  // var addNewDayButton = document.getElementById("button");
  // addNewDayButton.addEventListener("click", startNewDay);
  startNewDay();
};

let changingSize = 1;

let arrayOfSketchSettings = [];
let currentSketchSettings;

var sketch1 = function (p) {
  p.pos;
  p.prev;
  p.walker;
  p.center;

  p.counter;

  // Creating array that will hold lines
  p.lines = [];

  // Maybe here call a function that just loads the parameters below, but each time have it pull the previous one + evolve it somehow...

  // Parameters for sliders/adjustments
  p.newSize = currentSketchSettings.size; // stroke size
  p.newOpacity = currentSketchSettings.opacity; // opacity of lines
  p.newBranch = currentSketchSettings.branch; // chance of branching
  p.newTerm = currentSketchSettings.term; // chance of terminiating
  p.newDense = currentSketchSettings.dense; // multiplying velocity magnitude
  p.newFade = currentSketchSettings.fade; // how quickly old stalks fade
  p.newSat = currentSketchSettings.sat; // how quickly saturation rises
  p.newStarSize = currentSketchSettings.starSize; // starburst size
  p.newStarPts = currentSketchSettings.starPts; // starburst points

  p.sketchSettings = {
    size: p.newSize,
    opacity: p.newOpacity,
    branch: p.newBranch,
    term: p.newTerm,
    dense: p.newDense,
    fade: p.newFade,
    sat: p.newSat,
    hue: p.newHueSpeed,
    starSize: p.newStarSize,
    starPts: p.newStarPts,
  };

  p.setup = function () {
    p.createCanvas(100, 100);
    p.vw = p.width;
    p.vh = p.height;
    p.walker = new Walker(p.vw / 2, p.vh / 2);
    p.lines.push(p.walker);
    p.background(0);

    // p.randomizeDrawing();

    // p.randomizeButton = p.createButton("Randomize line");
    // p.randomizeButton.mousePressed(p.randomizeDrawing);
  };

  p.draw = function () {
    for (p.walker of p.lines) {
      p.walker.update();
      p.walker.show();
    }
  };

  p.randomizeDrawing = function () {
    // console.log("random attempt");
    p.counter++;
    p.lines = [];
    p.background(0);
    p.lines.push(new Walker());
    p.newSize = p.random(1, 25); // stroke size
    p.newOpacity = p.random(1, 100); // opacity of lines
    p.newBranch = p.random(0, 5); // chance of branching
    p.newTerm = p.random(0, 5); // chance of terminiating
    p.newDense = p.random(2); // multiplying velocity magnitude
    p.newFade = p.random(10); // how quickly old stalks fade
    p.newSat = p.random(10); // how quickly saturation rises
    p.newStarSize = p.random(100); // starburst size
    p.newStarPts = p.random(2, 33); // starburst points
  };
  class Walker {
    constructor(x, y) {
      this.pos = p.createVector(x, y);
    }

    update() {
      // creates vector pointing in random direction
      this.vel = p5.Vector.random2D();
      this.vel.normalize();
      this.vel.setMag(1);
      // multiplies vel length/magnitude
      this.vel.mult(p.sketchSettings.dense);
      // sets a vector located at the middle of the screen
      p.center = p.createVector(p.vw / 2, p.vh / 2);
      // try to create vector pointing from center to current position
      this.outgrowth = p.center.sub(this.pos);
      this.outgrowth.mult(-0.0006 * (1 + p.lines.length / 200));

      const roll = p.random(100);
      if (roll > 5) {
        this.vel.add(this.outgrowth);
        this.pos.add(this.vel);
      } else {
        const reroll = p.random(100);
        if (reroll < p.sketchSettings.branch) {
          const newWalker = new Walker(this.pos.x, this.pos.y);
          p.lines.push(newWalker);
          // console.log("new walker attempted");
          if (p.lines.length > 1000) {
            p.lines = [];
            p.background(0);
            const nextWalker = new Walker(p.vw / 2, p.vh / 2);
            p.lines.push(nextWalker);
          }
        }
        if (reroll > 100 - p.sketchSettings.term) {
          p.colorMode(p.RGB, 100, 100, 100, 1);
          p.stroke(p.color(100, 100, 100, 0.01));

          star(
            this.pos.x, // x location
            this.pos.y, // y location
            1, // inner radius
            p.sketchSettings.starSize, // outer radius
            p.sketchSettings.starPts // number of points
          );
          if (p.lines.length === 1) {
            p.colorMode(p.HSB);
            p.color(0, 0, 0, 1);
            star(
              this.pos.x, // x location
              this.pos.y, // y location
              p.random(5), // inner radius
              p.random(p.sketchSettings.starSize * 3), // outer radius
              p.random(p.sketchSettings.starPts) // number of points
            );
          }
          p.lines.pop(this);
          // console.log("pop");
          if (p.lines.length === 0) {
            p.colorMode(p.HSB);
            p.background(0, 0, 0, 50);
            const nextWalker = new Walker(p.vw / 2, p.vh / 2);
            p.lines.push(nextWalker);
          }
        }
      }
      if (
        this.pos.y > p.height ||
        this.pos.y < 0 ||
        this.pos.x > p.width ||
        this.pos.x < 0
      ) {
        p.lines = [];
        p.colorMode(p.HSB);
        p.background(0, 0, 0, 10);
        const nextWalker = new Walker(p.vw / 2, p.vh / 2);
        p.lines.push(nextWalker);
      }
    }

    show() {
      p.colorMode(p.HSB, 100, 100, 100, 100);
      let hue = p.floor(100 * ((p.frameCount / 10) % 100)) / 100;
      let saturation = 10 + (p.lines.length * p.sketchSettings.sat) / 2;
      if (saturation > 100) {
        saturation = 100;
      }
      let brightness = 100;
      let opacity = p.sketchSettings.opacity;
      let c = p.color(hue, saturation, brightness, opacity);
      p.stroke(c);
      p.strokeWeight(p.sketchSettings.size);
      p.point(this.pos.x, this.pos.y);
    }
  }
  function star(x, y, radius1, radius2, npoints) {
    let angle = p.TWO_PI / npoints;
    let halfAngle = angle / 2.0;
    p.beginShape();
    for (let a = 0; a < p.TWO_PI; a += angle) {
      let sx = x + p.cos(a) * radius2;
      let sy = y + p.sin(a) * radius2;
      p.vertex(sx, sy);
      sx = x + p.cos(a + halfAngle) * radius1;
      sy = y + p.sin(a + halfAngle) * radius1;
      p.vertex(sx, sy);
    }
    p.endShape(p.CLOSE);
  }
};

let day = 0;

i = 0;

const flowerSpecies = [
  "🌻",
  "🦋",
  "🔮",
  "🌺",
  "🍁",
  "💐",
  "🌷",
  "🌸",
  "🌹",
  "🌼",
];

function assignFlowerSpecies() {
  return flowerSpecies[Math.floor(Math.random() * flowerSpecies.length)];
}

// let sketchSettings = {
//   size: newSize,
//   branch: newBranch,
//   term: newTerm,
//   fade: newFade,
//   dense: newDense,
//   hor: newHor,
//   sat: newSat,
//   hue: newHueSpeed,
//   starSize: newStarSize,
//   starPts: newStarPts,
// };

let flowerSketchSettings = {
  size: 1,
  opacity: 100,
  branch: 5,
  term: 2,
  dense: 1,
  fade: 25,
  sat: 10,
  starSize: 5,
  starPts: 7,
};

var startingFlower = {
  children: [],
  species: assignFlowerSpecies(),
  generation: 1,
  parent: 0,
  id: 1,
  indexNum: 0,
  chance: 1,
  age: 1,
  daySinceReset: 0,
  parentSpecies: "",
  geneology: "",
  treePrefix: "<li><span>",
  treeSuffix: "</span>",
  treeLeaf: "</li>",
  birthday: 1,
  sketchSet: flowerSketchSettings,
};

let flowers = [{ ...startingFlower }];

function flowerDblClick(id) {
  let flower = flowers[id - 1];
  flowers.pop(flower);
}
// GOAL: Make the flower clicked produce a new offspring; complete all the functinos startNewDay does
function flowerClick(id) {
  let flower = flowers[id - 1];
  if (flower.children.length() > 2) {
  return
  }
  flowers.push({
    ...startingFlower,
    id: flowers[flowers.length - 1].id + 1,
    indexNum: flowers[flowers.length - 1].indexNum + 1,
    generation: flower.generation + 1,
    species: assignFlowerSpecies(),
    parent: flower.id,
    parentSpecies: flower.species,
    geneology: flower.geneology + flower.species,
    children: [],
    birthday: day,
    // HERE'S THE BIG BREAKTHROUGH 8.14 !
    sketchSet: {
      ...flower.sketchSet,
      size: flower.sketchSet.size * Math.random() * 2,
      opacity: flower.sketchSet.opacity * Math.random() * 2,
      branch: flower.sketchSet.branch * Math.random() * 2,
      term: flower.sketchSet.term * Math.random() * 2,
      dense: flower.sketchSet.dense * Math.random() * 2,
      fade: flower.sketchSet.fade * Math.random() * 2,
      sat: flower.sketchSet.sat * Math.random() * 2,
      starSize: flower.sketchSet.starSize * Math.random() * 2,
      starPts: flower.sketchSet.starPts * Math.random() * 2,
    },
  });
  flower.children[flower.children.length] = flowers[flowers.length - 1];
  var flowerHTML = buildTree(flowers);

  tree.innerHTML = flowerHTML.join(" ");

  console.log(tree.innerHTML);
  console.log(flowers);

  // console.log(day);
  // console.log(numberOfFlowers);

  // changingSize = 1;

  var sketchCount;

  for (sketchCount = 1; sketchCount < flowers.length + 1; sketchCount++) {
    currentSketchSettings = flowers[sketchCount - 1].sketchSet;

    // arrayOfSketchSettings.push({ size: changingSize });

    new p5(sketch1, `${sketchCount}`);
    // changingSize = arrayOfSketches[sketchCount].size
    // changingSize = changingSize + 5;
  }
}

function startNewDay() {
  for (flower of flowers) {
    if (flower.daySinceReset === 0) {
      flower.daySinceReset++;
    } else {
      var roll = Math.random();
      if (roll < flower.chance && flower.children.length < 2) {
        // roll < flower.chance &&
        // (flower.children.length < 1 ||
        //   (flower.children.length < 2 && flower.generation % 2 === 1))
        flowers.push({
          ...startingFlower,
          id: flowers[flowers.length - 1].id + 1,
          indexNum: flowers[flowers.length - 1].indexNum + 1,
          generation: flower.generation + 1,
          species: assignFlowerSpecies(),
          parent: flower.id,
          parentSpecies: flower.species,
          geneology: flower.geneology + flower.species,
          children: [],
          birthday: day,
          // HERE'S THE BIG BREAKTHROUGH 8.14 !
          sketchSet: {
            ...flower.sketchSet,
            size: flower.sketchSet.size * Math.random() * 2,
            opacity: flower.sketchSet.opacity * Math.random() * 2,
            branch: flower.sketchSet.branch * Math.random() * 2,
            term: flower.sketchSet.term * Math.random() * 2,
            dense: flower.sketchSet.dense * Math.random() * 2,
            fade: flower.sketchSet.fade * Math.random() * 2,
            sat: flower.sketchSet.sat * Math.random() * 2,
            starSize: flower.sketchSet.starSize * Math.random() * 2,
            starPts: flower.sketchSet.starPts * Math.random() * 2,
          },
        });
        flower.age++;
        flower.children[flower.children.length] = flowers[flowers.length - 1];
      } else {
        flower.age++;
        flower.daySinceReset++;
      }
    }
  }

  day++;

  var numberOfFlowers = flowers.length;

  var flowerHTML = buildTree(flowers);

  tree.innerHTML = flowerHTML.join(" ");

  console.log(tree.innerHTML);
  console.log(flowers);

  // console.log(day);
  // console.log(numberOfFlowers);

  // changingSize = 1;

  var sketchCount;

  for (sketchCount = 1; sketchCount < flowers.length + 1; sketchCount++) {
    currentSketchSettings = flowers[sketchCount - 1].sketchSet;

    // arrayOfSketchSettings.push({ size: changingSize });

    new p5(sketch1, `${sketchCount}`);
    // changingSize = arrayOfSketches[sketchCount].size
    // changingSize = changingSize + 5;
  }
}

var flowersFirst = [flowers[0]];

function buildTree() {
  var flowerHTML = [];

  for (flower of flowersFirst) {
    flowerHTML.push(flowerBioLong(flower));
    assignChildren(flower);
    flowerHTML.push("</li>");
  }

  function assignChildren(parent) {
    if (parent.children.length > 0) {
      flowerHTML.push("<ul>");
      for (child of parent.children) {
        flowerHTML.push(flowerBioLong(child));
        if (child.children.length > 0) {
          assignChildren(child);
        }
        flowerHTML.push("</li>");
      }
      flowerHTML.push("</ul>");
    }
  }
  return flowerHTML;
}

function flowerBioLong(flower) {
  return `<li><span id="${flower.id}" onclick="flowerClick(this.id)"></span>`;
}

function flowerBio(flower) {
  return `${flower.species}`;
}
