import {
  closeSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  openSync,
  writeSync,
} from 'fs';
import { join } from 'path';
import { PassThrough } from 'stream';
import { storage } from './firebase.js';

// Helper: create a WAV writer (PassThrough stream + file on disk)
function createWavRecorder(prefix = 'recording', sampleRate = 16000) {
  const stream = new PassThrough();
  const cwd = process.cwd();
  const tempDir = join(cwd, 'temp');

  if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true });

  const fileName = `temp/${prefix}_${Date.now()}.wav`;
  const filePath = join(process.cwd(), fileName);
  const fileStream = createWriteStream(filePath, { flags: 'w' });

  const numChannels = 1;
  const bitsPerSample = 16;

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  // ChunkSize (4 bytes) at offset 4 -> placeholder for now
  header.writeUInt32LE(36 + 0, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20); // AudioFormat 1 = PCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE((sampleRate * numChannels * bitsPerSample) / 8, 28); // ByteRate
  header.writeUInt16LE((numChannels * bitsPerSample) / 8, 32); // BlockAlign
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  // Subchunk2Size (4 bytes) at offset 40 -> placeholder for now
  header.writeUInt32LE(0, 40);

  fileStream.write(header);
  stream.pipe(fileStream);
  console.log(`Piping stream to ${fileName}`);

  let pcmBytesWritten = 0;
  stream.on('data', (chunk: Buffer) => {
    pcmBytesWritten += chunk.length;
  });

  stream.on('end', () => {
    try {
      const chunkSize = 36 + pcmBytesWritten;
      const fd = openSync(filePath, 'r+');
      const b1 = Buffer.alloc(4);
      b1.writeUInt32LE(chunkSize, 0);
      writeSync(fd, b1, 0, 4, 4);

      const b2 = Buffer.alloc(4);
      b2.writeUInt32LE(pcmBytesWritten, 0);
      writeSync(fd, b2, 0, 4, 40);

      closeSync(fd);
      console.log(
        `Successfully saved WAV to ${fileName} (${pcmBytesWritten} bytes PCM)`
      );

      // Save a final copy to firebase storage for later retrieval

      storage
        .upload(filePath, { destination: fileName })
        .then(() => {
          console.log(`Uploaded ${fileName} to Firebase Storage`);
        })
        .catch((err) => {
          console.error(
            `Failed to upload ${fileName} to Firebase Storage:`,
            err
          );
        });
    } catch (err) {
      console.error('Failed to finalize WAV header:', err);
    }
  });

  return { stream, fileName };
}

// Create a stream per connection so we can save incoming audio to a WAV file
const { stream: audioStream, fileName } = createWavRecorder('recording', 16000);

export { audioStream, fileName, createWavRecorder };
