export interface Song {
  id: string; // Firestore document ID
  name: string;
  audioSrc: string; // Firebase Storage download URL
  storagePath: string; // Path to the file in Firebase Storage (for deletion)
  lyrics?: string;
  duration?: number; // Song duration in seconds
  year?: number; // Optional: Year the song was released/recorded
  createdAt?: number; // Timestamp of creation
}
