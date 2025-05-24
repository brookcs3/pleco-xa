const { mkdirSync, existsSync } = require('fs');
const { spawnSync } = require('child_process');
const Bun = require('bun');

const uploadDir = Bun.path.join(__dirname, 'uploads');
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir);
}

const tracks = [];

Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === 'POST' && url.pathname === '/api/upload') {
      const formData = await req.formData();
      const file = formData.get('audio');
      if (!file || !(file instanceof Blob)) {
        return new Response(JSON.stringify({ error: 'No file uploaded' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      const filename = `${Date.now()}-${file.name}`;
      const rawPath = Bun.path.join(uploadDir, filename);
      await Bun.write(rawPath, file);

      const processedName = `processed-${filename.replace(/\.[^/.]+$/, '')}.wav`;
      const metaName = `metadata-${filename.replace(/\.[^/.]+$/, '')}.json`;
      const processedPath = Bun.path.join(uploadDir, processedName);
      const metaPath = Bun.path.join(uploadDir, metaName);

      const proc = spawnSync('python3', [
        Bun.path.join(__dirname, 'librosa_encoder.py'),
        rawPath,
        processedPath,
        metaPath,
      ]);
      if (proc.status !== 0) {
        console.error(proc.stderr.toString());
        return new Response(JSON.stringify({ error: 'Audio processing failed' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const track = {
        id: tracks.length + 1,
        filename: processedName,
        url: `/uploads/${processedName}`,
        metadataUrl: `/uploads/${metaName}`,
        createdAt: new Date()
      };
      tracks.push(track);
      return Response.json(track);
    }

    if (url.pathname === '/api/tracks') {
      return Response.json(tracks);
    }

    if (url.pathname.startsWith('/uploads/')) {
      const filePath = Bun.path.join('.', url.pathname);
      return new Response(Bun.file(filePath));
    }

    return new Response('Not Found', { status: 404 });
  }
});

console.log('Bun server running on http://localhost:3000');

