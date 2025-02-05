// Add to CONSTANTS
const CONSTANTS = {
  // ... existing constants ...

  // Energy Flow Parameters
  ENERGY_FLOW_RATE: 0.2, // max percentage of energy that can flow per update
  UPWARD_FLOW_RATIO: 0.3, // portion of excess that flows upward
  DOWNWARD_FLOW_RATIO: 0.7, // portion of excess that flows downward
  ENERGY_REQUEST_THRESHOLD: 0.3, // energy ratio below which cells request energy
  ENERGY_SHARE_THRESHOLD: 0.7, // energy ratio above which cells share energy
};

class PlantCell {
  // ... existing methods ...

  updateEnergy() {
    // ... existing energy update code ...

    // After collecting/storing energy, handle energy distribution
    this.handleEnergyDistribution();
  }

  handleEnergyDistribution() {
    const energyRatio = this.currentEnergy / this.energyCapacity;

    if (energyRatio < CONSTANTS.ENERGY_REQUEST_THRESHOLD) {
      // Cell needs energy - request from connected cells
      this.requestEnergyFromConnections();
    } else if (energyRatio > CONSTANTS.ENERGY_SHARE_THRESHOLD) {
      // Cell has excess energy - distribute to connected cells
      this.distributeExcessEnergy();
    }
  }

  requestEnergyFromConnections() {
    const needed = this.energyCapacity * 0.5 - this.currentEnergy;
    let received = 0;

    // First try parent
    if (this.parent) {
      received += this.requestEnergyFrom(this.parent, needed - received);
    }

    // If still needed, try children
    if (received < needed) {
      for (const child of this.children) {
        received += this.requestEnergyFrom(child, needed - received);
        if (received >= needed) break;
      }
    }
  }

  requestEnergyFrom(cell, amount) {
    const available = Math.max(
      0,
      cell.currentEnergy -
        cell.energyCapacity * CONSTANTS.ENERGY_REQUEST_THRESHOLD
    );
    const transfer = Math.min(available * CONSTANTS.ENERGY_FLOW_RATE, amount);

    if (transfer > 0) {
      cell.currentEnergy -= transfer;
      this.currentEnergy += transfer;
      return transfer;
    }
    return 0;
  }

  distributeExcessEnergy() {
    const excess =
      this.currentEnergy -
      this.energyCapacity * CONSTANTS.ENERGY_SHARE_THRESHOLD;
    if (excess <= 0) return;

    const upwardAmount = excess * CONSTANTS.UPWARD_FLOW_RATIO;
    const downwardAmount = excess * CONSTANTS.DOWNWARD_FLOW_RATIO;

    // Distribute upward (to children)
    if (this.children.length > 0) {
      const perChild = upwardAmount / this.children.length;
      for (const child of this.children) {
        if (child.currentEnergy < child.energyCapacity) {
          const space = child.energyCapacity - child.currentEnergy;
          const transfer = Math.min(perChild, space);
          this.currentEnergy -= transfer;
          child.currentEnergy += transfer;
        }
      }
    }

    // Distribute downward (to parent)
    if (this.parent && this.parent.currentEnergy < this.parent.energyCapacity) {
      const space = this.parent.energyCapacity - this.parent.currentEnergy;
      const transfer = Math.min(downwardAmount, space);
      this.currentEnergy -= transfer;
      this.parent.currentEnergy += transfer;
    }
  }
}
