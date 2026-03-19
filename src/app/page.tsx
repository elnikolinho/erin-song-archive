"use client";

import { useState, useEffect, useCallback } from "react";
import type { Song } from "@/types";
import AudioUploadForm from "@/components/AudioUploadForm";
import MusicPlayer from "@/components/MusicPlayer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ListMusic,
  Music2,
  PlayCircle,
  Trash2,
  CloudUpload,
  DatabaseZap,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  loadSongsFromFirebase,
  saveSongToFirebase,
  deleteSongFromFirebase,
  updateSongLyricsInFirebase,
} from "@/lib/db";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSongIndex, setCurrentSongIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchSongs = async () => {
      setIsLoading(true);
      try {
        const loadedSongs = await loadSongsFromFirebase();
        setSongs(loadedSongs);
        if (loadedSongs.length > 0 && currentSongIndex === -1) {
          setCurrentSongIndex(0);
        }
      } catch (error) {
        console.error("Failed to load songs from Firebase:", error);
        toast({
          variant: "destructive",
          title: "Error Loading Songs",
          description:
            "Could not load songs from the cloud. Check your connection and Firebase setup.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchSongs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSongAdd = useCallback(
    async (
      file: File,
      songDetails: { name: string; year?: number },
      duration: number,
    ) => {
      try {
        const newSong = await saveSongToFirebase(file, songDetails, duration);
        setSongs((prevSongs) => [newSong, ...prevSongs]); // Add to the beginning of the list
        if (songs.length === 0) {
          // If this is the first song added
          setCurrentSongIndex(0);
          setIsPlaying(true); // Auto-play first uploaded song
        } else if (currentSongIndex === -1 && songs.length > 0) {
          setCurrentSongIndex(0); // If there were songs but none selected, select the first
        }
        // else, if a song is already playing, adding a new one doesn't change current playback

        toast({
          title: "Song Added to Cloud",
          description: `${newSong.name} has been saved.`,
        });
      } catch (error) {
        console.error("Failed to save song to Firebase:", error);
        toast({
          variant: "destructive",
          title: "Error Saving Song",
          description:
            "Could not save the song to the cloud. Check console for details.",
        });
        throw error; // Re-throw to be caught by AudioUploadForm if needed
      }
    },
    [songs, currentSongIndex, toast],
  );

  const handleSelectSong = (index: number) => {
    setCurrentSongIndex(index);
    if (songs[index]?.audioSrc) {
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  };

  const handleLyricsUpdate = async (songId: string, lyrics: string) => {
    const songToUpdate = songs.find((s) => s.id === songId);
    if (songToUpdate) {
      try {
        await updateSongLyricsInFirebase(songId, lyrics);
        const updatedSong: Song = { ...songToUpdate, lyrics };
        setSongs((prevSongs) =>
          prevSongs.map((song) => (song.id === songId ? updatedSong : song)),
        );
        toast({
          title: "Lyrics Saved",
          description: "Lyrics have been updated in the cloud.",
        });
      } catch (error) {
        console.error("Failed to update lyrics in Firebase:", error);
        toast({
          variant: "destructive",
          title: "Error Updating Lyrics",
          description: "Could not save lyric changes to the cloud.",
        });
      }
    }
  };

  const handlePlayPause = (playing: boolean) => {
    if (currentSong?.audioSrc) {
      setIsPlaying(playing);
    } else if (!playing) {
      setIsPlaying(false);
    }
  };

  const handleNextSong = () => {
    if (songs.length === 0) return;
    const nextIndex = (currentSongIndex + 1) % songs.length;
    setCurrentSongIndex(nextIndex);
    setIsPlaying(!!songs[nextIndex]?.audioSrc);
  };

  const handlePrevSong = () => {
    if (songs.length === 0) return;
    const prevIndex = (currentSongIndex - 1 + songs.length) % songs.length;
    setCurrentSongIndex(prevIndex);
    setIsPlaying(!!songs[prevIndex]?.audioSrc);
  };

  const handleDeleteSong = async (songId: string, storagePath: string) => {
    const songIndexToDelete = songs.findIndex((s) => s.id === songId);
    const songNameToDelete = songs[songIndexToDelete]?.name || "The song";
    try {
      await deleteSongFromFirebase(songId, storagePath);
      const newSongs = songs.filter((s) => s.id !== songId);
      setSongs(newSongs);

      if (newSongs.length === 0) {
        setCurrentSongIndex(-1);
        setIsPlaying(false);
      } else if (currentSongIndex === songIndexToDelete) {
        // If deleting currently playing song, select next or first, or none if becomes empty
        const newCurrentIndex =
          newSongs.length > 0
            ? Math.max(0, songIndexToDelete % newSongs.length)
            : -1;
        setCurrentSongIndex(newCurrentIndex);
        setIsPlaying(
          newCurrentIndex !== -1
            ? !!newSongs[newCurrentIndex]?.audioSrc
            : false,
        );
      } else if (currentSongIndex > songIndexToDelete) {
        setCurrentSongIndex((prevIndex) => prevIndex - 1);
      }
      toast({
        title: "Song Deleted",
        description: `${songNameToDelete} has been removed from the cloud.`,
      });
    } catch (error) {
      console.error("Failed to delete song from Firebase:", error);
      toast({
        variant: "destructive",
        title: "Error Deleting Song",
        description: "Could not remove the song from the cloud.",
      });
    }
  };

  const currentSong = songs[currentSongIndex] || null;

  return (
    <div className="container mx-auto p-4 md:p-8 flex flex-col min-h-screen">
      <header className="mb-8 text-center">
        <h1 className="text-5xl md:text-6xl font-headline text-primary drop-shadow-md">
          Erins Song Archive
        </h1>
        <p className="text-lg text-muted-foreground mt-2">
          Your personal music player with lyric synchronization, stored in the
          cloud.
        </p>
      </header>

      <main className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-2xl flex items-center">
                <CloudUpload className="mr-2 h-6 w-6 text-accent" />
                Upload Song to Cloud
              </CardTitle>
              <CardDescription>
                Add .wav files. Songs and audio are stored in Firebase
                (Firestore & Storage) and accessible by anyone with the link.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AudioUploadForm onSongAdd={handleSongAdd} />
            </CardContent>
          </Card>

          {(isLoading || songs.length > 0) && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="font-headline text-2xl flex items-center">
                  <DatabaseZap className="mr-2 h-6 w-6 text-accent" />
                  Cloud Song Library
                </CardTitle>
                <CardDescription>
                  Select a song to play. All songs are loaded from Firebase.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    <div className="h-12 bg-muted animate-pulse rounded-md"></div>
                    <div className="h-12 bg-muted animate-pulse rounded-md"></div>
                    <div className="h-12 bg-muted animate-pulse rounded-md"></div>
                  </div>
                ) : songs.length > 0 ? (
                  <ScrollArea className="h-64">
                    <ul className="space-y-2">
                      {songs.map((song, index) => (
                        <li key={song.id}>
                          <Button
                            variant={
                              index === currentSongIndex ? "default" : "outline"
                            }
                            className={`w-full justify-start text-left h-auto py-3 ${index === currentSongIndex ? "bg-primary/80 hover:bg-primary" : "hover:bg-secondary"}`}
                            onClick={() => handleSelectSong(index)}
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center min-w-0">
                                {" "}
                                {/* Added min-w-0 for truncation */}
                                <PlayCircle
                                  className={`mr-3 h-5 w-5 flex-shrink-0 ${index === currentSongIndex ? "text-primary-foreground" : "text-primary"}`}
                                />
                                <span className="truncate flex-1">
                                  {song.name}
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSong(song.id, song.storagePath);
                                }}
                                className={`p-1 h-auto flex-shrink-0 ${index === currentSongIndex ? "text-primary-foreground hover:bg-primary-foreground/20 hover:text-destructive" : "text-muted-foreground hover:text-destructive"}`}
                                aria-label={`Delete ${song.name}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    No songs in the cloud library yet. Upload one!
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2">
          <MusicPlayer
            song={currentSong}
            songs={songs}
            onNextSong={handleNextSong}
            onPrevSong={handlePrevSong}
            onLyricsUpdate={handleLyricsUpdate}
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
            currentSongIndex={currentSongIndex}
            isLoading={
              currentSongIndex === -1 && isLoading && songs.length === 0
            } // Pass loading state for initial player view
          />
        </div>
      </main>

      <footer className="mt-12 text-center text-sm text-muted-foreground py-6 border-t">
        <p>
          &copy; {new Date().getFullYear()} Erins Song Archive. Crafted with
          passion.
        </p>
      </footer>
    </div>
  );
}
