"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import toast from "react-hot-toast";
import { CreditCard, Loader2 } from "lucide-react";
import { VoiceRecorder } from "@/components/VoiceRecorder";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"login" | "otp">("login");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceAudio, setVoiceAudio] = useState<string | null>(null);
  const [useVoice, setUseVoice] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await authApi.login(username, password);
      setUserId(response.user_id);
      setStep("otp");
      toast.success("OTP sent! Check your device.");
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    // Both OTP and voice verification are REQUIRED
    if (!otp) {
      toast.error("Please enter OTP");
      return;
    }
    if (!voiceAudio) {
      toast.error("Please record your voice for verification");
      return;
    }
    setLoading(true);
    try {
      const response = await authApi.verifyOtp(userId, otp, voiceAudio);
      localStorage.setItem("access_token", response.access_token);
      localStorage.setItem("refresh_token", response.refresh_token);
      localStorage.setItem("user_id", userId);
      toast.success("Login successful!");
      router.push("/dashboard");
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceRecorded = (audioBase64: string) => {
    setVoiceAudio(audioBase64);
    setUseVoice(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-blue-50 to-primary-100 p-4">
      <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 w-full max-w-md border border-gray-200">
        <div className="flex items-center justify-center mb-6">
          <div className="bg-gradient-to-br from-primary-500 to-primary-700 p-4 rounded-2xl shadow-lg">
            <CreditCard className="w-10 h-10 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-center bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent mb-2">
          AI Voice Banking
        </h1>
        <p className="text-center text-gray-600 mb-8 text-sm">
          Secure banking with voice assistance
        </p>

        {step === "login" ? (
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 transition-all"
                placeholder="Enter your username"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 transition-all"
                placeholder="Enter your password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white py-3 px-4 rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Continue"
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpVerify} className="space-y-5">
            <div className="bg-primary-50 border-2 border-primary-200 rounded-xl p-4">
              <label className="block text-sm font-semibold text-gray-700 mb-3 text-center">
                Enter OTP <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                maxLength={6}
                className="w-full px-4 py-3 border-2 border-primary-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-center text-3xl tracking-[0.5em] text-gray-900 font-bold bg-white"
                placeholder="000000"
              />
              <p className="text-xs text-gray-600 mt-2 text-center">Check your device for the OTP code</p>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-primary-50 border-2 border-primary-200 rounded-xl p-5">
              <p className="text-sm font-semibold text-gray-700 mb-3 text-center">
                Voice Verification <span className="text-red-500">*</span>
              </p>
              <div className="bg-white rounded-lg p-4 border border-primary-200">
                <VoiceRecorder
                  onAudioReady={handleVoiceRecorded}
                  disabled={loading}
                  label={useVoice ? "Voice Recorded ✓" : "Record Voice"}
                  helperText="Voice verification is required. Speak clearly."
                />
              </div>
              {useVoice && (
                <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-2">
                  <p className="text-xs text-green-700 text-center font-medium">✓ Voice recorded! You can proceed.</p>
                </div>
              )}
              {!useVoice && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-2">
                  <p className="text-xs text-red-700 text-center font-medium">⚠ Voice verification is required</p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !otp || !voiceAudio}
              className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white py-3 px-4 rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify & Login"
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("login");
                setOtp("");
                setVoiceAudio(null);
                setUseVoice(false);
              }}
              className="w-full text-primary-600 hover:text-primary-700 text-sm font-medium py-2 hover:bg-primary-50 rounded-lg transition-colors"
            >
              ← Back to login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

