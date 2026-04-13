import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Upload, Download, Trash2, Loader2, Image as ImageIcon, Grid, ShieldCheck, Sliders, RefreshCw, Type, Palette, Square } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { UserProfile, AppSettings } from '../../types';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../firebase';
import { getDailyLimit } from '../../lib/utils';

export default function GridMaker({ profile, settings }: { profile: UserProfile | null, settings: AppSettings | null }) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  
  // Grid Settings
  const [rows, setRows] = useState(5);
  const [cols, setCols] = useState(5);
  const [lineColor, setLineColor] = useState('#ff0000');
  const [lineWidth, setLineWidth] = useState(2);
  const [showLabels, setShowLabels] = useState(true);
  const [showDiagonals, setShowDiagonals] = useState(false);
  const [grayscale, setGrayscale] = useState(false);
  const [opacity, setOpacity] = useState(100);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        toast.error("File size too large (max 15MB)");
        return;
      }
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResultUrl(null);
    }
  };

  const generateGrid = async () => {
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
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;

      // 1. Draw Image
      if (grayscale) {
        ctx.filter = 'grayscale(100%)';
      }
      ctx.drawImage(img, 0, 0);
      ctx.filter = 'none';

      // 2. Draw Grid Lines
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = lineWidth;
      ctx.globalAlpha = opacity / 100;

      const cellWidth = canvas.width / cols;
      const cellHeight = canvas.height / rows;

      // Vertical lines
      for (let i = 0; i <= cols; i++) {
        const x = i * cellWidth;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      // Horizontal lines
      for (let i = 0; i <= rows; i++) {
        const y = i * cellHeight;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // 3. Draw Diagonals if enabled
      if (showDiagonals) {
        ctx.lineWidth = lineWidth / 2;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const x = c * cellWidth;
            const y = r * cellHeight;
            
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + cellWidth, y + cellHeight);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(x + cellWidth, y);
            ctx.lineTo(x, y + cellHeight);
            ctx.stroke();
          }
        }
      }

      // 4. Draw Labels if enabled
      if (showLabels) {
        ctx.globalAlpha = 1;
        const fontSize = Math.max(12, Math.min(cellWidth, cellHeight) * 0.2);
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.fillStyle = lineColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Column labels (A, B, C...)
        for (let i = 0; i < cols; i++) {
          const label = String.fromCharCode(65 + (i % 26)) + (i >= 26 ? Math.floor(i / 26) : '');
          ctx.fillText(label, (i * cellWidth) + (cellWidth / 2), fontSize);
        }

        // Row labels (1, 2, 3...)
        ctx.textAlign = 'left';
        for (let i = 0; i < rows; i++) {
          ctx.fillText((i + 1).toString(), 5, (i * cellHeight) + (cellHeight / 2));
        }
      }

      const url = canvas.toDataURL('image/png');
      setResultUrl(url);
      toast.success("Grid generated!");

      // Update usage count (skip for admins to save writes)
      if (profile && profile.role !== 'admin') {
        await updateDoc(doc(db, 'users', profile.uid), {
          usageCount: increment(1),
          lastUsedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error("Error generating grid:", error);
      toast.error("Failed to generate grid.");
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const link = document.createElement('a');
    link.href = resultUrl;
    link.download = `gridded-${selectedImage?.name || 'image'}.png`;
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

  // Re-generate grid when settings change if an image is selected
  useEffect(() => {
    if (selectedImage && previewUrl) {
      const timer = setTimeout(() => {
        generateGrid();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [rows, cols, lineColor, lineWidth, showLabels, showDiagonals, grayscale, opacity]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-8 px-4">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary text-sm font-bold rounded-full border border-primary/20">
          <Grid className="w-4 h-4" />
          ARTIST UTILITY
        </div>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">
          Artist <span className="text-primary">Grid Maker</span>
        </h1>
        <p className="text-gray-600 max-w-xl mx-auto">
          Overlay a customizable grid on any image to help with proportions and accuracy in your drawings.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Controls Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100 space-y-6 sticky top-24">
            <div className="flex items-center gap-2 font-bold text-gray-900">
              <Sliders className="w-5 h-5 text-primary" />
              Grid Settings
            </div>
            
            <div className="space-y-5">
              {/* Rows & Cols */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Rows</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="50" 
                    value={rows}
                    onChange={(e) => setRows(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Cols</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="50" 
                    value={cols}
                    onChange={(e) => setCols(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold"
                  />
                </div>
              </div>

              {/* Line Color & Width */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                    <Palette className="w-3 h-3" /> Color
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="color" 
                      value={lineColor}
                      onChange={(e) => setLineColor(e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border-none bg-transparent"
                    />
                    <input 
                      type="text" 
                      value={lineColor}
                      onChange={(e) => setLineColor(e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-gray-500 uppercase">
                    <label>Thickness</label>
                    <span>{lineWidth}px</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="10" 
                    value={lineWidth}
                    onChange={(e) => setLineWidth(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-gray-500 uppercase">
                    <label>Grid Opacity</label>
                    <span>{opacity}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="10" 
                    max="100" 
                    value={opacity}
                    onChange={(e) => setOpacity(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-10 h-5 rounded-full transition-colors relative ${showLabels ? 'bg-primary' : 'bg-gray-200'}`}>
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${showLabels ? 'left-6' : 'left-1'}`} />
                  </div>
                  <input type="checkbox" className="hidden" checked={showLabels} onChange={() => setShowLabels(!showLabels)} />
                  <span className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <Type className="w-4 h-4" /> Show Labels
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-10 h-5 rounded-full transition-colors relative ${showDiagonals ? 'bg-primary' : 'bg-gray-200'}`}>
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${showDiagonals ? 'left-6' : 'left-1'}`} />
                  </div>
                  <input type="checkbox" className="hidden" checked={showDiagonals} onChange={() => setShowDiagonals(!showDiagonals)} />
                  <span className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <Square className="w-4 h-4" /> Diagonal Lines
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-10 h-5 rounded-full transition-colors relative ${grayscale ? 'bg-primary' : 'bg-gray-200'}`}>
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${grayscale ? 'left-6' : 'left-1'}`} />
                  </div>
                  <input type="checkbox" className="hidden" checked={grayscale} onChange={() => setGrayscale(!grayscale)} />
                  <span className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <Palette className="w-4 h-4" /> Grayscale Mode
                  </span>
                </label>
              </div>
            </div>

            <button 
              onClick={generateGrid}
              disabled={!selectedImage || processing}
              className="w-full py-4 bg-primary text-white rounded-2xl font-black hover:bg-secondary transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
              Refresh Grid
            </button>
          </div>
        </div>

        {/* Main Canvas Area */}
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
                <h3 className="text-xl font-bold text-gray-900">Upload Reference Photo</h3>
                <p className="text-gray-500 mt-2">Drag and drop or click to browse</p>
                <p className="text-xs text-gray-400 mt-4">Supports PNG, JPG, WEBP (Max 15MB)</p>
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
                <div className="flex-1 relative bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 flex items-center justify-center min-h-[400px]">
                  {processing ? (
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="w-12 h-12 text-primary animate-spin" />
                      <p className="text-sm font-bold text-gray-600">Generating grid...</p>
                    </div>
                  ) : resultUrl ? (
                    <img src={resultUrl} alt="Result" className="max-w-full max-h-[70vh] object-contain shadow-2xl" />
                  ) : (
                    <div className="text-center space-y-2 opacity-30">
                      <ImageIcon className="w-12 h-12 mx-auto" />
                      <p className="text-sm font-bold">Processing image...</p>
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
                    Clear Image
                  </button>
                  
                  {resultUrl && (
                    <button 
                      onClick={handleDownload}
                      className="px-12 py-4 bg-green-600 text-white rounded-2xl font-black hover:bg-green-700 transition-all shadow-lg shadow-green-200 flex items-center gap-2"
                    >
                      <Download className="w-5 h-5" />
                      Download Gridded Image
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
