import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Upload, Download, Trash2, Loader2, Image as ImageIcon, 
  Maximize, ShieldCheck, Sliders, RefreshCw, Instagram, 
  Facebook, Twitter, Linkedin, Youtube, Share2, Crop, Palette
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { UserProfile, AppSettings } from '../../types';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../firebase';
import { getDailyLimit } from '../../lib/utils';

interface SocialPreset {
  id: string;
  name: string;
  platform: string;
  width: number;
  height: number;
  icon: any;
}

const SOCIAL_PRESETS: SocialPreset[] = [
  { id: 'ig-post', name: 'Instagram Post', platform: 'Instagram', width: 1080, height: 1080, icon: Instagram },
  { id: 'ig-story', name: 'Instagram Story', platform: 'Instagram', width: 1080, height: 1920, icon: Instagram },
  { id: 'fb-post', name: 'Facebook Post', platform: 'Facebook', width: 1200, height: 630, icon: Facebook },
  { id: 'fb-cover', name: 'Facebook Cover', platform: 'Facebook', width: 820, height: 312, icon: Facebook },
  { id: 'tw-post', name: 'Twitter Post', platform: 'Twitter', width: 1200, height: 675, icon: Twitter },
  { id: 'tw-header', name: 'Twitter Header', platform: 'Twitter', width: 1500, height: 500, icon: Twitter },
  { id: 'li-post', name: 'LinkedIn Post', platform: 'LinkedIn', width: 1200, height: 627, icon: Linkedin },
  { id: 'yt-thumb', name: 'YouTube Thumbnail', platform: 'YouTube', width: 1280, height: 720, icon: Youtube },
];

