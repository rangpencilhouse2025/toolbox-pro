import { useState } from 'react';
import QRCode from 'qrcode';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { QrCode, Download, Loader2, Zap, Link as LinkIcon } from 'lucide-react';
import { auth, db } from '../../firebase';
import { UserProfile, AppSettings } from '../../types';
import { downloadFile, handleFirestoreError, OperationType, getDailyLimit } from '../../lib/utils';
import ToolAdWrapper from '../../components/ToolAdWrapper';

export default function QRCodeGenerator({ profile, settings }: { profile: UserProfile | null, settings: AppSettings | null }) {
  const [text, setText] = useState('');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateQR = async () => {
    if (!text) return;
    
    const dailyLimit = getDailyLimit(profile, settings);
    
    // Check usage limit
    if (profile && !profile.premiumStatus && profile.usageCount >= dailyLimit) {
      toast.error("Daily limit reached. Upgrade to Premium for unlimited access!");
      return;
    }

    setLoading(true);
    try {
      const url = await QRCode.toDataURL(text, {
        width: 1000,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      setQrCode(url);

      // Increment usage count (skip for admins to save writes)
      if (profile && profile.role !== 'admin') {
        await updateDoc(doc(db, 'users', profile.uid), {
          usageCount: increment(1),
          lastUsedAt: new Date().toISOString()
        });
      }
      toast.success("QR Code generated!");
    } catch (error) {
      if (profile) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`, auth);
      } else {
        toast.error("Generation failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (qrCode) {
      fetch(qrCode)
        .then(res => res.blob())
        .then(blob => downloadFile(blob, 'qrcode.png'));
    }
  };

  return (
    <div className="flex flex-col items-center space-y-8">
      <ToolAdWrapper position="tool_top" />
      
      <div className="w-[400px] max-w-[90vw] bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
            <QrCode className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">QR Code Generator</h1>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1">URL or Text</label>
            <div className="relative">
              <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="text" 
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="https://example.com"
              />
            </div>
          </div>

          <button 
            onClick={generateQR}
            disabled={!text || loading}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
            Generate QR Code
          </button>
        </div>
      </div>

      {qrCode && (
        <div className="w-[400px] max-w-[90vw] bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <h2 className="text-lg font-bold text-gray-900">Output Preview</h2>
          <div className="w-full aspect-square bg-white rounded-2xl overflow-hidden border border-gray-100 p-4">
            <img src={qrCode} alt="QR Code" className="w-full h-full object-contain" />
          </div>
          <button 
            onClick={handleDownload}
            className="w-full py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Download QR Code
          </button>
        </div>
      )}

      <ToolAdWrapper position="tool_bottom" />
    </div>
  );
}
