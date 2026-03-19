
"use client";

import type React from "react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { UploadCloud, CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AudioUploadFormProps {
  onSongAdd: (file: File, songDetails: { name: string; year?: number }, duration: number) => Promise<void>;
}

const AudioUploadForm: React.FC<AudioUploadFormProps> = ({ onSongAdd }) => {
  const [file, setFile] = useState<File | null>(null);
  const [year, setYear] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      if (selectedFile.type === "audio/wav" || selectedFile.type === "audio/wave") {
        setFile(selectedFile);
      } else {
        toast({
          variant: "destructive",
          title: "Invalid File Type",
          description: "Please upload a .wav file.",
        });
        setFile(null);
        event.target.value = ""; 
      }
    }
  };

  const handleYearChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setYear(event.target.value);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      toast({
        variant: "destructive",
        title: "No File Selected",
        description: "Please select a .wav file to upload.",
      });
      return;
    }

    const songYear = year ? parseInt(year, 10) : undefined;
    if (year && (isNaN(songYear) || songYear < 1000 || songYear > new Date().getFullYear() + 5)) {
      toast({
        variant: "destructive",
        title: "Invalid Year",
        description: "Please enter a valid year (e.g., 1999).",
      });
      return;
    }

    setIsUploading(true);

    const songDetails = {
      name: file.name.replace(/\.(wav|wave)$/i, ""),
      year: songYear,
    };

    const tempAudio = new Audio();
    const objectUrl = URL.createObjectURL(file);
    tempAudio.src = objectUrl;

    tempAudio.onloadedmetadata = async () => {
      const duration = tempAudio.duration;
      URL.revokeObjectURL(objectUrl); // Clean up temporary object URL

      try {
        await onSongAdd(file, songDetails, duration);
        // Toast for success is handled in page.tsx after successful Firebase save
        setFile(null);
        setYear("");
        (event.target as HTMLFormElement).reset();
      } catch (error) {
        console.error("Error in onSongAdd:", error);
        // Toast for error is handled in page.tsx
      } finally {
        setIsUploading(false);
      }
    };

    tempAudio.onerror = () => {
      URL.revokeObjectURL(objectUrl); // Clean up temporary object URL
      toast({
        variant: "destructive",
        title: "Error loading audio metadata",
        description: "Could not determine audio duration.",
      });
      setIsUploading(false);
    };
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="audioFile" className="text-lg">Upload .wav File</Label>
        <div className="mt-2 flex items-center space-x-2">
          <Input
            id="audioFile"
            type="file"
            accept=".wav,audio/wav,audio/wave"
            onChange={handleFileChange}
            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            disabled={isUploading}
          />
        </div>
        {file && <p className="text-sm text-muted-foreground mt-1">Selected: {file.name}</p>}
      </div>
      <div>
        <Label htmlFor="songYear" className="text-lg">Year (Optional)</Label>
        <div className="mt-2 flex items-center space-x-2">
          <CalendarIcon className="h-5 w-5 text-muted-foreground" />
          <Input
            id="songYear"
            type="number"
            placeholder="e.g., 2023"
            value={year}
            onChange={handleYearChange}
            min="1000"
            max={new Date().getFullYear() + 5}
            className="w-full"
            disabled={isUploading}
          />
        </div>
      </div>
      <Button type="submit" disabled={!file || isUploading}>
        {isUploading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Uploading...
          </>
        ) : (
          <>
            <UploadCloud className="mr-2 h-5 w-5" /> Add Song
          </>
        )}
      </Button>
    </form>
  );
};

export default AudioUploadForm;
