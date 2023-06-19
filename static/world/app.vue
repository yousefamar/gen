<template>
  <div class="max-w-2xl mx-auto p-8">
    <article class="prose max-w-2xl">
      <h1>Mini World</h1>

      <p>This is an experiment of a small world with autonomous agents powered by LLMs.</p>

      <div class="world flex flex-col">
        <div class="flex flex-row" v-for="(row, y) in world?.cells" :key="y">
          <div class="cell" v-for="(cell, x) in row" :key="x"><span v-if="cell === ' '">&nbsp;</span><span v-else v-html="cell?.string"></span></div>
        </div>
      </div>

      <div class="flex flex-row">
        <button class="btn btn-primary" @click="tick">Tick</button>
      </div>
    </article>

  </div>
</template>
<script>
export default {
  data() {
    return {
      world: null,
    }
  },
  methods: {
    async tick() {
      const res = await fetch('/world/tick');
      const data = await res.json();
      this.world = data;
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
}

.cell {
  text-align: center;
  line-height: 1.1em;
  width: 1.1em;
  height: 1.1em;
}
</style>
