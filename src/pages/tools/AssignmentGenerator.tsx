import React, { useState } from 'react';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { BookOpen, Sparkles, Loader2, Copy, Trash2, Download, FileText, List, Layout } from 'lucide-react';
import { db } from '../../firebase';
import { UserProfile, AppSettings } from '../../types';
import ToolAdWrapper from '../../components/ToolAdWrapper';
import { motion } from 'motion/react';
import { GoogleGenAI } from '@google/genai';

export default function AssignmentGenerator({ profile }: { profile: UserProfile | null, settings: AppSettings | null }) {
  const [topic, setTopic] = useState('');
  const [subject, setSubject] = useState('');
  const [wordCount, setWordCount] = useState('500');
  const [academicLevel, setAcademicLevel] = useState('High School');
  const [assignment, setAssignment] = useState('');
  const [loading, setLoading] = useState(false);

  const generateAssignment = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic for the assignment");
      return;
    }

    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const prompt = `As an expert academic writer, generate a complete, high-quality assignment on the following topic.
      
      Topic: ${topic}
      Subject: ${subject || 'General'}
      Academic Level: ${academicLevel}
      Target Word Count: ${wordCount} words
      
      The assignment should include:
      1. A professional Title
      2. Introduction (background and thesis)
      3. Main Body Paragraphs (with clear headings and subheadings)
      4. Conclusion (summary of main points)
      5. References/Bibliography (in APA style)
      
      Format the output clearly with headings and bullet points where appropriate. Ensure the content is original, academic, and informative.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      
      setAssignment(response.text || "No assignment generated.");

      // Update usage count (skip for admins)
      if (profile && profile.role !== 'admin') {
        await updateDoc(doc(db, 'users', profile.uid), {
          usageCount: increment(1),
          lastUsedAt: new Date().toISOString()
        });
      }
      toast.success("Assignment generated successfully!");
    } catch (error) {
      console.error("Assignment generation error:", error);
      toast.error("Failed to generate assignment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(assignment);
    toast.success("Copied to clipboard!");
  };

  const downloadAsTxt = () => {
    const element = document.createElement("a");
    const file = new Blob([assignment], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${topic.replace(/\s+/g, '_')}_Assignment.txt`;
    document.body.appendChild(element);
    element.click();
    toast.success("Downloading assignment...");
  };

  return (
    <div className="flex flex-col items-center space-y-8 max-w-6xl mx-auto w-full px-4">
      <ToolAdWrapper position="tool_top" />
      
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Input Panel */}
        <div className="lg:col-span-5 bg-white rounded-3xl shadow-sm border border-gray-100 p-8 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
              <BookOpen className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Assignment Generator</h1>
              <p className="text-gray-500 text-sm font-medium">Create high-quality academic assignments instantly.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">Assignment Topic</label>
              <input
                type="text"
                placeholder="e.g., The Impact of AI on Modern Education"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Subject</label>
                <input
                  type="text"
                  placeholder="e.g., Science, History"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Academic Level</label>
                <select
                  value={academicLevel}
                  onChange={(e) => setAcademicLevel(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition-all"
                >
                  <option>Middle School</option>
                  <option>High School</option>
                  <option>Undergraduate</option>
                  <option>Graduate</option>
                  <option>PhD</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">Target Word Count: <span className="text-indigo-600">{wordCount}</span></label>
              <input
                type="range"
                min="200"
                max="2000"
                step="100"
                value={wordCount}
                onChange={(e) => setWordCount(e.target.value)}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                <span>200 words</span>
                <span>2000 words</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => {
                setTopic('');
                setSubject('');
                setAssignment('');
              }}
              className="px-6 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all flex items-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={generateAssignment}
              disabled={loading}
              className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-6 h-6" />
                  Generate Assignment
                </>
              )}
            </button>
          </div>
          
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
            <p className="text-xs text-amber-800 font-medium leading-relaxed">
              <strong>Tip:</strong> Be specific with your topic for better results. You can edit the generated text directly in the preview panel.
            </p>
          </div>
        </div>

        {/* Output Panel */}
        <div className="lg:col-span-7 bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col min-h-[600px]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Layout className="w-5 h-5 text-gray-400" />
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Assignment Preview</h2>
            </div>
            {assignment && (
              <div className="flex gap-2">
                <button 
                  onClick={copyToClipboard}
                  className="p-3 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-gray-100"
                  title="Copy to clipboard"
                >
                  <Copy className="w-5 h-5" />
                </button>
                <button 
                  onClick={downloadAsTxt}
                  className="p-3 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all border border-gray-100"
                  title="Download as TXT"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 bg-gray-50 rounded-2xl border border-gray-100 p-8 overflow-hidden flex flex-col">
            {assignment ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="h-full flex flex-col"
              >
                <textarea
                  value={assignment}
                  onChange={(e) => setAssignment(e.target.value)}
                  className="flex-1 w-full bg-transparent border-none outline-none resize-none text-gray-800 text-base leading-relaxed font-medium"
                  placeholder="Edit your assignment here..."
                />
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-sm">
                  <FileText className="w-10 h-10 opacity-10" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900">Ready to Generate</p>
                  <p className="text-sm max-w-[250px] mx-auto">Fill in the details on the left and click generate to see your assignment here.</p>
                </div>
              </div>
            )}
          </div>
          
          {assignment && (
            <div className="mt-6 flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-widest">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {assignment.split(/\s+/).length} Words</span>
                <span className="flex items-center gap-1"><List className="w-3 h-3" /> {assignment.split('\n').filter(l => l.trim()).length} Paragraphs</span>
              </div>
              <span>AI Generated Content</span>
            </div>
          )}
        </div>
      </div>

      <ToolAdWrapper position="tool_bottom" />
    </div>
  );
}
