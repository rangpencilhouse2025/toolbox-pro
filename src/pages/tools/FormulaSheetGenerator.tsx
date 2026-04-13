import React, { useState } from 'react';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { BookOpen, Sparkles, Loader2, Copy, Download } from 'lucide-react';
import { db } from '../../firebase';
import { UserProfile, AppSettings } from '../../types';
import ToolAdWrapper from '../../components/ToolAdWrapper';
import { motion } from 'motion/react';
import { GoogleGenAI } from '@google/genai';
import { jsPDF } from 'jspdf';

export default function FormulaSheetGenerator({ profile }: { profile: UserProfile | null, settings: AppSettings | null }) {
  const [topic, setTopic] = useState('');
  const [formulaSheet, setFormulaSheet] = useState('');
  const [loading, setLoading] = useState(false);

  const generateSheet = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a subject or topic");
      return;
    }

    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const prompt = `Generate a comprehensive formula sheet for the topic: "${topic}". Include all important formulas, constants, and brief definitions. Organize it logically with headings. Use clear text formatting.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      
      setFormulaSheet(response.text || "No formula sheet generated.");

      // Update usage count (skip for admins)
      if (profile && profile.role !== 'admin') {
        await updateDoc(doc(db, 'users', profile.uid), {
          usageCount: increment(1),
          lastUsedAt: new Date().toISOString()
        });
      }
      toast.success("Formula sheet generated!");
    } catch (error) {
      console.error("Generation error:", error);
      toast.error("Failed to generate formula sheet.");
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    const splitText = doc.splitTextToSize(formulaSheet, 180);
    doc.setFontSize(16);
    doc.text(`Formula Sheet: ${topic}`, 15, 20);
    doc.setFontSize(10);
    doc.text(splitText, 15, 30);
    doc.save(`${topic.replace(/\s+/g, '-').toLowerCase()}-formulas.pdf`);
    toast.success("PDF Downloaded!");
  };

  return (
    <div className="flex flex-col items-center space-y-8 max-w-5xl mx-auto w-full px-4">
      <ToolAdWrapper position="tool_top" />
      
      <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Formula Sheet Generator</h1>
              <p className="text-gray-500 text-sm">Instantly create a cheat sheet for any subject.</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Subject or Topic</label>
            <input
              type="text"
              placeholder="e.g. Quantum Physics, Calculus II, Organic Chemistry"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>

          <button
            onClick={generateSheet}
            disabled={loading}
            className="w-full py-4 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-100 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Formula Sheet
              </>
            )}
          </button>

          <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
            <p className="text-xs text-purple-700 leading-relaxed">
              <strong>Tip:</strong> Be specific! Instead of just "Math", try "Integrals and Derivatives" for better results.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Preview</h2>
            {formulaSheet && (
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(formulaSheet);
                    toast.success("Copied!");
                  }}
                  className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                  title="Copy text"
                >
                  <Copy className="w-5 h-5" />
                </button>
                <button 
                  onClick={downloadPDF}
                  className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                  title="Download PDF"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 bg-gray-50 rounded-2xl border border-gray-100 p-6 overflow-hidden flex flex-col">
            {formulaSheet ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col"
              >
                <textarea
                  value={formulaSheet}
                  onChange={(e) => setFormulaSheet(e.target.value)}
                  className="flex-1 w-full bg-transparent border-none outline-none resize-none text-gray-700 text-sm leading-relaxed"
                  placeholder="Edit your formula sheet here..."
                />
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3">
                <BookOpen className="w-12 h-12 opacity-10" />
                <p className="text-sm">Your formula sheet will appear here...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ToolAdWrapper position="tool_bottom" />
    </div>
  );
}
