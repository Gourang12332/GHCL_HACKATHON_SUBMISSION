"use client";

import { VoiceHelper } from "./VoiceHelper";
import toast from "react-hot-toast";

interface VoiceInputFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  voiceHelper?: boolean;
}

export function VoiceInputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  voiceHelper = true,
}: VoiceInputFieldProps) {
  const handleVoiceClick = () => {
    // Provide immediate field-specific explanation when voice button is clicked
    // This will be shown before recording starts
    if (label.toLowerCase() === "amount") {
      toast.success(
        "This is the amount field. You can say an amount like 'one thousand rupees' or 'five thousand'. For example, I'll suggest ₹1000 as a demo amount. Please speak your desired amount now.",
        { duration: 8000, icon: "💰" }
      );
    } else if (label.toLowerCase() === "recipient") {
      toast.success(
        "This is the recipient field for UPI ID. You can say a name like 'rajesh' or 'alice'. I'll fill a demo UPI ID like 'rajesh@paytm' as an example. Please speak the recipient name or UPI ID now.",
        { duration: 8000, icon: "👤" }
      );
    }
  };

  const handleVoiceResponse = (data: { transcript?: string; message?: string; slots?: any }) => {
    const slots = data.slots || {};
    
    // Handle amount field with demo suggestions
    if (label.toLowerCase() === "amount" && slots.amount) {
      // For demo: suggest a different amount based on detected amount
      const demoAmounts: { [key: number]: number } = {
        5000: 1000,
        10000: 2000,
        15000: 3000,
        20000: 5000,
      };
      const detectedAmount = slots.amount;
      const suggestedAmount = demoAmounts[detectedAmount] || 1000;
      
      // Show confirmation toast
      toast.success(
        `I detected ₹${detectedAmount}. I suggest filling ₹${suggestedAmount}. Please confirm or modify.`,
        { duration: 5000 }
      );
      
      // Auto-fill with suggested amount
      onChange(suggestedAmount.toString());
    }
    // Handle recipient field with demo UPI IDs
    else if (label.toLowerCase() === "recipient" && slots.counterparty) {
      const counterparty = slots.counterparty.toLowerCase();
      const demoUpiIds: { [key: string]: string } = {
        rajesh: "rajesh@paytm",
        alice: "alice@phonepe",
        john: "john@upi",
        priya: "priya@paytm",
        bob: "bob@phonepe",
        sarah: "sarah@upi",
      };
      
      const demoUpi = demoUpiIds[counterparty] || `${counterparty}@paytm`;
      
      toast.success(
        `I've filled demo UPI: ${demoUpi}. Please fill a similar UPI ID for ${slots.counterparty} (like ${counterparty}@paytm or ${counterparty}@phonepe).`,
        { duration: 6000 }
      );
      
      // Auto-fill with demo UPI
      onChange(demoUpi);
    }
    // Handle other fields
    else {
      if (slots.amount) {
        onChange(slots.amount.toString());
      } else if (slots.counterparty) {
        onChange(slots.counterparty);
      }
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
        />
        {voiceHelper && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <VoiceHelper
              context={label.toLowerCase()}
              onTranscript={(text) => onChange(text)}
              onFill={(slots) => {
                // Auto-fill from backend slots
                if (label.toLowerCase() === "amount" && slots.amount) {
                  onChange(slots.amount.toString());
                } else if (label.toLowerCase() === "recipient" && slots.counterparty) {
                  // Auto-fill the UPI ID from backend (e.g., rajesh@paytm)
                  onChange(slots.counterparty);
                }
              }}
              onResponse={handleVoiceResponse}
              onVoiceClick={handleVoiceClick}
            />
          </div>
        )}
      </div>
    </div>
  );
}

