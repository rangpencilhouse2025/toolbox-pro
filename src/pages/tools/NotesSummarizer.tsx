import React, { useState } from 'react';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { FileText, Sparkles, Loader2, Copy, Trash2 } from 'lucide-react';
import { db } from '../../firebase';
import { UserProfile, AppSettings } from '../../types';
import ToolAdWrapper from '../../components/ToolAdWrapper';
import { motion } from 'motion/react';
import { GoogleGenAI } from '@google/genai';

export default function NotesSummarizer({ profile }: { profile: UserProfile | null, settings: AppSettings | null }) {
  const [text, setText] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);

  const summarize = async () => {
    if (!text.trim()) {
      toast.error("Please enter some notes to summarize");
      return;
    }

    if (text.length < 50) {
      toast.error("Text is too short to summarize effectively");
      return;
    }

    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const prompt = `Please summarize the following student notes into a concise, well-structured summary with key takeaways and bullet points. Keep it academic and clear.\n\nNotes:\n${text}`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      
      setSummary(response.text || "No summary generated.");

      // Update usage count (skip for admins)
      if (profile && profile.role !== 'admin') {
        await updateDoc(doc(db, 'users', profile.uid), {
          usageCount: increment(1),
          lastUsedAt: new Date().toISOString()
        });
      }
      toast.success("Summary generated!");
    } catch (error) {
      console.error("Summarization error:", error);
      toast.error("Failed to generate summary. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(summary);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="flex flex-col items-center space-y-8 max-w-5xl mx-auto w-full px-4">
      <ToolAdWrapper position="tool_top" />
      
      <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Notes Summarizer</h1>
              <p className="text-gray-500 text-sm">Paste your long notes and get a concise summary.</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-gray-700">Your Notes</label>
              <span className="text-xs text-gray-400">{text.length} characters</span>
            </div>
            <textarea
              placeholder="Paste your lecture notes, textbook chapters, or articles here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full h-[400px] px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm leading-relaxed"
            />
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setText('')}
              className="px-6 py-3 bg-gray-100 text-gray-600 rounded-xl font-semibold hover:bg-gray-200 transition-all flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
            <button
              onClick={summarize}
              disabled={loading}
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Summarize Notes
                </>
              )}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Summary</h2>
            {summary && (
              <button 
                onClick={copyToClipboard}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                title="Copy to clipboard"
              >
                <Copy className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="flex-1 bg-gray-50 rounded-2xl border border-gray-100 p-6 overflow-hidden flex flex-col">
            {summary ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col"
              >
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="flex-1 w-full bg-transparent border-none outline-none resize-none text-gray-700 text-sm leading-relaxed"
                  placeholder="Edit your summary here..."
                />
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3">
                <Sparkles className="w-12 h-12 opacity-10" />
                <p className="text-sm">Your summary will appear here...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ToolAdWrapper position="tool_bottom" />
    </div>
  );
}
