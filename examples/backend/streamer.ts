import express from 'express';
import { join } from 'path';
import { spawnSync } from 'child_process';
import { existsSync, mkdirSync, createReadStream } from 'fs';

const DEBUG_ENABLED = Boolean(process.env.PLECO_DEBUG);

function debugLog(...args: any[]) {
  if (DEBUG_ENABLED) {
    console.log(...args);
  }
}

const rawDir = join(__dirname, 'uploads');
const processedDir = join(__dirname, 'processed');
if (!existsSync(processedDir)) {
  mkdirSync(processedDir);
}

const app = express();
const port = process.env.STREAM_PORT ? Number(process.env.STREAM_PORT) : 3001;

app.get('/stream/:name', (req, res) => {
  const { name } = req.params;
  if (!name) return res.status(400).send('Bad request');

  const rawPath = join(rawDir, name);
  const base = name.replace(/\.[^/.]+$/, '');
  const outWav = join(processedDir, `${base}.wav`);
  const metaPath = join(processedDir, `${base}.json`);

  if (!existsSync(outWav)) {
    spawnSync('python3', [
      join(__dirname, 'librosa_encoder.py'),
      rawPath,
      outWav,
      metaPath,
    ]);
  }

  if (existsSync(outWav)) {
    res.setHeader('Content-Type', 'audio/wav');
    createReadStream(outWav).pipe(res);
  } else {
    res.status(404).send('Not found');
  }
});

app.listen(port, () => {
  debugLog(`Streamer running on http://localhost:${port}`);
});
