import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUp, ArrowLeft, MessageCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppSettings } from '../types';

export default function FloatingWidgets({ settings }: { settings: AppSettings | null }) {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    navigate(-1);
  };

  const openWhatsApp = () => {
    if (settings?.whatsAppNumber) {
      const number = settings.whatsAppNumber.replace(/\D/g, '');
      window.open(`https://wa.me/${number}`, '_blank');
    }
  };

  // Don't show back button on home page
  const showBack = settings?.enableBackButton && location.pathname !== '/';

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
      <AnimatePresence>
        {/* WhatsApp Widget */}
        {settings?.enableWhatsApp && settings?.whatsAppNumber && (
          <motion.button
            key="whatsapp"
            initial={{ scale: 0, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: 20 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={openWhatsApp}
            className="w-14 h-14 bg-[#25D366] text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-[#128C7E] transition-all duration-300"
            title="Chat on WhatsApp"
          >
            <MessageCircle className="w-7 h-7 fill-current" />
          </motion.button>
        )}

        {/* Back Button */}
        {showBack && (
          <motion.button
            key="back"
            initial={{ scale: 0, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: 20 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={goBack}
            className="w-12 h-12 bg-white text-gray-700 rounded-full shadow-lg border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-all duration-300"
            title="Go Back"
          >
            <ArrowLeft className="w-6 h-6" />
          </motion.button>
        )}

        {/* Scroll to Top */}
        {(settings?.enableScrollToTop !== false) && showScrollTop && (
          <motion.button
            key="scroll-top"
            initial={{ scale: 0, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: 20 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={scrollToTop}
            className="w-12 h-12 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:bg-secondary transition-all duration-300"
            title="Scroll to Top"
          >
            <ArrowUp className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
