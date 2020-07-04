window.onload = () => {
  var text = document.getElementById("text");
  var tree = document.getElementById("tree");
  var moon = document.getElementById("moon");
  // var starsID = document.getElementById("starsID");
  var addNewDayButton = document.getElementById("button");
  addNewDayButton.addEventListener("click", startNewDay);
  // clearInterval(autoClick)
  // var addPruneButton = document.getElementById("pruneButton");
  // addPruneButton.addEventListener("click", prune);
};

// IDEAS: 1. Make the flowers die after a certain amount of day. 2. Limit flowers to a pre-ordained (rolled) number of children -- this will stop the chart from being so horizontal... or make chances 2x worse to give birth after each birth

// WHERE I LEFT OFF: trying to delete old flowers by setting flower to {} in the startNewDay process. Somehow, they're still being rendered, and I can't figure out where it's pulling the dead flower emoji from.

let day = 0;

i = 0;

function moonPhase() {
  if (day % 28 < 3) {
    return moonPhases[i];
  } else if (day % 28 < 7) {
    return moonPhases[i + 1];
  } else if (day % 28 < 10) {
    return moonPhases[i + 2];
  } else if (day % 28 < 14) {
    return moonPhases[i + 3];
  } else if (day % 28 < 18) {
    return moonPhases[i + 4];
  } else if (day % 28 < 21) {
    return moonPhases[i + 5];
  } else if (day % 28 < 25) {
    return moonPhases[i + 6];
  } else {
    return moonPhases[i + 7];
  }
}

let moonPhases = ["🌕", "🌖", "🌗", "🌘", "🌑", "🌒", "🌓", " 🌔"];

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

const weedSpecies = ["🌿", "🌱", "☘️", "🍀", "🍃", "🌾"];

function assignFlowerSpecies() {
  return flowerSpecies[Math.floor(Math.random() * flowerSpecies.length)];
}

function assignWeedSpecies() {
  return weedSpecies[Math.floor(Math.random() * weedSpecies.length)];
}

const flowerGender = [
  // used to randomly assign a gender; could create a function to automatically create an array reflecting the desired probability, e.g., 80% fertile would be an array with 4 "fertile" elements and 1 "infertile" element. Could call it genderOdds()
  "fertile",
  "infertile",
];

function assignGender() {
  return flowerGender[Math.floor(Math.random() * flowerGender.length)];
}

var startingFlower = {
  children: [],
  species: assignFlowerSpecies(),
  generation: 1,
  parent: 0,
  id: 1,
  indexNum: 0,
  chance: 0.05,
  chanceDivider: 1,
  age: 1,
  daySinceReset: 0,
  gender: "fertile",
  parentSpecies: "",
  geneology: "",
  treePrefix: "<li><span>",
  treeSuffix: "</span>",
  treeLeaf: "</li>",
  birthday: 1,
  infertileAge: 0,
};

let flowers = [{ ...startingFlower }];