export default function SocialMediaResizer({ profile, settings }: { profile: UserProfile | null, settings: AppSettings | null }) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<SocialPreset>(SOCIAL_PRESETS[0]);
  const [fitMode, setFitMode] = useState<'cover' | 'contain'>('cover');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error("File size too large (max 20MB)");
        return;
      }
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResultUrl(null);
    }
  };

  const resizeImage = async () => {
    if (!selectedImage || !previewUrl) return;

    // Check usage limit
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
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = selectedPreset.width;
      canvas.height = selectedPreset.height;

      // Fill background
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const targetRatio = canvas.width / canvas.height;
      const imgRatio = img.width / img.height;

      let drawWidth, drawHeight, x, y;

      if (fitMode === 'cover') {
        if (imgRatio > targetRatio) {
          drawHeight = canvas.height;
          drawWidth = img.width * (canvas.height / img.height);
          x = (canvas.width - drawWidth) / 2;
          y = 0;
        } else {
          drawWidth = canvas.width;
          drawHeight = img.height * (canvas.width / img.width);
          x = 0;
          y = (canvas.height - drawHeight) / 2;
        }
      } else {
        // Contain
        if (imgRatio > targetRatio) {
          drawWidth = canvas.width;
          drawHeight = img.height * (canvas.width / img.width);
          x = 0;
          y = (canvas.height - drawHeight) / 2;
        } else {
          drawHeight = canvas.height;
          drawWidth = img.width * (canvas.height / img.height);
          x = (canvas.width - drawWidth) / 2;
          y = 0;
        }
      }

      ctx.drawImage(img, x, y, drawWidth, drawHeight);

      const url = canvas.toDataURL('image/jpeg', 0.9);
      setResultUrl(url);
      toast.success(`Resized for ${selectedPreset.name}!`);

      // Update usage (skip for admins to save writes)
      if (profile && profile.role !== 'admin') {
        await updateDoc(doc(db, 'users', profile.uid), {
          usageCount: increment(1),
          lastUsedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error("Resize error:", error);
      toast.error("Failed to resize image.");
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const link = document.createElement('a');
    link.href = resultUrl;
    link.download = `${selectedPreset.id}-${selectedImage?.name || 'image'}.jpg`;
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

  // Auto-resize when preset or mode changes
  useEffect(() => {
    if (selectedImage && previewUrl) {
      const timer = setTimeout(() => {
        resizeImage();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [selectedPreset, fitMode, backgroundColor]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-8 px-4">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary text-sm font-bold rounded-full border border-primary/20">
          <Share2 className="w-4 h-4" />
          SOCIAL MEDIA TOOL
        </div>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">
          Social Media <span className="text-primary">Resizer</span>
        </h1>
        <p className="text-gray-600 max-w-xl mx-auto">
          Instantly resize your images for Instagram, Facebook, Twitter, and more. Perfect dimensions every time.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Presets Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100 space-y-6 sticky top-24">
            <div className="flex items-center gap-2 font-bold text-gray-900">
              <Maximize className="w-5 h-5 text-primary" />
              Select Preset
            </div>
            
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {SOCIAL_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setSelectedPreset(preset)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all border ${
                    selectedPreset.id === preset.id 
                      ? 'bg-primary/5 border-primary text-primary shadow-sm' 
                      : 'bg-gray-50 border-transparent text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${selectedPreset.id === preset.id ? 'bg-primary text-white' : 'bg-white text-gray-400'}`}>
                    <preset.icon className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-black uppercase tracking-wider opacity-60">{preset.platform}</p>
                    <p className="text-sm font-bold">{preset.name}</p>
                    <p className="text-[10px] font-medium opacity-60">{preset.width}x{preset.height}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-50">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                  <Crop className="w-3 h-3" /> Fit Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setFitMode('cover')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${fitMode === 'cover' ? 'bg-gray-900 text-white border-gray-900' : 'bg-gray-50 text-gray-600 border-gray-100'}`}
                  >
                    Fill / Crop
                  </button>
                  <button 
                    onClick={() => setFitMode('contain')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${fitMode === 'contain' ? 'bg-gray-900 text-white border-gray-900' : 'bg-gray-50 text-gray-600 border-gray-100'}`}
                  >
                    Fit / Border
                  </button>
                </div>
              </div>

              {fitMode === 'contain' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                    <Palette className="w-3 h-3" /> Background
                  </label>
                  <input 
                    type="color" 
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-full h-10 rounded-xl cursor-pointer border-none bg-transparent"
                  />
                </div>
              )}
            </div>

            <button 
              onClick={handleDownload}
              disabled={!resultUrl || processing}
              className="w-full py-4 bg-primary text-white rounded-2xl font-black hover:bg-secondary transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
              Download Image
            </button>
          </div>
        </div>

        {/* Main Preview Area */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden min-h-[600px] flex flex-col">
            {!selectedImage ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex flex-col items-center justify-center border-4 border-dashed border-gray-100 m-6 rounded-[1.5rem] hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer group"
              >
                <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                  <Upload className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Upload Image</h3>
                <p className="text-gray-500 mt-2">Drag and drop or click to browse</p>
                <p className="text-xs text-gray-400 mt-4">Supports PNG, JPG, WEBP (Max 20MB)</p>
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
                <div className="flex-1 relative bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 flex items-center justify-center min-h-[400px] p-4">
                  {processing ? (
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="w-12 h-12 text-primary animate-spin" />
                      <p className="text-sm font-bold text-gray-600">Resizing...</p>
                    </div>
                  ) : resultUrl ? (
                    <div className="relative group">
                      <img 
                        src={resultUrl} 
                        alt="Result" 
                        className="max-w-full max-h-[65vh] object-contain shadow-2xl rounded-lg" 
                      />
                      <div className="absolute top-4 right-4 px-3 py-1 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold rounded-full">
                        {selectedPreset.width} x {selectedPreset.height}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-2 opacity-30">
                      <ImageIcon className="w-12 h-12 mx-auto" />
                      <p className="text-sm font-bold">Processing...</p>
                    </div>
                  )}
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
                  
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl text-xs text-gray-500 font-medium">
                    <ShieldCheck className="w-4 h-4 text-green-500" />
                    High Quality Export
                  </div>
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
