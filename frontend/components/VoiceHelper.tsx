"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { dialogueApi } from "@/lib/api";
import toast from "react-hot-toast";

interface VoiceHelperProps {
  onTranscript?: (text: string) => void;
  onFill?: (data: any) => void;
  onResponse?: (data: { transcript?: string; message?: string; slots?: any }) => void;
  language?: string;
  className?: string;
  context?: string; // Context like "amount", "recipient", "loans", "offers", "transactions"
  onVoiceClick?: () => void; // Called when voice button is clicked
}

export function VoiceHelper({
  onTranscript,
  onFill,
  onResponse,
  language = "en",
  className,
  context,
  onVoiceClick,
}: VoiceHelperProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.success("Listening...");
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(",")[1];
        
        // Add context to the API call if available
        const payload: any = {
          audio_base64: base64Audio,
          language,
        };
        if (context) {
          payload.context = context;
        }
        
        const response = await dialogueApi.voiceTurn(payload);

        if (response.transcript) {
          onTranscript?.(response.transcript);
        }

        // For context-specific pages, use hardcoded responses
        if (context && ["loans", "offers", "transactions"].includes(context)) {
          const contextMessages: { [key: string]: string } = {
            loans: "This page displays all your active loans including home loans, car loans, and personal loans. You can see the outstanding amount, EMI due, interest rate, and next due date for each loan. Use this page to track your loan payments and manage your credit.",
            offers: "This page shows eligible loans and special offers based on your credit score and account activity. You can see home loans, car loans, personal loans, and credit card offers with their interest rates, tenure, and benefits. Check here for personalized financial products.",
            transactions: "This page shows all your past transactions including transfers, payments, and deposits. You can see the amount, recipient, payment method, status, and date of each transaction. Use this to track your spending and payment history.",
          };
          
          const message = contextMessages[context] || response.dialogue?.text;
          toast.success(message, { duration: 6000 });
          onResponse?.({
            transcript: response.transcript || "",
            message: message,
            slots: response.slots,
          });
        } else if (response.dialogue?.text) {
          toast.success(response.dialogue.text);
          onResponse?.({
            transcript: response.transcript,
            message: response.dialogue.text,
            slots: response.slots,
          });
        } else {
          onResponse?.({
            transcript: response.transcript,
            slots: response.slots,
          });
        }

        if (response.slots && onFill) {
          onFill(response.slots);
        }

        // Play TTS if available
        if (response.tts?.audio_base64) {
          playTTS(response.tts.audio_base64);
        }

        setIsProcessing(false);
      };
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error("Error processing audio:", error);
      toast.error("Failed to process voice input");
      setIsProcessing(false);
    }
  };

  const playTTS = (audioBase64: string) => {
    const audio = new Audio(`data:audio/mpeg;base64,${audioBase64}`);
    audio.play().catch((error) => {
      console.error("Error playing TTS:", error);
    });
  };

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      // Call onVoiceClick callback if provided (for field-specific explanations)
      if (onVoiceClick) {
        onVoiceClick();
      }
      startRecording();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isProcessing}
      className={cn(
        "flex items-center justify-center w-10 h-10 rounded-full transition-all",
        isRecording
          ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
          : "bg-primary-500 hover:bg-primary-600 text-white",
        isProcessing && "opacity-50 cursor-not-allowed",
        className
      )}
      title={isRecording ? "Stop recording" : "Start voice input"}
    >
      {isProcessing ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : isRecording ? (
        <MicOff className="w-5 h-5" />
      ) : (
        <Mic className="w-5 h-5" />
      )}
    </button>
  );
}

