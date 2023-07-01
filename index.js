import fs from 'fs';
import express from 'express';
import { Configuration, OpenAIApi } from "openai";
import 'dotenv/config';
import world from './routes/world.js';

const dataDir = fs.existsSync('/data') ? '/data': './data';
const rootDir = fs.existsSync('/data') ? '/' : '.';

// Create emoji cache directory if it doesn't exist
const emojiCacheDir = dataDir + '/cache/emojis';
if (!fs.existsSync(emojiCacheDir)) {
  fs.mkdirSync(emojiCacheDir, { recursive: true });
}

(async () => {
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_KEY,
  });
  const openai = new OpenAIApi(configuration);

  const app = express();
  const port = process.env.PORT || 8080;

  const queryGPT4 = async (prompt) => {
    console.log('Querying GPT-4:', prompt);
    const completion = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
    });
    return completion.data.choices[0].message.content;
  };

  app.get('/favicon.ico', (req, res) => res.status(204));

  // app.use('/models/*', createProxyMiddleware({
  //   target: 'http://51.68.165.227:8081',
  //   changeOrigin: true,
  // }));

  app.get('/', async (req, res) => {
    return res.send(
`<html>
  <head>
    <title>AI Generatorss</title>
  </head>
  <body>
    <h1>AI Generators</h1>

    <ul>
      <li><a href="/emoji/purple apple">/models/purple apple</a></li>
    </ul>
  </body>
</html>`
    );
  });

  app.use(express.static('static'));

  app.use('/world', world);

  app.get('/emoji/:name', async (req, res) => {
    const name = req.params.name;

    if (!name)
      return res.status(400).send('No emoji name provided');

    // Check if emoji is cached
    const emojiCachePath = `${emojiCacheDir}/${name}.txt`;
    if (fs.existsSync(emojiCachePath)) {
      console.log('Emoji found in cache:', name);
      return res.sendFile(emojiCachePath, { root: rootDir });
    }

    // Query GPT-4
    const prompt = `Which single character best corresponds to "${name}"? This can be alphanumeric, a symbol, an ascii icon, or an emoji. Respond only with the character and nothing else.`;
    const emoji = await queryGPT4(prompt);

    // Cache emoji
    fs.writeFileSync(emojiCachePath, emoji);

    return res.send(emoji);
  });

  app.listen(port, () => {
    console.log(`AI generators started on port ${port}`);
  });
})();
