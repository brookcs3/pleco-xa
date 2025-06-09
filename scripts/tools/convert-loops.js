#!/usr/bin/env node
import { promises as fs } from 'fs';
import { join, extname, basename, dirname } from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import { execFile } from 'child_process';

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const audioDir = join(__dirname, '../../src/assets/audio');

async function convert() {
  const files = await fs.readdir(audioDir);
  for (const file of files) {
    const ext = extname(file).toLowerCase();
    if (ext === '.aif' || ext === '.aiff') {
      const input = join(audioDir, file);
      const output = join(audioDir, basename(file, ext) + '.mp3');
      console.log(`Converting ${file} -> ${basename(output)}`);
      await execFileAsync('ffmpeg', ['-y', '-i', input, output]);
    }
  }
}

convert().catch((err) => {
  console.error(err);
  process.exit(1);
});
