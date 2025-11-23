"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CreditCard } from "lucide-react";
import { bankingApi } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import { VoiceHelper } from "@/components/VoiceHelper";

interface Loan {
  loan_id: string;
  loan_type: string;
  interest_rate: number;
  outstanding: number;
  emi_due: number;
  next_due: string;
}

export default function LoansPage() {
  const router = useRouter();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLoans();
  }, []);

  const loadLoans = async () => {
    setLoading(true);
    try {
      const data = await bankingApi.getLoans();
      setLoans(data.loans || []);
    } catch (error) {
      toast.error("Failed to load loan information");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <CreditCard className="w-8 h-8 text-primary-600" />
              <h1 className="text-3xl font-bold text-gray-900">Loans & Credit</h1>
            </div>
            <VoiceHelper
              context="loans"
              onResponse={(data) => {
                if (data.message) {
                  toast.success(data.message, { duration: 6000 });
                }
              }}
            />
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          ) : loans.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No active loans</p>
            </div>
          ) : (
            <div className="space-y-6">
              {loans.map((loan) => (
                <div
                  key={loan.loan_id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 capitalize">
                        {loan.loan_type} Loan
                      </h3>
                      <p className="text-sm text-gray-500">Interest Rate: {loan.interest_rate}%</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Outstanding</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(loan.outstanding)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">EMI Due</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(loan.emi_due)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Next Due Date</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatDate(loan.next_due)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

