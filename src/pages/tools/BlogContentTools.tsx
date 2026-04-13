import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PenTool, 
  Sparkles, 
  Search, 
  FileText, 
  Type, 
  RefreshCcw, 
  CheckCircle2, 
  BarChart3, 
  ShieldCheck, 
  ChevronRight, 
  Copy, 
  Download, 
  Wand2,
  Layout,
  MessageSquare,
  Hash,
  Eye,
  Settings,
  AlertCircle,
  Loader2,
  Share2,
  Mail,
  Box,
  Menu,
  X,
  ChevronLeft
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import toast from 'react-hot-toast';

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

type ToolType = 
  | 'topic' 
  | 'title' 
  | 'keywords' 
  | 'meta' 
  | 'outline' 
  | 'paragraph' 
  | 'rewriter' 
  | 'grammar' 
  | 'readability' 
  | 'plagiarism'
  | 'social'
  | 'newsletter'
  | 'product';

interface ToolConfig {
  id: ToolType;
  name: string;
  description: string;
  icon: any;
  prompt: string;
  inputLabel: string;
  placeholder: string;
  buttonText: string;
  isTextArea?: boolean;
}

const TOOLS: ToolConfig[] = [
  {
    id: 'topic',
    name: 'Blog Topic Generator',
    description: 'Generate creative and trending blog post ideas based on your niche.',
    icon: Sparkles,
    prompt: 'Generate 10 creative, trending, and high-engagement blog post topics for the following niche or keyword. For each topic, provide a brief "why it works" explanation.',
    inputLabel: 'Niche or Main Keyword',
    placeholder: 'e.g. Digital Marketing, Healthy Cooking, Travel in Japan',
    buttonText: 'Generate Topics'
  },
  {
    id: 'title',
    name: 'Blog Title Generator',
    description: 'Create catchy, SEO-friendly titles that drive clicks.',
    icon: Type,
    prompt: 'Generate 15 catchy, click-worthy, and SEO-optimized blog post titles for the following topic. Include a mix of "How-to", "Listicles", "Question-based", and "Controversial" titles.',
    inputLabel: 'Blog Post Topic',
    placeholder: 'e.g. Benefits of Yoga for Beginners',
    buttonText: 'Generate Titles'
  },
  {
    id: 'keywords',
    name: 'SEO Keyword Generator',
    description: 'Find high-ranking keywords and LSI terms for your content.',
    icon: Search,
    prompt: 'Generate a comprehensive list of SEO keywords for the following topic. Include: 1. Primary Keywords, 2. Long-tail Keywords, 3. LSI (Latent Semantic Indexing) Keywords, and 4. Question-based keywords people search for.',
    inputLabel: 'Main Topic or Seed Keyword',
    placeholder: 'e.g. Best Running Shoes 2024',
    buttonText: 'Generate Keywords'
  },
  {
    id: 'meta',
    name: 'Meta Description Generator',
    description: 'Write compelling meta descriptions that improve CTR.',
    icon: Eye,
    prompt: 'Write 5 compelling, SEO-friendly meta descriptions (under 160 characters) for a blog post with the following title and keywords. Each should have a clear call-to-action.',
    inputLabel: 'Blog Title & Keywords',
    placeholder: 'Title: 10 Best Vegan Recipes; Keywords: easy vegan meals, plant-based diet',
    buttonText: 'Generate Meta Descriptions'
  },
  {
    id: 'outline',
    name: 'Article Outline Generator',
    description: 'Structure your blog posts with detailed, logical outlines.',
    icon: Layout,
    prompt: 'Create a detailed, SEO-optimized article outline for the following blog title. Include: Introduction (with hook), H2 and H3 subheadings, key points for each section, and a Conclusion (with CTA).',
    inputLabel: 'Blog Post Title',
    placeholder: 'e.g. The Ultimate Guide to Remote Work in 2024',
    buttonText: 'Generate Outline'
  },
  {
    id: 'paragraph',
    name: 'Paragraph Generator',
    description: 'Expand your ideas into well-written, engaging paragraphs.',
    icon: MessageSquare,
    prompt: 'Write a high-quality, engaging, and informative paragraph (approx 150-200 words) based on the following point or heading. Use a professional yet conversational tone.',
    inputLabel: 'Point or Heading to Expand',
    placeholder: 'e.g. Why consistent sleep patterns improve productivity',
    buttonText: 'Generate Paragraph',
    isTextArea: true
  },
  {
    id: 'rewriter',
    name: 'Content Rewriter',
    description: 'Paraphrase and rewrite content to improve flow or avoid repetition.',
    icon: RefreshCcw,
    prompt: 'Rewrite the following text to make it more engaging, clear, and professional while maintaining the original meaning. Provide 3 different variations: 1. Professional, 2. Casual/Friendly, 3. Concise.',
    inputLabel: 'Text to Rewrite',
    placeholder: 'Paste your text here...',
    buttonText: 'Rewrite Content',
    isTextArea: true
  },
  {
    id: 'grammar',
    name: 'Grammar Checker',
    description: 'Fix grammar, spelling, and punctuation errors instantly.',
    icon: CheckCircle2,
    prompt: 'Check the following text for grammar, spelling, and punctuation errors. Provide the corrected version and a list of specific improvements made.',
    inputLabel: 'Text to Check',
    placeholder: 'Paste your text here...',
    buttonText: 'Check Grammar',
    isTextArea: true
  },
  {
    id: 'readability',
    name: 'Readability Checker',
    description: 'Analyze and improve the readability of your content.',
    icon: BarChart3,
    prompt: 'Analyze the readability of the following text. Provide: 1. Estimated Reading Level (e.g. Grade 8), 2. Reading Time, 3. Suggestions to improve clarity, and 4. A simplified version of the text.',
    inputLabel: 'Text to Analyze',
    placeholder: 'Paste your text here...',
    buttonText: 'Analyze Readability',
    isTextArea: true
  },
  {
    id: 'plagiarism',
    name: 'Plagiarism Checker (Basic)',
    description: 'AI-based check for potential originality issues.',
    icon: ShieldCheck,
    prompt: 'Analyze the following text for potential originality issues or common phrasing that might be flagged as non-unique. Provide an "Originality Score" (estimate) and suggest ways to make the content more unique and personal.',
    inputLabel: 'Text to Check',
    placeholder: 'Paste your text here...',
    buttonText: 'Check Originality',
    isTextArea: true
  },
  {
    id: 'social',
    name: 'Social Media Post Generator',
    description: 'Turn your blog content into engaging social media posts.',
    icon: Share2,
    prompt: 'Create 3 engaging social media posts (Twitter, LinkedIn, Instagram) based on the following blog content or topic. Include relevant hashtags and emojis.',
    inputLabel: 'Blog Content or Topic',
    placeholder: 'Paste your blog content or topic here...',
    buttonText: 'Generate Social Posts',
    isTextArea: true
  },
  {
    id: 'newsletter',
    name: 'Email Newsletter Generator',
    description: 'Draft a compelling email newsletter to promote your blog.',
    icon: Mail,
    prompt: 'Write a compelling email newsletter to promote a blog post with the following title and summary. Include a subject line, a personalized opening, a summary of the value, and a clear call-to-action.',
    inputLabel: 'Blog Title & Summary',
    placeholder: 'Title: 10 Best Vegan Recipes; Summary: A collection of easy, plant-based meals for busy people.',
    buttonText: 'Generate Newsletter',
    isTextArea: true
  },
  {
    id: 'product',
    name: 'Product Description Generator',
    description: 'Write persuasive product descriptions that convert.',
    icon: Box,
    prompt: 'Write a persuasive, benefit-driven product description for the following product. Include a catchy headline, a list of key features/benefits, and a call-to-action.',
    inputLabel: 'Product Name & Features',
    placeholder: 'Product: ErgoChair Pro; Features: lumbar support, breathable mesh, adjustable height',
    buttonText: 'Generate Description'
  }
];

