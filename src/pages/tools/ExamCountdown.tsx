import React, { useState, useEffect } from 'react';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { Timer, Plus, Trash2, Calendar } from 'lucide-react';
import { db } from '../../firebase';
import { UserProfile, AppSettings } from '../../types';
import ToolAdWrapper from '../../components/ToolAdWrapper';
import { motion, AnimatePresence } from 'motion/react';

interface Exam {
  id: string;
  subject: string;
  date: string;
}

export default function ExamCountdown({ profile }: { profile: UserProfile | null, settings: AppSettings | null }) {
  const [exams, setExams] = useState<Exam[]>(() => {
    const saved = localStorage.getItem('exam_countdown_list');
    return saved ? JSON.parse(saved) : [];
  });
  const [newSubject, setNewSubject] = useState('');
  const [newDate, setNewDate] = useState('');

  useEffect(() => {
    localStorage.setItem('exam_countdown_list', JSON.stringify(exams));
  }, [exams]);

  const addExam = async () => {
    if (!newSubject || !newDate) {
      toast.error("Please fill in both fields");
      return;
    }

    const examDate = new Date(newDate);
    if (examDate < new Date()) {
      toast.error("Date must be in the future");
      return;
    }

    setExams([...exams, { id: Math.random().toString(36).substr(2, 9), subject: newSubject, date: newDate }]);
    setNewSubject('');
    setNewDate('');
    toast.success("Exam added!");

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

  const removeExam = (id: string) => {
    setExams(exams.filter(e => e.id !== id));
  };

  const getTimeRemaining = (targetDate: string) => {
    const total = Date.parse(targetDate) - Date.parse(new Date().toString());
    const seconds = Math.floor((total / 1000) % 60);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const days = Math.floor(total / (1000 * 60 * 60 * 24));

    return { total, days, hours, minutes, seconds };
  };

  return (
    <div className="flex flex-col items-center space-y-8 max-w-4xl mx-auto w-full px-4">
      <ToolAdWrapper position="tool_top" />
      
      <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
            <Timer className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Exam Countdown</h1>
            <p className="text-gray-500 text-sm">Track your upcoming exams and stay prepared.</p>
          </div>
        </div>

        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Subject</label>
            <input
              type="text"
              placeholder="e.g. Physics"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Exam Date</label>
            <input
              type="datetime-local"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>
          <button
            onClick={addExam}
            className="w-full py-2 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Exam
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence mode="popLayout">
            {exams.length === 0 ? (
              <div className="col-span-full py-12 text-center text-gray-400">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No exams added yet. Start by adding one above!</p>
              </div>
            ) : (
              exams.map((exam) => {
                const remaining = getTimeRemaining(exam.date);
                const isExpired = remaining.total <= 0;

                return (
                  <motion.div
                    key={exam.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={`p-6 rounded-2xl border ${isExpired ? 'bg-gray-50 border-gray-200' : 'bg-white border-orange-100 shadow-sm'} relative group`}
                  >
                    <button 
                      onClick={() => removeExam(exam.id)}
                      className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{exam.subject}</h3>
                        <p className="text-sm text-gray-500">
                          {new Date(exam.date).toLocaleDateString(undefined, { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>

                      {isExpired ? (
                        <div className="text-red-500 font-bold">Exam Started/Finished</div>
                      ) : (
                        <div className="grid grid-cols-4 gap-2">
                          <div className="text-center">
                            <div className="text-2xl font-black text-orange-600">{remaining.days}</div>
                            <div className="text-[10px] uppercase font-bold text-gray-400">Days</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-black text-orange-600">{remaining.hours}</div>
                            <div className="text-[10px] uppercase font-bold text-gray-400">Hrs</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-black text-orange-600">{remaining.minutes}</div>
                            <div className="text-[10px] uppercase font-bold text-gray-400">Min</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-black text-orange-600">{remaining.seconds}</div>
                            <div className="text-[10px] uppercase font-bold text-gray-400">Sec</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>

      <ToolAdWrapper position="tool_bottom" />
    </div>
  );
}
