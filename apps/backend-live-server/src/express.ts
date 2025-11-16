import cors from 'cors';
import express from 'express';
import http from 'http';
import { firestore } from './firebase.js';

const app = express();
app.use(cors({ origin: true }));

// Return stories stored in Firestore under `stories` collection.
// The function converts Firestore timestamps to ISO strings for the client.
app.get('/stories', async (_req, res) => {
  try {
    const snap = await firestore
      .collection('stories')
      .orderBy('createdAt', 'desc')
      .get();
    const stories = snap.docs.map((doc) => {
      const data = doc.data() as any;
      const createdAt =
        data.createdAt && typeof (data.createdAt as any).toDate === 'function'
          ? (data.createdAt as any).toDate().toISOString()
          : data.createdAt || null;

      return {
        ...data,
        id: doc.id,
        createdAt,
      };
    });
    res.json(stories);
  } catch (err) {
    console.error('Failed to fetch stories:', err);
    res.status(500).json({ error: String(err) });
  }
});

// Return a single story by id
app.get('/stories/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const doc = await firestore.collection('stories').doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Not found' });
    }
    const data = doc.data() as any;
    const createdAt =
      data.createdAt && typeof (data.createdAt as any).toDate === 'function'
        ? (data.createdAt as any).toDate().toISOString()
        : data.createdAt || null;

    return res.json({
      ...data,
      id: doc.id,
      createdAt,
    });
  } catch (err) {
    console.error('Failed to fetch story:', err);
    return res.status(500).json({ error: String(err) });
  }
});

const server = http.createServer(app);

export { app, server };
