import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile, AppSettings } from '../types';
import { checkSubscription } from '../lib/subscriptionService';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, X, AlertCircle } from 'lucide-react';

interface SubscriptionManagerProps {
  profile: UserProfile | null;
  settings: AppSettings | null;
}

/**
 * SubscriptionManager handles global subscription enforcement.
 * It intercepts clicks on premium tools and shows an upgrade prompt if needed.
 */
export default function SubscriptionManager({ profile, settings }: SubscriptionManagerProps) {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Find the closest link that points to a tool
      const toolLink = target.closest('a');
      
      if (toolLink && toolLink.getAttribute('href')?.startsWith('/tools/')) {
        // Check if the tool is premium. 
        // We can detect this by looking for the Zap icon or checking the tool's path in our data.
        // For a non-destructive approach, we check if the clicked element or its children have premium indicators.
        const isPremiumIndicator = toolLink.querySelector('.text-amber-500') || toolLink.querySelector('[data-premium="true"]');
        
        if (isPremiumIndicator && !checkSubscription(profile)) {
          e.preventDefault();
          e.stopPropagation();
          setShowModal(true);
        }
      }
    };

    // Use capture phase to intercept clicks before they reach the Link component's handler
    document.addEventListener('click', handleGlobalClick, true);
    return () => document.removeEventListener('click', handleGlobalClick, true);
  }, [profile]);

  return (
    <AnimatePresence>
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl space-y-6 relative overflow-hidden"
          >
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full -mr-16 -mt-16 opacity-50" />
            
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-4 relative z-10">
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 mx-auto shadow-inner">
                <Zap className="w-8 h-8 fill-amber-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-gray-900">Plan Expired</h3>
                <p className="text-gray-500 font-medium leading-relaxed">
                  Your free plan has ended. Please upgrade to continue.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 relative z-10">
              <button 
                onClick={() => {
                  setShowModal(false);
                  navigate('/pricing');
                }}
                className="w-full py-4 bg-[#e5322d] text-white rounded-2xl font-black text-lg hover:bg-[#c42b27] transition-all shadow-lg shadow-red-200 active:scale-95"
              >
                Upgrade Required
              </button>
              <button 
                onClick={() => setShowModal(false)}
                className="w-full py-4 bg-gray-50 text-gray-600 rounded-2xl font-bold hover:bg-gray-100 transition-all active:scale-95"
              >
                Maybe Later
              </button>
            </div>
            
            <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <AlertCircle className="w-3 h-3" />
              Secure Checkout
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
