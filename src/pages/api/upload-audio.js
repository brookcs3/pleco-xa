import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function POST({ request }) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio');
    
    if (!audioFile || !(audioFile instanceof File)) {
      return new Response(JSON.stringify({ error: 'No audio file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate file type
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/m4a', 'audio/aiff', 'audio/x-aiff'];
    if (!allowedTypes.includes(audioFile.type)) {
      return new Response(JSON.stringify({ error: 'Invalid file type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate safe filename
    const originalName = audioFile.name;
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension);
    const safeBaseName = baseName.replace(/[^a-zA-Z0-9-_]/g, '-');
    const timestamp = Date.now();
    const filename = `${safeBaseName}-${timestamp}${extension}`;

    // Create audio directory if it doesn't exist
    const audioDir = path.join(process.cwd(), 'public', 'audio');
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }

    // Save file
    const filePath = path.join(audioDir, filename);
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    fs.writeFileSync(filePath, buffer);

    console.log(`Audio file saved: ${filename}`);

    return new Response(JSON.stringify({ 
      success: true,
      filename: filename,
      originalName: originalName,
      size: audioFile.size
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({ error: 'Upload failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}