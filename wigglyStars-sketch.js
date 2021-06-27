const vw = Math.max(
  document.documentElement.clientWidth || 0,
  window.innerWidth || 0
);
const vh = Math.max(
  document.documentElement.clientHeight || 0,
  window.innerHeight || 0
);

let numOfStonks = vw;

let stonkmarket = [];

let quadTree;

function setup() {
  createCanvas(vw, vh);
  background(0);

  for (i = 0; i < numOfStonks; i++) {
    let stonk = new Stonk(width * (i / numOfStonks), height / 2);
    // let stonk = new Stonk(width * (i / numOfStonks), height * Math.random());
    stonkmarket.push(stonk);
  }

  quadTree = new QuadTree(Infinity, 30, new Rect(0, 0, width, height));
}

function draw() {
  quadTree.clear();
  for (var stonk of stonkmarket) {
    quadTree.addItem(stonk.pos.x, stonk.pos.y, stonk);
  }

  background(0, 0, 0, 25);

  for (var stonk of stonkmarket) {
    stonk.update();
    stonk.show();
  }

  // quadTree.debugRender();
}
