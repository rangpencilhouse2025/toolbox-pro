import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { Upload, Download, Trash2, Loader2, Image as ImageIcon, Box, ShieldCheck, Sliders, RefreshCw, Palette, Move, Target } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { UserProfile, AppSettings } from '../../types';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../firebase';
import { getDailyLimit } from '../../lib/utils';

interface Point {
  x: number;
  y: number;
}

type PerspectiveType = '1-point' | '2-point' | '3-point';

export default function PerspectiveGridTool({ profile, settings }: { profile: UserProfile | null, settings: AppSettings | null }) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  
  // Perspective Settings
  const [type, setType] = useState<PerspectiveType>('2-point');
  const [lineColor, setLineColor] = useState('#00ff00');
  const [lineWidth, setLineWidth] = useState(1);
  const [density, setDensity] = useState(10);
  const [opacity, setOpacity] = useState(60);
  const [showHorizon, setShowHorizon] = useState(true);

  // Vanishing Points (relative to canvas size 0-1)
  const [vp1, setVp1] = useState<Point>({ x: 0.2, y: 0.5 });
  const [vp2, setVp2] = useState<Point>({ x: 0.8, y: 0.5 });
  const [vp3, setVp3] = useState<Point>({ x: 0.5, y: 0.1 }); // For 3-point
  
  const [draggingPoint, setDraggingPoint] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        toast.error("File size too large (max 15MB)");
        return;
      }
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !previewUrl) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = previewUrl;
    img.onload = () => {
      // Maintain aspect ratio
      const containerWidth = containerRef.current?.clientWidth || 800;
      const containerHeight = 600;
      
      let drawWidth = img.width;
      let drawHeight = img.height;
      const ratio = Math.min(containerWidth / img.width, containerHeight / img.height);
      drawWidth *= ratio;
      drawHeight *= ratio;

      canvas.width = drawWidth;
      canvas.height = drawHeight;

      // 1. Draw Image
      ctx.drawImage(img, 0, 0, drawWidth, drawHeight);

      // 2. Draw Grid
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = lineWidth;
      ctx.globalAlpha = opacity / 100;

      const drawVp1 = { x: vp1.x * drawWidth, y: vp1.y * drawHeight };
      const drawVp2 = { x: vp2.x * drawWidth, y: vp2.y * drawHeight };
      const drawVp3 = { x: vp3.x * drawWidth, y: vp3.y * drawHeight };

      // Horizon Line
      if (showHorizon && (type === '2-point' || type === '3-point')) {
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(0, drawVp1.y);
        ctx.lineTo(drawWidth, drawVp1.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Grid Lines
      const angleStep = (Math.PI * 2) / (density * 4);

      const drawLinesFromPoint = (p: Point) => {
        for (let i = 0; i < density * 4; i++) {
          const angle = i * angleStep;
          const length = Math.max(drawWidth, drawHeight) * 2;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + Math.cos(angle) * length, p.y + Math.sin(angle) * length);
          ctx.stroke();
        }
      };

      if (type === '1-point') {
        drawLinesFromPoint(drawVp1);
        // Vertical and horizontal lines for 1-point
        for (let i = 0; i <= density; i++) {
          const x = (i / density) * drawWidth;
          const y = (i / density) * drawHeight;
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, drawHeight); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(drawWidth, y); ctx.stroke();
        }
      } else if (type === '2-point') {
        drawLinesFromPoint(drawVp1);
        drawLinesFromPoint(drawVp2);
      } else if (type === '3-point') {
        drawLinesFromPoint(drawVp1);
        drawLinesFromPoint(drawVp2);
        drawLinesFromPoint(drawVp3);
      }

      // 3. Draw Handles (only if not exporting)
      if (!processing) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = lineColor;
        const drawHandle = (p: Point, label: string) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(label, p.x, p.y + 4);
          ctx.fillStyle = lineColor;
        };

        drawHandle(drawVp1, 'VP1');
        if (type === '2-point' || type === '3-point') drawHandle(drawVp2, 'VP2');
        if (type === '3-point') drawHandle(drawVp3, 'VP3');
      }
    };
  }, [previewUrl, type, lineColor, lineWidth, density, opacity, showHorizon, vp1, vp2, vp3, processing]);

  useEffect(() => {
    drawGrid();
  }, [drawGrid]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    const dist = (p: Point) => Math.sqrt(Math.pow(p.x - x, 2) + Math.pow(p.y - y, 2));

    if (dist(vp1) < 0.05) setDraggingPoint(1);
    else if (type !== '1-point' && dist(vp2) < 0.05) setDraggingPoint(2);
    else if (type === '3-point' && dist(vp3) < 0.05) setDraggingPoint(3);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingPoint === null || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    if (draggingPoint === 1) {
      setVp1({ x, y });
      if (type === '2-point' || type === '3-point') setVp2(prev => ({ ...prev, y })); // Keep horizon level
    } else if (draggingPoint === 2) {
      setVp2({ x, y });
      setVp1(prev => ({ ...prev, y })); // Keep horizon level
    } else if (draggingPoint === 3) {
      setVp3({ x, y });
    }
  };

  const handleMouseUp = () => setDraggingPoint(null);

  const handleDownload = async () => {
    if (!canvasRef.current) return;

    // Check usage limit
    if (!profile?.premiumStatus) {
      const limit = getDailyLimit(profile, settings);
      if ((profile?.usageCount || 0) >= limit) {
        toast.error("Daily free limit reached. Please upgrade to premium!");
        return;
      }
    }

    setProcessing(true);
    
    // Redraw without handles
    setTimeout(async () => {
      const url = canvasRef.current!.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = `perspective-${selectedImage?.name || 'grid'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setProcessing(false);
      
      // Update usage (skip for admins to save writes)
      if (profile && profile.role !== 'admin') {
        await updateDoc(doc(db, 'users', profile.uid), {
          usageCount: increment(1),
          lastUsedAt: new Date().toISOString()
        });
      }
    }, 100);
  };

  const reset = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    setVp1({ x: 0.2, y: 0.5 });
    setVp2({ x: 0.8, y: 0.5 });
    setVp3({ x: 0.5, y: 0.1 });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-8 px-4">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary text-sm font-bold rounded-full border border-primary/20">
          <Box className="w-4 h-4" />
          PERSPECTIVE TOOL
        </div>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">
          Perspective <span className="text-primary">Grid Tool</span>
        </h1>
        <p className="text-gray-600 max-w-xl mx-auto">
          Master depth and space. Overlay 1, 2, or 3-point perspective grids on your reference photos.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Controls Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100 space-y-6 sticky top-24">
            <div className="flex items-center gap-2 font-bold text-gray-900">
              <Sliders className="w-5 h-5 text-primary" />
              Grid Controls
            </div>
            
            <div className="space-y-5">
              {/* Perspective Type */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Perspective Type</label>
                <div className="grid grid-cols-1 gap-2">
                  {(['1-point', '2-point', '3-point'] as PerspectiveType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setType(t)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                        type === t 
                          ? 'bg-primary text-white border-primary shadow-md' 
                          : 'bg-gray-50 text-gray-600 border-gray-100 hover:bg-gray-100'
                      }`}
                    >
                      {t.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Line Color & Width */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                    <Palette className="w-3 h-3" /> Grid Color
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
                    <label>Grid Density</label>
                    <span>{density}</span>
                  </div>
                  <input 
                    type="range" 
                    min="2" 
                    max="30" 
                    value={density}
                    onChange={(e) => setDensity(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-gray-500 uppercase">
                    <label>Opacity</label>
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
                  <div className={`w-10 h-5 rounded-full transition-colors relative ${showHorizon ? 'bg-primary' : 'bg-gray-200'}`}>
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${showHorizon ? 'left-6' : 'left-1'}`} />
                  </div>
                  <input type="checkbox" className="hidden" checked={showHorizon} onChange={() => setShowHorizon(!showHorizon)} />
                  <span className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <Target className="w-4 h-4" /> Horizon Line
                  </span>
                </label>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
                  <Move className="w-3 h-3 inline mr-1" />
                  Drag the <strong>VP handles</strong> on the image to align the grid with your reference perspective.
                </p>
              </div>
            </div>

            <button 
              onClick={handleDownload}
              disabled={!selectedImage || processing}
              className="w-full py-4 bg-primary text-white rounded-2xl font-black hover:bg-secondary transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
              Download Result
            </button>
          </div>
        </div>

        {/* Main Canvas Area */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden min-h-[600px] flex flex-col" ref={containerRef}>
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
                <div className="flex-1 relative bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 flex items-center justify-center min-h-[500px] cursor-crosshair">
                  <canvas 
                    ref={canvasRef} 
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    className="max-w-full max-h-[70vh] object-contain shadow-2xl" 
                  />
                  {processing && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white gap-4">
                      <Loader2 className="w-12 h-12 animate-spin" />
                      <p className="font-bold">Exporting...</p>
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
                  
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl text-xs text-gray-500 font-medium">
                    <ShieldCheck className="w-4 h-4 text-green-500" />
                    Secure Local Processing
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
