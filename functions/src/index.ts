import { onObjectFinalized } from 'firebase-functions/v2/storage';
import * as logger from 'firebase-functions/logger';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { SpeechClient } from '@google-cloud/speech';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { getStorage } from 'firebase-admin/storage';
import { VertexAI } from '@google-cloud/vertexai';
import { onDocumentCreated } from 'firebase-functions/firestore';

initializeApp();

const speechClient = new SpeechClient();
const textToSpeechClient = new TextToSpeechClient();

export const onFileUpload = onObjectFinalized(
  { region: 'europe-west1', bucket: 'YOUR-PROJECT-ID' },
  async (event) => {
    const { name } = event.data;
    logger.info(
      `File uploaded: ${name} in bucket: gs://YOUR-PROJECT-ID`
    );

    const gcsUri = `gs://YOUR-PROJECT-ID/${name}`;
    const audio = {
      uri: gcsUri,
    };

    if (name.includes('temp/ai_')) {
      logger.info('File name starts with ai_, skipping transcription.');
      return;
    }

    if (name.includes('generated-audio')) {
      logger.info('File is generated audio, skipping transcription.');
      return;
    }

    if (name.startsWith('generated-images/')) {
      logger.info('File is not in uploads/, skipping transcription.');
      return;
    }

    // Configure the speech recognition request
    const config = {
      encoding: 'LINEAR16' as const, // Adjust if your audio format is different
      sampleRateHertz: 16000, // Adjust to your audio's sample rate
      languageCode: 'en-US', // Adjust to your audio's language
    };

    const request = {
      audio: audio,
      config: config,
    };

    try {
      // Detects speech in the audio file
      const [operation] = await speechClient.longRunningRecognize(request);
      const [response] = await operation.promise();
      if (response.results && response.results.length > 0) {
        const transcription = response.results
          .map((result) => result.alternatives?.[0].transcript)
          .join('\n');

        logger.info(`Transcription: ${transcription}`);

        // Save the transcription to Firestore
        const firestore = getFirestore();
        await firestore.collection('transcriptions').add({
          fileName: name,
          transcription: transcription,
          createdAt: new Date(),
        });

        logger.info('Transcription saved to Firestore.');
      } else {
        logger.info('No transcription results found.');
      }
    } catch (error) {
      logger.error('Error transcribing audio:', error);
    }
  }
);

export const onTranscriptionCreated = onDocumentCreated(
  {
    document: 'transcriptions/{transcriptionId}',
    region: 'europe-west1',
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.info('No data associated with the event');
      return;
    }

    const data = snapshot.data();
    const transcription = data.transcription;

    // Call Vertex AI to generate a memoir story
    const vertexAI = new VertexAI({
      project: 'YOUR-PROJECT-ID',
      location: 'europe-west1',
    });
    const generativeModel = vertexAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const prompt = `Your task is to take the following transcription of a person's spoken memo and transform it into a coherent story, and also generate a title and a short description. 

    Transcription:
    ---
    ${transcription}
    ---

    Your output should be a JSON object with the following structure:
    {
      "title": "A short, engaging title for the story",
      "description": "A brief one-sentence summary of the story.",
      "story": "The full memoir story, written in the first person..."
    }

    The memoir story should:
    - Keep the story focused on personal experiences and reflections, you can make it longer but do not add completely new events or details.
    - Be written in the first person, as if the speaker is telling their own story.
    - Have a clear narrative arc with a beginning, middle, and end.
    - Capture the speaker's unique experience and personality.
    - Be well-structured, with clear sentences and a logical flow. Keep it concise and simple.`;

    try {
      const result = await generativeModel.generateContent(prompt);
      const storyData = JSON.parse(
        result.response.candidates?.[0].content.parts[0].text ?? ''
      );

      if (storyData && storyData.story) {
        logger.info(`Generated story: ${storyData.story}`);

        const firestore = getFirestore();
        const storyRef = firestore.collection('stories').doc();

        // Synthesize speech from the story
        const ttsRequest = {
          input: { text: storyData.story },
          voice: { languageCode: 'en-US', ssmlGender: 'NEUTRAL' as const },
          audioConfig: { audioEncoding: 'MP3' as const },
        };

        let audioUrl = null;
        try {
          const [ttsResponse] = await textToSpeechClient.synthesizeSpeech(
            ttsRequest
          );
          if (ttsResponse.audioContent) {
            const bucket = getStorage().bucket('YOUR-PROJECT-ID');
            const audioFileName = `generated-audio/${storyRef.id}.mp3`;
            const file = bucket.file(audioFileName);
            await file.save(ttsResponse.audioContent);
            await file.makePublic();
            audioUrl = file.publicUrl();
            logger.info(`Audio content uploaded to ${audioFileName}`);
          }
        } catch (ttsError) {
          logger.error('Error generating or uploading audio:', ttsError);
        }

        // Generate an image for the story
        let imageUrl = null;
        try {
          const imageGenerationModel = vertexAI.getGenerativeModel({
            model: 'gemini-2.5-flash-image',
          });
          const imagePrompt = `A digital painting of: ${storyData.title}. Emphasize emotions and memories, in a watercolor style.`;
          const imageResult = await imageGenerationModel.generateContent(
            imagePrompt
          );
          const base64ImageData = (imageResult.response as any).predictions?.[0]
            .bytesBase64Encoded;

          if (base64ImageData) {
            const bucket = getStorage().bucket('YOUR-PROJECT-ID');
            const imageFileName = `generated-images/${storyRef.id}.png`;
            const file = bucket.file(imageFileName);
            await file.save(Buffer.from(base64ImageData, 'base64'));
            await file.makePublic();
            imageUrl = file.publicUrl();
            logger.info(`Image content uploaded to ${imageFileName}`);
          }
        } catch (imageError) {
          logger.error('Error generating or uploading image:', imageError);
        }

        // Save the story to a new collection in Firestore
        await storyRef.set({
          originalTranscriptionId: snapshot.id,
          title: storyData.title,
          description: storyData.description,
          story: storyData.story,
          createdAt: new Date(),
          audioUrl: audioUrl,
          imageUrl: imageUrl,
        });

        logger.info('Story saved to Firestore.');
      } else {
        logger.info('No story generated by Vertex AI.');
      }
    } catch (error) {
      logger.error('Error generating story with Vertex AI:', error);
    }
  }
);
