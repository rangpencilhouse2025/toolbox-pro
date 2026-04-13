import React, { useState, useRef, useEffect } from 'react';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { 
  FileText, Sparkles, Loader2, Download, 
  Plus, Minus, User, Building2, Mail, Phone, MapPin, Calendar,
  Hash, PenTool, Layout, Check, X, Wand2, GraduationCap, Briefcase, School
} from 'lucide-react';
import { db, auth } from '../../firebase';
import { UserProfile, AppSettings } from '../../types';
import ToolAdWrapper from '../../components/ToolAdWrapper';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { GoogleGenAI } from "@google/genai";

type TemplateType = 'formal' | 'modern' | 'creative';
type ApplicationContext = 'office' | 'school' | 'college' | 'other';

interface LeaveInfo {
  applicantName: string;
  designation: string;
  department: string;
  recipientName: string;
  recipientDesignation: string;
  organizationName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  contactInfo: string;
  address: string;
}

export default function LeaveApplicationGenerator({ profile }: { profile: UserProfile | null, settings: AppSettings | null }) {
  const [info, setInfo] = useState<LeaveInfo>({
    applicantName: '',
    designation: '',
    department: '',
    recipientName: '',
    recipientDesignation: '',
    organizationName: '',
    leaveType: 'Sick Leave',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: '',
    contactInfo: '',
    address: ''
  });

  const [context, setContext] = useState<ApplicationContext>('office');
  const [template, setTemplate] = useState<TemplateType>('formal');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);
  
  const applicationRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth - 32;
        const scale = Math.min(1, containerWidth / 595);
        setPreviewScale(scale);
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setInfo(prev => ({ ...prev, [name]: value }));
  };

  const generateWithAI = async () => {
    if (!info.applicantName || !info.reason) {
      toast.error("Please provide at least your name and reason for leave");
      return;
    }

    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Write a professional leave application for a ${context} context.
      Details:
      - Applicant Name: ${info.applicantName}
      - Designation/Class: ${info.designation}
      - Department/Section: ${info.department}
      - Recipient: ${info.recipientName} (${info.recipientDesignation})
      - Organization: ${info.organizationName}
      - Type of Leave: ${info.leaveType}
      - Dates: From ${info.startDate} to ${info.endDate}
      - Reason: ${info.reason}
      - Contact Info: ${info.contactInfo}
      
      The application should be well-structured, polite, and formal. Include placeholders for date and signature if not provided. Return only the body of the application.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      setGeneratedContent(response.text || '');
      toast.success("Application generated successfully!");
    } catch (error) {
      console.error("AI Generation error:", error);
      toast.error("Failed to generate application with AI");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = async () => {
    if (!applicationRef.current) return;
    setLoading(true);
    try {
      const canvas = await html2canvas(applicationRef.current, {
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
      pdf.save(`Leave_Application_${info.applicantName.replace(/\s+/g, '_')}.pdf`);

      if (profile && profile.role !== 'admin') {
        await updateDoc(doc(db, 'users', profile.uid), {
          usageCount: increment(1),
          lastUsedAt: new Date().toISOString()
        });
      }
      toast.success("Application downloaded!");
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
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
                <FileText className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Leave Application</h1>
                <p className="text-gray-500 text-sm font-medium">AI-powered professional leave requests.</p>
              </div>
            </div>

            {/* Context Selection */}
            <div className="space-y-3">
              <label className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <Layout className="w-4 h-4 text-indigo-500" /> Context
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'office', icon: Briefcase, label: 'Office' },
                  { id: 'school', icon: School, label: 'School' },
                  { id: 'college', icon: GraduationCap, label: 'College' },
                  { id: 'other', icon: User, label: 'Other' }
                ].map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setContext(c.id as ApplicationContext)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                      context === c.id 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' 
                        : 'bg-gray-50 border-gray-100 text-gray-500 hover:border-indigo-200'
                    }`}
                  >
                    <c.icon className="w-5 h-5" />
                    <span className="text-[10px] font-black uppercase">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Template Selection */}
            <div className="space-y-3">
              <label className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <Layout className="w-4 h-4 text-purple-500" /> Template Style
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['formal', 'modern', 'creative'] as TemplateType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTemplate(t)}
                    className={`py-2 px-2 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border-2 ${
                      template === t 
                        ? 'bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-100' 
                        : 'bg-gray-50 border-gray-100 text-gray-500 hover:border-purple-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Your Name</label>
                  <input
                    name="applicantName"
                    value={info.applicantName}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Designation / Class</label>
                  <input
                    name="designation"
                    value={info.designation}
                    onChange={handleInputChange}
                    placeholder="Software Engineer / 10th Grade"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Recipient Name</label>
                  <input
                    name="recipientName"
                    value={info.recipientName}
                    onChange={handleInputChange}
                    placeholder="Manager / Principal Name"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Recipient Designation</label>
                  <input
                    name="recipientDesignation"
                    value={info.recipientDesignation}
                    onChange={handleInputChange}
                    placeholder="Manager / Principal"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Leave Type</label>
                  <select
                    name="leaveType"
                    value={info.leaveType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold appearance-none"
                  >
                    <option>Sick Leave</option>
                    <option>Casual Leave</option>
                    <option>Annual Leave</option>
                    <option>Maternity Leave</option>
                    <option>Paternity Leave</option>
                    <option>Emergency Leave</option>
                    <option>Study Leave</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Organization Name</label>
                  <input
                    name="organizationName"
                    value={info.organizationName}
                    onChange={handleInputChange}
                    placeholder="Company / School Name"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Start Date</label>
                  <input
                    type="date"
                    name="startDate"
                    value={info.startDate}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">End Date</label>
                  <input
                    type="date"
                    name="endDate"
                    value={info.endDate}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Reason for Leave (for AI)</label>
                <textarea
                  name="reason"
                  value={info.reason}
                  onChange={handleInputChange}
                  placeholder="Briefly explain why you need leave..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium h-24 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Final Application Content (Editable)</label>
                <textarea
                  name="generatedContent"
                  value={generatedContent}
                  onChange={(e) => setGeneratedContent(e.target.value)}
                  placeholder="Click 'AI Generate' or type your application here..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium h-48 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={generateWithAI}
                disabled={isGenerating}
                className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                AI Generate
              </button>
              <button
                onClick={downloadPDF}
                disabled={loading || !generatedContent}
                className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-black hover:bg-black transition-all shadow-xl shadow-gray-200 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                Download PDF
              </button>
            </div>
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
                ref={applicationRef}
              >
                {/* Formal Template */}
                {template === 'formal' && (
                  <div className="p-16 space-y-8 font-serif text-gray-900">
                    <div className="space-y-1">
                      <p className="font-bold">To,</p>
                      <p className="font-bold">{info.recipientName || '[Recipient Name]'}</p>
                      <p>{info.recipientDesignation || '[Recipient Designation]'}</p>
                      <p>{info.organizationName || '[Organization Name]'}</p>
                    </div>

                    <div className="pt-4">
                      <p className="font-bold">Date: {new Date().toLocaleDateString()}</p>
                    </div>

                    <div className="pt-4">
                      <p className="font-bold underline uppercase tracking-tight">Subject: Application for {info.leaveType || 'Leave'}</p>
                    </div>

                    <div className="pt-4">
                      <p>Respected Sir/Madam,</p>
                    </div>

                    <div className="whitespace-pre-wrap leading-relaxed text-justify">
                      {generatedContent || "Click 'AI Generate' to create your application content based on the information provided."}
                    </div>

                    <div className="pt-12 space-y-1">
                      <p>Yours sincerely,</p>
                      <div className="h-12" />
                      <p className="font-bold">{info.applicantName || '[Your Name]'}</p>
                      <p className="text-sm text-gray-600">{info.designation}</p>
                      <p className="text-sm text-gray-600">{info.department}</p>
                    </div>
                  </div>
                )}

                {/* Modern Template */}
                {template === 'modern' && (
                  <div className="p-16 space-y-12 font-sans text-gray-800 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full -mr-32 -mt-32 opacity-50" />
                    
                    <div className="relative flex justify-between items-start">
                      <div className="space-y-1">
                        <h1 className="text-3xl font-black text-indigo-600 uppercase tracking-tighter">Leave Request</h1>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{info.leaveType}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">{new Date().toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="relative grid grid-cols-2 gap-12 pt-8">
                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-100 pb-1 inline-block">From</p>
                        <div className="space-y-0.5">
                          <p className="font-black text-gray-900">{info.applicantName || 'Your Name'}</p>
                          <p className="text-xs text-gray-500">{info.designation}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-100 pb-1 inline-block">To</p>
                        <div className="space-y-0.5">
                          <p className="font-black text-gray-900">{info.recipientName || 'Recipient'}</p>
                          <p className="text-xs text-gray-500">{info.recipientDesignation}</p>
                        </div>
                      </div>
                    </div>

                    <div className="relative bg-gray-50 p-8 rounded-3xl border border-gray-100 italic leading-relaxed text-gray-700">
                      {generatedContent || "Your professional leave application content will appear here..."}
                    </div>

                    <div className="relative flex justify-between items-end pt-12">
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                            <Calendar className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Duration</p>
                            <p className="text-sm font-bold text-gray-900">{info.startDate} to {info.endDate}</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-center space-y-2">
                        <div className="w-40 h-px bg-gray-200" />
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Digital Signature</p>
                        <p className="font-serif italic text-lg text-gray-900">{info.applicantName}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Creative Template */}
                {template === 'creative' && (
                  <div className="p-16 space-y-10 font-sans text-gray-900">
                    <div className="border-l-8 border-indigo-600 pl-8 py-4">
                      <h1 className="text-5xl font-black tracking-tighter uppercase leading-none">Leave<br/><span className="text-indigo-600">Application</span></h1>
                    </div>

                    <div className="flex justify-between items-center bg-indigo-600 text-white p-6 rounded-2xl">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                          <User className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">Applicant</p>
                          <p className="font-black">{info.applicantName || 'Your Name'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">Date</p>
                        <p className="font-black">{new Date().toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-8">
                      <div className="col-span-2 space-y-6">
                        <div className="space-y-2">
                          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">The Message</p>
                          <div className="text-sm leading-relaxed text-gray-600 whitespace-pre-wrap">
                            {generatedContent || "Click 'AI Generate' to create your application content..."}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-8">
                        <div className="space-y-2">
                          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Recipient</p>
                          <p className="text-sm font-bold text-gray-900">{info.recipientName}</p>
                          <p className="text-xs text-gray-500">{info.recipientDesignation}</p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Organization</p>
                          <p className="text-sm font-bold text-gray-900">{info.organizationName}</p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Type</p>
                          <p className="text-sm font-bold text-indigo-600">{info.leaveType}</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-12 border-t border-gray-100 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                          <PenTool className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Authorized by Applicant</p>
                      </div>
                      <p className="font-black text-xl tracking-tighter uppercase">{info.applicantName}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <ToolAdWrapper position="tool_bottom" />
    </div>
  );
}
