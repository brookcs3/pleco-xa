import { join } from 'path';
import { spawnSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';

const rawDir = join(import.meta.dir, 'uploads');
const processedDir = join(import.meta.dir, 'processed');
if (!existsSync(processedDir)) {
  mkdirSync(processedDir);
}

export default {
  port: process.env.STREAM_PORT ? Number(process.env.STREAM_PORT) : 3001,
  async fetch(req: Request) {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/stream/')) {
      const name = url.pathname.split('/').pop();
      if (!name) {
        return new Response('Bad request', { status: 400 });
      }
      const rawPath = join(rawDir, name);
      const base = name.replace(/\.[^/.]+$/, '');
      const outWav = join(processedDir, `${base}.wav`);
      const metaPath = join(processedDir, `${base}.json`);

      if (!existsSync(outWav)) {
        spawnSync('python3', [
          join(import.meta.dir, 'librosa_encoder.py'),
          rawPath,
          outWav,
          metaPath,
        ]);
      }

      const file = Bun.file(outWav);
      if (await file.exists()) {
        return new Response(file, {
          headers: { 'Content-Type': 'audio/wav' },
        });
      }
      return new Response('Not found', { status: 404 });
    }

    return new Response('Not found', { status: 404 });
  },
};
