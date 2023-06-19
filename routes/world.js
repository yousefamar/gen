const fs = require('fs');
const express = require('express');
const router = express.Router();
const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
  apiKey: process.env.OPENAI_KEY,
});
const openai = new OpenAIApi(configuration);

const dataDir = fs.existsSync('/data') ? '/data': './data';

const NPCfunctions = [
  {
    name: "doNothing",
    description: "Do nothing",
    parameters: {
      type: "object",
      properties: {},
    },
  }, {
    name: "remember",
    description: "Add facts about people to your long-term memory",
    parameters: {
      type: "object",
      properties: {
        fact: {
          type: "string",
          description: "The fact to remember",
        },
      },
      required: [ "fact" ],
    },
  }, {
    name: "stepForward",
    description: "Step one cell forward (minus Y)",
    parameters: {
      type: "object",
      properties: {},
    },
  }, {
    name: "stepBackward",
    description: "Step one cell back (plus Y)",
    parameters: {
      type: "object",
      properties: {},
    },
  }, {
    name: "stepLeft",
    description: "Step one cell to the left (minus X)",
    parameters: {
      type: "object",
      properties: {},
    },
  }, {
    name: "stepRight",
    description: "Step one cell to the right (plus X)",
    parameters: {
      type: "object",
      properties: {},
    },
  }, {
    name: "say",
    description: "Say something short (one sentence)",
    parameters: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "The text to say",
        },
      },
      required: [ "text" ],
    },
  },
];

const prompt = async (prompt) => {
  let completion;
  try {
    completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo-0613",
      messages: [{ role: "user", content: prompt }],
      functions: NPCfunctions,
    });
  } catch (e) {
    console.log(e.response.data.error.message);
    return;
  }

  const { function_call } = completion.data.choices[0].message;

  if (!function_call)
    return {
      name: 'doNothing',
      arguments: {},
    };

  function_call.arguments = JSON.parse(function_call.arguments);

  return function_call;
};

class World {
  constructor(name = 'default') {
    this.name = name;
    this.path = dataDir + '/worlds/' + name;
    fs.mkdirSync(this.path, { recursive: true });
    this.loadFromPath();
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
    this.cells = state.cells.map(row => row.map(cell => cell ? buildEntity(this, cell) : null));
    this.prevEvents = state.prevEvents;
  }

  async tick() {
    const entities = this.cells.flat().filter(cell => cell);

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

class Entity {
  metadata = {};

  constructor(world, label, string, x, y) {
    this.world = world;
    this.label = label;
    this.string = string;
    this.x = x;
    this.y = y;
  }

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

class NPC extends Entity {
  static memorySize = 5;

  constructor(world, label, string, x, y) {
    super(world, label, string, x, y);
  }

  async tick() {

    const formattedCoordinates = ``;

    let formattedMemory = '';
    if (this.metadata.memory?.length) {
      formattedMemory = 'Your memory contains the following facts:\n';
      for (const fact of this.metadata.memory)
        formattedMemory += ` - ${fact}\n`;
      formattedMemory += '\n';
    }

    const surroundings = [
      this.world.cells[this.y - 1][this.x],
      this.world.cells[this.y + 1][this.x],
      this.world.cells[this.y][this.x - 1],
      this.world.cells[this.y][this.x + 1],
    ].map(cell => cell ? cell.toString() : 'nothing');

    const formattedSurroundings = `To your front is ${surroundings[0]}.\nTo your back is ${surroundings[1]}.\nTo your left is ${surroundings[2]}.\nTo your right is ${surroundings[3]}.`;

    let formattedEvents = '';
    if (this.world.prevEvents?.length) {
      formattedEvents = 'Just now:\n';
      for (const event of this.world.prevEvents)
        formattedEvents += `  - ${event}\n`;
      formattedEvents += '\n';
    }

    const functionCall = await prompt(
`Your name is ${this.label}. You live on a 32x32 grid. Your current coordinates are (${this.x}, ${this.y}).

${formattedMemory}The message from God is: "Make friends"

You're currently carrying nothing.

${formattedSurroundings}

${formattedEvents}You may only speak when next to someone. You MUST perform a single function in response to the above information.`
    );

    this[functionCall.name](...Object.values(functionCall.arguments));

    if (functionCall.name === 'say')
      return `${this.label} said: "${functionCall.arguments[0]}"`;

    //this.move(['up', 'down', 'left', 'right'][Math.floor(Math.random() * 4)]);
  }

  doNothing() {
    console.log('doing nothing');
  }

  remember(fact) {
    console.log(this.label, 'remembering', fact);
    this.metadata.memory = this.metadata.memory || [];
    this.metadata.memory.push(fact);
    if (this.metadata.memory.length > NPC.memorySize)
      this.metadata.memory.shift();
  }

  say(text) {
    console.log(this.label, 'saying', text);
  }

  stepForward() {
    console.log(this.label, 'stepping forward');
    if (this.world.cells[this.y - 1][this.x] === null)
      this.setPosition(this.x, this.y - 1);
  }

  stepBackward() {
    console.log(this.label, 'stepping backward');
    if (this.world.cells[this.y + 1][this.x] === null)
      this.setPosition(this.x, this.y + 1);
  }

  stepLeft() {
    console.log(this.label, 'stepping left');
    if (this.world.cells[this.y][this.x - 1] === null)
      this.setPosition(this.x - 1, this.y);
  }

  stepRight() {
    console.log(this.label, 'stepping right');
    if (this.world.cells[this.y][this.x + 1] === null)
      this.setPosition(this.x + 1, this.y);
  }

  move(direction) {
    switch (direction) {
      case 'up':
        if (this.world.cells[this.y - 1][this.x] === null)
          this.setPosition(this.x, this.y - 1);
        break;
      case 'down':
        if (this.world.cells[this.y + 1][this.x] === null)
          this.setPosition(this.x, this.y + 1);
        break;
      case 'left':
        if (this.world.cells[this.y][this.x - 1] === null)
          this.setPosition(this.x - 1, this.y);
        break;
      case 'right':
        if (this.world.cells[this.y][this.x + 1] === null)
          this.setPosition(this.x + 1, this.y);
        break;
      default:
        break;
    }
  }
}

const classMap = {
  'Entity': Entity,
  'NPC': NPC,
};

const buildEntity = (world, json) => {
  const entity = new classMap[json.className](world, json.label, json.string, json.x, json.y);
  entity.metadata = json.metadata;
  return entity;
}


const world = new World();

router.get('/tick', async (req, res) => {
  await world.tick();
  return res.json(world.toJSON());
});

router.get('/state', async (req, res) => {
  return res.json(world.toJSON());
});

module.exports = router;