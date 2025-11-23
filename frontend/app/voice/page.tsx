"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, CheckCircle, Lock } from "lucide-react";
import toast from "react-hot-toast";
import { authApi } from "@/lib/api";
import { VoiceRecorder } from "@/components/VoiceRecorder";

export default function VoiceSecurityPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("user_id");
    if (!id) {
      router.push("/login");
      return;
    }
    setUserId(id);
  }, [router]);

  const handleEnroll = async (audioBase64: string) => {
    if (!userId) {
      toast.error("User session not found");
      return;
    }
    setEnrollLoading(true);
    try {
      await authApi.enrollVoice(userId, audioBase64);
      toast.success("Voice profile enrolled successfully");
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Voice enrollment failed");
    } finally {
      setEnrollLoading(false);
    }
  };

  const handleVerify = async (audioBase64: string) => {
    if (!userId) {
      toast.error("User session not found");
      return;
    }
    setVerifyLoading(true);
    try {
      const response = await authApi.verifyVoice(userId, audioBase64, otp || undefined);
      setVerificationMessage(response.detail || "Voice verification successful");
      toast.success("Voice verified");
    } catch (error: any) {
      setVerificationMessage(error.response?.data?.detail || "Voice verification failed");
      toast.error("Voice verification failed");
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Voice Security</h1>
            <p className="text-gray-600">
              Enroll your voice for authentication and verify it before approving transactions.
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Voice Enrollment</h2>
                <p className="text-sm text-gray-600">
                  Record three clear samples of your voice command for best accuracy.
                </p>
              </div>
            </div>
            <VoiceRecorder
              onAudioReady={handleEnroll}
              disabled={enrollLoading}
              helperText="Use a quiet room and speak clearly."
            />
            <ul className="text-sm text-gray-500 space-y-1 list-disc list-inside">
              <li>State your full name and an example banking command.</li>
              <li>Keep each sample 5-7 seconds long for better matching.</li>
              <li>Repeat the process if the environment was noisy.</li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Lock className="w-6 h-6 text-primary-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Voice Verification</h2>
                <p className="text-sm text-gray-600">
                  Confirm your identity before high-value actions.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">OTP (optional)</label>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                placeholder="Enter OTP if required"
              />
            </div>

            <VoiceRecorder
              onAudioReady={handleVerify}
              disabled={verifyLoading}
              label="Verify with Voice"
              helperText="Speak your enrollment phrase to verify."
            />

            {verificationMessage && (
              <div className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-700">
                {verificationMessage}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


