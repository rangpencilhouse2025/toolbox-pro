import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Upload, Download, Trash2, Loader2, Image as ImageIcon, Pencil, ShieldCheck, Sliders, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { UserProfile, AppSettings } from '../../types';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../firebase';
import { getDailyLimit } from '../../lib/utils';

export default function PencilOutlineGenerator({ profile, settings }: { profile: UserProfile | null, settings: AppSettings | null }) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [intensity, setIntensity] = useState(50);
  const [blur, setBlur] = useState(10);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size too large (max 10MB)");
        return;
      }
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResultUrl(null);
    }
  };

  const applyPencilEffect = async () => {
    if (!selectedImage || !previewUrl) return;

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
      const img = new Image();
      img.src = previewUrl;
      await new Promise((resolve) => (img.onload = resolve));

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;

      // 1. Draw original grayscale
      ctx.drawImage(img, 0, 0);
      let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = avg;
        data[i + 1] = avg;
        data[i + 2] = avg;
      }
      ctx.putImageData(imageData, 0, 0);

      // 2. Create Inverted & Blurred version in a temporary canvas
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      tempCtx.drawImage(canvas, 0, 0);
      let tempImageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      let tempData = tempImageData.data;

      for (let i = 0; i < tempData.length; i += 4) {
        tempData[i] = 255 - tempData[i];
        tempData[i + 1] = 255 - tempData[i + 1];
        tempData[i + 2] = 255 - tempData[i + 2];
      }
      tempCtx.putImageData(tempImageData, 0, 0);

      // Apply blur using CSS filter for performance/simplicity
      ctx.save();
      ctx.filter = `blur(${blur}px)`;
      ctx.drawImage(tempCanvas, 0, 0);
      ctx.restore();

      // 3. Color Dodge Blend
      const blurredData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      // Re-get grayscale data
      tempCtx.drawImage(img, 0, 0);
      const grayData = tempCtx.getImageData(0, 0, canvas.width, canvas.height).data;
      for (let i = 0; i < grayData.length; i += 4) {
        const g = (grayData[i] + grayData[i+1] + grayData[i+2]) / 3;
        grayData[i] = g;
        grayData[i+1] = g;
        grayData[i+2] = g;
      }

      const finalImageData = ctx.createImageData(canvas.width, canvas.height);
      const finalData = finalImageData.data;

      for (let i = 0; i < finalData.length; i += 4) {
        const a = grayData[i];
        const b = blurredData[i];
        
        // Color Dodge formula: result = base / (1 - blend)
        let res = b === 255 ? 255 : Math.min(255, (a * 255) / (255 - b));
        
        // Apply intensity/contrast adjustment
        const factor = (intensity / 50);
        res = 255 - ((255 - res) * factor);
        res = Math.max(0, Math.min(255, res));

        finalData[i] = res;
        finalData[i + 1] = res;
        finalData[i + 2] = res;
        finalData[i + 3] = 255;
      }

      ctx.putImageData(finalImageData, 0, 0);
      
      const url = canvas.toDataURL('image/png');
      setResultUrl(url);
      toast.success("Outline generated!");

      // Update usage count (skip for admins to save writes)
      if (profile && profile.role !== 'admin') {
        await updateDoc(doc(db, 'users', profile.uid), {
          usageCount: increment(1),
          lastUsedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error("Error generating outline:", error);
      toast.error("Failed to generate outline.");
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const link = document.createElement('a');
    link.href = resultUrl;
    link.download = `pencil-outline-${selectedImage?.name || 'image'}.png`;
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
    <div className="max-w-5xl mx-auto space-y-8 py-8 px-4">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary text-sm font-bold rounded-full border border-primary/20">
          <Pencil className="w-4 h-4" />
          ARTISTIC TOOL
        </div>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">
          Pencil <span className="text-primary">Outline</span> Generator
        </h1>
        <p className="text-gray-600 max-w-xl mx-auto">
          Transform any photo into a beautiful pencil sketch or outline instantly. Perfect for coloring pages, art references, or unique profile pictures.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Controls Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100 space-y-6">
            <div className="flex items-center gap-2 font-bold text-gray-900">
              <Sliders className="w-5 h-5 text-primary" />
              Adjustments
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-bold text-gray-600">
                  <label>Intensity</label>
                  <span>{intensity}%</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="100" 
                  value={intensity}
                  onChange={(e) => setIntensity(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm font-bold text-gray-600">
                  <label>Detail (Blur)</label>
                  <span>{blur}px</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="50" 
                  value={blur}
                  onChange={(e) => setBlur(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <p className="text-[10px] text-gray-400 italic">Lower blur = finer lines, Higher blur = more shading</p>
              </div>
            </div>

            <button 
              onClick={applyPencilEffect}
              disabled={!selectedImage || processing}
              className="w-full py-4 bg-primary text-white rounded-2xl font-black hover:bg-secondary transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
              Apply Effect
            </button>
          </div>

          {!profile?.premiumStatus && (
            <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 space-y-3">
              <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
                <ShieldCheck className="w-4 h-4" />
                Free Plan
              </div>
              <p className="text-xs text-amber-600">
                You have <strong>{Math.max(0, (settings?.dailyLimit || 5) - (profile?.usageCount || 0))}</strong> free uses left today.
              </p>
            </div>
          )}
        </div>

        {/* Main Canvas Area */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden min-h-[500px] flex flex-col">
            {!selectedImage ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex flex-col items-center justify-center border-4 border-dashed border-gray-100 m-6 rounded-[1.5rem] hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer group"
              >
                <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                  <Upload className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Upload an image</h3>
                <p className="text-gray-500 mt-2">Drag and drop or click to browse</p>
                <p className="text-xs text-gray-400 mt-4">Supports PNG, JPG, WEBP (Max 10MB)</p>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            ) : (
              <div className="p-8 space-y-8 flex-1 flex flex-col">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
                  <div className="space-y-4 flex flex-col">
                    <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Original</p>
                    <div className="flex-1 relative bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 min-h-[300px]">
                      {previewUrl && (
                        <img src={previewUrl} alt="Original" className="absolute inset-0 w-full h-full object-contain" />
                      )}
                    </div>
                  </div>
                  <div className="space-y-4 flex flex-col">
                    <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Pencil Outline</p>
                    <div className="flex-1 relative bg-white rounded-2xl overflow-hidden border border-gray-100 flex items-center justify-center min-h-[300px]">
                      {processing ? (
                        <div className="flex flex-col items-center gap-4">
                          <Loader2 className="w-12 h-12 text-primary animate-spin" />
                          <p className="text-sm font-bold text-gray-600">Sketching...</p>
                        </div>
                      ) : resultUrl ? (
                        <img src={resultUrl} alt="Result" className="absolute inset-0 w-full h-full object-contain" />
                      ) : (
                        <div className="text-center space-y-2 opacity-30">
                          <ImageIcon className="w-12 h-12 mx-auto" />
                          <p className="text-sm font-bold">Click "Apply Effect" to start</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-4 pt-6 border-t border-gray-50">
                  <button 
                    onClick={reset}
                    disabled={processing}
                    className="px-8 py-4 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <Trash2 className="w-5 h-5" />
                    Clear
                  </button>
                  
                  {resultUrl && (
                    <button 
                      onClick={handleDownload}
                      className="px-12 py-4 bg-green-600 text-white rounded-2xl font-black hover:bg-green-700 transition-all shadow-lg shadow-green-200 flex items-center gap-2"
                    >
                      <Download className="w-5 h-5" />
                      Download Sketch
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden Canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
