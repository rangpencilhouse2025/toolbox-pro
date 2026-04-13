import React, { useState, useRef, useEffect } from 'react';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { 
  FileText, Sparkles, Loader2, Copy, Trash2, Download, 
  Plus, Minus, Image as ImageIcon, Type, Palette, 
  User, Building2, Mail, Phone, MapPin, Calendar,
  Hash, DollarSign, PenTool, Layout, Check, X
} from 'lucide-react';
import { db } from '../../firebase';
import { UserProfile, AppSettings } from '../../types';
import ToolAdWrapper from '../../components/ToolAdWrapper';
import { motion, AnimatePresence } from 'motion/react';
import SignatureCanvas from 'react-signature-canvas';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
}

type TemplateType = 'modern' | 'classic' | 'minimal' | 'premium';

export default function InvoiceGenerator({ profile }: { profile: UserProfile | null, settings: AppSettings | null }) {
  // Invoice State
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Math.floor(1000 + Math.random() * 9000)}`);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  
  // Sender Info
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [senderAddress, setSenderAddress] = useState('');
  const [logo, setLogo] = useState<string | null>(null);

  // Recipient Info
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');

  // Items
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', description: 'Sample Service', quantity: 1, rate: 100 }
  ]);

  // Financials
  const [taxRate, setTaxRate] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [notes, setNotes] = useState('');

  // UI State
  const [template, setTemplate] = useState<TemplateType>('modern');
  const [loading, setLoading] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const sigPad = useRef<SignatureCanvas>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Resize signature canvas on window resize
  useEffect(() => {
    const resizeCanvas = () => {
      if (sigPad.current) {
        const canvas = sigPad.current.getCanvas();
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        canvas.getContext("2d")?.scale(ratio, ratio);
        sigPad.current.clear(); // Clear to avoid distortion
      }
    };

    if (showSignature) {
      // Small delay to ensure modal is rendered
      setTimeout(resizeCanvas, 100);
      window.addEventListener('resize', resizeCanvas);
    }
    
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [showSignature]);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth - 32; // Reduced padding for mobile
        const scale = Math.min(1, containerWidth / 595);
        setPreviewScale(scale);
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), description: '', quantity: 1, rate: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
  };

  const calculateTax = () => {
    return (calculateSubtotal() * taxRate) / 100;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax() - discount;
  };

  // Manual canvas trimming to avoid trim-canvas dependency issues
  const getTrimmedCanvas = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const l = pixels.data.length;
    const bound = {
      top: null as number | null,
      left: null as number | null,
      right: null as number | null,
      bottom: null as number | null
    };
    let x, y;

    for (let i = 0; i < l; i += 4) {
      if (pixels.data[i + 3] !== 0) {
        x = (i / 4) % canvas.width;
        y = Math.floor((i / 4) / canvas.width);

        if (bound.top === null) bound.top = y;
        if (bound.left === null) bound.left = x;
        else if (x < bound.left) bound.left = x;
        if (bound.right === null) bound.right = x;
        else if (bound.right < x) bound.right = x;
        if (bound.bottom === null || bound.bottom < y) bound.bottom = y;
      }
    }

    if (bound.top === null || bound.left === null || bound.right === null || bound.bottom === null) {
      return canvas;
    }

    const trimHeight = bound.bottom - bound.top + 1;
    const trimWidth = bound.right - bound.left + 1;
    const trimmed = ctx.getImageData(bound.left, bound.top, trimWidth, trimHeight);

    const copy = document.createElement('canvas');
    copy.width = trimWidth;
    copy.height = trimHeight;
    const copyCtx = copy.getContext('2d');
    if (!copyCtx) return canvas;
    copyCtx.putImageData(trimmed, 0, 0);

    return copy;
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearSignature = () => {
    sigPad.current?.clear();
    setSignatureData(null);
  };

  const saveSignature = () => {
    if (!sigPad.current || sigPad.current.isEmpty()) {
      toast.error("Please provide a signature first");
      return;
    }
    
    try {
      const canvas = sigPad.current.getCanvas();
      const trimmedCanvas = getTrimmedCanvas(canvas);
      const data = trimmedCanvas.toDataURL('image/png');
      setSignatureData(data);
      setShowSignature(false);
      toast.success("Signature saved!");
    } catch (error) {
      console.error("Signature save error:", error);
      // Fallback to untrimmed if trimming fails
      const data = sigPad.current.getCanvas().toDataURL('image/png');
      setSignatureData(data);
      setShowSignature(false);
      toast.success("Signature saved!");
    }
  };

  const downloadPDF = async () => {
    if (!invoiceRef.current) return;
    setLoading(true);
    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Invoice_${invoiceNumber}.pdf`);

      // Update usage count
      if (profile && profile.role !== 'admin') {
        await updateDoc(doc(db, 'users', profile.uid), {
          usageCount: increment(1),
          lastUsedAt: new Date().toISOString()
        });
      }
      toast.success("Invoice downloaded!");
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-8 max-w-7xl mx-auto w-full px-4 pb-20">
      <ToolAdWrapper position="tool_top" />
      
      <div className="w-full grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Editor Panel */}
        <div className="xl:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-inner">
                <FileText className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Invoice Generator</h1>
                <p className="text-gray-500 text-sm font-medium">Create professional, beautiful invoices in seconds.</p>
              </div>
            </div>

            {/* Template Selection */}
            <div className="space-y-4">
              <label className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <Palette className="w-4 h-4 text-purple-500" /> Design Style
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(['modern', 'classic', 'minimal', 'premium'] as TemplateType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTemplate(t)}
                    className={`relative overflow-hidden group p-4 rounded-2xl transition-all border-2 flex flex-col items-start gap-2 ${
                      template === t 
                        ? 'bg-white border-blue-600 shadow-xl shadow-blue-50' 
                        : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${template === t ? 'text-blue-600' : 'text-gray-400'}`}>
                        {t}
                      </span>
                      {template === t && (
                        <div className="bg-blue-600 rounded-full p-1">
                          <Check className="w-2 h-2 text-white" />
                        </div>
                      )}
                    </div>
                    <div className={`h-1.5 w-full rounded-full ${
                      template === t ? 'bg-blue-600' : 'bg-gray-200 group-hover:bg-gray-300'
                    }`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 ml-1">Invoice #</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 ml-1">Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Logo Upload */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-700 ml-1">Business Logo</label>
              <div className="flex items-center gap-4">
                {logo ? (
                  <div className="relative group">
                    <img src={logo} alt="Logo" className="w-20 h-20 object-contain rounded-xl border border-gray-100 p-2" />
                    <button 
                      onClick={() => setLogo(null)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="w-20 h-20 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors">
                    <ImageIcon className="w-6 h-6 text-gray-300" />
                    <span className="text-[10px] font-bold text-gray-400 mt-1">Upload</span>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                )}
                <div className="flex-1">
                  <p className="text-xs text-gray-400 leading-relaxed font-medium">Upload your business logo. PNG or JPG recommended. Max size 1MB.</p>
                </div>
              </div>
            </div>

            {/* Sender & Client Section */}
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-500" /> From (Your Details)
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  <input
                    placeholder="Business Name"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-sm"
                  />
                  <input
                    placeholder="Email Address"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-sm"
                  />
                  <textarea
                    placeholder="Address"
                    value={senderAddress}
                    onChange={(e) => setSenderAddress(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-sm h-20 resize-none"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                  <User className="w-4 h-4 text-green-500" /> Bill To (Client Details)
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  <input
                    placeholder="Client Name / Company"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-sm"
                  />
                  <input
                    placeholder="Client Email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-sm"
                  />
                  <textarea
                    placeholder="Client Address"
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-sm h-20 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Items Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Items & Services</h3>
                <button 
                  onClick={addItem}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Item
                </button>
              </div>
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-start">
                    <div className="col-span-6">
                      <input
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs font-medium"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs font-bold text-center"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        placeholder="Rate"
                        value={item.rate}
                        onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs font-bold text-center"
                      />
                    </div>
                    <div className="col-span-1 pt-1">
                      <button 
                        onClick={() => removeItem(item.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals & Tax */}
            <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Currency</label>
                  <select 
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:outline-none"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="JPY">JPY (¥)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tax Rate (%)</label>
                  <input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:outline-none"
                  />
                </div>
              </div>
              <div className="pt-2 border-t border-gray-200 space-y-2">
                <div className="flex justify-between text-sm font-bold text-gray-600">
                  <span>Subtotal</span>
                  <span>{calculateSubtotal().toFixed(2)} {currency}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-gray-600">
                  <span>Tax ({taxRate}%)</span>
                  <span>{calculateTax().toFixed(2)} {currency}</span>
                </div>
                <div className="flex justify-between text-lg font-black text-gray-900 pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span className="text-blue-600">{calculateTotal().toFixed(2)} {currency}</span>
                </div>
              </div>
            </div>

            {/* Signature Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700 ml-1">E-Signature</label>
                {signatureData && (
                  <button onClick={() => setSignatureData(null)} className="text-[10px] font-bold text-red-500 hover:underline">Remove</button>
                )}
              </div>
              {signatureData ? (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex items-center justify-center">
                  <img src={signatureData} alt="Signature" className="h-16 object-contain" />
                </div>
              ) : (
                <button 
                  onClick={() => setShowSignature(true)}
                  className="w-full py-4 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 font-bold text-xs flex items-center justify-center gap-2 hover:bg-gray-100 transition-all"
                >
                  <PenTool className="w-4 h-4" /> Add E-Signature
                </button>
              )}
            </div>

            <button
              onClick={downloadPDF}
              disabled={loading}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <Download className="w-6 h-6" />
                  Download Invoice PDF
                </>
              )}
            </button>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="xl:col-span-7 sticky top-24">
          <div className="bg-gray-200 rounded-[40px] p-4 sm:p-8 shadow-2xl overflow-hidden flex flex-col items-center" ref={containerRef}>
            <div 
              style={{ 
                height: `${842 * previewScale}px`,
                width: `${595 * previewScale}px`
              }} 
              className="relative transition-all duration-300"
            >
              <div 
                className="bg-white shadow-2xl min-h-[842px] w-[595px] overflow-hidden origin-top-left absolute left-0 top-0" 
                style={{ transform: `scale(${previewScale})` }}
                ref={invoiceRef}
              >
              {/* Modern Template */}
              {template === 'modern' && (
                <div className="p-12 space-y-12 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-32 -mt-32 opacity-50" />
                  <div className="relative flex justify-between items-start gap-8">
                    <div className="space-y-4">
                      {logo && <img src={logo} alt="Logo" className="h-16 w-auto object-contain" />}
                      <div className="space-y-1">
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">{senderName || 'Your Business'}</h2>
                        <p className="text-sm text-gray-500 max-w-xs whitespace-pre-line leading-relaxed">{senderAddress || 'Your Address'}</p>
                        <p className="text-sm text-gray-500 font-medium">{senderEmail}</p>
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <h1 className="text-6xl font-black text-blue-600 uppercase tracking-tighter leading-none">Invoice</h1>
                      <div className="space-y-1">
                        <p className="text-sm font-black text-gray-400">#{invoiceNumber}</p>
                        <p className="text-sm font-bold text-gray-900">{date}</p>
                      </div>
                    </div>
                  </div>

                  <div className="relative grid grid-cols-2 gap-12">
                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b border-blue-100 pb-1 inline-block">Bill To</p>
                      <div className="space-y-1">
                        <h3 className="text-lg font-black text-gray-900">{clientName || 'Client Name'}</h3>
                        <p className="text-sm text-gray-500 whitespace-pre-line leading-relaxed">{clientAddress || 'Client Address'}</p>
                        <p className="text-sm text-gray-500 font-medium">{clientEmail}</p>
                      </div>
                    </div>
                  </div>

                  <div className="relative space-y-4">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-gray-900">
                          <th className="text-left py-4 text-xs font-black uppercase tracking-widest text-gray-900">Description</th>
                          <th className="text-center py-4 text-xs font-black uppercase tracking-widest text-gray-900">Qty</th>
                          <th className="text-right py-4 text-xs font-black uppercase tracking-widest text-gray-900">Rate</th>
                          <th className="text-right py-4 text-xs font-black uppercase tracking-widest text-gray-900">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {items.map((item) => (
                          <tr key={item.id} className="group">
                            <td className="py-6 text-sm font-bold text-gray-800">{item.description || 'New Item'}</td>
                            <td className="py-6 text-sm font-bold text-gray-500 text-center">{item.quantity}</td>
                            <td className="py-6 text-sm font-bold text-gray-500 text-right">{item.rate.toFixed(2)}</td>
                            <td className="py-6 text-sm font-black text-gray-900 text-right">{(item.quantity * item.rate).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="relative flex justify-end">
                    <div className="w-64 space-y-3 bg-gray-50 p-6 rounded-2xl">
                      <div className="flex justify-between text-xs font-bold text-gray-500">
                        <span>Subtotal</span>
                        <span>{calculateSubtotal().toFixed(2)} {currency}</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold text-gray-500">
                        <span>Tax ({taxRate}%)</span>
                        <span>{calculateTax().toFixed(2)} {currency}</span>
                      </div>
                      <div className="flex justify-between text-2xl font-black text-gray-900 pt-4 border-t border-gray-200">
                        <span>Total</span>
                        <span className="text-blue-600">{calculateTotal().toFixed(2)} {currency}</span>
                      </div>
                    </div>
                  </div>

                  <div className="relative flex justify-between items-end pt-12">
                    <div className="max-w-xs">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Notes</p>
                      <p className="text-xs text-gray-500 leading-relaxed italic">{notes || 'Thank you for your business!'}</p>
                    </div>
                    {signatureData && (
                      <div className="text-center space-y-2">
                        <img src={signatureData} alt="Signature" className="h-16 mx-auto" />
                        <div className="w-40 h-px bg-gray-200" />
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Authorized Signature</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Classic Template */}
              {template === 'classic' && (
                <div className="p-12 space-y-10 font-serif">
                  <div className="text-center border-b-8 border-double border-gray-900 pb-8">
                    <h1 className="text-5xl font-black text-gray-900 uppercase tracking-[0.3em]">Invoice</h1>
                  </div>
                  
                  <div className="flex justify-between gap-8 pt-4">
                    <div className="space-y-2">
                      <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{senderName || 'Your Business'}</h2>
                      <div className="text-xs text-gray-600 space-y-1">
                        <p className="whitespace-pre-line leading-relaxed">{senderAddress}</p>
                        <p className="font-bold">{senderEmail}</p>
                      </div>
                    </div>
                    <div className="text-right space-y-2 min-w-[200px]">
                      <div className="inline-block border-2 border-gray-900 p-4 space-y-1">
                        <p className="text-xs font-black uppercase tracking-widest">Invoice No.</p>
                        <p className="text-lg font-black text-gray-900">{invoiceNumber}</p>
                        <div className="h-px bg-gray-200 my-2" />
                        <p className="text-xs font-black uppercase tracking-widest">Date</p>
                        <p className="text-sm font-bold text-gray-700">{date}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-12">
                    <div className="border-l-4 border-gray-900 pl-6 py-2">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Bill To</p>
                      <h3 className="text-xl font-black text-gray-900">{clientName || 'Client Name'}</h3>
                      <div className="text-xs text-gray-600 mt-2 space-y-1">
                        <p className="whitespace-pre-line leading-relaxed">{clientAddress}</p>
                        <p className="font-bold">{clientEmail}</p>
                      </div>
                    </div>
                  </div>

                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-y-2 border-gray-900">
                        <th className="py-4 text-left text-[10px] font-black uppercase tracking-widest">Description</th>
                        <th className="py-4 text-center text-[10px] font-black uppercase tracking-widest">Qty</th>
                        <th className="py-4 text-right text-[10px] font-black uppercase tracking-widest">Rate</th>
                        <th className="py-4 text-right text-[10px] font-black uppercase tracking-widest">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {items.map((item) => (
                        <tr key={item.id}>
                          <td className="py-6 text-sm font-bold text-gray-800">{item.description}</td>
                          <td className="py-6 text-sm font-bold text-gray-600 text-center">{item.quantity}</td>
                          <td className="py-6 text-sm font-bold text-gray-600 text-right">{item.rate.toFixed(2)}</td>
                          <td className="py-6 text-sm font-black text-gray-900 text-right">{(item.quantity * item.rate).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="flex justify-end">
                    <div className="w-72 border-t-2 border-gray-900 pt-6 space-y-3">
                      <div className="flex justify-between text-sm font-bold text-gray-600">
                        <span>Subtotal</span>
                        <span>{calculateSubtotal().toFixed(2)} {currency}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold text-gray-600">
                        <span>Tax ({taxRate}%)</span>
                        <span>{calculateTax().toFixed(2)} {currency}</span>
                      </div>
                      <div className="flex justify-between text-2xl font-black pt-4 border-t-4 border-double border-gray-900">
                        <span className="uppercase tracking-tighter">Total Amount</span>
                        <span>{calculateTotal().toFixed(2)} {currency}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-end pt-16">
                    <div className="max-w-xs">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Notes & Terms</p>
                      <p className="text-xs text-gray-500 leading-relaxed italic">{notes || 'Thank you for your business!'}</p>
                    </div>
                    {signatureData && (
                      <div className="text-center space-y-3">
                        <img src={signatureData} alt="Signature" className="h-16 mx-auto" />
                        <div className="w-48 h-px bg-gray-900" />
                        <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Authorized Signature</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Minimal Template */}
              {template === 'minimal' && (
                <div className="p-16 space-y-16">
                  <div className="flex justify-between items-center gap-10">
                    <h1 className="text-2xl font-light text-gray-400 tracking-[0.2em] uppercase">Invoice</h1>
                    {logo && <img src={logo} alt="Logo" className="h-10 w-auto grayscale opacity-50" />}
                  </div>

                  <div className="grid grid-cols-2 gap-20">
                    <div className="space-y-6">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">From</p>
                        <p className="text-sm font-bold text-gray-900">{senderName}</p>
                        <p className="text-xs text-gray-400 leading-relaxed">{senderAddress}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">To</p>
                        <p className="text-sm font-bold text-gray-900">{clientName}</p>
                        <p className="text-xs text-gray-400 leading-relaxed">{clientAddress}</p>
                      </div>
                    </div>
                    <div className="space-y-6 text-right">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Invoice Number</p>
                        <p className="text-sm font-bold text-gray-900">{invoiceNumber}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Date</p>
                        <p className="text-sm font-bold text-gray-900">{date}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="border-b border-gray-100 pb-4">
                      <div className="grid grid-cols-12 gap-4 text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                        <div className="col-span-8">Description</div>
                        <div className="col-span-4 text-right">Amount</div>
                      </div>
                    </div>
                    <div className="space-y-6">
                      {items.map((item) => (
                        <div key={item.id} className="grid grid-cols-12 gap-4">
                          <div className="col-span-8">
                            <p className="text-sm font-bold text-gray-900">{item.description}</p>
                            <p className="text-[10px] text-gray-400 font-medium mt-1">{item.quantity} x {item.rate.toFixed(2)}</p>
                          </div>
                          <div className="col-span-4 text-right text-sm font-bold text-gray-900">
                            {(item.quantity * item.rate).toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-gray-100 pt-8 flex justify-between items-end">
                      <div className="max-w-[200px]">
                        <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-2">Notes</p>
                        <p className="text-[10px] text-gray-400 italic">{notes || 'Thank you!'}</p>
                      </div>
                      <div className="flex flex-col items-end gap-8">
                        {signatureData && (
                          <div className="text-right space-y-2">
                            <img src={signatureData} alt="Signature" className="h-12 ml-auto opacity-60 grayscale" />
                            <div className="w-32 h-px bg-gray-100" />
                            <p className="text-[8px] font-bold text-gray-300 uppercase tracking-widest">Signature</p>
                          </div>
                        )}
                        <div className="w-48 space-y-2">
                          <div className="flex justify-between text-xs font-bold text-gray-400">
                            <span>Subtotal</span>
                            <span>{calculateSubtotal().toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-lg font-bold text-gray-900 pt-2">
                            <span>Total</span>
                            <span>{calculateTotal().toFixed(2)} {currency}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Premium Template */}
              {template === 'premium' && (
                <div className="min-h-[842px] flex flex-col">
                  <div className="bg-gray-900 text-white p-12 flex justify-between items-center">
                    <div className="space-y-2">
                      <h1 className="text-4xl font-black tracking-tighter uppercase">Invoice</h1>
                      <div className="flex items-center gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                        <span>#{invoiceNumber}</span>
                        <span className="w-1 h-1 bg-gray-600 rounded-full" />
                        <span>{date}</span>
                      </div>
                    </div>
                    {logo ? (
                      <img src={logo} alt="Logo" className="h-16 w-auto object-contain brightness-0 invert" />
                    ) : (
                      <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                    )}
                  </div>

                  <div className="p-12 flex-1 flex flex-col space-y-12">
                    <div className="grid grid-cols-2 gap-12">
                      <div className="space-y-4">
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Sender</p>
                        <div className="space-y-1">
                          <h3 className="text-lg font-black text-gray-900">{senderName || 'Your Business'}</h3>
                          <p className="text-xs text-gray-500 whitespace-pre-line leading-relaxed">{senderAddress}</p>
                          <p className="text-xs text-gray-500 font-bold">{senderEmail}</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Recipient</p>
                        <div className="space-y-1">
                          <h3 className="text-lg font-black text-gray-900">{clientName || 'Client Name'}</h3>
                          <p className="text-xs text-gray-500 whitespace-pre-line leading-relaxed">{clientAddress}</p>
                          <p className="text-xs text-gray-500 font-bold">{clientEmail}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1">
                      <table className="w-full">
                        <thead>
                          <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                            <th className="text-left py-4">Description</th>
                            <th className="text-center py-4">Quantity</th>
                            <th className="text-right py-4">Rate</th>
                            <th className="text-right py-4">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {items.map((item) => (
                            <tr key={item.id}>
                              <td className="py-6">
                                <p className="text-sm font-black text-gray-900">{item.description || 'New Item'}</p>
                              </td>
                              <td className="py-6 text-center text-sm font-bold text-gray-500">{item.quantity}</td>
                              <td className="py-6 text-right text-sm font-bold text-gray-500">{item.rate.toFixed(2)}</td>
                              <td className="py-6 text-right text-sm font-black text-gray-900">{(item.quantity * item.rate).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="pt-12 border-t border-gray-100 flex justify-between items-end">
                      <div className="space-y-6">
                        <div className="max-w-xs">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Notes & Terms</p>
                          <p className="text-[10px] text-gray-500 leading-relaxed italic">{notes || 'Thank you for your business. Please pay within 15 days.'}</p>
                        </div>
                        {signatureData && (
                          <div className="space-y-2">
                            <img src={signatureData} alt="Signature" className="h-12" />
                            <div className="w-32 h-px bg-gray-200" />
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Authorized Signature</p>
                          </div>
                        )}
                      </div>
                      <div className="bg-gray-50 p-8 rounded-[32px] w-72 space-y-4">
                        <div className="flex justify-between text-xs font-bold text-gray-500">
                          <span>Subtotal</span>
                          <span>{calculateSubtotal().toFixed(2)} {currency}</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold text-gray-500">
                          <span>Tax ({taxRate}%)</span>
                          <span>{calculateTax().toFixed(2)} {currency}</span>
                        </div>
                        <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
                          <span className="text-sm font-black text-gray-900 uppercase">Total</span>
                          <span className="text-2xl font-black text-blue-600">{calculateTotal().toFixed(2)} {currency}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* Signature Modal */}
      <AnimatePresence>
        {showSignature && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSignature(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 sm:p-8 space-y-4 sm:space-y-6 overflow-y-auto">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Draw Signature</h3>
                  <button onClick={() => setShowSignature(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                
                <div className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 overflow-hidden touch-none">
                  <SignatureCanvas 
                    ref={sigPad}
                    penColor="black"
                    canvasProps={{
                      className: "w-full h-48 sm:h-64 cursor-crosshair"
                    }}
                  />
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={clearSignature}
                    className="flex-1 py-3 sm:py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all text-sm sm:text-base"
                  >
                    Clear
                  </button>
                  <button 
                    onClick={saveSignature}
                    className="flex-1 py-3 sm:py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 text-sm sm:text-base"
                  >
                    Save Signature
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ToolAdWrapper position="tool_bottom" />
    </div>
  );
}
