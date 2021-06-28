const vw = Math.max(
  document.documentElement.clientWidth || 0,
  window.innerWidth || 0
);
const vh = Math.max(
  document.documentElement.clientHeight || 0,
  window.innerHeight || 0
);

let numOfStonks = 8;
// let names = ["🤑", "🥵", "🥶", "😈"];
let names = [
  "🍿 AMC",
  "🍇 BB",
  "🪙 BTC",
  "🐕 DOGE",
  "✨ ETH",
  "🎮 GME",
  "🙅 NOK",
  "🌊 XRP",
];
let emojis = ["🍿", "🍇", "🪙", "🐕", "✨", "🎮", "📞", "🙅"];

let stonkmarket = [];
let highlightedIndex = 0;
let holdingIndex = 0;
let holding = true;
let shorting = false;
let status = "";
let noiseNum;
let noiseSum = 0;
let noiseAvg;
let noiseCount = 0;

let counter = 1;

let quadTree;

let money = 100;
let numOfStonksHeld = 0;

// let paused = false;

function setup() {
  createCanvas(vw, vh);
  colorMode(HSB, 100, 100, 100, 100);
  background(0);

  for (i = 0; i < numOfStonks; i++) {
    let stonk = new Stonk(width / 10, height / 2);
    stonk.name = names[i];
    stonk.emoji = emojis[i];
    stonk.index = i;
    stonkmarket.push(stonk);
  }

  // for (i = 0; i < numOfStonks; i++) {
  //   let stonk = new Stonk(width / 2, height * (i / numOfStonks));
  //   // let stonk = new Stonk(width * (i / numOfStonks), height * Math.random());
  //   stonk.y = false;
  //   stonk.x = true;
  //   stonkmarket.push(stonk);
  // }

  quadTree = new QuadTree(Infinity, 30, new Rect(0, 0, width, height));

  button = createButton("start the stonks");
  button.position(width / 2, (height / 10) * 9.5);
  // button.center("horizontal");
  button.mousePressed(unpause);

  // pause = createButton("stop the stonks");
  // pause.position(width / 2, (height / 10) * 9.5);
  // // button.center("horizontal");
  // pause.mousePressed(pauseMarket);

  prev = createButton("👆");
  prev.position((width / 10) * 5.0, (height / 10) * 8.5);
  prev.mousePressed(prevHighlight);

  next = createButton("👇");
  next.position((width / 10) * 5.5, (height / 10) * 8.5);
  next.mousePressed(nextHighlight);

  prev = createButton(
    `trade ${stonkmarket[holdingIndex].emoji} for ${stonkmarket[highlightedIndex].emoji}`
  );
  prev.position((width / 10) * 5.0, (height / 10) * 9);
  prev.mousePressed(tradeStonk);

  // next = createButton("short");
  // next.position((width / 10) * 5.5, (height / 10) * 8.5);
  // next.mousePressed(shortStonk);
}
function tradeStonk() {
  holdingIndex = highlightedIndex;

  numOfStonksHeld = money / stonkmarket[holdingIndex].value;

  prev = createButton(
    `trade ${stonkmarket[holdingIndex].emoji} for ${stonkmarket[highlightedIndex].emoji}`
  );
  prev.position((width / 10) * 5.0, (height / 10) * 9);
  prev.mousePressed(tradeStonk);
}
function holdStonk() {
  holding = true;
  shorting = false;
}

function shortStonk() {
  holding = false;
  shorting = true;
}

function prevHighlight() {
  highlightedIndex -= 1;
  if (highlightedIndex < 0) {
    highlightedIndex = stonkmarket.length - 1;
  }

  prev = createButton(
    `trade ${stonkmarket[holdingIndex].emoji} for ${stonkmarket[highlightedIndex].emoji}`
  );
  prev.position((width / 10) * 5.0, (height / 10) * 9);
  prev.mousePressed(tradeStonk);

  // numOfStonksHeld = money / stonkmarket[highlightedIndex].value;
}

