<template>
  <div class="max-w-2xl mx-auto p-8">
    <article class="max-w-2xl">
      <div class="prose">
        <h1>Miniverse</h1>

        <p>This is an experiment of a small 32x32 world with autonomous emoji agents powered by LLMs. See <a href="https://yousefamar.com/memo/projects/miniverse/" target="_blank">the project page</a> for more details.</p>

        <p>Click <code>Tick</code> to step through the simulation, and click a cell for more info on it.</p>

        <div class="flex flex-row mb-2 justify-center">
          <button class="btn btn-primary" @click="tick">Tick</button>
        </div>
      </div>

      <div class="world flex flex-col">
        <div class="flex flex-row" v-for="(row, y) in world?.cells" :key="y">
          <div class="cell" :class="[ cell && 'occupied', cell?.metadata?.speechCurr && 'speaking' ]" v-for="(cell, x) in row" :key="x" @click="selectCell(cell)"><span v-if="cell === ' '">&nbsp;</span><span v-else v-html="cell?.string"></span></div>
        </div>
      </div>

      <div v-if="selectedCell" class="card w-full bg-neutral shadow-xl mt-2">
        <div class="card-body">
          <h2 class="card-title">{{ selectedCell.string }} {{ selectedCell.label }} <div class="badge">{{ selectedCell.className }}</div></h2>
          <p>Current position: ({{ selectedCell.x }}, {{ selectedCell.y }})</p>
          <p v-if="selectedCell.metadata?.speechCurr"><b>Saying:</b> {{ selectedCell.metadata.speechCurr }}</p>
          <p v-if="selectedCell.metadata?.speechPrec"><b>Previously said:</b> {{ selectedCell.metadata.speechPrev }}</p>
        </div>
      </div>
    </article>

  </div>
</template>
<script>
export default {
  data() {
    return {
      world: null,
      selectedCell: null,
    }
  },
  methods: {
    selectCell(cell) {
      this.selectedCell = cell;
    },

    async tick() {
      const res = await fetch('/world/tick');
      const data = await res.json();
      this.world = data;

      for (const row of this.world.cells) {
        for (const cell of row) {
          if (cell?.className === 'NPC' && cell.metadata?.speechCurr) {
            console.log(cell.label, 'said', cell.metadata.speechCurr);
          }
        }
      }
    },
  },
  computed: {


  },
  async mounted() {
    const res = await fetch('/world/state');
    const data = await res.json();
    this.world = data;
  },
}
</script>

<style scoped>
.world {
  font-size: min(1em, 2vw);
  align-items: center;
}

.cell {
  position: relative;
  text-align: center;
  line-height: 1.1em;
  width: 1.1em;
  height: 1.1em;
}

.cell.occupied {
  cursor: pointer;
}

@keyframes speaking {
  0% { content: ""; }
  50% { content: "💬"; }
  100% { content: ""; }
}

.speaking span::before {
  pointer-events: none;
  position: absolute;
  bottom: 15%;
  left: 40%;
  opacity: 80%;
  content: "";
  animation: speaking 1s infinite;
}
</style>
