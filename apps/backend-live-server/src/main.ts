import 'dotenv/config';
import { Socket } from 'socket.io';
import { server } from './express.js';
import { io } from './socket-server.js';
import { createBlob, createSession } from './live-api.js';
import { audioStream, fileName } from './files.js';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 8080;

io.on('connection', async (socket: Socket) => {
  console.log('Connected to the socket.');
  const session = await createSession();

  socket.on('contentUpdateText', (text: string) => {
    session.sendClientContent({
      turns: `<instructions>${text}</instructions>`,
      turnComplete: true,
    });
  });

  socket.on('realtimeInput', (audioData: string) => {
    // Forward realtime input to the AI session
    try {
      session.sendRealtimeInput({ media: createBlob(audioData) });
    } catch (err) {
      console.error('sendRealtimeInput error:', err);
    }

    // Also save the raw PCM bytes to the per-connection stream so we
    // can persist the audio to disk when the client stops recording.
    try {
      const buffer = Buffer.from(audioData, 'base64');
      audioStream.write(buffer);
    } catch (err) {
      console.error('Failed to write incoming audio chunk:', err);
    }
  });

  socket.on('endStream', () => {
    console.log('Received endStream from client, ending audio stream');
    audioStream.end();
  });

  audioStream.on('finish', () => {
    console.log(`Successfully saved audio to ${fileName}`);
  });
});

server.listen(port, host, () => {
  console.log(`[ ready ] http://${host}:${port}`);
});
