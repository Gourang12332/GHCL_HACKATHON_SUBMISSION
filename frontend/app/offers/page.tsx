"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Gift, TrendingUp, CreditCard, Home, Car, Star } from "lucide-react";
import { bankingApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";
import { VoiceHelper } from "@/components/VoiceHelper";

interface Loan {
  type: string;
  max_amount: number;
  interest_rate: number;
  tenure_years: number;
  eligibility_score: string;
  description: string;
}

interface Offer {
  type: string;
  benefits: string[];
  description: string;
  credit_limit?: number;
  min_amount?: number;
}

export default function OffersPage() {
  const router = useRouter();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [creditScore, setCreditScore] = useState<number>(0);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    setLoading(true);
    try {
      const data = await bankingApi.getEligibleOffers();
      setLoans(data.loans || []);
      setOffers(data.offers || []);
      setCreditScore(data.credit_score || 0);
      setBalance(data.balance || 0);
    } catch (error) {
      toast.error("Failed to load eligible offers");
    } finally {
      setLoading(false);
    }
  };

  const getLoanIcon = (type: string) => {
    if (type.includes("Home")) return Home;
    if (type.includes("Car")) return Car;
    return CreditCard;
  };

  const getScoreColor = (score: string) => {
    if (score === "High") return "text-green-600 bg-green-100";
    if (score === "Medium") return "text-yellow-600 bg-yellow-100";
    return "text-gray-600 bg-gray-100";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Gift className="w-8 h-8 text-primary-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Eligible Offers & Loans</h1>
                <p className="text-gray-600">Discover personalized financial products tailored for you</p>
              </div>
            </div>
            <VoiceHelper
              context="offers"
              onResponse={(data) => {
                if (data.message) {
                  toast.success(data.message, { duration: 6000 });
                }
              }}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Credit Score</p>
              <p className="text-3xl font-bold text-primary-600">{creditScore}</p>
            </div>
            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Current Balance</p>
              <p className="text-3xl font-bold text-green-600">{formatCurrency(balance)}</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Loans Section */}
            {loans.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
                <div className="flex items-center gap-3 mb-6">
                  <TrendingUp className="w-6 h-6 text-primary-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Eligible Loans</h2>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {loans.map((loan, index) => {
                    const Icon = getLoanIcon(loan.type);
                    return (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="bg-primary-100 p-3 rounded-lg">
                              <Icon className="w-6 h-6 text-primary-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">{loan.type}</h3>
                              <span
                                className={`inline-block px-2 py-1 rounded text-xs mt-1 ${getScoreColor(
                                  loan.eligibility_score
                                )}`}
                              >
                                {loan.eligibility_score} Eligibility
                              </span>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">{loan.description}</p>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Max Amount:</span>
                            <span className="font-semibold text-gray-900">
                              {formatCurrency(loan.max_amount)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Interest Rate:</span>
                            <span className="font-semibold text-gray-900">{loan.interest_rate}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Tenure:</span>
                            <span className="font-semibold text-gray-900">{loan.tenure_years} years</span>
                          </div>
                        </div>
                        <button className="w-full mt-4 bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors">
                          Apply Now
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Offers Section */}
            {offers.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Star className="w-6 h-6 text-yellow-500" />
                  <h2 className="text-2xl font-bold text-gray-900">Special Offers</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  {offers.map((offer, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="text-xl font-semibold text-gray-900">{offer.type}</h3>
                        {offer.credit_limit && (
                          <span className="text-sm text-gray-600">
                            Limit: {formatCurrency(offer.credit_limit)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-4">{offer.description}</p>
                      <div className="space-y-2 mb-4">
                        <p className="text-sm font-medium text-gray-700">Benefits:</p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                          {offer.benefits.map((benefit, i) => (
                            <li key={i}>{benefit}</li>
                          ))}
                        </ul>
                      </div>
                      {offer.min_amount && (
                        <p className="text-xs text-gray-500 mb-4">
                          Minimum amount: {formatCurrency(offer.min_amount)}
                        </p>
                      )}
                      <button className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors">
                        Get Offer
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {loans.length === 0 && offers.length === 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                <p className="text-gray-500">No eligible offers at the moment. Check back later!</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

