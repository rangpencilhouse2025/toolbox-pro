import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Book, 
  Wand2, 
  Users, 
  Layout, 
  Image as ImageIcon, 
  Download, 
  ChevronRight, 
  ChevronLeft, 
  Plus, 
  Trash2, 
  Type, 
  Sparkles,
  Loader2,
  CheckCircle2,
  Save,
  PenTool,
  BookOpen,
  Palette,
  X
} from 'lucide-react';
import { GoogleGenAI, Type as GenAIType } from "@google/genai";
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';

// Custom components for book-like experience
const BookPage = ({ children, pageNumber, totalPages, theme }: { children: React.ReactNode, pageNumber: number, totalPages: number, theme?: string }) => {
  const currentTheme = THEMES.find(t => t.id === theme) || THEMES[0];
  
  return (
    <motion.div 
      initial={{ rotateY: 90, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      exit={{ rotateY: -90, opacity: 0 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      className="w-full h-full shadow-inner p-8 sm:p-12 relative flex flex-col overflow-hidden border-l border-gray-100/10"
      style={{ 
        transformOrigin: "left",
        backgroundColor: currentTheme.bg,
        color: currentTheme.text
      }}
    >
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {children}
      </div>
      <div 
        className="mt-4 pt-4 border-t flex justify-center items-center text-[10px] font-bold uppercase tracking-widest opacity-40"
        style={{ borderColor: `${currentTheme.text}20` }}
      >
        {pageNumber} / {totalPages}
      </div>
    </motion.div>
  );
};

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// Helper to safely parse JSON from AI response
const parseAIJSON = (text: string) => {
  try {
    // Remove potential markdown code blocks
    const cleanText = text.replace(/```json\n?|```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Failed to parse AI JSON:", e);
    return null;
  }
};

interface Character {
  id: string;
  name: string;
  role: string;
  description: string;
  image?: string;
}

interface Chapter {
  id: string;
  title: string;
  content: string;
  summary: string;
  image?: string;
}

interface EBookData {
  title: string;
  genre: string;
  audience: string;
  tone: string;
  description: string;
  chapterCount: number;
  language: string;
  writingStyle: string;
  characters: Character[];
  chapters: Chapter[];
  coverImage?: string;
  theme: 'classic' | 'modern' | 'dark' | 'sepia';
}

const GENRES = [
  'Fantasy', 'Science Fiction', 'Mystery', 'Romance', 'Horror', 
  'Thriller', 'Historical Fiction', 'Non-Fiction', 'Self-Help', 
  'Biography', 'Children\'s Story', 'Educational', 'Action', 'Adventure'
];

const LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Hindi', 'Bengali', 'Japanese', 'Chinese'
];

const WRITING_STYLES = [
  'Descriptive', 'Minimalist', 'Poetic', 'Journalistic', 'Academic', 'Conversational', 'Humorous'
];

const THEMES = [
  { id: 'classic', name: 'Classic', bg: '#fdfcf8', text: '#111827', accent: '#4f46e2' },
  { id: 'modern', name: 'Modern', bg: '#ffffff', text: '#1f2937', accent: '#06b6d4' },
  { id: 'dark', name: 'Midnight', bg: '#111827', text: '#f3f4f6', accent: '#818cf8' },
  { id: 'sepia', name: 'Vintage', bg: '#f4ecd8', text: '#433422', accent: '#92400e' }
];

const FONTS = [
  { name: 'Inter', family: 'Inter, sans-serif' },
  { name: 'Serif', family: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif' },
  { name: 'Mono', family: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' },
  { name: 'Playfair', family: '"Playfair Display", serif' },
  { name: 'Montserrat', family: '"Montserrat", sans-serif' }
];

export default function EBookGenerator() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [generatingPart, setGeneratingPart] = useState<string | null>(null);
  const [data, setData] = useState<EBookData>(() => {
    const saved = localStorage.getItem('ai_ebook_data');
    if (saved) return JSON.parse(saved);
    return {
      title: '',
      genre: 'Fantasy',
      audience: 'Young Adults',
      tone: 'Inspiring',
      description: '',
      chapterCount: 5,
      language: 'English',
      writingStyle: 'Descriptive',
      characters: [],
      chapters: [],
      theme: 'classic'
    };
  });
  const [selectedFont, setSelectedFont] = useState(FONTS[0]);
  const [previewMode, setPreviewMode] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [editingChapter, setEditingChapter] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('ai_ebook_data', JSON.stringify(data));
  }, [data]);

  const resetData = () => {
    if (window.confirm('Are you sure you want to reset all data? This will clear your current book.')) {
      setData({
        title: '',
        genre: 'Fantasy',
        audience: 'Young Adults',
        tone: 'Inspiring',
        description: '',
        chapterCount: 5,
        language: 'English',
        writingStyle: 'Descriptive',
        characters: [],
        chapters: [],
        theme: 'classic'
      });
      setStep(1);
      setCurrentPage(0);
      localStorage.removeItem('ai_ebook_data');
      toast.success('Data reset successfully');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setData(prev => ({ ...prev, [name]: value }));
  };

  const generateInitialConcept = async () => {
    if (!data.title && !data.description) {
      toast.error('Please provide at least a title or a brief description.');
      return;
    }

    setLoading(true);
    setGeneratingPart('concept');
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate a detailed e-book concept based on:
        Title: ${data.title}
        Genre: ${data.genre}
        Audience: ${data.audience}
        Tone: ${data.tone}
        Language: ${data.language}
        Writing Style: ${data.writingStyle}
        Chapter Count: ${data.chapterCount}
        Initial Description: ${data.description}

        Return a JSON object with:
        {
          "title": "A catchy title if original was weak",
          "description": "A compelling 2-3 paragraph book description",
          "characters": [
            { "name": "Name", "role": "Protagonist/Antagonist/etc", "description": "Detailed physical and personality description" }
          ],
          "chapters": [
            { "title": "Chapter 1: Title", "summary": "What happens in this chapter" }
          ]
        }`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: GenAIType.OBJECT,
            properties: {
              title: { type: GenAIType.STRING },
              description: { type: GenAIType.STRING },
              characters: {
                type: GenAIType.ARRAY,
                items: {
                  type: GenAIType.OBJECT,
                  properties: {
                    name: { type: GenAIType.STRING },
                    role: { type: GenAIType.STRING },
                    description: { type: GenAIType.STRING }
                  }
                }
              },
              chapters: {
                type: GenAIType.ARRAY,
                items: {
                  type: GenAIType.OBJECT,
                  properties: {
                    title: { type: GenAIType.STRING },
                    summary: { type: GenAIType.STRING }
                  }
                }
              }
            }
          }
        }
      });

      const result = parseAIJSON(response.text);
      if (!result) {
        throw new Error("Invalid response format from AI");
      }
      
      setData(prev => ({
        ...prev,
        title: result.title || prev.title,
        description: result.description || prev.description,
        characters: (result.characters || []).map((c: any) => ({ 
          ...c, 
          id: Math.random().toString(36).substr(2, 9),
          description: c.description || '' 
        })),
        chapters: (result.chapters || []).map((c: any) => ({ 
          ...c, 
          id: Math.random().toString(36).substr(2, 9), 
          content: '',
          summary: c.summary || ''
        }))
      }));
      setStep(2);
      toast.success('Concept generated successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate concept. Please try again.');
    } finally {
      setLoading(false);
      setGeneratingPart(null);
    }
  };

  const generateChapterContent = async (chapterId: string) => {
    const chapter = data.chapters.find(c => c.id === chapterId);
    if (!chapter) return;

    setGeneratingPart(`chapter-${chapterId}`);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Write a high-quality, professional book chapter.
        Book Title: ${data.title}
        Genre: ${data.genre}
        Tone: ${data.tone}
        Language: ${data.language}
        Writing Style: ${data.writingStyle}
        Target Audience: ${data.audience}
        Chapter Title: ${chapter.title}
        Chapter Summary: ${chapter.summary}
        
        Context of previous events: ${data.chapters.slice(0, data.chapters.indexOf(chapter)).map(c => c.summary).join(' ')}
        
        Requirements:
        1. Write in a professional literary style suitable for a published e-book in ${data.language}.
        2. Use ${data.writingStyle} writing style.
        3. Use descriptive language, dialogue, and emotional depth.
        4. Length: 800-1200 words.
        5. Do not include meta-talk, just the story content.
        6. Use proper paragraph breaks.`,
      });

      setData(prev => ({
        ...prev,
        chapters: prev.chapters.map(c => 
          c.id === chapterId ? { ...c, content: response.text } : c
        )
      }));
      toast.success(`${chapter.title} generated!`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate chapter content.');
    } finally {
      setGeneratingPart(null);
    }
  };

  const generateCharacter = async (charId: string) => {
    const char = data.characters.find(c => c.id === charId);
    if (!char) return;

    setGeneratingPart(`character-${charId}`);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Enhance this character for a book:
        Book Title: ${data.title}
        Genre: ${data.genre}
        Current Character Name: ${char.name}
        Current Role: ${char.role}
        Current Description: ${char.description}

        Return a JSON object with:
        {
          "name": "Enhanced Name",
          "role": "Enhanced Role",
          "description": "Detailed physical and personality description (2-3 paragraphs)"
        }`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: GenAIType.OBJECT,
            properties: {
              name: { type: GenAIType.STRING },
              role: { type: GenAIType.STRING },
              description: { type: GenAIType.STRING }
            },
            required: ["name", "role", "description"]
          }
        }
      });

      const result = parseAIJSON(response.text);
      if (!result) throw new Error("Invalid response");

      setData(prev => ({
        ...prev,
        characters: prev.characters.map(c => c.id === charId ? { ...c, ...result } : c)
      }));
      toast.success('Character enhanced!');
    } catch (error) {
      console.error('Error enhancing character:', error);
      toast.error('Failed to enhance character.');
    } finally {
      setGeneratingPart(null);
    }
  };

  const generateImage = async (type: 'character' | 'background' | 'cover', id?: string) => {
    setGeneratingPart(`image-${type}-${id || 'main'}`);
    try {
      let prompt = "";
      if (type === 'character' && id) {
        const char = data.characters.find(c => c.id === id);
        prompt = `A high-quality character portrait of ${char?.name}, who is a ${char?.role}. Description: ${char?.description}. Artistic style: Digital painting, detailed, cinematic lighting.`;
      } else if (type === 'background' && id) {
        const chap = data.chapters.find(c => c.id === id);
        prompt = `A cinematic background illustration for a book chapter titled "${chap?.title}". Scene: ${chap?.summary}. Style: ${data.genre} aesthetic, immersive, high detail.`;
      } else {
        prompt = `A professional book cover for "${data.title}". Genre: ${data.genre}. Theme: ${data.description.substring(0, 100)}. No text, just the background art. High-quality digital art.`;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
        config: { imageConfig: { aspectRatio: "3:4" } }
      });

      let imageUrl = "";
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (type === 'character') {
        setData(prev => ({
          ...prev,
          characters: prev.characters.map(c => c.id === id ? { ...c, image: imageUrl } : c)
        }));
      } else if (type === 'background') {
        setData(prev => ({
          ...prev,
          chapters: prev.chapters.map(c => c.id === id ? { ...c, image: imageUrl } : c)
        }));
      } else {
        setData(prev => ({ ...prev, coverImage: imageUrl }));
      }
      toast.success('Image generated successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate image.');
    } finally {
      setGeneratingPart(null);
    }
  };

  const generateAllChapters = async () => {
    setLoading(true);
    setGeneratingPart('all-chapters');
    try {
      for (const chapter of data.chapters) {
        if (!chapter.content) {
          await generateChapterContent(chapter.id);
        }
      }
      toast.success('All chapters generated successfully!');
    } catch (error) {
      toast.error('Failed to generate some chapters.');
    } finally {
      setLoading(false);
      setGeneratingPart(null);
    }
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 20;

    // Cover Page
    if (data.coverImage) {
      try {
        doc.addImage(data.coverImage, 'PNG', 0, 0, pageWidth, pageHeight);
        // Overlay Title on Cover
        doc.setFillColor(0, 0, 0, 0.5);
        doc.rect(0, pageHeight - 60, pageWidth, 60, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.text(data.title, pageWidth / 2, pageHeight - 40, { align: 'center' });
        doc.setFontSize(12);
        doc.text(`A ${data.genre} Story`, pageWidth / 2, pageHeight - 25, { align: 'center' });
      } catch (e) { console.error(e); }
    } else {
      doc.setFontSize(30);
      doc.setTextColor(17, 24, 39);
      doc.text(data.title, pageWidth / 2, 80, { align: 'center' });
      doc.setFontSize(16);
      doc.setTextColor(79, 70, 229);
      doc.text(`A ${data.genre} Story`, pageWidth / 2, 100, { align: 'center' });
    }

    // Characters Page
    doc.addPage();
    doc.setFontSize(24);
    doc.setTextColor(17, 24, 39);
    doc.text('Characters', 20, 20);
    y = 40;
    data.characters.forEach(char => {
      if (y > 240) { doc.addPage(); y = 20; }
      
      if (char.image) {
        try {
          doc.addImage(char.image, 'PNG', 20, y, 30, 40);
          doc.setFontSize(16);
          doc.setTextColor(79, 70, 229);
          doc.text(char.name, 55, y + 10);
          doc.setFontSize(10);
          doc.setTextColor(100, 116, 139);
          doc.text(`Role: ${char.role}`, 55, y + 17);
          doc.setTextColor(51, 65, 85);
          doc.setFontSize(11);
          const splitDesc = doc.splitTextToSize(char.description, 125);
          doc.text(splitDesc, 55, y + 25);
          y += Math.max(45, 25 + (splitDesc.length * 6));
        } catch (e) { y += 10; }
      } else {
        doc.setFontSize(16);
        doc.setTextColor(79, 70, 229);
        doc.text(char.name, 20, y);
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text(`Role: ${char.role}`, 20, y + 7);
        doc.setTextColor(51, 65, 85);
        doc.setFontSize(11);
        const splitDesc = doc.splitTextToSize(char.description, 170);
        doc.text(splitDesc, 20, y + 15);
        y += 25 + (splitDesc.length * 6);
      }
    });

    // Chapters
    data.chapters.forEach((chap, idx) => {
      doc.addPage();
      
      if (chap.image) {
        try {
          doc.addImage(chap.image, 'PNG', 0, 0, pageWidth, 80);
          y = 95;
        } catch (e) { y = 30; }
      } else {
        y = 30;
      }

      doc.setFontSize(10);
      doc.setTextColor(156, 163, 175);
      doc.text(`Chapter ${idx + 1}`, pageWidth / 2, y - 15, { align: 'center' });
      
      doc.setFontSize(22);
      doc.setTextColor(17, 24, 39);
      doc.text(chap.title, pageWidth / 2, y, { align: 'center' });
      
      doc.setFontSize(11);
      doc.setTextColor(55, 65, 81);
      const splitContent = doc.splitTextToSize(chap.content || 'Content not generated yet.', 170);
      
      let currentY = y + 15;
      splitContent.forEach((line: string) => {
        if (currentY > 280) {
          doc.addPage();
          currentY = 20;
        }
        doc.text(line, 20, currentY);
        currentY += 7;
      });
    });

    doc.save(`${data.title.replace(/\s+/g, '_')}_EBook.pdf`);
    toast.success('E-Book downloaded!');
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-xl text-white">
                <Book className="w-8 h-8" />
              </div>
              AI E-Book Generator
            </h1>
            <p className="text-gray-500 mt-1 font-medium">Create full-length books with AI characters, stories, and art.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={resetData}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              title="Reset All Data"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              {previewMode ? <PenTool className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
              <span className="hidden sm:inline">{previewMode ? 'Back to Editor' : 'Live Preview'}</span>
            </button>
            <button
              onClick={downloadPDF}
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export PDF</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Panel: Steps & Inputs */}
          <div className={`${previewMode ? 'hidden' : 'lg:col-span-7'} space-y-6 w-full`}>
            {/* Step Indicator */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between overflow-x-auto no-scrollbar">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex items-center shrink-0">
                  <div 
                    onClick={() => s < step && setStep(s)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                      step === s ? 'bg-indigo-600 text-white scale-110 shadow-lg shadow-indigo-200' : 
                      step > s ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
                  </div>
                  {s < 4 && <div className={`w-8 sm:w-12 h-0.5 mx-1 sm:mx-2 ${step > s ? 'bg-green-500' : 'bg-gray-100'}`} />}
                </div>
              ))}
              <div className="ml-4 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                {step === 1 && 'Concept'}
                {step === 2 && 'Characters'}
                {step === 3 && 'Chapters'}
                {step === 4 && 'Design'}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6"
                >
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Book Title</label>
                      <input
                        name="title"
                        value={data.title}
                        onChange={handleInputChange}
                        placeholder="Enter a title or let AI suggest one..."
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Genre</label>
                        <select
                          name="genre"
                          value={data.genre}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold appearance-none"
                        >
                          {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tone</label>
                        <select
                          name="tone"
                          value={data.tone}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold appearance-none"
                        >
                          <option value="Formal">Formal</option>
                          <option value="Casual">Casual</option>
                          <option value="Humorous">Humorous</option>
                          <option value="Dark">Dark</option>
                          <option value="Inspiring">Inspiring</option>
                          <option value="Educational">Educational</option>
                          <option value="Dramatic">Dramatic</option>
                          <option value="Mysterious">Mysterious</option>
                          <option value="Whimsical">Whimsical</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Language</label>
                        <select
                          name="language"
                          value={data.language}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold appearance-none"
                        >
                          {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Writing Style</label>
                        <select
                          name="writingStyle"
                          value={data.writingStyle}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold appearance-none"
                        >
                          {WRITING_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Target Audience</label>
                        <input
                          name="audience"
                          value={data.audience}
                          onChange={handleInputChange}
                          placeholder="e.g. Children, Tech Professionals"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Chapter Count</label>
                        <input
                          type="number"
                          name="chapterCount"
                          min="1"
                          max="20"
                          value={data.chapterCount}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Brief Description / Idea</label>
                      <textarea
                        name="description"
                        value={data.description}
                        onChange={handleInputChange}
                        placeholder="What is your book about? (Optional, AI can expand this)"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium h-32 resize-none"
                      />
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={generateInitialConcept}
                      disabled={loading}
                      className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading && generatingPart === 'concept' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                      Generate Concept & Next
                    </button>
                    <button
                      onClick={() => setStep(2)}
                      className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-200 transition-all"
                    >
                      Skip
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Characters</h2>
                    <button
                      onClick={() => setData(prev => ({
                        ...prev,
                        characters: [...prev.characters, { id: Math.random().toString(36).substr(2, 9), name: 'New Character', role: 'Supporting', description: '' }]
                      }))}
                      className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {data.characters.map((char) => (
                      <div key={char.id} className="bg-white p-4 sm:p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                          <div className="w-full sm:w-24 h-48 sm:h-32 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 relative group">
                            {char.image ? (
                              <img src={char.image} alt={char.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300">
                                <Users className="w-8 h-8" />
                              </div>
                            )}
                            <button
                              onClick={() => generateImage('character', char.id)}
                              disabled={generatingPart === `image-character-${char.id}`}
                              className="absolute inset-0 bg-black/40 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                            >
                              {generatingPart === `image-character-${char.id}` ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                            </button>
                          </div>
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center justify-between">
                              <input
                                value={char.name}
                                onChange={(e) => setData(prev => ({
                                  ...prev,
                                  characters: prev.characters.map(c => c.id === char.id ? { ...c, name: e.target.value } : c)
                                }))}
                                className="text-lg font-black text-gray-900 bg-transparent border-none p-0 focus:ring-0 w-full"
                              />
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => generateCharacter(char.id)}
                                disabled={generatingPart === `character-${char.id}`}
                                className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
                                title="AI Enhance Character"
                              >
                                {generatingPart === `character-${char.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => setData(prev => ({ ...prev, characters: prev.characters.filter(c => c.id !== char.id) }))}
                                className="text-gray-400 hover:text-red-500 transition-colors p-2"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            </div>
                            <input
                              value={char.role}
                              onChange={(e) => setData(prev => ({
                                ...prev,
                                characters: prev.characters.map(c => c.id === char.id ? { ...c, role: e.target.value } : c)
                              }))}
                              className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md w-full sm:w-fit"
                            />
                            <textarea
                              value={char.description}
                              onChange={(e) => setData(prev => ({
                                ...prev,
                                characters: prev.characters.map(c => c.id === char.id ? { ...c, description: e.target.value } : c)
                              }))}
                              className="w-full text-sm text-gray-500 bg-transparent border-none p-0 focus:ring-0 resize-none h-20 sm:h-16"
                              placeholder="Character description..."
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => setStep(1)} className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-200 transition-all">Back</button>
                    <button onClick={() => setStep(3)} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all">Next: Chapters</button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Chapters</h2>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={generateAllChapters}
                        disabled={loading || data.chapters.length === 0}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        {generatingPart === 'all-chapters' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        Generate All Chapters
                      </button>
                      <button
                        onClick={() => setData(prev => ({
                          ...prev,
                          chapters: [...prev.chapters, { id: Math.random().toString(36).substr(2, 9), title: `Chapter ${prev.chapters.length + 1}`, summary: '', content: '' }]
                        }))}
                        className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {data.chapters.map((chap, idx) => (
                      <div key={chap.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-4 sm:p-6 space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl font-black text-gray-200">{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}</span>
                              <input
                                value={chap.title}
                                onChange={(e) => setData(prev => ({
                                  ...prev,
                                  chapters: prev.chapters.map(c => c.id === chap.id ? { ...c, title: e.target.value } : c)
                                }))}
                                className="text-lg font-black text-gray-900 bg-transparent border-none p-0 focus:ring-0 w-full"
                              />
                            </div>
                            <div className="flex items-center gap-2 self-end sm:self-auto">
                              <button
                                onClick={() => setEditingChapter(chap.id)}
                                className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors"
                                title="Open Full Editor"
                              >
                                <PenTool className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => generateChapterContent(chap.id)}
                                disabled={generatingPart === `chapter-${chap.id}`}
                                className="p-2.5 bg-indigo-50/50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors disabled:opacity-50"
                                title="AI Write Chapter"
                              >
                                {generatingPart === `chapter-${chap.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => generateImage('background', chap.id)}
                                disabled={generatingPart === `image-background-${chap.id}`}
                                className="p-2.5 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition-colors disabled:opacity-50"
                                title="AI Generate Scene Art"
                              >
                                {generatingPart === `image-background-${chap.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => setData(prev => ({ ...prev, chapters: prev.chapters.filter(c => c.id !== chap.id) }))}
                                className="p-2.5 text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <textarea
                            value={chap.summary}
                            onChange={(e) => setData(prev => ({
                              ...prev,
                              chapters: prev.chapters.map(c => c.id === chap.id ? { ...c, summary: e.target.value } : c)
                            }))}
                            className="w-full text-sm text-gray-500 bg-gray-50 p-4 rounded-2xl border-none focus:ring-0 resize-none h-24 sm:h-20"
                            placeholder="Chapter summary..."
                          />
                          {chap.content && (
                            <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Chapter Content</p>
                                <span className="text-[10px] font-bold text-gray-400">{chap.content.split(' ').length} words</span>
                              </div>
                              <p className="text-sm text-gray-700 line-clamp-3 italic leading-relaxed">{chap.content}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => setStep(2)} className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-200 transition-all">Back</button>
                    <button onClick={() => setStep(4)} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all">Next: Design</button>
                  </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-8"
                >
                  <div className="space-y-4">
                    <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                      <Palette className="w-5 h-5 text-indigo-600" />
                      Visual Style
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Typography</label>
                        <div className="grid grid-cols-1 gap-2">
                          {FONTS.map(f => (
                            <button
                              key={f.name}
                              onClick={() => setSelectedFont(f)}
                              className={`px-4 py-3 rounded-xl text-left transition-all border-2 ${
                                selectedFont.name === f.name ? 'border-indigo-600 bg-indigo-50' : 'border-gray-100 hover:border-gray-200'
                              }`}
                              style={{ fontFamily: f.family }}
                            >
                              <span className="text-sm font-bold">{f.name}</span>
                              <p className="text-[10px] opacity-60">The quick brown fox jumps over the lazy dog.</p>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Color Theme</label>
                        <div className="grid grid-cols-2 gap-2">
                          {THEMES.map(t => (
                            <button
                              key={t.id}
                              onClick={() => setData(prev => ({ ...prev, theme: t.id as any }))}
                              className={`p-4 rounded-xl text-left transition-all border-2 flex flex-col gap-2 ${
                                data.theme === t.id ? 'border-indigo-600 bg-indigo-50' : 'border-gray-100 hover:border-gray-200'
                              }`}
                              style={{ backgroundColor: t.bg, color: t.text }}
                            >
                              <span className="text-xs font-black uppercase tracking-tight">{t.name}</span>
                              <div className="flex gap-1">
                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: t.accent }} />
                                <div className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: t.bg }} />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Cover Art</label>
                        <div className="aspect-[3/4] bg-gray-100 rounded-2xl overflow-hidden relative group">
                          {data.coverImage ? (
                            <img src={data.coverImage} alt="Cover" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 p-6 text-center">
                              <ImageIcon className="w-12 h-12 mb-2" />
                              <p className="text-xs font-bold">No cover art generated yet</p>
                            </div>
                          )}
                          <button
                            onClick={() => generateImage('cover')}
                            disabled={generatingPart === 'image-cover-main'}
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-2"
                          >
                            {generatingPart === 'image-cover-main' ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
                            <span className="text-xs font-black uppercase tracking-widest">Generate AI Cover</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  <div className="flex gap-4">
                    <button onClick={() => setStep(3)} className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-200 transition-all">Back</button>
                    <button onClick={() => setPreviewMode(true)} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all">Final Review</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile Preview Toggle */}
          <div className="sm:hidden fixed bottom-6 right-6 z-50">
            <button
              onClick={() => setShowMobilePreview(!showMobilePreview)}
              className="p-4 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center gap-2 font-black uppercase tracking-widest text-xs"
            >
              {showMobilePreview ? <X className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
              {showMobilePreview ? 'Close' : 'Preview'}
            </button>
          </div>

          {/* Right Panel: Live Preview */}
          <div className={`${previewMode ? 'lg:col-span-12' : 'lg:col-span-5'} sticky top-24 h-fit ${showMobilePreview ? 'fixed inset-0 z-40 !block bg-white' : 'hidden sm:block'}`}>
            <div className={`bg-white rounded-[2rem] border border-gray-100 shadow-2xl overflow-hidden flex flex-col h-[80vh] lg:h-[85vh] print-container`}>
              <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between no-print">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex items-center gap-4">
                  {previewMode && (
                    <button
                      onClick={() => setPreviewMode(false)}
                      className="px-3 py-1 bg-gray-200 text-gray-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-gray-300 transition-colors"
                    >
                      Edit Mode
                    </button>
                  )}
                  <button
                    onClick={() => window.print()}
                    className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-600"
                    title="Print / Save as PDF"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                    disabled={currentPage === 0}
                    className="p-1 hover:bg-gray-200 rounded-full disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Book Preview
                  </span>
                  <button 
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="w-12" />
              </div>
              
              <div className="flex-1 bg-[#f0f0f0] p-4 sm:p-8 flex items-center justify-center perspective-1000 overflow-hidden">
                <AnimatePresence mode="wait">
                  <div key={currentPage} className="w-full max-w-4xl h-full flex gap-1">
                    {/* Left Page (Desktop only) */}
                    <div className="hidden lg:block flex-1 h-full">
                      <BookPage pageNumber={currentPage * 2 + 1} totalPages={data.chapters.length * 2 + 4} theme={data.theme}>
                        <div style={{ fontFamily: selectedFont.family }}>
                          {currentPage === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-8">
                              {data.coverImage && (
                                <img src={data.coverImage} className="w-48 h-64 object-cover rounded-xl shadow-xl" />
                              )}
                              <div className="space-y-2">
                                <h2 className="text-3xl font-black leading-tight">{data.title || 'Untitled'}</h2>
                                <p className="font-bold uppercase tracking-widest text-xs" style={{ color: THEMES.find(t => t.id === data.theme)?.accent }}>
                                  A {data.genre} Story
                                </p>
                              </div>
                            </div>
                          ) : currentPage === 1 ? (
                            <div className="space-y-6">
                              <h3 className="text-xl font-black border-b-2 pb-2" style={{ borderColor: `${THEMES.find(t => t.id === data.theme)?.text}20` }}>Synopsis</h3>
                              <p className="leading-relaxed text-sm whitespace-pre-wrap italic opacity-80">{data.description}</p>
                            </div>
                          ) : (
                            <div className="space-y-6">
                              {data.chapters[currentPage - 2] ? (
                                <>
                                  <div className="text-center space-y-2">
                                    <span className="font-black uppercase tracking-widest text-[10px]" style={{ color: THEMES.find(t => t.id === data.theme)?.accent }}>
                                      Chapter {currentPage - 1}
                                    </span>
                                    <h3 className="text-xl font-black">{data.chapters[currentPage - 2].title}</h3>
                                  </div>
                                  {data.chapters[currentPage - 2].image && (
                                    <img src={data.chapters[currentPage - 2].image} className="w-full h-40 object-cover rounded-xl" />
                                  )}
                                  <p className="leading-relaxed text-sm first-letter:text-3xl first-letter:font-black first-letter:mr-2 first-letter:float-left whitespace-pre-wrap">
                                    {data.chapters[currentPage - 2].content || 'Content not generated yet.'}
                                  </p>
                                </>
                              ) : (
                                <div className="h-full flex items-center justify-center opacity-30 font-bold italic">The End</div>
                              )}
                            </div>
                          )}
                        </div>
                      </BookPage>
                    </div>

                    {/* Right Page / Mobile Page */}
                    <div className="flex-1 h-full">
                      <BookPage pageNumber={currentPage * 2 + 2} totalPages={data.chapters.length * 2 + 4} theme={data.theme}>
                        <div style={{ fontFamily: selectedFont.family }}>
                          {currentPage === 0 ? (
                            <div className="space-y-6">
                              <h3 className="text-xl font-black border-b-2 pb-2" style={{ borderColor: `${THEMES.find(t => t.id === data.theme)?.text}20` }}>Characters</h3>
                              <div className="space-y-6">
                                {data.characters.slice(0, 3).map(char => (
                                  <div key={char.id} className="flex gap-4">
                                    {char.image && <img src={char.image} className="w-16 h-20 object-cover rounded-lg shadow-md" />}
                                    <div className="space-y-1">
                                      <h4 className="text-sm font-black">{char.name}</h4>
                                      <p className="text-[10px] font-bold uppercase" style={{ color: THEMES.find(t => t.id === data.theme)?.accent }}>{char.role}</p>
                                      <p className="text-[10px] opacity-60 line-clamp-2">{char.description}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-6">
                              {data.chapters[currentPage - 1] ? (
                                <>
                                  <div className="text-center space-y-2">
                                    <span className="font-black uppercase tracking-widest text-[10px]" style={{ color: THEMES.find(t => t.id === data.theme)?.accent }}>
                                      Chapter {currentPage}
                                    </span>
                                    <h3 className="text-xl font-black">{data.chapters[currentPage - 1].title}</h3>
                                  </div>
                                  {data.chapters[currentPage - 1].image && (
                                    <img src={data.chapters[currentPage - 1].image} className="w-full h-40 object-cover rounded-xl" />
                                  )}
                                  <p className="leading-relaxed text-sm first-letter:text-3xl first-letter:font-black first-letter:mr-2 first-letter:float-left whitespace-pre-wrap">
                                    {data.chapters[currentPage - 1].content || 'Content not generated yet.'}
                                  </p>
                                </>
                              ) : (
                                <div className="h-full flex items-center justify-center opacity-30 font-bold italic">The End</div>
                              )}
                            </div>
                          )}
                        </div>
                      </BookPage>
                    </div>
                  </div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chapter Editor Modal */}
      <AnimatePresence>
        {editingChapter && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-5xl h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-indigo-600 rounded-xl text-white">
                    <PenTool className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                      {data.chapters.find(c => c.id === editingChapter)?.title}
                    </h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Professional Editor</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingChapter(null)}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>
              
              <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Editor Area */}
                <div className="flex-1 p-6 flex flex-col gap-4 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Chapter Content</label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => generateChapterContent(editingChapter)}
                        disabled={generatingPart === `chapter-${editingChapter}`}
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                        {generatingPart === `chapter-${editingChapter}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        AI Rewrite
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={data.chapters.find(c => c.id === editingChapter)?.content || ''}
                    onChange={(e) => setData(prev => ({
                      ...prev,
                      chapters: prev.chapters.map(c => c.id === editingChapter ? { ...c, content: e.target.value } : c)
                    }))}
                    className="flex-1 w-full p-8 bg-gray-50 rounded-[2rem] border-none focus:ring-2 focus:ring-indigo-500 outline-none text-lg leading-relaxed text-gray-800 custom-scrollbar resize-none"
                    placeholder="Start writing your masterpiece here..."
                    style={{ fontFamily: selectedFont.family }}
                  />
                </div>

                {/* Sidebar Info */}
                <div className="w-full lg:w-80 bg-gray-50 p-6 border-l border-gray-100 overflow-y-auto custom-scrollbar space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Chapter Summary</label>
                    <textarea
                      value={data.chapters.find(c => c.id === editingChapter)?.summary || ''}
                      onChange={(e) => setData(prev => ({
                        ...prev,
                        chapters: prev.chapters.map(c => c.id === editingChapter ? { ...c, summary: e.target.value } : c)
                      }))}
                      className="w-full p-4 bg-white rounded-2xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-gray-600 h-32 resize-none"
                    />
                  </div>

                  <div className="p-4 bg-indigo-600 rounded-2xl text-white space-y-2 shadow-lg shadow-indigo-200">
                    <h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                      <Wand2 className="w-4 h-4" />
                      Editor Tips
                    </h4>
                    <ul className="text-[10px] space-y-1 opacity-90 font-medium">
                      <li>• Use AI Rewrite to expand your summary.</li>
                      <li>• Keep paragraphs short for readability.</li>
                      <li>• Characters are listed in the main view.</li>
                      <li>• Changes are saved automatically.</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Statistics</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white p-3 rounded-xl border border-gray-200 text-center">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Words</p>
                        <p className="text-lg font-black text-gray-900">
                          {data.chapters.find(c => c.id === editingChapter)?.content?.split(/\s+/).filter(Boolean).length || 0}
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-gray-200 text-center">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Chars</p>
                        <p className="text-lg font-black text-gray-900">
                          {data.chapters.find(c => c.id === editingChapter)?.content?.length || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 flex justify-end bg-white">
                <button
                  onClick={() => setEditingChapter(null)}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                >
                  Done Editing
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4">
          <div className="relative">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
            <Sparkles className="w-6 h-6 text-amber-400 absolute -top-2 -right-2 animate-bounce" />
          </div>
          <p className="text-sm font-black text-gray-900 uppercase tracking-widest animate-pulse">
            AI is brainstorming your masterpiece...
          </p>
        </div>
      )}
    </div>
  );
}
