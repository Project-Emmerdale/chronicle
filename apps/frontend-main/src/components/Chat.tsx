import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import NavBar from './NavBar';

export function Chat() {
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);
  // Casual example prompts to show to the user (randomized on mount)
  const examples = [
    'Hey — tell me about a time you felt proud recently.',
    'What was the last movie that made you laugh out loud?',
    'Did anything unexpected happen this week?',
    'Tell me about your favorite place to relax.',
    "What's a small thing that made your day better recently?",
    'What would you tell your younger self today?',
    "What's one thing you're looking forward to this month?",
    'Who made you smile recently? Tell me about it.',
    'Share a short story about something that surprised you.',
  ];
  const [examplePrompt, setExamplePrompt] = useState<string>(
    () => examples[Math.floor(Math.random() * examples.length)]
  );
  const socketRef = useRef<Socket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const messageQueueRef = useRef<Float32Array[]>([]);
  const queueProcessingRef = useRef(false);
  const nextStartTimeRef = useRef(0);

  useEffect(() => {
    const base =
      (import.meta as any).env.VITE_BACKEND_URL ?? 'http://localhost:3000';
    socketRef.current = io(base);

    socketRef.current.on('connect', () => {
      console.log('Connected to socket server');
    });

    // handle incoming audio stream (base64-encoded 16-bit PCM)
    socketRef.current.on('audioStream', (msg: string) => {
      const audioChunks = base64ToFloat32AudioData(msg);
      if (audioChunks) {
        messageQueueRef.current.push(audioChunks);
        if (!queueProcessingRef.current) {
          playAudioData();
        }
      }
    });

    return () => {
      socketRef.current?.off('audioStream');
      socketRef.current?.disconnect();
    };
  }, []);

  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  // Convert base64-encoded 16-bit little-endian PCM to Float32Array
  const base64ToFloat32AudioData = (base64String: string) => {
    try {
      const byteCharacters = window.atob(base64String);
      const byteArray = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteArray[i] = byteCharacters.charCodeAt(i);
      }

      const length = byteArray.length / 2;
      const float32AudioData = new Float32Array(length);

      for (let i = 0; i < length; i++) {
        const low = byteArray[i * 2];
        const high = byteArray[i * 2 + 1];
        let sample = low | (high << 8);
        if (sample >= 32768) sample -= 65536;
        float32AudioData[i] = sample / 32768;
      }

      return float32AudioData;
    } catch (err) {
      console.error('Failed to decode audio base64', err);
      return null;
    }
  };

  const playAudioData = async () => {
    queueProcessingRef.current = true;

    if (
      !audioContextRef.current ||
      audioContextRef.current.state === 'closed'
    ) {
      audioContextRef.current = new AudioContext();
      nextStartTimeRef.current = audioContextRef.current.currentTime;
    }

    const audioCtx = audioContextRef.current as AudioContext;

    while (messageQueueRef.current.length > 0) {
      const audioChunks = messageQueueRef.current.shift();
      if (!audioChunks) continue;

      // Create an AudioBuffer (1 channel, use 24000 sample rate like example)
      const playbackSampleRate = 24000;
      const audioBuffer = audioCtx.createBuffer(
        1,
        audioChunks.length,
        playbackSampleRate
      );
      const channelData = audioBuffer.getChannelData(0);
      channelData.set(audioChunks as Float32Array);

      const src = audioCtx.createBufferSource();
      src.buffer = audioBuffer;
      src.connect(audioCtx.destination);

      if (nextStartTimeRef.current < audioCtx.currentTime) {
        nextStartTimeRef.current = audioCtx.currentTime;
      }
      src.start(nextStartTimeRef.current);
      nextStartTimeRef.current += audioBuffer.duration;
    }

    queueProcessingRef.current = false;
  };

  const recordAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      sourceRef.current = audioContext.createMediaStreamSource(stream);

      const workletName = 'audio-recorder-worklet';
      const AudioRecordingWorklet = `
      class AudioProcessingWorklet extends AudioWorkletProcessor {
        buffer = new Int16Array(2048);
        bufferWriteIndex = 0;

        constructor() {
          super();
        }

        process(inputs) {
          if (inputs[0].length) {
            const channel0 = inputs[0][0];
            this.processChunk(channel0);
          }
          return true;
        }

        sendAndClearBuffer(){
          this.port.postMessage({
            event: "chunk",
            data: {
              int16arrayBuffer: this.buffer.slice(0, this.bufferWriteIndex).buffer,
            },
          });
          this.bufferWriteIndex = 0;
        }

        processChunk(float32Array) {
          const l = float32Array.length;

          for (let i = 0; i < l; i++) {
            const int16Value = float32Array[i] * 32768;
            this.buffer[this.bufferWriteIndex++] = int16Value;
            if(this.bufferWriteIndex >= this.buffer.length) {
              this.sendAndClearBuffer();
            }
          }

          if(this.bufferWriteIndex >= this.buffer.length) {
            this.sendAndClearBuffer();
          }
        }
      }`;

      const script = new Blob(
        [`registerProcessor("${workletName}", ${AudioRecordingWorklet})`],
        {
          type: 'application/javascript',
        }
      );

      const src = URL.createObjectURL(script);
      await audioContext.audioWorklet.addModule(src);
      const recordingWorklet = new AudioWorkletNode(audioContext, workletName);

      recordingWorklet.port.onmessage = (ev) => {
        const arrayBuffer = ev.data.data.int16arrayBuffer;
        if (arrayBuffer) {
          const arrayBufferString = arrayBufferToBase64(arrayBuffer);
          socketRef.current?.emit('realtimeInput', arrayBufferString);
        }
      };
      sourceRef.current.connect(recordingWorklet);
    } catch (error) {
      console.error('Error recording audio:', error);
    }
  };

  const recordStart = async () => {
    await recordAudio();
    setIsRecording(true);
  };

  const recordStop = () => {
    sourceRef.current?.disconnect();
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    socketRef.current?.emit('endStream');
    setIsRecording(false);
  };

  const handleToggleRecording = () => {
    if (isRecording) {
      recordStop();
    } else {
      recordStart();
    }
  };

  const handleEndConversation = () => {
    navigate('/journal');
  };

  return (
    <div className="bg-[#f9e9ff] min-h-screen flex items-center justify-center p-4">
      <div
        className="rounded-[24px] w-full max-w-[448px] flex flex-col shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]"
        style={{
          background:
            'linear-gradient(135deg, #FAF5FF 0%, #FDF2F8 50%, rgba(253, 242, 248, 0.00) 100%)',
          minHeight: '70vh',
        }}
      >
        {/* Chat Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-[#ececec] rounded-[16px] p-3 w-fit max-w-[80%]">
            <p className="font-sans font-normal leading-[22.75px] text-[14px] text-black tracking-[-0.1504px] break-words">
              {examplePrompt}
            </p>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="border-t border-[#d1d1d1] pt-[25px] px-6 pb-6 flex flex-col gap-3">
          <button
            onClick={handleToggleRecording}
            className={`h-[48px] rounded-full w-full flex items-center justify-center gap-2 transition-colors ${
              isRecording
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-[#8200db] hover:bg-[#6d00b8]'
            }`}
            style={{
              boxShadow: isRecording
                ? '0px 10px 15px -3px rgba(239, 68, 68, 0.3), 0px 4px 6px -4px rgba(239, 68, 68, 0.3)'
                : '0px 10px 15px -3px #e9d4ff, 0px 4px 6px -4px #e9d4ff',
            }}
          >
            <Mic className="size-4 text-white" />
            <span className="font-sans font-medium leading-[20px] text-[14px] text-white tracking-[-0.1504px]">
              {isRecording ? 'Stop recording' : 'Tap to record answer'}
            </span>
          </button>

          <button
            onClick={handleEndConversation}
            className="h-9 rounded-[8px] w-full flex items-center justify-center hover:bg-neutral-50 transition-colors"
          >
            <span className="font-sans font-medium leading-[20px] text-[14px] text-neutral-600 tracking-[-0.1504px]">
              End conversation
            </span>
          </button>
        </div>
        <div className="pb-4">
          <NavBar />
        </div>
      </div>
    </div>
  );
}

export default Chat;
