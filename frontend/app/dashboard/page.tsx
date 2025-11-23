"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Wallet, ArrowRightLeft, History, CreditCard, Bell, LogOut, Bot, X, Gift } from "lucide-react";
import { bankingApi } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";
import { VoiceHelper } from "@/components/VoiceHelper";

export default function DashboardPage() {
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantMessages, setAssistantMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);

  useEffect(() => {
    const userId = localStorage.getItem("user_id");
    if (!userId) {
      router.push("/login");
      return;
    }

    loadBalance();
  }, [router]);

  const loadBalance = async () => {
    try {
      const data = await bankingApi.getBalance();
      setBalance(data.balance);
    } catch (error) {
      toast.error("Failed to load balance");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_id");
    router.push("/login");
  };

  const cards = [
    {
      title: "Transfer Money",
      description: "Send funds to beneficiaries",
      icon: ArrowRightLeft,
      route: "/transfer",
      color: "bg-blue-500",
    },
    {
      title: "Transaction History",
      description: "View past transactions",
      icon: History,
      route: "/transactions",
      color: "bg-green-500",
    },
    {
      title: "Loans & Credit",
      description: "Check loan details",
      icon: CreditCard,
      route: "/loans",
      color: "bg-purple-500",
    },
    {
      title: "Reminders",
      description: "Manage payment alerts",
      icon: Bell,
      route: "/reminders",
      color: "bg-orange-500",
    },
    {
      title: "Eligible Offers",
      description: "Loans & special offers",
      icon: Gift,
      route: "/offers",
      color: "bg-purple-500",
    },
  ];

  const handleAssistantTranscript = (text: string) => {
    setAssistantMessages((prev) => [...prev, { role: "user", text }]);
  };

  const handleAssistantResponse = (data: { transcript?: string; message?: string; slots?: any }) => {
    if (data.message) {
      setAssistantMessages((prev) => [...prev, { role: "ai", text: data.message as string }]);
      
      // If transfer intent detected, suggest clicking transfer button
      if (data.message.toLowerCase().includes("transfer") && data.message.toLowerCase().includes("click")) {
        // Auto-suggest after a short delay
        setTimeout(() => {
          setAssistantMessages((prev) => [...prev, {
            role: "ai",
            text: "You can click on the 'Transfer Money' card below to start the transfer process. I'll guide you through filling the form once you're there!"
          }]);
        }, 2000);
      }
    }
    
    // Handle slots for transfer
    if (data.slots) {
      const slots = data.slots;
      if (slots.amount || slots.counterparty) {
        // Suggest navigating to transfer page
        setTimeout(() => {
          setAssistantMessages((prev) => [...prev, {
            role: "ai",
            text: "I've detected your transfer request. Please click on the 'Transfer Money' button on the dashboard to proceed with the transfer."
          }]);
        }, 1500);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100">
      <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                Dashboard
              </h1>
              <p className="text-sm text-gray-600 mt-1">Welcome back! Manage your banking needs</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setAssistantOpen(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white px-5 py-2.5 rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                <Bot className="w-5 h-5" />
                <span className="font-medium">Talk to AI</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Balance Card */}
        <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 rounded-3xl shadow-2xl p-8 mb-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-primary-100 text-sm mb-3 font-medium tracking-wide">Available Balance</p>
              {loading ? (
                <div className="h-14 w-64 bg-primary-500/50 rounded-xl animate-pulse" />
              ) : (
                <h2 className="text-5xl font-bold mb-2">{formatCurrency(balance || 0)}</h2>
              )}
              <p className="text-primary-200 text-sm">Your account is active and secure</p>
            </div>
            <div className="relative">
              <Wallet className="w-20 h-20 text-primary-200/80" />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.route}
                  onClick={() => router.push(card.route)}
                  className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-6 text-left group border border-gray-100 hover:border-primary-200 transform hover:-translate-y-1"
                >
                  <div className={`${card.color} w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">{card.description}</p>
                  <div className="flex items-center text-primary-600 font-medium text-sm group-hover:gap-2 transition-all">
                    <span>Get started</span>
                    <ArrowRightLeft className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {assistantOpen && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-gray-200">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-white">
            <div>
              <p className="text-sm uppercase tracking-wide text-primary-600 font-semibold mb-1">AI Assistant</p>
              <h2 className="text-2xl font-bold text-gray-900">What would you like to do?</h2>
            </div>
            <button
              onClick={() => setAssistantOpen(false)}
              className="text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
            {assistantMessages.length === 0 ? (
              <div className="text-center py-12">
                <Bot className="w-16 h-16 text-primary-300 mx-auto mb-4" />
                <p className="text-base text-gray-600 mb-2 font-medium">
                  Tell the assistant to transfer money, check your balance, set a reminder, and more.
                </p>
                <p className="text-sm text-gray-500">Tap the microphone to start.</p>
              </div>
            ) : (
              assistantMessages.map((message, index) => (
                <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={cn(
                      "px-5 py-3 rounded-2xl max-w-sm text-sm shadow-md",
                      message.role === "user"
                        ? "bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-tr-none"
                        : "bg-white text-gray-900 rounded-tl-none border border-gray-200"
                    )}
                  >
                    {message.text}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-6 border-t border-gray-200 bg-white flex items-center justify-between gap-4 rounded-b-3xl">
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900 mb-1">Hold the mic & speak clearly</p>
              <p className="text-xs text-gray-500">The assistant can perform any supported banking workflow.</p>
            </div>
            <VoiceHelper onTranscript={handleAssistantTranscript} onResponse={handleAssistantResponse} />
          </div>
        </div>
      </div>
      )}
    </div>    
  );
}

