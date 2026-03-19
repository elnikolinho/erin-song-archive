"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { Song } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface LyricsInputProps {
  song: Song | null;
  onLyricsUpdate: (songId: string, lyrics: string) => void;
}

const LyricsInput: React.FC<LyricsInputProps> = ({ song, onLyricsUpdate }) => {
  const [lyricsText, setLyricsText] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    if (song?.lyrics) {
      setLyricsText(song.lyrics);
    } else {
      setLyricsText("");
    }
  }, [song]);

  const handleLyricsChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLyricsText(event.target.value);
  };

  const handleSaveLyrics = () => {
    if (song) {
      onLyricsUpdate(song.id, lyricsText);
       toast({ // Added toast on successful save
        title: "Lyrics Saved",
        description: "Your lyrics have been saved.",
      });
    } else {
       toast({
        variant: "destructive",
        title: "Error",
        description: "No song selected to save lyrics for.",
      });
    }
  };
  
  return (
    <div className="space-y-4">
      <Textarea
        placeholder="Enter song lyrics here..."
        value={lyricsText}
        onChange={handleLyricsChange}
        rows={10}
        className="text-base leading-relaxed bg-background/70"
      />
      <div className="flex flex-col sm:flex-row gap-2">
        <Button onClick={handleSaveLyrics} variant="outline" className="flex-grow">
          Save Lyrics
        </Button>
      </div>
    </div>
  );
};

export default LyricsInput;