function startNewDay() {
  for (flower of flowers) {
    if (flower.daySinceReset === 0) {
      flower.daySinceReset++;
    } else {
      var roll = Math.random();
      if (
        roll < flower.chance / flower.chanceDivider &&
        flower.gender === "fertile"
      ) {
        flowers.push({
          ...startingFlower,
          id: flowers[flowers.length - 1].id + 1,
          indexNum: flowers[flowers.length - 1].indexNum + 1,
          generation: flower.generation + 1,
          species: assignFlowerSpecies(),
          gender: assignGender(),
          parent: flower.id,
          parentSpecies: flower.species,
          geneology: flower.geneology + flower.species,
          children: [],
          birthday: day,
        });
        flower.chance = startingFlower.chance;
        flower.chanceDivider++;
        flower.daySinceReset = 1;
        flower.age++;
        flower.children[flower.children.length] = flowers[flowers.length - 1];
        flower.gender = assignGender();
      } else if (flower.gender === "infertile" && flower.infertileAge > 5) {
        console.log("removal started");
        if (
          flower.children.some((child) => child.gender === "fertile") === false
        ) {
          console.log("removal step 2");
          console.log(flower);
          console.log("removal step 3");
        }
      } else if (flower.gender === "infertile") {
        flower.chance = 0;
        flower.age++;
        flower.infertileAge++;
        flower.species = "🥀"; // NEW
      } else if (
        roll < flower.chance / flower.chanceDivider &&
        flower.gender === "weed"
      ) {
        flowers.push({
          ...startingFlower,
          id: flowers[flowers.length - 1].id + 1,
          generation: flower.generation + 1,
          species: assignWeedSpecies(),
          gender: flower.gender,
          parent: flower.id,
          indexNum: flowers[flowers.length - 1].indexNum + 1,
          parentName: flower.species,
          children: [],
          birthday: day,
          geneology: flower.geneology + flower.species,
        });
        flower.chance = startingFlower.chance;
        flower.daySinceReset = 1;
        flower.chanceDivider++;
        flower.age++;
        flower.children[flower.children.length] = flowers[flowers.length - 1];
      } else {
        var newChance =
          flower.daySinceReset >= 3 && flower.chance < 0.9
            ? flower.chance + 0.05
            : flower.chance;
        flower.chance = newChance;
        flower.age++;
        flower.daySinceReset++;
      }
    }
  }

  // for (flower of flowers) {
  //     if (flower.gender === "infertile" && flower.infertileAge > 3) {
  //         cutFlower(flower)
  //         console.log(flowers);
  //         console.log("pruning attempted 🚨")
  //     }
  // }
  day++;
  let moons = moonPhase();
  moon.innerHTML = moonPhase();

  // let stars = starsPhase();
  // console.log(stars)
  // starsID.innerHTML = stars

  var numberOfFlowers = flowers.length;
  text.innerHTML = `Day ${day}. <br> You have ${numberOfFlowers} flowers.`;

  var flowerHTML = buildTree(flowers);

  tree.innerHTML = flowerHTML.join(" ");
  console.log(tree.innerHTML);
  console.log(flowers);

  console.log(day);
  console.log(numberOfFlowers);

  if (day < numberOfFlowers) {
    clearInterval(autoClick);
  }

  // THIS MAKES THE BACKGROUND CHANGE COLORS WHEN NO LIVING FLOWERS LEFT
  // if (flowers.some(child => child.gender === "fertile") === false) {
  //     document.body.style.backgroundColor = "black";
  //     document.body.style.color = "white";
  // }
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

function setColor(flower) {
  if (flower.chance / flower.chanceDivider < 0.25) {
    return `style="background-color: rgba(${
      (flower.chance / flower.chanceDivider) * 255 * 4
    }, 255, 0, ${(flower.chance / flower.chanceDivider) * 1.5})"`;
  } else if (0.5 > flower.chance / flower.chanceDivider >= 0.25) {
    return `style="background-color: rgba(255, ${
      (0.5 - flower.chance / flower.chanceDivider) * 255 * 4
    }, 0, ${(flower.chance / flower.chanceDivider) * 1.5})"`;
  } else {
    return `style="background-color: rgba(255, 0, 0, ${
      (flower.chance / flower.chanceDivider) * 1.5
    })"`;
  }
}

function setColorSimple(flower) {
  if (flower.gender === "weed") {
    return `style="background-color: rgba(255, 0, 0, ${
      Math.floor(flower.chance / flower.chanceDivider) * 1.5
    })"`;
  } else if (flower.gender === "infertile") {
    // if (flower.children.some(child => child.gender === "fertile") === false) {
    //     return `style="background-color: rgba(0, 0, 0, ${((flower.infertileAge + 5)/10)})"`
    // } else {
    return `style="background-color: rgba(255, 239, 213, ${Math.floor(
      flower.infertileAge / 5
    )})"`;
    // }
  } else {
    return `style="background-color: rgba(0, 255, 0, ${Math.floor(
      (flower.chance / flower.chanceDivider) * 1.5
    )})"`;
  }
}

function flowerBioLong(flower) {
  if (
    flower.gender === "infertile" &&
    flower.infertileAge > 5 &&
    flower.children.some((child) => child.gender === "fertile") === false
  ) {
    console.log(flower.species + flower.id + " pruned!");
    flower = {};
  } else {
    return `<li><span ${setColorSimple(flower)}>${flowerBio(flower)}</span>`;
  }
}

function flowerBio(flower) {
  // return `<div style="background-color: rgba(${5*flower.chance}, ${255/(20*flower.chance)}, 0, ${3*flower.chance})">${flower.species}</div>`
  // return `<div class="name">${flower.species}</div><br>age: ${flower.age}<br>${Math.floor(100 * flower.chance)}%`
  return `${flower.species}`;
}

// function prune(flowers) {
//     if (flower.gender === "infertile") {
//         console.log("removal started");
//         if (flower.children.some(child => child.gender === "fertile") === false) {
//             console.log("removal step 2");
//             flower = ""
//             console.log("removal step 3");
//         }
//     }
// }

var autoClick = setInterval(function () {
  document.getElementById("button").click();
}, 200);

function startRolling() {
  var autoClick = setInterval(function () {
    document.getElementById("button").click();
  }, 100);
}

function cutFlower(flower) {
  flower = {
    children: "",
    species: "",
    generation: "",
    parent: "",
    id: "",
    indexNum: "",
    chance: "",
    chanceDivider: "",
    age: "",
    daySinceReset: "",
    gender: "",
    parentSpecies: "",
    geneology: "",
    treePrefix: "",
    treeSuffix: "",
    treeLeaf: "",
    birthday: "",
    infertileAge: "",
  };
}

// // Simulate a click every second
// var autoClick = setInterval(clickButton, 100);

// // Simulate click function
// function clickButton() {
//     click_event = new CustomEvent('click');
//     btn_element = document.querySelector('#button');
//     btn_element.dispatchEvent(click_event);
// }

//     for (child of parent) {
//         if (parent.children.length > 0) {
//             flowerHTML.push(`<ul>`);
//             console.log(flowerHTML);
//             for (i = 0; i < flower.children.length; i++) {
//                 flowerHTML.push("<li><span>" + flower.children[i].species + "</span>");
//                 console.log(flowerHTML);
//                 if (flower.children[i].children.length > 0) {
//                     assignChildren(flower.children[i], flower.children)
//                 } else {
//                     flowerHTML.push("</li>")
//                     console.log(flowerHTML);
//                 }
//             }
//             flowerHTML.push(`</ul>`)
//             console.log(flowerHTML);
//         } else {
//             flowerHTML.push("</li>")
//             console.log(flowerHTML);
//         }
//     }
// }

// var flowerGenerationsHtml = flowers.reduce((acc, flower) => {
//     const flowerHtml =  `<span class="flower"><div class="name">${flower.species}</div><div class="lineage">${flower.geneology}</div><br>${flower.gender}<br>age: ${flower.age}<br>chance: ${Math.floor(flower.chance*100)}%</span>`
//     if (acc.length >= flower.generation) {
//         acc[flower.generation - 1] += flowerHtml
//     } else {
//         acc.push(flowerHtml);`6`
//     }
//     return acc;
// }, [])

// function startNewDay2() {
//     for (flower of startingFlower) {
//         if (flowerTree[0].daySinceReset === 0) {
//             flowerTree[0].daySinceReset++;
//         }
//         else {
//             var roll = Math.random();
//         if (roll < flower.chance && flower.gender === "fertile") {
//             startingFlower._children.push({
//                 ...startingFlower,
//                 id: idList.length + 1,
//                 generation: flower.generation + 1,
//                 species: assignFlowerSpecies(),
//                 gender: assignGender(),
//                 parent: flower.id,
//                 parentSpecies: flower.species,
//                 geneology: flower.geneology + flower.species
//             });
//             flower.chance = startingFlower.chance;
//             flower.daySinceReset = 1;
//             console.log(flower.age);
//             flower.age++;
//             console.log(flower.age);
//             idList++;
//         } else if (flower.gender === "infertile") {
//             flower.chance = 0;
//             flower.age++;
//         } else {
//             var newChance = (flower.daySinceReset >= 3 && flower.chance < .9)
//                 ? flower.chance + .05
//                 : flower.chance;
//             flower.chance = newChance
//             flower.age++;
//             flower.daySinceReset++;
//         }}
//     }
//     day++;

//     statusUpdate(startingFlower);

//     function statusUpdate() {
//         text.innerHTML = `It is day #${day}. You have ${idList} flowers.`
//         console.log(startingFlower)
//     }
// }}

// let starsBlank =
// `
// `
// let starsStar =
// `　✨
// `
// let starsLeft1 =
// `✨
// `
// let starsRight1 =
// `　　✨
// `
// let starsLeft2 =
// `✨✨
// `
// let starsRight2 =
// `　✨✨
// `
// let starsStars =
// `✨　✨
// `
// let starsComet =
// `　　💫
// `
// const starsArray = [
//     starsBlank,
//     starsBlank,
//     starsBlank,
//     starsBlank,
//     starsBlank,
//     starsBlank,
//     starsBlank,
//     starsBlank,
//     starsBlank,
//     starsBlank,
//     starsBlank,
//     starsBlank,
//     starsBlank,
//     starsBlank,
//     starsBlank,
//     starsBlank,
//     starsBlank,
//     starsBlank,
//     starsBlank,
//     starsBlank,
//     starsLeft1,
//     starsLeft2,
//     starsRight1,
//     starsRight2,
//     starsStar,
//     starsStars,
//     starsComet]

// function starsPhase() {
//     return starsArray[Math.floor(Math.random() * starsArray.length)]
// }
// stars = starsPhase()
// stars.innerHTML = `${starsPhase()}`
