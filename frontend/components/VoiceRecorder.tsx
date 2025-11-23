"use client";

import { useRef, useState } from "react";
import { Loader2, Mic, Square } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

interface VoiceRecorderProps {
  onAudioReady: (audioBase64: string) => void | Promise<void>;
  label?: string;
  helperText?: string;
  disabled?: boolean;
  className?: string;
}

export function VoiceRecorder({
  onAudioReady,
  label = "Record Voice Sample",
  helperText = "Tap to record, then tap again to stop",
  disabled = false,
  className,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    if (disabled || isProcessing) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        await processAudio(audioBlob);
        cleanupStream();
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.success("Recording started");
    } catch (error) {
      console.error("Microphone error:", error);
      toast.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const cleanupStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64Audio = (reader.result as string).split(",")[1];
          await onAudioReady(base64Audio);
          toast.success("Voice sample captured");
        } catch (error) {
          console.error("Error handling audio payload:", error);
          toast.error("Unable to send voice sample");
        } finally {
          setIsProcessing(false);
        }
      };
      reader.onerror = () => {
        toast.error("Failed to read audio sample");
        setIsProcessing(false);
      };
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error("Error processing audio:", error);
      toast.error("Failed to capture voice sample");
      setIsProcessing(false);
    }
  };

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isProcessing}
        className={cn(
          "w-full flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-white font-semibold transition-all",
          isRecording ? "bg-red-600 hover:bg-red-700" : "bg-primary-600 hover:bg-primary-700",
          (disabled || isProcessing) && "opacity-60 cursor-not-allowed"
        )}
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing...
          </>
        ) : isRecording ? (
          <>
            <Square className="w-4 h-4" />
            Stop Recording
          </>
        ) : (
          <>
            <Mic className="w-4 h-4" />
            {label}
          </>
        )}
      </button>
      <p className="text-sm text-gray-500">
        {isRecording ? "Recording... tap to finish" : helperText}
      </p>
    </div>
  );
}


