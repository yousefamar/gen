import fs from 'fs';
import Entity from './Entity.js';
import NPC from './NPC.js';

const dataDir = fs.existsSync('/data') ? '/data': './data';

const classMap = {
  'Entity': Entity,
  'NPC': NPC,
};

export default class World {
  constructor(name = 'default') {
    this.name = name;
    this.path = dataDir + '/worlds/' + name;
    fs.mkdirSync(this.path, { recursive: true });
    this.loadFromPath();
  }

  buildEntity(json) {
    const entity = new classMap[json.className](this, json.label, json.string, json.x, json.y);
    entity.metadata = json.metadata;
    return entity;
  }

  loadDefault(width = 32, height = 32) {
    this.time = 0;
    this.width = width;
    this.height = height;
    this.cells = [];
    this.prevEvents = [];

    for (let y = 0; y < height; ++y) {
      this.cells.push([]);
      for (let x = 0; x < width; ++x) {
        if (y === 0 || y === (height - 1) || x === 0 || x === (width - 1))
          this.cells[y].push(new Entity(this, 'wall', '🧱', x, y));
        else
          this.cells[y].push(null);
      }
    }

    const emojis = [ '👨', '👩', '👧', '👦', '👶' ];
    const names  = [ 'John', 'Jane', 'Alice', 'Bob', 'Eve' ];

    for (let i = 0; i < 5; ++i) {
      let x, y;
      do {
        x = Math.floor(Math.random() * (width - 2)) + 1;
        y = Math.floor(Math.random() * (height - 2)) + 1;
      } while (this.cells[y][x]);

      this.cells[y][x] = new NPC(this, names[i], emojis[i], x, y);
    }
  }

  loadFromPath() {
    const statePath = this.path + '/state.json';

    if (!fs.existsSync(statePath)) {
      this.loadDefault();
      this.save();
      return;
    }

    const state = JSON.parse(fs.readFileSync(statePath));
    this.time = state.time;
    this.width = state.width;
    this.height = state.height;
    this.cells = state.cells.map(row => row.map(cell => cell ? this.buildEntity(cell) : null));
    this.prevEvents = state.prevEvents;
  }

  async tick() {
    const entities = this.cells.flat().filter(cell => cell);

    for (const entity of entities)
      await entity.preTick();

    const events = [];
    for (const entity of entities) {
      const event = await entity.tick();
      if (event)
        events.push(event);
    }
    this.prevEvents = events;

    this.save();
  }

  save() {
    if (this.path)
      fs.writeFileSync(this.path + '/state.json', JSON.stringify(this.toJSON()));
  }

  toJSON() {
    return {
      time: this.time,
      width: this.width,
      height: this.height,
      cells: this.cells.map(row => row.map(cell => cell ? cell.toJSON() : null)),
      prevEvents: this.prevEvents,
    };
  }
}