import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Upload, Download, Trash2, Loader2, Image as ImageIcon, Wand2, ShieldCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { removeBackground } from '@imgly/background-removal';
import { UserProfile, AppSettings } from '../../types';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../firebase';
import { getDailyLimit } from '../../lib/utils';

export default function ImageBackgroundRemover({ profile, settings }: { profile: UserProfile | null, settings: AppSettings | null }) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size too large (max 5MB)");
        return;
      }
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResultUrl(null);
    }
  };

  const handleRemoveBackground = async () => {
    if (!selectedImage) return;

    // Check usage limit for free users
    if (!profile?.premiumStatus) {
      const limit = getDailyLimit(profile, settings);
      if ((profile?.usageCount || 0) >= limit) {
        toast.error("Daily free limit reached. Please upgrade to premium!");
        return;
      }
    }

    setProcessing(true);
    try {
      const blob = await removeBackground(selectedImage, {
        progress: (step, progress) => {
          console.log(`Processing: ${step} - ${Math.round(progress * 100)}%`);
        }
      });
      
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      toast.success("Background removed successfully!");

      // Update usage count
      if (profile) {
        await updateDoc(doc(db, 'users', profile.uid), {
          usageCount: increment(1),
          lastUsedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error("Error removing background:", error);
      toast.error("Failed to remove background. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const link = document.createElement('a');
    link.href = resultUrl;
    link.download = `bg-removed-${selectedImage?.name || 'image'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reset = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    setResultUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-8 px-4">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary text-sm font-bold rounded-full border border-primary/20">
          <Wand2 className="w-4 h-4" />
          AI POWERED
        </div>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">
          Background <span className="text-primary">Remover</span>
        </h1>
        <p className="text-gray-600 max-w-xl mx-auto">
          Remove backgrounds from your images instantly using AI. High quality, fast, and completely automatic.
        </p>
      </div>

      <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden">
        {!selectedImage ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="p-20 flex flex-col items-center justify-center border-4 border-dashed border-gray-100 m-4 rounded-[1.5rem] hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer group"
          >
            <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
              <Upload className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Upload an image</h3>
            <p className="text-gray-500 mt-2">Drag and drop or click to browse</p>
            <p className="text-xs text-gray-400 mt-4">Supports PNG, JPG, WEBP (Max 5MB)</p>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              className="hidden"
            />
          </div>
        ) : (
          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Original Image</p>
                <div className="relative aspect-square bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
                  {previewUrl && (
                    <img src={previewUrl} alt="Original" className="w-full h-full object-contain" />
                  )}
                </div>
              </div>
              <div className="space-y-4">
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Result</p>
                <div className="relative aspect-square bg-gray-50 bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')] rounded-2xl overflow-hidden border border-gray-100 flex items-center justify-center">
                  {processing ? (
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="w-12 h-12 text-primary animate-spin" />
                      <p className="text-sm font-bold text-gray-600">Removing background...</p>
                    </div>
                  ) : resultUrl ? (
                    <img src={resultUrl} alt="Result" className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-center space-y-2 opacity-30">
                      <ImageIcon className="w-12 h-12 mx-auto" />
                      <p className="text-sm font-bold">Ready to process</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-4 border-t border-gray-50">
              <button 
                onClick={reset}
                disabled={processing}
                className="px-8 py-4 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Trash2 className="w-5 h-5" />
                Clear
              </button>
              
              {!resultUrl ? (
                <button 
                  onClick={handleRemoveBackground}
                  disabled={processing}
                  className="px-12 py-4 bg-primary text-white rounded-2xl font-black hover:bg-secondary transition-all shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50"
                >
                  {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                  Remove Background
                </button>
              ) : (
                <button 
                  onClick={handleDownload}
                  className="px-12 py-4 bg-green-600 text-white rounded-2xl font-black hover:bg-green-700 transition-all shadow-lg shadow-green-200 flex items-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Download PNG
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {!profile?.premiumStatus && (
        <div className="bg-primary rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Unlock Unlimited Access</h3>
              <p className="text-white/80">Upgrade to premium for unlimited background removals and high-res downloads.</p>
            </div>
          </div>
          <button className="px-8 py-4 bg-white text-primary rounded-2xl font-black hover:bg-white/90 transition-all shadow-xl whitespace-nowrap">
            Upgrade Now
          </button>
        </div>
      )}
    </div>
  );
}
