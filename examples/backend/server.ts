import express from 'express';
import multer from 'multer';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { analyzeLoop } from './loopAnalysis';

const DEBUG_ENABLED = Boolean(process.env.PLECO_DEBUG);

function debugLog(...args: any[]) {
  if (DEBUG_ENABLED) {
    console.log(...args);
  }
}

const uploadDir = join(__dirname, 'uploads');
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

interface Track {
  id: number;
  filename: string;
  url: string;
  loopStart: number;
  loopEnd: number;
  createdAt: Date;
}

const upload = multer({ dest: uploadDir });
const app = express();
app.use(express.json());

const tracks: Track[] = [];
const analytics: { lib: string; ts: number }[] = [];

app.post('/api/upload', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const { path: filePath, filename } = req.file;
  const { loopStart, loopEnd } = await analyzeLoop(filePath);
  const track: Track = {
    id: tracks.length + 1,
    filename,
    url: `/uploads/${filename}`,
    loopStart,
    loopEnd,
    createdAt: new Date(),
  };
  tracks.push(track);
  res.json(track);
});

app.get('/api/tracks', (req, res) => {
  res.json(tracks);
});

app.post('/api/analytics', (req, res) => {
  const data = req.body || {};
  analytics.push({ lib: data.lib, ts: Date.now() });
  res.json({ ok: true });
});

app.use('/uploads', express.static(uploadDir));
app.use(express.static(join(__dirname, '../frontend')));

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(port, () => {
  debugLog(`Server running on http://localhost:${port}`);
});
