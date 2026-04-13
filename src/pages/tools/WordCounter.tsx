import React, { useState } from 'react';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { Type, Trash2, Copy, Clock, Hash, AlignLeft, FileText } from 'lucide-react';
import { db } from '../../firebase';
import { UserProfile, AppSettings } from '../../types';
import ToolAdWrapper from '../../components/ToolAdWrapper';
import { motion } from 'motion/react';

export default function WordCounter({ profile }: { profile: UserProfile | null, settings: AppSettings | null }) {
  const [text, setText] = useState('');

  const stats = {
    words: text.trim() ? text.trim().split(/\s+/).length : 0,
    chars: text.length,
    charsNoSpaces: text.replace(/\s/g, '').length,
    sentences: text.split(/[.!?]+/).filter(Boolean).length,
    paragraphs: text.split(/\n+/).filter(Boolean).length,
    readingTime: Math.ceil((text.trim() ? text.trim().split(/\s+/).length : 0) / 200)
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(text);
    toast.success("Text copied!");
  };

  const handleUsage = async () => {
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

  return (
    <div className="flex flex-col items-center space-y-8 max-w-5xl mx-auto w-full px-4">
      <ToolAdWrapper position="tool_top" />
      
      <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
              <Type className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Word Counter</h1>
              <p className="text-gray-500 text-sm">Analyze your text with real-time word and character counts.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setText('')}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              title="Clear text"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={copyToClipboard}
              className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
              title="Copy text"
            >
              <Copy className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Words', value: stats.words, icon: Hash, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Characters', value: stats.chars, icon: Type, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Sentences', value: stats.sentences, icon: AlignLeft, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Paragraphs', value: stats.paragraphs, icon: FileText, color: 'text-orange-600', bg: 'bg-orange-50' },
            { label: 'Reading Time', value: `${stats.readingTime} min`, icon: Clock, color: 'text-rose-600', bg: 'bg-rose-50' },
            { label: 'No Spaces', value: stats.charsNoSpaces, icon: Type, color: 'text-gray-600', bg: 'bg-gray-50' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`${stat.bg} p-4 rounded-2xl border border-transparent hover:border-gray-200 transition-all text-center`}
            >
              <stat.icon className={`w-5 h-5 mx-auto mb-2 ${stat.color}`} />
              <div className="text-xl font-black text-gray-900">{stat.value}</div>
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        <div className="relative">
          <textarea
            placeholder="Start typing or paste your text here..."
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (text.length === 0) handleUsage();
            }}
            className="w-full h-[400px] px-6 py-6 bg-gray-50 border border-gray-200 rounded-3xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none text-lg leading-relaxed shadow-inner"
          />
          <div className="absolute bottom-6 right-6 flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-white/80 backdrop-blur px-3 py-1 rounded-full border border-gray-100">
            Real-time Analysis
          </div>
        </div>
      </div>

      <ToolAdWrapper position="tool_bottom" />
    </div>
  );
}
