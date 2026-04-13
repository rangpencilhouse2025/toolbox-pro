import React, { useState } from 'react';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { ListChecks, Sparkles, Loader2, Copy, Trash2, CheckCircle2 } from 'lucide-react';
import { db } from '../../firebase';
import { UserProfile, AppSettings } from '../../types';
import ToolAdWrapper from '../../components/ToolAdWrapper';
import { motion } from 'motion/react';
import { GoogleGenAI } from '@google/genai';

export default function MCQGenerator({ profile }: { profile: UserProfile | null, settings: AppSettings | null }) {
  const [text, setText] = useState('');
  const [mcqs, setMcqs] = useState('');
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(5);

  const generateMCQs = async () => {
    if (!text.trim()) {
      toast.error("Please enter some text to generate MCQs");
      return;
    }

    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const prompt = `Generate ${count} multiple-choice questions (MCQs) based on the following text. For each question, provide 4 options (A, B, C, D) and indicate the correct answer at the end of each question. Format it clearly.\n\nText:\n${text}`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      
      setMcqs(response.text || "No MCQs generated.");

      // Update usage count (skip for admins)
      if (profile && profile.role !== 'admin') {
        await updateDoc(doc(db, 'users', profile.uid), {
          usageCount: increment(1),
          lastUsedAt: new Date().toISOString()
        });
      }
      toast.success("MCQs generated!");
    } catch (error) {
      console.error("MCQ generation error:", error);
      toast.error("Failed to generate MCQs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-8 max-w-5xl mx-auto w-full px-4">
      <ToolAdWrapper position="tool_top" />
      
      <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-cyan-50 rounded-xl flex items-center justify-center text-cyan-600">
              <ListChecks className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">MCQ Generator</h1>
              <p className="text-gray-500 text-sm">Create practice questions from any text or notes.</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Source Text</label>
            <textarea
              placeholder="Paste the text you want to generate questions from..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full h-[300px] px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-cyan-500 outline-none resize-none text-sm leading-relaxed"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-semibold text-gray-700">Number of Questions</label>
              <select 
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value))}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none"
              >
                {[3, 5, 10, 15, 20].map(n => (
                  <option key={n} value={n}>{n} Questions</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setText('')}
              className="mt-7 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={generateMCQs}
            disabled={loading}
            className="w-full py-4 bg-cyan-600 text-white rounded-xl font-bold hover:bg-cyan-700 transition-all shadow-lg shadow-cyan-100 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate MCQs
              </>
            )}
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Questions</h2>
            {mcqs && (
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(mcqs);
                  toast.success("Copied!");
                }}
                className="p-2 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-all"
              >
                <Copy className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="flex-1 bg-gray-50 rounded-2xl border border-gray-100 p-6 overflow-hidden flex flex-col">
            {mcqs ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col"
              >
                <textarea
                  value={mcqs}
                  onChange={(e) => setMcqs(e.target.value)}
                  className="flex-1 w-full bg-transparent border-none outline-none resize-none text-gray-700 text-sm leading-relaxed"
                  placeholder="Edit your MCQs here..."
                />
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3 text-center">
                <CheckCircle2 className="w-12 h-12 opacity-10" />
                <p className="text-sm">Your practice questions will appear here...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ToolAdWrapper position="tool_bottom" />
    </div>
  );
}
