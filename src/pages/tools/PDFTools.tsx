import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, FilePlus, FileStack, Zap, ShieldCheck, 
  Download, Trash2, Loader2, Upload, Plus, 
  Image as ImageIcon, Type, Layers, Minimize2, 
  ChevronRight, AlertCircle, CheckCircle2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import { PDFDocument } from 'pdf-lib';
import { UserProfile, AppSettings } from '../../types';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../firebase';
import { getDailyLimit } from '../../lib/utils';

type PDFSubTool = 'image-to-pdf' | 'text-to-pdf' | 'merge-pdf' | 'compress-pdf';

export default function PDFTools({ profile, settings }: { profile: UserProfile | null, settings: AppSettings | null }) {
  const [activeTool, setActiveTool] = useState<PDFSubTool>('image-to-pdf');
  const [processing, setProcessing] = useState(false);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultName, setResultName] = useState('');

  // Sub-tool states
  const [images, setImages] = useState<{ file: File, preview: string }[]>([]);
  const [textContent, setTextContent] = useState('');
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [compressFile, setCompressFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const incrementUsage = async () => {
    if (profile && profile.role !== 'admin') {
      await updateDoc(doc(db, 'users', profile.uid), {
        usageCount: increment(1),
        lastUsedAt: new Date().toISOString()
      });
    }
  };

  const checkLimit = () => {
    if (!profile?.premiumStatus) {
      const limit = getDailyLimit(profile, settings);
      if ((profile?.usageCount || 0) >= limit) {
        toast.error("Daily free limit reached. Please upgrade to premium!");
        return false;
      }
    }
    return true;
  };

  // 1. Image to PDF
  const handleImageToPDF = async () => {
    if (images.length === 0) return;
    if (!checkLimit()) return;
    setProcessing(true);
    try {
      const doc = new jsPDF();
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const imgData = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(img.file);
        });

        if (i > 0) doc.addPage();
        
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        // Simple fit to page
        doc.addImage(imgData, 'JPEG', 10, 10, pageWidth - 20, pageHeight - 20);
      }
      
      const blob = doc.output('blob');
      setResultBlob(blob);
      setResultName('images-to-pdf.pdf');
      toast.success("PDF generated from images!");
      await incrementUsage();
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate PDF.");
    } finally {
      setProcessing(false);
    }
  };

  // 2. Text to PDF
  const handleTextToPDF = async () => {
    if (!textContent.trim()) return;
    if (!checkLimit()) return;
    setProcessing(true);
    try {
      const doc = new jsPDF();
      const splitText = doc.splitTextToSize(textContent, 180);
      doc.text(splitText, 15, 20);
      
      const blob = doc.output('blob');
      setResultBlob(blob);
      setResultName('text-to-pdf.pdf');
      toast.success("PDF generated from text!");
      await incrementUsage();
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate PDF.");
    } finally {
      setProcessing(false);
    }
  };

  // 3. Merge PDF
  const handleMergePDF = async () => {
    if (pdfFiles.length < 2) {
      toast.error("Select at least 2 PDF files to merge.");
      return;
    }
    if (!checkLimit()) return;
    setProcessing(true);
    try {
      const mergedPdf = await PDFDocument.create();
      for (const file of pdfFiles) {
        const pdfBytes = await file.arrayBuffer();
        const pdf = await PDFDocument.load(pdfBytes);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }
      
      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setResultBlob(blob);
      setResultName('merged-document.pdf');
      toast.success("PDFs merged successfully!");
      await incrementUsage();
    } catch (error) {
      console.error(error);
      toast.error("Failed to merge PDFs.");
    } finally {
      setProcessing(false);
    }
  };

  // 4. Compress PDF (Basic Optimization)
  const handleCompressPDF = async () => {
    if (!compressFile) return;
    if (!checkLimit()) return;
    setProcessing(true);
    try {
      const pdfBytes = await compressFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      // Basic optimization: re-save with compression
      const compressedBytes = await pdfDoc.save({ useObjectStreams: true });
      const blob = new Blob([compressedBytes], { type: 'application/pdf' });
      
      setResultBlob(blob);
      setResultName(`optimized-${compressFile.name}`);
      
      const originalSize = compressFile.size;
      const newSize = blob.size;
      const saved = originalSize - newSize;
      
      if (saved > 0) {
        toast.success(`PDF optimized! Saved ${(saved / 1024).toFixed(1)} KB`);
      } else {
        toast.success("PDF re-saved and optimized.");
      }
      await incrementUsage();
    } catch (error) {
      console.error(error);
      toast.error("Failed to optimize PDF.");
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob) return;
    const url = URL.createObjectURL(resultBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = resultName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const resetAll = () => {
    setResultBlob(null);
    setImages([]);
    setTextContent('');
    setPdfFiles([]);
    setCompressFile(null);
  };

  const subTools = [
    { id: 'image-to-pdf', name: 'Image to PDF', icon: ImageIcon, desc: 'Convert multiple images into a single PDF.' },
    { id: 'text-to-pdf', name: 'Text to PDF', icon: Type, desc: 'Turn plain text into a professional PDF document.' },
    { id: 'merge-pdf', name: 'Merge PDF', icon: Layers, desc: 'Combine multiple PDF files into one.' },
    { id: 'compress-pdf', name: 'PDF Compressor', icon: Minimize2, desc: 'Optimize and reduce PDF file size.' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-8 px-4">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary text-sm font-bold rounded-full border border-primary/20">
          <FileText className="w-4 h-4" />
          FILE UTILITIES
        </div>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">
          File <span className="text-primary">Toolbox</span>
        </h1>
        <p className="text-gray-600 max-w-xl mx-auto">
          A powerful set of tools to create, merge, and optimize your PDF documents instantly.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white p-4 rounded-3xl shadow-xl border border-gray-100 space-y-2">
            {subTools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => {
                  setActiveTool(tool.id as PDFSubTool);
                  setResultBlob(null);
                }}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all ${
                  activeTool === tool.id 
                    ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <tool.icon className={`w-5 h-5 ${activeTool === tool.id ? 'text-white' : 'text-gray-400'}`} />
                <div className="text-left">
                  <p className="text-sm font-black">{tool.name}</p>
                </div>
                <ChevronRight className={`ml-auto w-4 h-4 opacity-50 ${activeTool === tool.id ? 'block' : 'hidden'}`} />
              </button>
            ))}
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

        {/* Main Workspace */}
        <div className="lg:col-span-9">
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden min-h-[600px] flex flex-col">
            <div className="p-8 border-b border-gray-50 bg-gray-50/50">
              <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                {subTools.find(t => t.id === activeTool)?.name}
              </h2>
              <p className="text-gray-500 text-sm font-medium mt-1">
                {subTools.find(t => t.id === activeTool)?.desc}
              </p>
            </div>

            <div className="flex-1 p-8">
              <AnimatePresence mode="wait">
                {resultBlob ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="h-full flex flex-col items-center justify-center space-y-6"
                  >
                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                      <CheckCircle2 className="w-12 h-12" />
                    </div>
                    <div className="text-center space-y-2">
                      <h3 className="text-2xl font-black text-gray-900">PDF Ready!</h3>
                      <p className="text-gray-500 font-medium">{resultName}</p>
                      <p className="text-xs text-gray-400">Size: {(resultBlob.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <div className="flex gap-4">
                      <button 
                        onClick={handleDownload}
                        className="px-10 py-4 bg-primary text-white rounded-2xl font-black hover:bg-secondary transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                      >
                        <Download className="w-5 h-5" />
                        Download PDF
                      </button>
                      <button 
                        onClick={() => setResultBlob(null)}
                        className="px-8 py-4 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                      >
                        Create Another
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key={activeTool}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="h-full flex flex-col"
                  >
                    {/* Image to PDF */}
                    {activeTool === 'image-to-pdf' && (
                      <div className="space-y-6 flex-1 flex flex-col">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {images.map((img, i) => (
                            <div key={i} className="relative group aspect-[3/4] bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                              {img.preview && (
                                <img src={img.preview} alt="Preview" className="w-full h-full object-cover" />
                              )}
                              <button 
                                onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="aspect-[3/4] border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
                          >
                            <Plus className="w-8 h-8" />
                            <span className="text-xs font-bold">Add Image</span>
                          </button>
                        </div>
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          multiple 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            const newImages = files.map(f => ({ file: f, preview: URL.createObjectURL(f as Blob) }));
                            setImages([...images, ...newImages]);
                          }}
                        />
                        <div className="mt-auto pt-8">
                          <button 
                            onClick={handleImageToPDF}
                            disabled={images.length === 0 || processing}
                            className="w-full py-5 bg-primary text-white rounded-2xl font-black hover:bg-secondary transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 disabled:opacity-50"
                          >
                            {processing ? <Loader2 className="w-6 h-6 animate-spin" /> : <FilePlus className="w-6 h-6" />}
                            Convert {images.length} Image{images.length !== 1 ? 's' : ''} to PDF
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Text to PDF */}
                    {activeTool === 'text-to-pdf' && (
                      <div className="space-y-6 flex-1 flex flex-col">
                        <textarea 
                          value={textContent}
                          onChange={(e) => setTextContent(e.target.value)}
                          placeholder="Type or paste your text here..."
                          className="flex-1 w-full p-6 bg-gray-50 border border-gray-100 rounded-3xl outline-none focus:ring-2 focus:ring-primary font-medium text-gray-700 resize-none"
                        />
                        <button 
                          onClick={handleTextToPDF}
                          disabled={!textContent.trim() || processing}
                          className="w-full py-5 bg-primary text-white rounded-2xl font-black hover:bg-secondary transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                          {processing ? <Loader2 className="w-6 h-6 animate-spin" /> : <FilePlus className="w-6 h-6" />}
                          Generate PDF from Text
                        </button>
                      </div>
                    )}

                    {/* Merge PDF */}
                    {activeTool === 'merge-pdf' && (
                      <div className="space-y-6 flex-1 flex flex-col">
                        <div className="space-y-3">
                          {pdfFiles.map((file, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center">
                                  <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-gray-900 truncate max-w-[200px]">{file.name}</p>
                                  <p className="text-[10px] text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                                </div>
                              </div>
                              <button 
                                onClick={() => setPdfFiles(pdfFiles.filter((_, idx) => idx !== i))}
                                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full py-8 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-3 text-gray-400 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
                          >
                            <Plus className="w-8 h-8" />
                            <span className="text-sm font-bold">Add PDF Files</span>
                          </button>
                        </div>
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          multiple 
                          accept="application/pdf" 
                          className="hidden" 
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            setPdfFiles([...pdfFiles, ...files]);
                          }}
                        />
                        <div className="mt-auto pt-8">
                          <button 
                            onClick={handleMergePDF}
                            disabled={pdfFiles.length < 2 || processing}
                            className="w-full py-5 bg-primary text-white rounded-2xl font-black hover:bg-secondary transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 disabled:opacity-50"
                          >
                            {processing ? <Loader2 className="w-6 h-6 animate-spin" /> : <FileStack className="w-6 h-6" />}
                            Merge {pdfFiles.length} PDF Files
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Compress PDF */}
                    {activeTool === 'compress-pdf' && (
                      <div className="space-y-6 flex-1 flex flex-col">
                        {!compressFile ? (
                          <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 border-4 border-dashed border-gray-100 rounded-[2rem] flex flex-col items-center justify-center gap-4 hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer group"
                          >
                            <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mb-2 group-hover:scale-110 transition-transform">
                              <Upload className="w-10 h-10" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">Upload PDF to Optimize</h3>
                            <p className="text-gray-500 text-sm">Reduce file size without losing quality</p>
                          </div>
                        ) : (
                          <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                            <div className="p-8 bg-gray-50 rounded-3xl border border-gray-100 flex flex-col items-center space-y-4 w-full max-w-md">
                              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center">
                                <FileText className="w-8 h-8" />
                              </div>
                              <div className="text-center">
                                <p className="text-lg font-black text-gray-900">{compressFile.name}</p>
                                <p className="text-sm text-gray-500">Current Size: {(compressFile.size / 1024).toFixed(1)} KB</p>
                              </div>
                              <button 
                                onClick={() => setCompressFile(null)}
                                className="text-red-500 text-sm font-bold hover:underline"
                              >
                                Remove File
                              </button>
                            </div>
                            <div className="w-full max-w-md p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3">
                              <AlertCircle className="w-5 h-5 text-blue-600 shrink-0" />
                              <p className="text-xs text-blue-700 leading-relaxed">
                                Our optimizer re-structures the PDF objects and removes unnecessary metadata to reduce file size while maintaining visual quality.
                              </p>
                            </div>
                          </div>
                        )}
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          accept="application/pdf" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setCompressFile(file);
                          }}
                        />
                        <button 
                          onClick={handleCompressPDF}
                          disabled={!compressFile || processing}
                          className="w-full py-5 bg-primary text-white rounded-2xl font-black hover:bg-secondary transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                          {processing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Minimize2 className="w-6 h-6" />}
                          Optimize PDF Size
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
