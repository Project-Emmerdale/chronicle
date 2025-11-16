import { GoogleGenAI, Modality } from '@google/genai';
import * as types from '@google/genai';
import { io } from './socket-server.js';
import { createWavRecorder } from './files.js';
import { getSystemInstructions } from './instructions.js';
import console from 'console';
import { getServiceAccount } from './service-account.js';

if (!process.env.GOOGLE_API_KEY) throw new Error('Missing GOOGLE_API_KEY');

const serviceAccount = await getServiceAccount();
if (!serviceAccount) throw new Error('Missing service account file');

const ai = new GoogleGenAI({
  ...serviceAccount,
  vertexai: false,
});

// Helpers

function createBlob(audioData: string): types.Blob {
  return { data: audioData, mimeType: 'audio/pcm;rate=16000' };
}

function debug(data: object): string {
  return JSON.stringify(data);
}

const createSession = async () => {
  const session = await ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
    config: {
      responseModalities: [Modality.AUDIO],
      systemInstruction: getSystemInstructions(),
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
      },
    },
    callbacks: {
      onopen: () => {
        console.log('Live Session Opened');
      },
      onmessage: (message: types.LiveServerMessage) => {
        console.log('Received message from the server: %s\n', debug(message));
        const inline = message?.serverContent?.modelTurn?.parts?.[0].inlineData;
        if (inline?.data) {
          const audioData = inline.data;
          // Emit legacy event name (kept for backwards compatibility)
          io.emit('audioStream', audioData);
          // Also emit a dedicated AI audio event so clients can distinguish
          // between user audio and model (AI) audio streams.
          io.emit('aiAudio', audioData);

          // Persist AI audio to disk for this live session. Try to infer
          // sample rate from the inline MIME type if available, otherwise
          // default to 24000 Hz (most model preview audio uses 24kHz).
          try {
            const mime = inline.mimeType as string | undefined;
            let sampleRate = 24000;
            if (mime) {
              const m = mime.match(/rate=(\d+)/);
              if (m && m[1]) sampleRate = Number(m[1]);
            }

            // Lazily create a recorder attached to this session object so
            // it will be finalized on close. Reuse if already present.
            // @ts-expect-error augment-session-property
            if (!session.__aiRecorder) {
              // @ts-expect-error augment-session-property
              session.__aiRecorder = createWavRecorder(
                'ai_response',
                sampleRate
              );
            }

            // Write the raw PCM bytes (base64 -> Buffer) into the recorder
            const buf = Buffer.from(audioData, 'base64');
            // @ts-expect-error augment-session-property
            session.__aiRecorder.stream.write(buf);
          } catch (err) {
            console.error('Failed to write AI audio to disk:', err);
          }
        }
      },
      onerror: (e: unknown) => {
        console.log('Live Session Error:', debug(e as object));
      },
      onclose: (e: unknown) => {
        // some close events include a reason property
        if (e && typeof e === 'object' && 'reason' in e) {
          console.log((e as { reason?: unknown }).reason);
        }
        console.log('Live Session Closed:', debug(e as object));
        try {
          // finalize any per-session AI recorder we created
          // @ts-expect-error augment-session-property
          if (session.__aiRecorder) {
            // @ts-expect-error augment-session-property
            session.__aiRecorder.stream.end();
          }
        } catch (err) {
          console.error('Error finalizing AI recorder on close:', err);
        }
      },
    },
  });

  return session;
};

export { createSession, createBlob, debug };
