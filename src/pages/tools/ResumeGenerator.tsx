import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Mail, Phone, MapPin, Globe, Briefcase, GraduationCap, 
  Code, Languages, FileText, Download, Trash2, Loader2, 
  Upload, Plus, Image as ImageIcon, PenTool, CheckCircle2,
  ChevronLeft, ChevronRight, Save
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import { UserProfile, AppSettings } from '../../types';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../firebase';
import { getDailyLimit } from '../../lib/utils';

interface ResumeData {
  personalInfo: {
    fullName: string;
    title: string;
    email: string;
    phone: string;
    address: string;
    website: string;
    objective: string;
    photo: string | null;
    signature: string | null;
  };
  education: {
    id: string;
    school: string;
    degree: string;
    year: string;
    description: string;
  }[];
  experience: {
    id: string;
    company: string;
    position: string;
    duration: string;
    description: string;
  }[];
  skills: string[];
  languages: string[];
}

const initialData: ResumeData = {
  personalInfo: {
    fullName: '',
    title: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    objective: '',
    photo: null,
    signature: null,
  },
  education: [],
  experience: [],
  skills: [],
  languages: [],
};

export default function ResumeGenerator({ profile, settings }: { profile: UserProfile | null, settings: AppSettings | null }) {
  const [data, setData] = useState<ResumeData>(initialData);
  const [step, setStep] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (section: keyof ResumeData, field: string, value: any) => {
    if (section === 'personalInfo') {
      setData(prev => ({
        ...prev,
        personalInfo: { ...prev.personalInfo, [field]: value }
      }));
    }
  };

  const addListItem = (section: 'education' | 'experience') => {
    const newItem = section === 'education' 
      ? { id: Math.random().toString(36).substr(2, 9), school: '', degree: '', year: '', description: '' }
      : { id: Math.random().toString(36).substr(2, 9), company: '', position: '', duration: '', description: '' };
    
    setData(prev => ({
      ...prev,
      [section]: [...prev[section], newItem]
    }));
  };

  const updateListItem = (section: 'education' | 'experience', id: string, field: string, value: string) => {
    setData(prev => ({
      ...prev,
      [section]: prev[section].map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const removeListItem = (section: 'education' | 'experience', id: string) => {
    setData(prev => ({
      ...prev,
      [section]: prev[section].filter(item => item.id !== id)
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'photo' | 'signature') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        handleInputChange('personalInfo', field, event.target?.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const generatePDF = async () => {
    if (!data.personalInfo.fullName) {
      toast.error("Please enter your full name at least.");
      return;
    }

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
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const sidebarWidth = 70;
      const margin = 10;
      const contentWidth = pageWidth - sidebarWidth - (margin * 2);
      
      // Colors
      const primaryColor = [30, 41, 59]; // Slate 800
      const accentColor = [37, 99, 235]; // Blue 600
      const textColor = [51, 65, 85]; // Slate 700
      const lightTextColor = [100, 116, 139]; // Slate 500

      // Sidebar Background
      pdf.setFillColor(248, 250, 252); // Slate 50
      pdf.rect(0, 0, sidebarWidth, pageHeight, 'F');

      let leftY = 20;
      let rightY = 20;

      // --- SIDEBAR (LEFT) ---
      // Photo
      if (data.personalInfo.photo) {
        const photoSize = 40;
        pdf.addImage(data.personalInfo.photo, 'JPEG', (sidebarWidth - photoSize) / 2, leftY, photoSize, photoSize);
        leftY += photoSize + 15;
      }

      // Contact Section
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.text('CONTACT', margin, leftY);
      leftY += 6;
      pdf.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
      pdf.setLineWidth(0.5);
      pdf.line(margin, leftY, sidebarWidth - margin, leftY);
      leftY += 8;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(textColor[0], textColor[1], textColor[2]);

      const contactItems = [
        { label: 'Email', value: data.personalInfo.email },
        { label: 'Phone', value: data.personalInfo.phone },
        { label: 'Address', value: data.personalInfo.address },
        { label: 'Website', value: data.personalInfo.website }
      ];

      contactItems.forEach(item => {
        if (item.value) {
          pdf.setFont('helvetica', 'bold');
          pdf.text(item.label, margin, leftY);
          leftY += 4;
          pdf.setFont('helvetica', 'normal');
          const splitVal = pdf.splitTextToSize(item.value, sidebarWidth - (margin * 2));
          pdf.text(splitVal, margin, leftY);
          leftY += (splitVal.length * 4) + 4;
        }
      });

      // Skills Section
      if (data.skills.length > 0) {
        leftY += 5;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        pdf.text('SKILLS', margin, leftY);
        leftY += 6;
        pdf.line(margin, leftY, sidebarWidth - margin, leftY);
        leftY += 8;

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        
        data.skills.forEach(skill => {
          const textWidth = pdf.getTextWidth(skill);
          const pillWidth = textWidth + 6;
          const pillHeight = 6;
          
          if (leftY + pillHeight > pageHeight - margin) {
            pdf.addPage();
            pdf.setFillColor(248, 250, 252);
            pdf.rect(0, 0, sidebarWidth, pageHeight, 'F');
            leftY = 20;
          }

          pdf.setFillColor(226, 232, 240); // Slate 200
          pdf.roundedRect(margin, leftY, pillWidth, pillHeight, 2, 2, 'F');
          pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          pdf.text(skill, margin + 3, leftY + 4);
          leftY += pillHeight + 2;
        });
      }

      // Languages Section
      if (data.languages.length > 0) {
        leftY += 5;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        pdf.text('LANGUAGES', margin, leftY);
        leftY += 6;
        pdf.line(margin, leftY, sidebarWidth - margin, leftY);
        leftY += 8;

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
        
        data.languages.forEach(lang => {
          pdf.text('• ' + lang, margin, leftY);
          leftY += 5;
        });
      }

      // --- MAIN CONTENT (RIGHT) ---
      const rightX = sidebarWidth + margin;

      // Name & Title
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(28);
      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.text(data.personalInfo.fullName.toUpperCase(), rightX, rightY);
      rightY += 10;
      
      pdf.setFontSize(14);
      pdf.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
      pdf.text(data.personalInfo.title || 'PROFESSIONAL', rightX, rightY);
      rightY += 15;

      // Summary
      if (data.personalInfo.objective) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        pdf.text('PROFILE', rightX, rightY);
        rightY += 4;
        pdf.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
        pdf.line(rightX, rightY, pageWidth - margin, rightY);
        rightY += 8;

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
        const splitObjective = pdf.splitTextToSize(data.personalInfo.objective, contentWidth);
        pdf.text(splitObjective, rightX, rightY);
        rightY += (splitObjective.length * 5) + 10;
      }

      // Experience
      if (data.experience.length > 0) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        pdf.text('EXPERIENCE', rightX, rightY);
        rightY += 4;
        pdf.line(rightX, rightY, pageWidth - margin, rightY);
        rightY += 8;
        
        data.experience.forEach(exp => {
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(11);
          pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          pdf.text(exp.position, rightX, rightY);
          
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(9);
          pdf.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
          pdf.text(exp.duration, pageWidth - margin, rightY, { align: 'right' });
          rightY += 5;

          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(10);
          pdf.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
          pdf.text(exp.company, rightX, rightY);
          rightY += 5;

          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);
          pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
          const splitDesc = pdf.splitTextToSize(exp.description, contentWidth);
          pdf.text(splitDesc, rightX, rightY);
          rightY += (splitDesc.length * 5) + 8;

          if (rightY > 270) { pdf.addPage(); rightY = 20; }
        });
      }

      // Education
      if (data.education.length > 0) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        pdf.text('EDUCATION', rightX, rightY);
        rightY += 4;
        pdf.line(rightX, rightY, pageWidth - margin, rightY);
        rightY += 8;

        data.education.forEach(edu => {
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(11);
          pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          pdf.text(edu.degree, rightX, rightY);
          
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(9);
          pdf.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
          pdf.text(edu.year, pageWidth - margin, rightY, { align: 'right' });
          rightY += 5;

          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(10);
          pdf.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
          pdf.text(edu.school, rightX, rightY);
          rightY += 5;

          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);
          pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
          const splitDesc = pdf.splitTextToSize(edu.description, contentWidth);
          pdf.text(splitDesc, rightX, rightY);
          rightY += (splitDesc.length * 5) + 8;

          if (rightY > 270) { pdf.addPage(); rightY = 20; }
        });
      }

      // Signature
      if (data.personalInfo.signature) {
        rightY += 10;
        if (rightY > 250) { pdf.addPage(); rightY = 20; }
        pdf.addImage(data.personalInfo.signature, 'PNG', rightX, rightY, 40, 15);
        rightY += 20;
        pdf.setDrawColor(150, 150, 150);
        pdf.line(rightX, rightY, rightX + 50, rightY);
        rightY += 5;
        pdf.setFontSize(8);
        pdf.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
        pdf.text('Candidate Signature', rightX, rightY);
      }

      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      toast.success("Resume generated successfully!");

      // Update usage (skip for admins to save writes)
      if (profile && profile.role !== 'admin') {
        await updateDoc(doc(db, 'users', profile.uid), {
          usageCount: increment(1),
          lastUsedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate resume.");
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!previewUrl) return;
    const link = document.createElement('a');
    link.href = previewUrl;
    link.download = `${data.personalInfo.fullName.replace(/\s+/g, '_')}_Resume.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-8 px-4">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary text-sm font-bold rounded-full border border-primary/20">
          <FileText className="w-4 h-4" />
          PROFESSIONAL BUILDER
        </div>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">
          Resume <span className="text-primary">Generator</span>
        </h1>
        <p className="text-gray-600 max-w-xl mx-auto">
          Create a professional, job-ready resume in minutes. Perfect for jobs, admissions, and academic purposes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Section */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden">
            {/* Steps Header */}
            <div className="flex border-b border-gray-50">
              {[1, 2, 3, 4].map((s) => (
                <button
                  key={s}
                  onClick={() => setStep(s)}
                  className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${
                    step === s ? 'bg-primary text-white' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                  }`}
                >
                  Step {s}
                </button>
              ))}
            </div>

            <div className="p-8 min-h-[500px]">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div 
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                      <User className="w-5 h-5 text-primary" /> Personal Information
                    </h3>
                    
                    <div className="flex flex-col md:flex-row gap-8">
                      <div className="space-y-4 flex-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Full Name</label>
                            <input 
                              type="text" 
                              value={data.personalInfo.fullName}
                              onChange={(e) => handleInputChange('personalInfo', 'fullName', e.target.value)}
                              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold"
                              placeholder="John Doe"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Professional Title</label>
                            <input 
                              type="text" 
                              value={data.personalInfo.title}
                              onChange={(e) => handleInputChange('personalInfo', 'title', e.target.value)}
                              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold"
                              placeholder="Software Engineer"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Email</label>
                            <input 
                              type="email" 
                              value={data.personalInfo.email}
                              onChange={(e) => handleInputChange('personalInfo', 'email', e.target.value)}
                              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold"
                              placeholder="john@example.com"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Phone</label>
                            <input 
                              type="text" 
                              value={data.personalInfo.phone}
                              onChange={(e) => handleInputChange('personalInfo', 'phone', e.target.value)}
                              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold"
                              placeholder="+1 234 567 890"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500 uppercase">Address</label>
                          <input 
                            type="text" 
                            value={data.personalInfo.address}
                            onChange={(e) => handleInputChange('personalInfo', 'address', e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold"
                            placeholder="City, Country"
                          />
                        </div>
                      </div>

                      <div className="w-full md:w-48 space-y-4">
                        <div 
                          onClick={() => photoInputRef.current?.click()}
                          className="aspect-square bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all overflow-hidden"
                        >
                          {data.personalInfo.photo ? (
                            <img src={data.personalInfo.photo} className="w-full h-full object-cover" />
                          ) : (
                            <>
                              <ImageIcon className="w-8 h-8 text-gray-300" />
                              <span className="text-[10px] font-black text-gray-400 uppercase">Passport Photo</span>
                            </>
                          )}
                        </div>
                        <input type="file" ref={photoInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'photo')} />
                        
                        <div 
                          onClick={() => signatureInputRef.current?.click()}
                          className="h-20 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all overflow-hidden"
                        >
                          {data.personalInfo.signature ? (
                            <img src={data.personalInfo.signature} className="h-full object-contain" />
                          ) : (
                            <>
                              <PenTool className="w-5 h-5 text-gray-300" />
                              <span className="text-[10px] font-black text-gray-400 uppercase">Signature</span>
                            </>
                          )}
                        </div>
                        <input type="file" ref={signatureInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'signature')} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase">Professional Summary / Objective</label>
                      <textarea 
                        value={data.personalInfo.objective}
                        onChange={(e) => handleInputChange('personalInfo', 'objective', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold min-h-[120px] resize-none"
                        placeholder="Briefly describe your career goals and key achievements..."
                      />
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div 
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-primary" /> Work Experience
                      </h3>
                      <button 
                        onClick={() => addListItem('experience')}
                        className="px-4 py-2 bg-primary/10 text-primary rounded-xl text-xs font-black uppercase hover:bg-primary hover:text-white transition-all flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> Add Experience
                      </button>
                    </div>

                    <div className="space-y-4">
                      {data.experience.map((exp) => (
                        <div key={exp.id} className="p-6 bg-gray-50 rounded-3xl border border-gray-100 space-y-4 relative group">
                          <button 
                            onClick={() => removeListItem('experience', exp.id)}
                            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-gray-500 uppercase">Company</label>
                              <input 
                                type="text" 
                                value={exp.company}
                                onChange={(e) => updateListItem('experience', exp.id, 'company', e.target.value)}
                                className="w-full px-4 py-2 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-gray-500 uppercase">Position</label>
                              <input 
                                type="text" 
                                value={exp.position}
                                onChange={(e) => updateListItem('experience', exp.id, 'position', e.target.value)}
                                className="w-full px-4 py-2 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-gray-500 uppercase">Duration</label>
                              <input 
                                type="text" 
                                value={exp.duration}
                                onChange={(e) => updateListItem('experience', exp.id, 'duration', e.target.value)}
                                className="w-full px-4 py-2 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold"
                                placeholder="Jan 2020 - Present"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
                            <textarea 
                              value={exp.description}
                              onChange={(e) => updateListItem('experience', exp.id, 'description', e.target.value)}
                              className="w-full px-4 py-2 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold min-h-[80px] resize-none"
                            />
                          </div>
                        </div>
                      ))}
                      {data.experience.length === 0 && (
                        <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-[2rem] text-gray-400">
                          <p className="text-sm font-bold">No experience added yet.</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div 
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-primary" /> Education
                      </h3>
                      <button 
                        onClick={() => addListItem('education')}
                        className="px-4 py-2 bg-primary/10 text-primary rounded-xl text-xs font-black uppercase hover:bg-primary hover:text-white transition-all flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> Add Education
                      </button>
                    </div>

                    <div className="space-y-4">
                      {data.education.map((edu) => (
                        <div key={edu.id} className="p-6 bg-gray-50 rounded-3xl border border-gray-100 space-y-4 relative group">
                          <button 
                            onClick={() => removeListItem('education', edu.id)}
                            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-gray-500 uppercase">School / University</label>
                              <input 
                                type="text" 
                                value={edu.school}
                                onChange={(e) => updateListItem('education', edu.id, 'school', e.target.value)}
                                className="w-full px-4 py-2 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-gray-500 uppercase">Degree / Course</label>
                              <input 
                                type="text" 
                                value={edu.degree}
                                onChange={(e) => updateListItem('education', edu.id, 'degree', e.target.value)}
                                className="w-full px-4 py-2 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-gray-500 uppercase">Year</label>
                              <input 
                                type="text" 
                                value={edu.year}
                                onChange={(e) => updateListItem('education', edu.id, 'year', e.target.value)}
                                className="w-full px-4 py-2 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold"
                                placeholder="2016 - 2020"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Description / Achievements</label>
                            <textarea 
                              value={edu.description}
                              onChange={(e) => updateListItem('education', edu.id, 'description', e.target.value)}
                              className="w-full px-4 py-2 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold min-h-[80px] resize-none"
                            />
                          </div>
                        </div>
                      ))}
                      {data.education.length === 0 && (
                        <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-[2rem] text-gray-400">
                          <p className="text-sm font-bold">No education added yet.</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {step === 4 && (
                  <motion.div 
                    key="step4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-8"
                  >
                    <div className="space-y-4">
                      <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                        <Code className="w-5 h-5 text-primary" /> Skills & Expertise
                      </h3>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Skills (Comma separated)</label>
                        <input 
                          type="text" 
                          value={data.skills.join(', ')}
                          onChange={(e) => setData(prev => ({ ...prev, skills: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold"
                          placeholder="React, TypeScript, Node.js, Design..."
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                        <Languages className="w-5 h-5 text-primary" /> Languages
                      </h3>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Languages (Comma separated)</label>
                        <input 
                          type="text" 
                          value={data.languages.join(', ')}
                          onChange={(e) => setData(prev => ({ ...prev, languages: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold"
                          placeholder="English, Spanish, French..."
                        />
                      </div>
                    </div>

                    <div className="pt-8 border-t border-gray-50">
                      <button 
                        onClick={generatePDF}
                        disabled={processing}
                        className="w-full py-5 bg-primary text-white rounded-2xl font-black hover:bg-secondary transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3"
                      >
                        {processing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                        Generate Final Resume
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Navigation Buttons */}
            <div className="flex p-8 bg-gray-50/50 border-t border-gray-50">
              <button 
                onClick={() => setStep(Math.max(1, step - 1))}
                disabled={step === 1}
                className="px-6 py-3 bg-white text-gray-600 rounded-xl font-bold hover:bg-gray-100 transition-all flex items-center gap-2 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <div className="flex-1" />
              {step < 4 && (
                <button 
                  onClick={() => setStep(step + 1)}
                  className="px-8 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all flex items-center gap-2"
                >
                  Next Step <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Preview Section */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden sticky top-24">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <h3 className="font-black text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" /> Live Preview
              </h3>
              {previewUrl && (
                <button 
                  onClick={handleDownload}
                  className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-all"
                  title="Download PDF"
                >
                  <Download className="w-5 h-5" />
                </button>
              )}
            </div>
            <div className="aspect-[1/1.414] bg-gray-100 p-4 overflow-hidden">
              {previewUrl ? (
                <iframe 
                  src={previewUrl} 
                  className="w-full h-full rounded-lg border border-gray-200 shadow-sm"
                  title="Resume Preview"
                />
              ) : (
                <div className="w-full h-full border-4 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 p-8 text-center space-y-4">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                    <FileText className="w-8 h-8 opacity-20" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">No Preview Available</p>
                    <p className="text-[10px] uppercase font-black tracking-widest opacity-60">Complete the form and click generate</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