export default function BlogContentTools() {
  const [activeTool, setActiveTool] = useState<ToolType>('topic');
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const currentTool = TOOLS.find(t => t.id === activeTool)!;

  const handleGenerate = async () => {
    if (!input.trim()) {
      toast.error('Please enter some input first.');
      return;
    }

    setLoading(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `${currentTool.prompt}\n\nInput: ${input}`
      });
      
      const text = response.text || "No response generated.";
      setResult(text);
      
      // Scroll to result on mobile
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      
      toast.success('Generated successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate content. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result);
    toast.success('Copied to clipboard!');
  };

  const downloadResult = () => {
    const element = document.createElement("a");
    const file = new Blob([result], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${currentTool.name.replace(/\s+/g, '_')}_Result.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-gray-900 flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
                <PenTool className="w-8 h-8" />
              </div>
              Blog & Content Tools
            </h1>
            <p className="text-gray-500 font-medium text-lg">Supercharge your writing with AI-powered content utilities.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar: Tool Selection */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4 mb-4">Select a Tool</p>
              <div className="space-y-1">
                {TOOLS.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => {
                      setActiveTool(tool.id);
                      setResult('');
                      setInput('');
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${
                      activeTool === tool.id 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                        : 'text-gray-600 hover:bg-gray-50 hover:text-indigo-600'
                    }`}
                  >
                    <tool.icon className={`w-5 h-5 ${activeTool === tool.id ? 'text-white' : 'text-gray-400'}`} />
                    {tool.name}
                    {activeTool === tool.id && <ChevronRight className="w-4 h-4 ml-auto" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Tips */}
            <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 hidden lg:block">
              <div className="flex items-center gap-2 text-indigo-600 mb-3">
                <Sparkles className="w-5 h-5" />
                <span className="font-black text-xs uppercase tracking-widest">Pro Tip</span>
              </div>
              <p className="text-sm text-indigo-900/70 leading-relaxed font-medium">
                Be specific with your inputs. The more context you provide, the better the AI can tailor the content to your needs.
              </p>
            </div>
          </div>

          {/* Main Content: Input & Output */}
          <div className="lg:col-span-8 space-y-6">
            {/* Input Section */}
            <motion.div 
              key={activeTool}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6"
            >
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                  <currentTool.icon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900">{currentTool.name}</h2>
                  <p className="text-sm text-gray-500 font-medium">{currentTool.description}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  {currentTool.inputLabel}
                </label>
                {currentTool.isTextArea ? (
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={currentTool.placeholder}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium h-48 resize-none transition-all"
                  />
                ) : (
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={currentTool.placeholder}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold transition-all"
                  />
                )}
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    {currentTool.buttonText}
                  </>
                )}
              </button>
            </motion.div>

            {/* Result Section */}
            <AnimatePresence>
              {result && (
                <motion.div
                  ref={resultRef}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden"
                >
                  <div className="p-4 sm:p-6 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">AI Generated Result</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={copyToClipboard}
                        className="p-2 hover:bg-gray-200 rounded-xl transition-colors text-gray-500"
                        title="Copy to Clipboard"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={downloadResult}
                        className="p-2 hover:bg-gray-200 rounded-xl transition-colors text-gray-500"
                        title="Download as .txt"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="p-8 sm:p-10 prose prose-indigo max-w-none">
                    <div className="whitespace-pre-wrap text-gray-800 leading-relaxed font-medium">
                      {result}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Empty State */}
            {!result && !loading && (
              <div className="h-64 border-2 border-dashed border-gray-200 rounded-[2.5rem] flex flex-col items-center justify-center text-gray-400 gap-3">
                <AlertCircle className="w-8 h-8 opacity-20" />
                <p className="text-sm font-bold opacity-40 uppercase tracking-widest">Your result will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
