import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { analyzeLoop } from './loopAnalysis';

const uploadDir = join(import.meta.dir, 'uploads');
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir);

}

interface Track {
  id: number;
  filename: string;
  url: string;
  loopStart: number;
  loopEnd: number;
  createdAt: Date;
}
const tracks: Track[] = [];
const analytics: { lib: string; ts: number }[] = [];

export default {
  port: process.env.PORT ? Number(process.env.PORT) : 3000,
  fetch: async (req: Request) => {
    const url = new URL(req.url);

    if (req.method === 'POST' && url.pathname === '/api/upload') {
      const form = await req.formData();
      const file = form.get('audio');
      if (!(file instanceof File)) {
        return new Response(JSON.stringify({ error: 'No file uploaded' }), {
          status: 400,
        });
      }
      const filename = `${Date.now()}-${file.name}`;
      const filePath = join(uploadDir, filename);
      await Bun.write(filePath, file);
      const { loopStart, loopEnd } = await analyzeLoop(filePath);
      const track = {
        id: tracks.length + 1,
        filename,
        url: `/uploads/${filename}`,
        loopStart,
        loopEnd,
        createdAt: new Date(),
      };

      tracks.push(track);
      return Response.json(track);
    }

    if (url.pathname === '/api/tracks') {
      return Response.json(tracks);
    }

    if (req.method === 'POST' && url.pathname === '/api/analytics') {
      const data = await req.json();
      analytics.push({ lib: data.lib, ts: Date.now() });
      return Response.json({ ok: true });
    }

    if (url.pathname.startsWith('/uploads/')) {
      const file = Bun.file(join(uploadDir, url.pathname.slice('/uploads/'.length)));
      if (await file.exists()) {
        return new Response(file);
      }
      return new Response('Not found', { status: 404 });
    }

    // Serve frontend files
    const frontendDir = join(import.meta.dir, '../frontend');
    let filePath = join(frontendDir, url.pathname === '/' ? 'index.html' : url.pathname.slice(1));
    const file = Bun.file(filePath);
    if (await file.exists()) {
      return new Response(file);
    }

    return new Response('Not found', { status: 404 });
  },
};

