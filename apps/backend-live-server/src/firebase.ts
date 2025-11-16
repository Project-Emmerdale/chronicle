import admin from 'firebase-admin';
import { getServiceAccount } from './service-account.js';

const serviceAccount = await getServiceAccount();
if (!serviceAccount) throw new Error('Missing service account file');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const firestore = admin.firestore();
const storage = admin.storage().bucket('gs://YOUR-PROJECT-ID');

export { admin, storage, firestore };
