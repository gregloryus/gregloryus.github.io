window.onload = () => {
  var text = document.getElementById("text");
  var tree = document.getElementById("tree");
  var addNewDayButton = document.getElementById("button");
  addNewDayButton.addEventListener("click", startNewDay);
};

const flowerSpecies = [
  "🌻",
  "🦋",
  "🔮",
  "🌺",
  "🍁",
  "🌿",
  "💐",
  "🌷",
  "🌸",
  "🌹",
  "🌼",
];

function assignFlowerSpecies() {
  return flowerSpecies[Math.floor(Math.random() * flowerSpecies.length)];
}

const flowerGender = [
  // used to randomly assign a gender; could create a function to automatically create an array reflecting the desired probability, e.g., 80% fertile would be an array with 4 "fertile" elements and 1 "infertile" element. Could call it genderOdds()
  "fertile",
  "fertile",
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
  chance: 0.05,
  age: 1,
  daySinceReset: 0,
  gender: "fertile",
  parentSpecies: "",
  geneology: "",
  treePrefix: "<li><span>",
  treeSuffix: "</span>",
  treeLeaf: "</li>",
  birthday: 1,
};

let flowers = [{ ...startingFlower }];

let day = 0;

function startNewDay() {
  for (flower of flowers) {
    if (flower.daySinceReset === 0) {
      flower.daySinceReset++;
    } else {
      var roll = Math.random();
      if (roll < flower.chance && flower.gender === "fertile") {
        flowers.push({
          ...startingFlower,
          id: flowers[flowers.length - 1].id + 1,
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
        flower.daySinceReset = 1;
        flower.age++;
        flower.children[flower.children.length] = flowers[flowers.length - 1];
      } else if (flower.gender === "infertile") {
        flower.chance = 0;
        flower.age++;
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
  day++;

  var numberOfFlowers = flowers.length;
  text.innerHTML = `Day ${day}. <br> You have ${numberOfFlowers} flowers.`;
  console.log(flowers);

  var flowerHTML = buildTree(flowers);
  console.log(flowerHTML);
  tree.innerHTML = flowerHTML.join(" ");
  console.log(flowerHTML.join(" "));
}

var flowersFirst = [flowers[0]];

function buildTree() {
  var flowerHTML = [];
  console.log(flowerHTML);

  for (flower of flowersFirst) {
    flowerHTML.push("<li><span>" + flower.species + "</span>");
    console.log(flowerHTML);
    assignChildren(flower);
    flowerHTML.push("</li>");
    console.log(flowerHTML);
  }

  function assignChildren(parent) {
    if (parent.children.length > 0) {
      flowerHTML.push("<ul>");
      console.log(flowerHTML);
      for (child of parent.children) {
        flowerHTML.push("<li><span>" + child.species + "</span>");
        console.log(flowerHTML); // LI OPEN
        if (child.children.length > 0) {
          assignChildren(child);
        }
        flowerHTML.push("</li>");
        console.log(flowerHTML); //LI CLOSE
      }
      flowerHTML.push("</ul>");
      console.log(flowerHTML); // UL CLOSE
    }
  }
  return flowerHTML;
}

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
