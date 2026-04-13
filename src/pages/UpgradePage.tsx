import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { Zap, ShieldCheck, Loader2, Check, ArrowRight } from 'lucide-react';
import { auth, db } from '../firebase';
import { UserProfile, AppSettings, PremiumPlan } from '../types';
import { handleFirestoreError, OperationType, handleApiRequest } from '../lib/utils';
import { motion } from 'motion/react';

export default function UpgradePage({ profile, settings }: { profile: UserProfile | null, settings: AppSettings | null }) {
  const [plans, setPlans] = useState<PremiumPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const q = query(collection(db, 'premiumPlans'), where('isActive', '==', true));
        const snapshot = await getDocs(q);
        const fetchedPlans = snapshot.docs.map(doc => doc.data() as PremiumPlan);
        setPlans(fetchedPlans);
        if (fetchedPlans.length > 0) {
          setSelectedPlanId(fetchedPlans[0].id);
        }
      } catch (error) {
        console.error("Error fetching plans:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  const handleCheckout = async (plan: PremiumPlan) => {
    if (!profile) {
      toast.error("Please sign in to upgrade");
      return;
    }

    if (settings?.manualPaymentEnabled && plan.paymentLink) {
      // Manual Payment Link
      window.open(plan.paymentLink, '_blank');
      toast.success("Opening payment page...");
      return;
    }

    if (settings?.razorpayEnabled && settings?.razorpayKeyId) {
      setProcessing(plan.id);
      
      // Load Razorpay Script
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      
      script.onload = async () => {
        try {
          // Create order on backend
          const order = await handleApiRequest<any>(fetch('/api/payments/order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: plan.price,
              currency: plan.currency || 'INR',
              receipt: `plan_${plan.id}_user_${profile.uid}`
            }),
          }));

          const options = {
            key: settings.razorpayKeyId,
            amount: order.amount,
            currency: order.currency,
            name: settings.siteName || 'ToolBox Pro',
            description: `${plan.name} - ${plan.durationText}`,
            order_id: order.id,
            handler: async (response: any) => {
              if (response.razorpay_payment_id && profile) {
                try {
                  // Verify payment on backend
                  await handleApiRequest(fetch('/api/payments/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      razorpay_order_id: response.razorpay_order_id,
                      razorpay_payment_id: response.razorpay_payment_id,
                      razorpay_signature: response.razorpay_signature,
                    }),
                  }));

                  await updateDoc(doc(db, 'users', profile.uid), { 
                    premiumStatus: true,
                    currentPlanId: plan.id,
                    planExpiresAt: plan.duration === 'lifetime' ? null : calculateExpiry(plan.duration)
                  });
                  toast.success(`Welcome to ${plan.name}! Your account has been upgraded.`);
                } catch (error) {
                  console.error("Verification error:", error);
                  toast.error("Payment verification failed. Please contact support.");
                }
              }
              setProcessing(null);
            },
            modal: {
              ondismiss: () => setProcessing(null),
              escape: true,
              backdropclose: false
            },
            prefill: {
              email: profile.email,
              name: profile.displayName || '',
              contact: ''
            },
            theme: {
              color: settings.primaryColor || '#2563eb'
            },
            notes: {
              plan_id: plan.id,
              user_id: profile.uid
            }
          };
          
          const rzp = new (window as any).Razorpay(options);
          rzp.on('payment.failed', function (response: any) {
            toast.error(response.error.description || "Payment failed");
            setProcessing(null);
          });
          rzp.open();
        } catch (error) {
          console.error("Razorpay initialization error:", error);
          toast.error("Failed to initialize payment gateway");
          setProcessing(null);
        }
      };
      
      script.onerror = () => {
        setProcessing(null);
        toast.error("Failed to load payment gateway script");
      };
      
      document.body.appendChild(script);
    } else if (settings?.enableTestMode) {
      // Bypass Payment (Dev Only)
      setProcessing(plan.id);
      toast.loading("Processing test upgrade...", { id: 'test-payment' });
      
      setTimeout(async () => {
        if (!profile) return;
        try {
          await updateDoc(doc(db, 'users', profile.uid), { 
            premiumStatus: true,
            currentPlanId: plan.id,
            planExpiresAt: plan.duration === 'lifetime' ? null : calculateExpiry(plan.duration)
          });
          toast.success(`[BYPASS] Welcome to ${plan.name}!`, { id: 'test-payment' });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`, auth);
          toast.error("Error updating profile", { id: 'test-payment' });
        } finally {
          setProcessing(null);
        }
      }, 1500);
    } else {
      toast.error("Payment gateway is not configured. Please check Admin Panel > Payments.");
    }
  };

  const calculateExpiry = (duration: string) => {
    const now = new Date();
    if (duration === 'daily') now.setDate(now.getDate() + 1);
    else if (duration === 'weekly') now.setDate(now.getDate() + 7);
    else if (duration === 'monthly') now.setMonth(now.getMonth() + 1);
    else if (duration === 'yearly') now.setFullYear(now.getFullYear() + 1);
    return now.toISOString();
  };

  const animationClass = settings?.animationSpeed === 'slow' ? 'animate-slow' : settings?.animationSpeed === 'fast' ? 'animate-fast' : 'animate-normal';
  const glassClass = settings?.enableGlassmorphism ? 'glass' : 'bg-white border border-gray-100';

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (profile?.premiumStatus) {
    return (
      <div className="max-w-4xl mx-auto py-20 px-4 text-center space-y-8">
        <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
          <ShieldCheck className="w-12 h-12 text-amber-600" />
        </div>
        <div className="space-y-4">
          <h1 className="text-3xl font-black text-gray-900">You're already Premium!</h1>
          <p className="text-gray-500 max-w-md mx-auto">
            Thank you for being a premium member. You have unlimited access to all our professional tools.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            to="/dashboard"
            className="px-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-secondary transition-all"
          >
            Go to Dashboard
          </Link>
          <button 
            onClick={() => window.history.back()}
            className="px-8 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-20 px-4 text-center space-y-8">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
          <Zap className="w-12 h-12 text-gray-300" />
        </div>
        <div className="space-y-4">
          <h1 className="text-3xl font-black text-gray-900">No Plans Available</h1>
          <p className="text-gray-500 max-w-md mx-auto">
            We're currently updating our membership plans. Please check back later or contact support if you need immediate assistance.
          </p>
        </div>
        <button 
          onClick={() => window.history.back()}
          className="px-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-secondary transition-all"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className={`max-w-6xl mx-auto py-12 px-4 space-y-16 ${animationClass}`}>
      <div className="text-center space-y-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary text-sm font-bold rounded-full border border-primary/20 mb-4"
        >
          <Zap className="w-4 h-4" />
          PRICING PLANS
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight"
        >
          {settings?.upgradeTitle || 'Upgrade to Premium'}
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-gray-500 text-lg max-w-2xl mx-auto"
        >
          {settings?.upgradeSubtitle || "Choose the plan that's right for you and get unlimited access to all our professional tools."}
        </motion.p>
      </div>

      <div className="max-w-2xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`relative p-8 md:p-12 rounded-[2.5rem] shadow-2xl transition-all ${glassClass} border-2 border-primary/10`}
        >
          <div className="space-y-10">
            <div className="space-y-4 text-center">
              <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Zap className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-3xl font-black text-gray-900">Choose Your Membership</h2>
              <p className="text-gray-500 font-medium">Select a plan that fits your needs and unlock all premium features instantly.</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-black text-gray-400 uppercase tracking-widest ml-1">Select Plan</label>
                <div className="relative group">
                  <select 
                    value={selectedPlanId}
                    onChange={(e) => {
                      setSelectedPlanId(e.target.value);
                      setProcessing(null);
                    }}
                    className="w-full p-5 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-gray-900 appearance-none focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all cursor-pointer group-hover:border-primary/30"
                  >
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} — {plan.currency === 'INR' ? '₹' : plan.currency === 'USD' ? '$' : '€'}{plan.price} {plan.durationText}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <ArrowRight className="w-5 h-5 text-gray-400 rotate-90" />
                  </div>
                </div>
              </div>

              {/* Selected Plan Details */}
              {selectedPlan && (
                <motion.div 
                  key={selectedPlan.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-8 pt-6 border-t border-gray-100"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-primary uppercase tracking-wider">Selected Plan</p>
                      <h3 className="text-2xl font-black text-gray-900">{selectedPlan.name}</h3>
                    </div>
                    <div className="text-right">
                      <div className="flex items-baseline justify-end gap-1">
                        <span className="text-4xl font-black text-gray-900">
                          {selectedPlan.currency === 'INR' ? '₹' : selectedPlan.currency === 'USD' ? '$' : '€'}
                          {selectedPlan.price}
                        </span>
                      </div>
                      <p className="text-gray-400 font-bold text-sm">{selectedPlan.durationText}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">What's Included</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {selectedPlan.features.map((feature, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100/50">
                          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shrink-0 shadow-sm shadow-green-200">
                            <Check className="w-3.5 h-3.5 text-white" />
                          </div>
                          <span className="text-sm font-bold text-gray-700">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={() => handleCheckout(selectedPlan)}
                    disabled={!!processing}
                    className="w-full py-5 bg-primary text-white rounded-2xl font-black text-xl hover:bg-secondary transition-all flex items-center justify-center gap-3 shadow-xl shadow-primary/20 disabled:opacity-70 group"
                  >
                    {processing === selectedPlan.id ? (
                      <Loader2 className="w-7 h-7 animate-spin" />
                    ) : (
                      <>
                        {selectedPlan.paymentButtonText || 'Buy Selected Plan'}
                        <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Comparison Table or FAQ could go here */}
      <div className="bg-primary rounded-[2.5rem] p-12 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/20 rounded-full -ml-32 -mb-32 blur-3xl" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 text-center md:text-left">
            <h2 className="text-3xl font-black">Still have questions?</h2>
            <p className="text-white/80 max-w-md">
              Our support team is here to help you choose the right plan for your needs.
            </p>
          </div>
          <button className="px-8 py-4 bg-white text-primary rounded-2xl font-black hover:bg-white/90 transition-all shadow-xl">
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
}
