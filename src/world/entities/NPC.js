import { promptFunctions } from '../openai.js';

import Entity from './Entity.js';
import npcFunctions from '../npcFunctions.json' assert { type: 'json' };

const NPCfunctionsMap = Object.fromEntries(npcFunctions.map(f => [f.name, f]));

export default class NPC extends Entity {
  static memorySize = 5;

  constructor(world, label, string, x, y) {
    super(world, label, string, x, y);
  }

  async preTick() {
    this.metadata.speechPrev = this.metadata.speechCurr;
    this.metadata.speechCurr = null;
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

    const surroundingEntities = [
      this.world.cells[this.y - 1][this.x],
      this.world.cells[this.y + 1][this.x],
      this.world.cells[this.y][this.x - 1],
      this.world.cells[this.y][this.x + 1],
    ];
    const surroundings = surroundingEntities.map(cell => cell ? cell.toString() : 'nothing');
    const maySpeak = !this.metadata.speechPrev && surroundingEntities.some(cell => cell && cell.constructor.name === 'NPC');

    let formattedSurroundings = `To your front is ${surroundings[0]}.\nTo your back is ${surroundings[1]}.\nTo your left is ${surroundings[2]}.\nTo your right is ${surroundings[3]}.\n`;

    const otherNPCs = this.world.cells.flat().filter(cell => cell && cell.constructor.name === 'NPC' && cell !== this);
    for (const npc of otherNPCs) {
      formattedSurroundings += `\n${npc.label} is ${Math.abs(npc.x - this.x)} cells to your ${npc.x < this.x ? 'left' : 'right'} and ${Math.abs(npc.y - this.y)} cells to your ${npc.y < this.y ? 'front' : 'back'}.`
    }

    let formattedEvents = '';
    if (this.world.prevEvents?.length) {
      formattedEvents = 'In the previous round:\n';
      for (const event of this.world.prevEvents)
        formattedEvents += `  - ${event}\n`;
      formattedEvents += '\n';
    }

    const surroundingEntitiesThatHaveSpoken = surroundingEntities.filter(cell => cell && cell.constructor.name === 'NPC' && cell.metadata.speechPrev);

    let formattedSpeech = '';
    if (surroundingEntitiesThatHaveSpoken.length) {
      formattedSpeech = 'In the previous round:\n';
      for (const entity of surroundingEntitiesThatHaveSpoken)
        formattedSpeech += `  - ${entity.label} said "${entity.metadata.speechPrev}"\n`;
      formattedSpeech += '\n';
    }

    const m = NPCfunctionsMap;

    const capabilities = [
      m.doNothing,
      //m.remember,
    ];

    if (surroundingEntities[0] == null)
      capabilities.push(m.stepForward);
    if (surroundingEntities[1] == null)
      capabilities.push(m.stepBackward);
    if (surroundingEntities[2] == null)
      capabilities.push(m.stepLeft);
    if (surroundingEntities[3] == null)
      capabilities.push(m.stepRight);

    if (maySpeak)
      capabilities.push(m.say);

    let functionCall;
    do {
      functionCall = await promptFunctions(
`Your name is ${this.label}. You live on a 32x32 grid. Your current coordinates are (${this.x}, ${this.y}).

${formattedMemory}Your goal is: "Walk to someone and have interesting conversations"

You're currently carrying nothing.

${formattedSurroundings}

${formattedEvents}${formattedSpeech}You MUST perform a single function in response to the above information.`,// Your memory is precious, so only remember important things others tell you.`,
      capabilities);

      this[functionCall.name](...Object.values(functionCall.arguments));

      // if (functionCall.name === 'say')
      //   return `${this.label} said: "${functionCall.arguments.text}"`;

      //this.move(['up', 'down', 'left', 'right'][Math.floor(Math.random() * 4)]);
    } while (functionCall.name === 'remember');
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
    this.metadata.speechCurr = text;
    // colour output
    console.log('\x1b[33m%s\x1b[0m', this.label + ':', text);
    // console.log(this.label, 'saying', text);
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