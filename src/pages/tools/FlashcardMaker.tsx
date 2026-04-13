import React, { useState, useEffect } from 'react';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { Layers, Plus, Trash2, RotateCcw, ChevronLeft, ChevronRight, Eye, Play } from 'lucide-react';
import { db } from '../../firebase';
import { UserProfile, AppSettings } from '../../types';
import ToolAdWrapper from '../../components/ToolAdWrapper';
import { motion, AnimatePresence } from 'motion/react';

interface Flashcard {
  id: string;
  front: string;
  back: string;
}

export default function FlashcardMaker({ profile }: { profile: UserProfile | null, settings: AppSettings | null }) {
  const [cards, setCards] = useState<Flashcard[]>(() => {
    const saved = localStorage.getItem('student_flashcards');
    return saved ? JSON.parse(saved) : [];
  });
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [isStudyMode, setIsStudyMode] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    localStorage.setItem('student_flashcards', JSON.stringify(cards));
  }, [cards]);

  const addCard = async () => {
    if (!front.trim() || !back.trim()) {
      toast.error("Please fill in both sides of the card");
      return;
    }

    const newCard: Flashcard = {
      id: Math.random().toString(36).substr(2, 9),
      front,
      back
    };

    setCards([...cards, newCard]);
    setFront('');
    setBack('');
    toast.success("Card added!");

    // Update usage count (skip for admins)
    if (profile && profile.role !== 'admin') {
      try {
        await updateDoc(doc(db, 'users', profile.uid), {
          usageCount: increment(1),
          lastUsedAt: new Date().toISOString()
        });
      } catch (error) {
        console.error("Error updating usage:", error);
      }
    }
  };

  const removeCard = (id: string) => {
    setCards(cards.filter(c => c.id !== id));
    if (currentIndex >= cards.length - 1 && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const startStudy = () => {
    if (cards.length === 0) {
      toast.error("Add some cards first!");
      return;
    }
    setIsStudyMode(true);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  return (
    <div className="flex flex-col items-center space-y-8 max-w-4xl mx-auto w-full px-4">
      <ToolAdWrapper position="tool_top" />
      
      <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Flashcard Maker</h1>
              <p className="text-gray-500 text-sm">Create and study digital flashcards for better memorization.</p>
            </div>
          </div>
          {cards.length > 0 && !isStudyMode && (
            <button
              onClick={startStudy}
              className="px-6 py-2 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-all flex items-center gap-2 shadow-lg shadow-rose-100"
            >
              <Play className="w-4 h-4" />
              Study Now
            </button>
          )}
        </div>

        {isStudyMode ? (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => setIsStudyMode(false)}
                className="text-sm font-bold text-gray-400 hover:text-gray-600 flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Back to Editor
              </button>
              <span className="text-sm font-bold text-rose-600 bg-rose-50 px-3 py-1 rounded-full">
                Card {currentIndex + 1} of {cards.length}
              </span>
            </div>

            <div className="perspective-1000 h-[300px] w-full cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
              <motion.div
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
                className="relative w-full h-full preserve-3d"
              >
                {/* Front */}
                <div className="absolute inset-0 backface-hidden bg-white border-2 border-rose-100 rounded-3xl flex flex-col items-center justify-center p-8 text-center shadow-xl">
                  <span className="absolute top-4 left-4 text-[10px] font-black text-rose-300 uppercase tracking-widest">Question</span>
                  <p className="text-2xl font-bold text-gray-800">{cards[currentIndex].front}</p>
                  <div className="mt-8 flex items-center gap-2 text-gray-400 text-xs font-bold">
                    <Eye className="w-4 h-4" />
                    Click to flip
                  </div>
                </div>

                {/* Back */}
                <div className="absolute inset-0 backface-hidden bg-rose-600 border-2 border-rose-500 rounded-3xl flex flex-col items-center justify-center p-8 text-center shadow-xl rotate-y-180">
                  <span className="absolute top-4 left-4 text-[10px] font-black text-rose-200 uppercase tracking-widest">Answer</span>
                  <p className="text-2xl font-bold text-white">{cards[currentIndex].back}</p>
                  <div className="mt-8 flex items-center gap-2 text-rose-200 text-xs font-bold">
                    <Eye className="w-4 h-4" />
                    Click to flip back
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="flex items-center justify-center gap-4">
              <button
                disabled={currentIndex === 0}
                onClick={() => { setCurrentIndex(currentIndex - 1); setIsFlipped(false); }}
                className="p-4 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-all disabled:opacity-30"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                disabled={currentIndex === cards.length - 1}
                onClick={() => { setCurrentIndex(currentIndex + 1); setIsFlipped(false); }}
                className="p-4 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-all disabled:opacity-30"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Front Side (Question)</label>
                  <textarea
                    placeholder="e.g. What is the capital of France?"
                    value={front}
                    onChange={(e) => setFront(e.target.value)}
                    className="w-full h-24 px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-rose-500 outline-none resize-none text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Back Side (Answer)</label>
                  <textarea
                    placeholder="e.g. Paris"
                    value={back}
                    onChange={(e) => setBack(e.target.value)}
                    className="w-full h-24 px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-rose-500 outline-none resize-none text-sm"
                  />
                </div>
              </div>
              <button
                onClick={addCard}
                className="w-full py-4 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Card
              </button>
            </div>

            <div className="space-y-4">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Your Cards ({cards.length})</h2>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                <AnimatePresence mode="popLayout">
                  {cards.length === 0 ? (
                    <div className="py-12 text-center text-gray-300 border-2 border-dashed border-gray-100 rounded-2xl">
                      <p className="text-sm">No cards yet. Add your first one!</p>
                    </div>
                  ) : (
                    cards.map((card) => (
                      <motion.div
                        key={card.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between group"
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="text-sm font-bold text-gray-800 truncate">{card.front}</p>
                          <p className="text-xs text-gray-500 truncate">{card.back}</p>
                        </div>
                        <button 
                          onClick={() => removeCard(card.id)}
                          className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}
      </div>

      <ToolAdWrapper position="tool_bottom" />
    </div>
  );
}
