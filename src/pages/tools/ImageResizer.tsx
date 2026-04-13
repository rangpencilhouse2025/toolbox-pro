import React, { useState, useRef } from 'react';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { Maximize, Download, Upload, Loader2, Zap } from 'lucide-react';
import { auth, db } from '../../firebase';
import { UserProfile, AppSettings } from '../../types';
import { downloadFile, handleFirestoreError, OperationType, getDailyLimit } from '../../lib/utils';
import ToolAdWrapper from '../../components/ToolAdWrapper';

export default function ImageResizer({ profile, settings }: { profile: UserProfile | null, settings: AppSettings | null }) {
  const [image, setImage] = useState<string | null>(null);
  const [resizedImage, setResizedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const [aspectRatio, setAspectRatio] = useState(true);
  const [originalAspectRatio, setOriginalAspectRatio] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          setImage(img.src);
          setWidth(img.width);
          setHeight(img.height);
          setOriginalAspectRatio(img.width / img.height);
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleWidthChange = (val: number) => {
    setWidth(val);
    if (aspectRatio) {
      setHeight(Math.round(val / originalAspectRatio));
    }
  };

  const handleHeightChange = (val: number) => {
    setHeight(val);
    if (aspectRatio) {
      setWidth(Math.round(val * originalAspectRatio));
    }
  };

  const resizeImage = async () => {
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
      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);

      const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setResizedImage(resizedDataUrl);

      // Increment usage count (skip for admins to save writes)
      if (profile && profile.role !== 'admin') {
        await updateDoc(doc(db, 'users', profile.uid), {
          usageCount: increment(1),
          lastUsedAt: new Date().toISOString()
        });
      }
      toast.success("Image resized successfully!");
    } catch (error) {
      if (profile) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`, auth);
      } else {
        toast.error("Resizing failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (resizedImage) {
      fetch(resizedImage)
        .then(res => res.blob())
        .then(blob => downloadFile(blob, 'resized-image.jpg'));
    }
  };

  return (
    <div className="flex flex-col items-center space-y-8">
      <ToolAdWrapper position="tool_top" />
      
      <div className="w-[400px] max-w-[90vw] bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
            <Maximize className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Image Resizer</h1>
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">Width (px)</label>
              <input 
                type="number" 
                value={width}
                onChange={(e) => handleWidthChange(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">Height (px)</label>
              <input 
                type="number" 
                value={height}
                onChange={(e) => handleHeightChange(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 ml-1">
            <input 
              type="checkbox" 
              id="aspectRatio"
              checked={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="aspectRatio" className="text-sm font-medium text-gray-600">Maintain Aspect Ratio</label>
          </div>

          <button 
            onClick={resizeImage}
            disabled={!image || loading}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
            Resize Image
          </button>
        </div>
      </div>

      {resizedImage && (
        <div className="w-[400px] max-w-[90vw] bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <h2 className="text-lg font-bold text-gray-900">Output Preview</h2>
          <div className="w-full aspect-video bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
            <img src={resizedImage} alt="Resized" className="w-full h-full object-contain" />
          </div>
          <button 
            onClick={handleDownload}
            className="w-full py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Download Resized
          </button>
        </div>
      )}

      <ToolAdWrapper position="tool_bottom" />
    </div>
  );
}