function nextHighlight() {
  highlightedIndex += 1;
  if (highlightedIndex > stonkmarket.length - 1) {
    highlightedIndex = 0;
  }

  prev = createButton(
    `trade ${stonkmarket[holdingIndex].emoji} for ${stonkmarket[highlightedIndex].emoji}`
  );
  prev.position((width / 10) * 5.0, (height / 10) * 9);
  prev.mousePressed(tradeStonk);

  // numOfStonksHeld = money / stonkmarket[highlightedIndex].value;
}

function unpause() {
  for (stonk of stonkmarket) {
    stonk.paused = false;
  }
}

function pauseMarket() {
  for (stonk of stonkmarket) {
    stonk.paused = true;
  }
}

function keyPressed() {
  if (keyCode === UP_ARROW) {
    prevHighlight();
  } else if (keyCode === DOWN_ARROW) {
    nextHighlight();
  } else if (keyCode === ENTER) {
    tradeStonk();
  } else if (keyCode === 32) {
    unpause();
  }
}

function draw() {
  // if (paused) {
  //   return;
  // }
  quadTree.clear();
  for (var stonk of stonkmarket) {
    quadTree.addItem(stonk.pos.x, stonk.pos.y, stonk);
  }

  if (holding) {
    status = "holding";
  } else if (shorting) {
    status = "shorting";
  }

  background(0, 0, 0, 10);
  stroke(1, 0, 100, 1);
  line(0, height / 2, width, height / 2);

  for (var stonk of stonkmarket) {
    stonk.update();
    stonk.show();
  }

  if (!money) {
    numOfStonksHeld = 100 / stonkmarket[holdingIndex].value;
    money = numOfStonksHeld * stonkmarket[holdingIndex].value;
  }

  money = numOfStonksHeld * stonkmarket[holdingIndex].value;

  textAlign(CENTER);

  stroke(1, 0, 100, 100);
  noiseNum = noise(12345 + counter / 2000);
  noiseSum = noiseSum + noiseNum;
  noiseCount++;
  noiseAvg = noiseSum / noiseCount;

  text(
    `
      You're holding ${Math.floor(numOfStonksHeld * 100) / 100} ${
      stonkmarket[holdingIndex].name
    }
  
      You have $${Math.floor(money)} in stonks
      `,
    width / 2,
    height / 10
  );

  // textAlign(RIGHT);
  // text(
  //   `
  //   ${stonkmarket[0].name}: $${stonkmarket[0].value}
  //   ${stonkmarket[1].name}: $${stonkmarket[1].value}
  //   ${stonkmarket[2].name}: $${stonkmarket[2].value}
  //   ${stonkmarket[3].name}: $${stonkmarket[3].value}
  //   ${stonkmarket[4].name}: $${stonkmarket[4].value}
  //   ${stonkmarket[5].name}: $${stonkmarket[5].value}
  //   ${stonkmarket[6].name}: $${stonkmarket[6].value}
  //   ${stonkmarket[7].name}: $${stonkmarket[7].value}
  //   `,
  //   (width / 4) * 3,
  //   height / 8
  // );

  // for (i = 0; i < stonkmarket.length; i++) {
  //   stroke(1, 0, 100, 100);
  //   text(
  //     `${stonkmarket[i].name}: $${stonkmarket[i].value} ... ${Math.floor(
  //       stonkmarket[i].odds * 100
  //     )}%
  //     `,
  //     width / 2,
  //     (height / 25) * (i + 1)
  //   );
  // }

  // for (i = 0; i < stonkmarket.length; i++) {
  //   stroke(1, 0, 100, 100);
  //   text(
  //     `${stonkmarket[i].name}: $${stonkmarket[i].value} ... ${Math.floor(
  //       stonkmarket[i].odds * 100
  //     )}%
  //     `,
  //     width / 2,
  //     (height / 25) * (i + 1)
  //   );
  // }

  // quadTree.debugRender();
}
