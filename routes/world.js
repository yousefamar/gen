import express from 'express';
import World from '../src/world/entities/World.js';

const router = express.Router();

const world = new World();

router.get('/tick', async (req, res) => {
  await world.tick();
  return res.json(world.toJSON());
});

router.get('/state', async (req, res) => {
  return res.json(world.toJSON());
});

export default router;