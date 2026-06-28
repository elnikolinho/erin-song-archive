"use client";

import type React from "react";
import { useRef, useState, useEffect, useCallback } from "react";
import type { Song } from "@/types";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  SkipForward,
  SkipBack,
  ListMusic,
  Edit3,
  Loader2,
} from "lucide-react";
import { formatTime } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import LyricsInput from "./LyricsInput";

interface MusicPlayerProps {
  song: Song | null;
  songs: Song[];
  onNextSong: () => void;
  onPrevSong: () => void;
  onLyricsUpdate: (songId: string, lyrics: string) => void;
  isPlaying: boolean;
  onPlayPause: (playing: boolean) => void;
  currentSongIndex: number;
  isLoading?: boolean; // For initial loading state
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({
  song,
  songs,
  onNextSong,
  onPrevSong,
  onLyricsUpdate,
  isPlaying,
  onPlayPause,
  currentSongIndex,
  isLoading,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [showLyricsEditor, setShowLyricsEditor] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);

  const handlePlayPause = useCallback(() => {
    if (!audioRef.current || !song?.audioSrc) return; // Ensure audioSrc is present
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current
        .play()
        .catch((error) => console.error("Error playing audio:", error));
    }
    onPlayPause(!isPlaying);
  }, [isPlaying, onPlayPause, song?.audioSrc]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      if (isPlaying && song?.audioSrc) {
        // Check song.audioSrc
        audio.play().catch((error) => {
          console.error(
            "Error playing audio in useEffect[isPlaying, song]:",
            error,
          );
          // Potentially set isPlaying to false if play fails
          // onPlayPause(false);
        });
      } else {
        audio.pause();
      }
    }
  }, [isPlaying, song]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio && song?.audioSrc) {
      // Check song.audioSrc
      if (audio.src !== song.audioSrc) {
        // Only change src if it's different
        setIsAudioLoading(true);
        audio.src = song.audioSrc;
        audio.load(); // Explicitly load the new source
      }
      audio.volume = isMuted ? 0 : volume;
      // audio.load(); // Moved to src change block
      if (isPlaying) {
        audio
          .play()
          .catch((e) => console.error("Error playing on song change:", e));
      }
      setShowLyricsEditor(false);
    } else if (audio) {
      // If no song or no audioSrc, reset
      audio.src = "";
      setDuration(0);
      setCurrentTime(0);
      setIsAudioLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song?.id, song?.audioSrc, volume, isMuted]); // Depend on song.id and song.audioSrc

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      if (!isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      } else {
        setDuration(0); // Reset or handle invalid duration
      }
      setIsAudioLoading(false); // Audio metadata loaded
    };
    const handleEnded = () => {
      onPlayPause(false);
      onNextSong();
    };
    const handleCanPlay = () => {
      setIsAudioLoading(false);
      if (isPlaying) {
        // Autoplay if it was supposed to be playing
        audio
          .play()
          .catch((e) => console.error("Error auto-playing on canplay:", e));
      }
    };
    const handleError = (e: Event) => {
      console.error("Audio Element Error:", e);
      setIsAudioLoading(false);
      // Optionally show a toast or UI indication of audio error
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("waiting", () => setIsAudioLoading(true));
    audio.addEventListener("playing", () => setIsAudioLoading(false));
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("waiting", () => setIsAudioLoading(true));
      audio.removeEventListener("playing", () => setIsAudioLoading(false));
      audio.removeEventListener("error", handleError);
    };
  }, [onNextSong, onPlayPause, isPlaying]);

  const handleSeek = (value: number[]) => {
    if (audioRef.current && song?.audioSrc) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    if (audioRef.current) {
      const newVolume = value[0];
      audioRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume > 0 ? volume : 0.1;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  if (isLoading && !song) {
    // Show loader if overall page is loading and no song yet
    return (
      <Card className="w-full shadow-xl">
        <CardContent className="p-6 text-center text-muted-foreground flex flex-col items-center justify-center h-96">
          <Loader2 className="mx-auto h-12 w-12 mb-4 text-primary animate-spin" />
          <p>Loading song library...</p>
        </CardContent>
      </Card>
    );
  }

  if (!song) {
    return (
      <Card className="w-full shadow-xl">
        <CardContent className="p-6 text-center text-muted-foreground flex flex-col items-center justify-center h-96">
          <ListMusic className="mx-auto h-12 w-12 mb-4 text-primary" />
          <p>
            No song selected. Upload a song or choose from the cloud library.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-xl overflow-hidden">
      <CardHeader className="bg-muted/30 p-4 border-b">
        <CardTitle className="font-headline text-2xl truncate text-primary">
          {song.name}
          {song.year && (
            <span className="text-lg text-muted-foreground ml-2">
              ({song.year})
            </span>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Erins Song Archive - Music Player
        </p>
      </CardHeader>
      <CardContent className="p-4 md:p-6 space-y-6">
        <audio ref={audioRef} preload="metadata" />

        <div className="flex items-center justify-between">
          <span className="text-sm font-mono text-muted-foreground min-w-[40px] text-center">
            {formatTime(currentTime)}
          </span>
          <Slider
            value={[currentTime]}
            max={duration || 0}
            step={1}
            onValueChange={handleSeek}
            className="mx-4 flex-1"
            aria-label="Song progress"
            disabled={!song.audioSrc || isAudioLoading}
          />
          <span className="text-sm font-mono text-muted-foreground min-w-[40px] text-center">
            {formatTime(duration || 0)}
          </span>
        </div>

        <div className="flex items-center justify-center space-x-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onPrevSong}
            disabled={songs.length < 2 || isAudioLoading}
            aria-label="Previous song"
          >
            <SkipBack className="h-6 w-6" />
          </Button>
          <Button
            variant="default"
            size="lg"
            onClick={handlePlayPause}
            className="rounded-full w-16 h-16 shadow-lg"
            aria-label={isPlaying ? "Pause" : "Play"}
            disabled={!song.audioSrc || isAudioLoading}
          >
            {isAudioLoading ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-8 w-8" />
            ) : (
              <Play className="h-8 w-8" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onNextSong}
            disabled={songs.length < 2 || isAudioLoading}
            aria-label="Next song"
          >
            <SkipForward className="h-6 w-6" />
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            aria-label={isMuted ? "Unmute" : "Mute"}
            disabled={isAudioLoading}
          >
            {isMuted ? (
              <VolumeX className="h-5 w-5" />
            ) : (
              <Volume2 className="h-5 w-5" />
            )}
          </Button>
          <Slider
            value={[isMuted ? 0 : volume]}
            max={1}
            step={0.01}
            onValueChange={handleVolumeChange}
            className="w-24"
            aria-label="Volume"
            disabled={isAudioLoading}
          />
        </div>

        <div className="mt-4">
          <Button
            onClick={() => setShowLyricsEditor(!showLyricsEditor)}
            variant="outline"
            className="w-full mb-4"
          >
            <Edit3 className="mr-2 h-4 w-4" />{" "}
            {showLyricsEditor ? "Hide" : "Show"} Lyrics Editor
          </Button>
          {showLyricsEditor && (
            <div className="p-4 border rounded-md bg-secondary/20">
              <LyricsInput song={song} onLyricsUpdate={onLyricsUpdate} />
            </div>
          )}
        </div>

        {song.lyrics && song.lyrics.trim() !== "" && !showLyricsEditor && (
          <ScrollArea className="h-48 md:h-64 p-4 rounded-lg border bg-background shadow-inner">
            <div className="whitespace-pre-wrap text-foreground/80 text-lg leading-relaxed">
              {song.lyrics}
            </div>
          </ScrollArea>
        )}
        {(!song.lyrics || song.lyrics.trim() === "") && !showLyricsEditor && (
          <p className="text-center text-muted-foreground py-8">
            No lyrics available for this song. Add them in the editor!
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default MusicPlayer;
