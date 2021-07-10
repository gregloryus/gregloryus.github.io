// // function for touch controls
function mouseDragged() {
  let perceptionRadius = touchRadius; // how far it can detect
  let perceptionCount = 100; // how many items it can perceive at once

  //capturing mouse locations
  let mouseV = createVector(mouseX, mouseY);
  let pmouseV = createVector(pmouseX, pmouseY);

  //sets a drag force that gets added to particle velocity
  let dragForce = p5.Vector.sub(mouseV, pmouseV);
  dragForce.mult(0.2);

  for (const other of quadTree.getItemsInRadius(
    mouseX,
    mouseY,
    perceptionRadius,
    perceptionCount
  )) {
    // if (other.plant) {
    //   other.acc.add(dragForce);
    //   other.acc.limit(10);
    // }
    if (!other.water) {
      return;
    }
    //distance between mouse and particle
    let d = dist(mouseX, mouseY, other.pos.x, other.pos.y);

    //heat and push particles, increasing magnitude the closer you are
    other.temp = other.temp + (100 - d) / 10;
    other.acc.add(dragForce);
    other.acc.mult((100 - d) / 100);
    other.acc.limit(100);
  }
}

// MAKE A NEW PLANT
//   let plant = new Plant(mouseX, mouseY);
//   plant.seed = true;
//   plant.size = 10;

//   plant.leaf = true;
//   lines.push(plant);

// function keyPressed() {
//   lines[0].pos.x = mouseX;
//   lines[0].pos.y = mouseY;
// }

// function doubleClicked() {
//   // window.location.reload();
// }
