import { db, storage } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import type { Song } from '@/types';

const SONGS_COLLECTION = 'songs';

// Type for song data stored in Firestore, using Firestore Timestamp
interface FirestoreSongData {
  name: string;
  audioSrc: string;
  storagePath: string;
  lyrics?: string;
  duration?: number;
  year?: number;
  createdAt: Timestamp; // Firestore Timestamp for ordering
}

// Type for song data coming from the client before Firestore conversion
interface SongInputData {
  name: string;
  lyrics?: string;
  duration?: number;
  year?: number;
}


export async function saveSongToFirebase(
  file: File,
  songDetails: SongInputData,
  duration: number
): Promise<Song> {
  if (!file) throw new Error('No file provided for upload.');

  const uniqueFileName = `${Date.now()}-${file.name}`;
  const storagePath = `songs/${uniqueFileName}`;
  const storageRef = ref(storage, storagePath);

  // Upload file to Firebase Storage
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);

  // Prepare song data for Firestore
  const songDataForFirestore: Omit<FirestoreSongData, 'audioSrc' | 'storagePath' | 'createdAt'> & {duration: number, audioSrc?: string, storagePath?: string, createdAt?: Timestamp} = {
    name: songDetails.name,
    year: songDetails.year,
    lyrics: songDetails.lyrics || "",
    duration: duration,
  };

  const docData: FirestoreSongData = {
    ...songDataForFirestore,
    audioSrc: downloadURL,
    storagePath: storagePath,
    createdAt: Timestamp.now(),
  };

  // Add song metadata to Firestore
  const docRef = await addDoc(collection(db, SONGS_COLLECTION), docData);

  return {
    id: docRef.id,
    ...songDetails,
    audioSrc: downloadURL,
    storagePath: storagePath,
    duration: duration,
    createdAt: docData.createdAt.toMillis(), // Convert to JS milliseconds timestamp
  };
}

export async function loadSongsFromFirebase(): Promise<Song[]> {
  const songsQuery = query(collection(db, SONGS_COLLECTION), orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(songsQuery);
  const songs: Song[] = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data() as FirestoreSongData;
    songs.push({
      id: doc.id,
      name: data.name,
      audioSrc: data.audioSrc,
      storagePath: data.storagePath,
      lyrics: data.lyrics,
      duration: data.duration,
      year: data.year,
      createdAt: data.createdAt.toMillis(), // Convert to JS milliseconds timestamp
    });
  });
  return songs;
}

export async function deleteSongFromFirebase(songId: string, storagePath: string): Promise<void> {
  // Delete file from Firebase Storage
  if (storagePath) {
    const storageRef = ref(storage, storagePath);
    try {
        await deleteObject(storageRef);
    } catch (error: any) {
        // If file not found, it might have been already deleted or path is wrong. Log and continue.
        if (error.code === 'storage/object-not-found') {
            console.warn(`File not found in Storage during deletion: ${storagePath}. It might have been already deleted.`);
        } else {
            console.error('Error deleting song from Storage:', error);
            throw new Error('Error deleting song file from cloud storage.');
        }
    }
  } else {
    console.warn(`No storagePath provided for song ID ${songId}, cannot delete from Storage.`);
  }

  // Delete metadata from Firestore
  await deleteDoc(doc(db, SONGS_COLLECTION, songId));
}

export async function updateSongLyricsInFirebase(songId: string, lyrics: string): Promise<void> {
  const songRef = doc(db, SONGS_COLLECTION, songId);
  await updateDoc(songRef, {
    lyrics: lyrics,
  });
}
