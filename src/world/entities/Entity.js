export default class Entity {
  metadata = {};

  constructor(world, label, string, x, y) {
    this.world = world;
    this.label = label;
    this.string = string;
    this.x = x;
    this.y = y;
  }

  preTick() {}

  tick() {}

  setPosition(x, y) {
    this.world.cells[this.y][this.x] = null;
    this.x = x;
    this.y = y;
    this.world.cells[this.y][this.x] = this;
  }

  toString() {
    return this.label;
  }

  toJSON() {
    return {
      className: this.constructor.name,
      label: this.label,
      string: this.string,
      x: this.x,
      y: this.y,
      metadata: this.metadata,
    };
  }
}