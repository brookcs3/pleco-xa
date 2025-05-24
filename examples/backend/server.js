const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const DEBUG_ENABLED = Boolean(process.env.PLECO_DEBUG);

function debugLog(...args) {
  if (DEBUG_ENABLED) {
    console.log(...args);
  }
}

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({ dest: uploadDir });
const app = express();
const tracks = [];

app.post('/api/upload', upload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const rawPath = req.file.path;
  const baseName = path.parse(req.file.originalname).name;
  const processedName = `processed-${baseName}.wav`;
  const metaName = `metadata-${baseName}.json`;
  const processedPath = path.join(uploadDir, processedName);
  const metaPath = path.join(uploadDir, metaName);

  const proc = spawnSync('python3', [
    path.join(__dirname, 'librosa_encoder.py'),
    rawPath,
    processedPath,
    metaPath,
  ]);

  if (proc.status !== 0) {
    console.error(proc.stderr.toString());
    return res.status(500).json({ error: 'Audio processing failed' });
  }

  const track = {
    id: tracks.length + 1,
    filename: processedName,
    url: `/uploads/${processedName}`,
    metadataUrl: `/uploads/${metaName}`,
    createdAt: new Date(),
  };
  tracks.push(track);
  res.json(track);
});

app.get('/api/tracks', (req, res) => {
  res.json(tracks);
});

app.use('/uploads', express.static(uploadDir));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  debugLog(`Server running on http://localhost:${port}`);
});
