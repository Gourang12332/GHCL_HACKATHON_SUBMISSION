"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import { bankingApi } from "@/lib/api";
import { VoiceInputField } from "@/components/VoiceInputField";
import toast from "react-hot-toast";

export default function TransferPage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "review" | "mfa" | "success">("form");
  const [formData, setFormData] = useState({
    amount: "",
    counterparty: "",
    channel: "UPI",
  });
  const [sessionId, setSessionId] = useState("");
  const [otp, setOtp] = useState("");
  const [mfaRequired, setMfaRequired] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleInitTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await bankingApi.initTransfer({
        amount: parseFloat(formData.amount),
        counterparty: formData.counterparty,
        channel: formData.channel,
      });
      setSessionId(response.session_id);
      setMfaRequired(response.mfa_required);
      setStep("review");
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to initiate transfer");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (mfaRequired && !otp) {
      setStep("mfa");
      return;
    }
    await handleFinalConfirm();
  };

  const handleFinalConfirm = async () => {
    setLoading(true);
    try {
      const response = await bankingApi.confirmTransfer({
        session_id: sessionId,
        otp: otp || undefined,
        voice_verified: false,
      });
      setStep("success");
      toast.success(`Transfer successful! Transaction ID: ${response.txn_id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Transfer failed");
    } finally {
      setLoading(false);
    }
  };

  if (step === "success") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Transfer Successful!</h2>
          <p className="text-gray-600 mb-6">Your money has been transferred successfully.</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <div className="bg-white text-gray-900 rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Transfer Money</h1>

          {step === "form" && (
            <form onSubmit={handleInitTransfer} className="space-y-6">
              <VoiceInputField
                label="Amount"
                value={formData.amount}
                onChange={(value) => setFormData({ ...formData, amount: value })}
                placeholder="Enter amount"
                type="number"
                required
              />

              <VoiceInputField
                label="Recipient"
                value={formData.counterparty}
                onChange={(value) => setFormData({ ...formData, counterparty: value })}
                placeholder="Name or UPI ID"
                required
              />

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Payment Method
                </label>
                <select
                  value={formData.channel}
                  onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900"
                >
                  <option value="UPI">UPI</option>
                  <option value="NEFT">NEFT</option>
                  <option value="NETBANKING">Net Banking</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center"
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
          )}

          {step === "review" && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-semibold">₹{formData.amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Recipient:</span>
                  <span className="font-semibold">{formData.counterparty}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Method:</span>
                  <span className="font-semibold">{formData.channel}</span>
                </div>
              </div>

              {mfaRequired && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    This transfer requires additional verification (MFA).
                  </p>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => setStep("form")}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50"
                >
                  Edit
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  Confirm Transfer
                </button>
              </div>
            </div>
          )}

          {step === "mfa" && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter OTP
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-center text-2xl tracking-widest text-gray-900"
                  placeholder="000000"
                />
              </div>
              <button
                onClick={handleFinalConfirm}
                disabled={loading || !otp}
                className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Verify & Transfer"
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

