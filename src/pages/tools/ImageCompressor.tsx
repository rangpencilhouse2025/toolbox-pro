import React, { useState, useRef } from 'react';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { Image as ImageIcon, Download, Upload, Loader2, Zap } from 'lucide-react';
import { auth, db } from '../../firebase';
import { UserProfile, AppSettings } from '../../types';
import { downloadFile, handleFirestoreError, OperationType, getDailyLimit } from '../../lib/utils';
import ToolAdWrapper from '../../components/ToolAdWrapper';

export default function ImageCompressor({ profile, settings }: { profile: UserProfile | null, settings: AppSettings | null }) {
  const [image, setImage] = useState<string | null>(null);
  const [compressedImage, setCompressedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [quality, setQuality] = useState(0.7);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setImage(event.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const compressImage = async () => {
    if (!image) return;
    
    const dailyLimit = getDailyLimit(profile, settings);
    
    // Check usage limit
    if (profile && !profile.premiumStatus && profile.usageCount >= dailyLimit) {
      toast.error("Daily limit reached. Upgrade to Premium for unlimited access!");
      return;
    }

    setLoading(true);
    try {
      const img = new Image();
      img.src = image;
      await new Promise((resolve) => (img.onload = resolve));

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);

      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      setCompressedImage(compressedDataUrl);

      // Increment usage count (skip for admins to save writes)
      if (profile && profile.role !== 'admin') {
        await updateDoc(doc(db, 'users', profile.uid), {
          usageCount: increment(1),
          lastUsedAt: new Date().toISOString()
        });
      }
      toast.success("Image compressed successfully!");
    } catch (error) {
      if (profile) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`, auth);
      } else {
        toast.error("Compression failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (compressedImage) {
      fetch(compressedImage)
        .then(res => res.blob())
        .then(blob => downloadFile(blob, 'compressed-image.jpg'));
    }
  };

  return (
    <div className="flex flex-col items-center space-y-8">
      <ToolAdWrapper position="tool_top" />
      
      <div className="w-[400px] max-w-[90vw] bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
            <ImageIcon className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Image Compressor</h1>
        </div>

        <div 
          onClick={() => fileInputRef.current?.click()}
          className="w-full aspect-video bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors overflow-hidden"
        >
          {image ? (
            <img src={image} alt="Preview" className="w-full h-full object-contain" />
          ) : (
            <div className="text-center space-y-2">
              <Upload className="w-8 h-8 text-gray-400 mx-auto" />
              <p className="text-sm text-gray-500 font-medium">Click to upload image</p>
            </div>
          )}
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-bold text-gray-700">
              <label>Compression Quality</label>
              <span>{Math.round(quality * 100)}%</span>
            </div>
            <input 
              type="range" 
              min="0.1" 
              max="1" 
              step="0.1"
              value={quality}
              onChange={(e) => setQuality(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          <button 
            onClick={compressImage}
            disabled={!image || loading}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
            Compress Image
          </button>
        </div>
      </div>

      {compressedImage && (
        <div className="w-[400px] max-w-[90vw] bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <h2 className="text-lg font-bold text-gray-900">Output Preview</h2>
          <div className="w-full aspect-video bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
            <img src={compressedImage} alt="Compressed" className="w-full h-full object-contain" />
          </div>
          <button 
            onClick={handleDownload}
            className="w-full py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Download Compressed
          </button>
        </div>
      )}

      <ToolAdWrapper position="tool_bottom" />
    </div>
  );
}
