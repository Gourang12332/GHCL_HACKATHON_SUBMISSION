"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Bell, X } from "lucide-react";
import { bankingApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import { VoiceInputField } from "@/components/VoiceInputField";

interface Reminder {
  reminder_id: string;
  title: string;
  schedule_iso: string;
  channel: string;
  created_at: string;
}

export default function RemindersPage() {
  const router = useRouter();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    schedule_iso: "",
    schedule_local: "",
    channel: "push",
  });

  useEffect(() => {
    loadReminders();
    
    // Check for due reminders every 30 seconds (for demo purposes)
    const checkDueReminders = async () => {
      try {
        const data = await bankingApi.getDueReminders();
        if (data.reminders && data.reminders.length > 0) {
          data.reminders.forEach((reminder: Reminder) => {
            toast.success(
              `🔔 Reminder: ${reminder.title}`,
              {
                duration: 10000,
                icon: "🔔",
                style: {
                  background: "#10b981",
                  color: "#fff",
                  fontSize: "16px",
                  padding: "16px",
                },
              }
            );
          });
        }
      } catch (error) {
        // Silently fail - don't spam errors
      }
    };
    
    // Check immediately and then every 30 seconds
    checkDueReminders();
    const interval = setInterval(checkDueReminders, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadReminders = async () => {
    setLoading(true);
    try {
      const data = await bankingApi.getReminders();
      setReminders(data.reminders || []);
    } catch (error) {
      toast.error("Failed to load reminders");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await bankingApi.createReminder(formData);
      toast.success("Reminder created!");
      setShowForm(false);
      setFormData({ title: "", schedule_iso: "", schedule_local: "", channel: "push" });
      loadReminders();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to create reminder");
    }
  };

  const handleDelete = async (reminder_id: string) => {
    if (!confirm("Are you sure you want to delete this reminder?")) return;
    try {
      await bankingApi.deleteReminder(reminder_id);
      toast.success("Reminder deleted");
      loadReminders();
    } catch (error) {
      toast.error("Failed to delete reminder");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
          >
            <Plus className="w-5 h-5" />
            New Reminder
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-8 h-8 text-primary-600" />
            <h1 className="text-3xl font-bold text-gray-900">Payment Reminders</h1>
          </div>

          {showForm && (
            <form onSubmit={handleCreate} className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
              <VoiceInputField
                label="Title"
                value={formData.title}
                onChange={(value) => setFormData({ ...formData, title: value })}
                placeholder="e.g., Pay credit card bill"
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Schedule Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.schedule_local}
                  onChange={(e) => {
                    const localValue = e.target.value;
                    const isoValue = localValue ? new Date(localValue).toISOString() : "";
                    setFormData({ ...formData, schedule_local: localValue, schedule_iso: isoValue });
                  }}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Select the date and time for your reminder
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Channel</label>
                <select
                  value={formData.channel}
                  onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900"
                >
                  <option value="push">Push Notification</option>
                  <option value="email">Email</option>
                  <option value="voice">Voice Call</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          ) : reminders.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No reminders set</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reminders.map((reminder) => (
                <div
                  key={reminder.reminder_id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow flex items-center justify-between"
                >
                  <div>
                    <h3 className="font-semibold text-gray-900">{reminder.title}</h3>
                    <p className="text-sm text-gray-500">
                      {formatDate(reminder.schedule_iso)} • {reminder.channel}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(reminder.reminder_id)}
                    className="text-red-600 hover:text-red-700 p-2"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

