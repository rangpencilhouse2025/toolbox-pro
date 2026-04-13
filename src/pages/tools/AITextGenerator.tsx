import { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { MessageSquare, Download, Loader2, Zap, Copy, ShieldAlert } from 'lucide-react';
import { auth, db } from '../../firebase';
import { UserProfile, AppSettings } from '../../types';
import { downloadFile, handleFirestoreError, OperationType } from '../../lib/utils';
import ToolAdWrapper from '../../components/ToolAdWrapper';

export default function AITextGenerator({ profile, settings }: { profile: UserProfile | null, settings: AppSettings | null }) {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateText = async () => {
    if (!prompt) return;
    
    if (!profile?.premiumStatus) {
      toast.error("This is a Premium tool. Please upgrade to access.");
      return;
    }

    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      
      const text = response.text || "No response generated.";
      setResult(text);

      // Increment usage count (skip for admins to save writes)
      if (profile && profile.role !== 'admin') {
        await updateDoc(doc(db, 'users', profile.uid), {
          usageCount: increment(1),
          lastUsedAt: new Date().toISOString()
        });
      }
      toast.success("Text generated!");
    } catch (error: any) {
      console.error("Gemini Error:", error);
      toast.error(error.message || "Failed to generate text. Please check your API key.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      toast.success("Copied to clipboard!");
    }
  };

  const handleDownload = () => {
    if (result) {
      const blob = new Blob([result], { type: 'text/plain' });
      downloadFile(blob, 'generated-text.txt');
    }
  };

  if (profile && !profile.premiumStatus) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6">
        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center text-amber-600">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Premium Tool</h1>
          <p className="text-gray-600 max-w-md">
            The AI Text Generator is exclusive to Premium members. 
            Upgrade your account to unlock this and other advanced features.
          </p>
        </div>
        <button className="px-8 py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-colors shadow-sm flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Upgrade to Premium
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-8">
      <ToolAdWrapper position="tool_top" />
      
      <div className="w-[400px] max-w-[90vw] bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
            <MessageSquare className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">AI Text Generator</h1>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1">What should I write?</label>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all min-h-[120px] resize-none"
              placeholder="e.g. Write a professional email to a client about a project delay..."
            />
          </div>

          <button 
            onClick={generateText}
            disabled={!prompt || loading}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
            Generate Text
          </button>
        </div>
      </div>

      {result && (
        <div className="w-[400px] max-w-[90vw] bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">AI Response</h2>
            <button 
              onClick={handleCopy}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
              title="Copy to clipboard"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <div className="w-full bg-gray-50 rounded-2xl p-6 border border-gray-100 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto">
            {result}
          </div>
          <button 
            onClick={handleDownload}
            className="w-full py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Download as .txt
          </button>
        </div>
      )}

      <ToolAdWrapper position="tool_bottom" />
    </div>
  );
}
