import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Image, Maximize, QrCode, MessageSquare, Zap, ShieldCheck, Loader2, 
  Settings as SettingsIcon, Wand2, Pencil, Grid, Box, Share2, FileText, 
  FilePlus, ChevronLeft, ChevronRight, Calculator, Percent, Timer, BookOpen, ListChecks,
  Quote, Layers, Type, Calendar, PenTool
} from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Tool, AppSettings, AdSlotConfig, PremiumPlan, HeroBannerSlide, Review } from '../types';
import HtmlRenderer from '../components/HtmlRenderer';
import ReviewSection from '../components/ReviewSection';
import { motion, AnimatePresence } from 'motion/react';

const IconMap: Record<string, any> = {
  Image,
  Maximize,
  QrCode,
  MessageSquare,
  Wand2,
  Pencil,
  Grid,
  Box,
  Share2,
  FileText,
  FilePlus,
  Calculator,
  Percent,
  Timer,
  BookOpen,
  ListChecks,
  Quote,
  Layers,
  Type,
  Calendar,
  Zap,
  ShieldCheck,
  PenTool
};

const DEFAULT_TOOLS: Tool[] = [
  {
    id: 'compressor',
    name: 'Image Compressor',
    description: 'Reduce image file size without losing quality. Support for PNG, JPG, and WebP.',
    icon: 'Image',
    path: '/tools/compressor',
    isActive: true,
    isPremium: false,
    category: 'Optimize Files'
  },
  {
    id: 'resizer',
    name: 'Image Resizer',
    description: 'Resize images to custom dimensions or social media presets.',
    icon: 'Maximize',
    path: '/tools/resizer',
    isActive: true,
    isPremium: false,
    category: 'Optimize Files'
  },
  {
    id: 'bg-remover',
    name: 'Background Remover',
    description: 'Remove backgrounds from images automatically using AI.',
    icon: 'Wand2',
    path: '/tools/bg-remover',
    isActive: true,
    isPremium: false,
    category: 'Edit Files'
  },
  {
    id: 'pdf-tools',
    name: 'PDF Toolbox',
    description: 'Merge, split, and convert PDF files with ease.',
    icon: 'FileText',
    path: '/tools/pdf-tools',
    isActive: true,
    isPremium: false,
    category: 'Organize Files'
  },
  {
    id: 'invoice-generator',
    name: 'Invoice Generator',
    description: 'Create professional invoices with custom templates and signatures.',
    icon: 'FileText',
    path: '/tools/invoice-generator',
    isActive: true,
    isPremium: false,
    category: 'Workflows'
  },
  {
    id: 'leave-generator',
    name: 'Leave Application',
    description: 'AI-powered leave application generator for office, school, and college.',
    icon: 'FileText',
    path: '/tools/leave-generator',
    isActive: true,
    isPremium: false,
    category: 'Workflows'
  },
  {
    id: 'resume-generator',
    name: 'Resume Builder',
    description: 'Build professional resumes with modern templates.',
    icon: 'FilePlus',
    path: '/tools/resume-generator',
    isActive: true,
    isPremium: false,
    category: 'Workflows'
  },
  {
    id: 'ai-text',
    name: 'AI Text Generator',
    description: 'Generate high-quality content, emails, and essays using Gemini AI.',
    icon: 'MessageSquare',
    path: '/tools/ai-text',
    isActive: true,
    isPremium: true,
    category: 'Intelligence'
  },
  {
    id: 'gpa-calculator',
    name: 'GPA Calculator',
    description: 'Calculate your semester and cumulative GPA easily.',
    icon: 'Calculator',
    path: '/tools/gpa-calculator',
    isActive: true,
    isPremium: false,
    category: 'Student Tools'
  },
  {
    id: 'marks-calculator',
    name: 'Marks Percentage',
    description: 'Calculate your marks percentage and grade instantly.',
    icon: 'Percent',
    path: '/tools/marks-calculator',
    isActive: true,
    isPremium: false,
    category: 'Student Tools'
  },
  {
    id: 'notes-summarizer',
    name: 'Notes Summarizer',
    description: 'Summarize long study notes into concise bullet points using AI.',
    icon: 'FileText',
    path: '/tools/notes-summarizer',
    isActive: true,
    isPremium: false,
    category: 'Student Tools'
  },
  {
    id: 'study-planner',
    name: 'Study Planner',
    description: 'Create a personalized study schedule to stay organized.',
    icon: 'Calendar',
    path: '/tools/study-planner',
    isActive: true,
    isPremium: false,
    category: 'Student Tools'
  },
  {
    id: 'mcq-generator',
    name: 'MCQ Generator',
    description: 'Generate multiple choice questions from any text for practice.',
    icon: 'ListChecks',
    path: '/tools/mcq-generator',
    isActive: true,
    isPremium: false,
    category: 'Student Tools'
  },
  {
    id: 'qrcode',
    name: 'QR Code Generator',
    description: 'Create custom QR codes for URLs, text, and contact info.',
    icon: 'QrCode',
    path: '/tools/qrcode',
    isActive: true,
    isPremium: false,
    category: 'Security'
  },
  {
    id: 'pencil-outline',
    name: 'Pencil Outline',
    description: 'Convert your photos into beautiful pencil sketches and outlines.',
    icon: 'Pencil',
    path: '/tools/pencil-outline',
    isActive: true,
    isPremium: false,
    category: 'Edit Files'
  },
  {
    id: 'grid-maker',
    name: 'Grid Maker',
    description: 'Create custom grids for drawing and design projects.',
    icon: 'Grid',
    path: '/tools/grid-maker',
    isActive: true,
    isPremium: false,
    category: 'Organize Files'
  },
  {
    id: 'perspective',
    name: 'Perspective Grid',
    description: 'Generate 1, 2, or 3-point perspective grids for architectural drawing.',
    icon: 'Box',
    path: '/tools/perspective',
    isActive: true,
    isPremium: false,
    category: 'Organize Files'
  },
  {
    id: 'social-resizer',
    name: 'Social Resizer',
    description: 'Instantly resize images for Instagram, Facebook, Twitter, and more.',
    icon: 'Share2',
    path: '/tools/social-resizer',
    isActive: true,
    isPremium: false,
    category: 'Optimize Files'
  },
  {
    id: 'exam-countdown',
    name: 'Exam Countdown',
    description: 'Keep track of your upcoming exams and stay motivated.',
    icon: 'Timer',
    path: '/tools/exam-countdown',
    isActive: true,
    isPremium: false,
    category: 'Student Tools'
  },
  {
    id: 'formula-generator',
    name: 'Formula Sheet',
    description: 'Generate custom formula sheets for math, physics, and chemistry.',
    icon: 'BookOpen',
    path: '/tools/formula-generator',
    isActive: true,
    isPremium: false,
    category: 'Student Tools'
  },
  {
    id: 'citation-generator',
    name: 'Citation Generator',
    description: 'Generate citations in APA, MLA, and Chicago styles.',
    icon: 'Quote',
    path: '/tools/citation-generator',
    isActive: true,
    isPremium: false,
    category: 'Student Tools'
  },
  {
    id: 'flashcard-maker',
    name: 'Flashcard Maker',
    description: 'Create digital flashcards to help you memorize key concepts.',
    icon: 'Layers',
    path: '/tools/flashcard-maker',
    isActive: true,
    isPremium: false,
    category: 'Student Tools'
  },
  {
    id: 'word-counter',
    name: 'Word Counter',
    description: 'Count words, characters, and reading time for your text.',
    icon: 'Type',
    path: '/tools/word-counter',
    isActive: true,
    isPremium: false,
    category: 'Student Tools'
  },
  {
    id: 'assignment-generator',
    name: 'Assignment Generator',
    description: 'AI-powered tool to help you structure and draft your assignments.',
    icon: 'FilePlus',
    path: '/tools/assignment-generator',
    isActive: true,
    isPremium: false,
    category: 'Student Tools'
  },
  {
    id: 'ebook-generator',
    name: 'E-Book Generator',
    description: 'AI-powered e-book generator with characters, story, and art.',
    icon: 'BookOpen',
    path: '/tools/ebook-generator',
    isActive: true,
    isPremium: false,
    category: 'Intelligence'
  },
  {
    id: 'blog-tools',
    name: 'Blog & Content Tools',
    description: 'AI-powered tools for blog topics, titles, SEO, outlines, and more.',
    icon: 'PenTool',
    path: '/tools/blog-tools',
    isActive: true,
    isPremium: false,
    category: 'Intelligence'
  },
  {
    id: 'legal-generators',
    name: 'Legal Generators',
    description: 'Generate Privacy Policy, Terms, and other legal documents.',
    icon: 'ShieldCheck',
    path: '/tools/legal-generators',
    isActive: true,
    isPremium: false,
    category: 'Security'
  }
];

function HeroBanner({ settings, heroSlides }: { settings: AppSettings | null, heroSlides: HeroBannerSlide[] }) {
  // Use heroSlides from props, fallback to settings.heroBannerSlides for migration
  const slides = heroSlides.length > 0 ? heroSlides : (settings?.heroBannerSlides || []);
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    if (!settings?.heroBannerAutoPlay || slides.length <= 1) return;
    const timer = setInterval(() => {
      setDirection(1);
      setCurrent((prev) => (prev + 1) % slides.length);
    }, settings.heroBannerInterval || 5000);
    return () => clearInterval(timer);
  }, [slides.length, settings?.heroBannerAutoPlay, settings?.heroBannerInterval]);

  if (settings?.showHeroBanner === false || slides.length === 0) return null;

  const slideVariants = {
    enter: (direction: number) => {
      const effect = settings?.heroBannerEffect || 'slide';
      if (effect === 'fade') return { opacity: 0 };
      if (effect === 'zoom') return { scale: 1.2, opacity: 0 };
      if (effect === 'slide-up') return { y: 500, opacity: 0 };
      if (effect === 'slide-down') return { y: -500, opacity: 0 };
      if (effect === 'blur') return { filter: 'blur(20px)', opacity: 0 };
      return { x: direction > 0 ? 1000 : -1000, opacity: 0 };
    },
    center: {
      zIndex: 1,
      x: 0,
      y: 0,
      scale: 1,
      opacity: 1,
      filter: 'blur(0px)'
    },
    exit: (direction: number) => {
      const effect = settings?.heroBannerEffect || 'slide';
      if (effect === 'fade') return { zIndex: 0, opacity: 0 };
      if (effect === 'zoom') return { zIndex: 0, scale: 0.8, opacity: 0 };
      if (effect === 'slide-up') return { zIndex: 0, y: -500, opacity: 0 };
      if (effect === 'slide-down') return { zIndex: 0, y: 500, opacity: 0 };
      if (effect === 'blur') return { zIndex: 0, filter: 'blur(20px)', opacity: 0 };
      return { zIndex: 0, x: direction < 0 ? 1000 : -1000, opacity: 0 };
    }
  };

  const currentSlide = slides[current];

  return (
    <div className="w-full flex justify-center" style={{ padding: settings?.heroBannerPadding || '0px' }}>
      <div 
        className="relative overflow-hidden bg-gray-900"
        style={{ 
          height: settings?.heroBannerHeight || '500px',
          width: settings?.heroBannerWidth || '100%',
          borderRadius: settings?.heroBannerBorderRadius || '0px'
        }}
      >
        <AnimatePresence initial={false} custom={direction} mode={settings?.heroBannerEffect === 'fade' ? 'wait' : 'popLayout'}>
          <motion.div
            key={current}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              y: { type: "spring", stiffness: 300, damping: 30 },
              scale: { duration: 0.5 },
              opacity: { duration: 0.5 },
              filter: { duration: 0.5 }
            }}
            className="absolute inset-0 w-full h-full"
          >
            {currentSlide.imageUrl && (
              <img 
                src={currentSlide.imageUrl} 
                alt={currentSlide.title}
                className="w-full h-full"
                style={{ 
                  objectFit: currentSlide.objectFit || 'cover',
                  objectPosition: currentSlide.objectPosition || 'center'
                }}
              />
            )}
            {(currentSlide.title || currentSlide.subtitle) && (
              <div 
                className="absolute inset-0" 
                style={{ backgroundColor: `rgba(0,0,0,${currentSlide.overlayOpacity ?? 0.4})` }} 
              />
            )}
            <div className={`absolute inset-0 flex items-center px-8 md:px-20`}>
              <div 
                className={`w-full max-w-4xl space-y-6 ${
                  currentSlide.textAlign === 'center' ? 'text-center mx-auto' : 
                  currentSlide.textAlign === 'right' ? 'text-right ml-auto' : 'text-left'
                }`}
              >
                <motion.h2 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-4xl md:text-6xl font-black leading-tight"
                  style={{ color: currentSlide.titleColor || '#ffffff' }}
                >
                  {currentSlide.title}
                </motion.h2>
                <motion.p 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-lg md:text-xl font-medium max-w-2xl"
                  style={{ 
                    color: currentSlide.subtitleColor || '#e5e7eb',
                    marginLeft: currentSlide.textAlign === 'center' ? 'auto' : currentSlide.textAlign === 'right' ? 'auto' : '0',
                    marginRight: currentSlide.textAlign === 'center' ? 'auto' : '0'
                  }}
                >
                  {currentSlide.subtitle}
                </motion.p>
                {currentSlide.buttonText && (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <Link 
                      to={currentSlide.buttonLink || '#'}
                      className="inline-block px-8 py-4 rounded-2xl font-black text-lg transition-transform hover:scale-105 shadow-xl"
                      style={{ 
                        backgroundColor: currentSlide.buttonBgColor || '#e5322d',
                        color: currentSlide.buttonTextColor || '#ffffff'
                      }}
                    >
                      {currentSlide.buttonText}
                    </Link>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
  
        {/* Controls */}
        {slides.length > 1 && (
          <>
            {settings?.heroBannerShowArrows !== false && (
              <>
                <button 
                  onClick={() => {
                    setDirection(-1);
                    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-full transition-all z-20"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button 
                  onClick={() => {
                    setDirection(1);
                    setCurrent((prev) => (prev + 1) % slides.length);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-full transition-all z-20"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
  
            {/* Dots */}
            {settings?.heroBannerShowDots !== false && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setDirection(i > current ? 1 : -1);
                      setCurrent(i);
                    }}
                    className={`h-2 rounded-full transition-all duration-300 ${current === i ? 'bg-white w-8' : 'bg-white/40 w-2 hover:bg-white/60'}`}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function HomePage({ profile, settings, heroSlides }: { profile: UserProfile | null, settings: AppSettings | null, heroSlides: HeroBannerSlide[] }) {
  const location = useLocation();
  const [tools, setTools] = useState<Tool[]>([]);
  const [adSlots, setAdSlots] = useState<AdSlotConfig[]>([]);
  const [premiumPlans, setPremiumPlans] = useState<PremiumPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    if (location.state?.activeCategory) {
      setActiveCategory(location.state.activeCategory);
      // Scroll to tools section
      const toolsSection = document.getElementById('tools-section');
      if (toolsSection) {
        toolsSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [location.state]);
  
  // Carousel state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleItems, setVisibleItems] = useState(1);
  const [isPaused, setIsPaused] = useState(false);

  const categories = ['All', 'Student Tools', 'Workflows', 'Organize Files', 'Optimize Files', 'Convert Files', 'Edit Files', 'Security', 'Intelligence'];

  useEffect(() => {
    const updateVisibleItems = () => {
      let newVisible = 1;
      if (window.innerWidth >= 1024) newVisible = 3;
      else if (window.innerWidth >= 768) newVisible = 2;
      setVisibleItems(newVisible);
      setCurrentIndex(prev => Math.min(prev, Math.max(0, premiumPlans.length - newVisible)));
    };
    
    updateVisibleItems();
    window.addEventListener('resize', updateVisibleItems);
    return () => window.removeEventListener('resize', updateVisibleItems);
  }, [premiumPlans.length]);

  useEffect(() => {
    if (premiumPlans.length <= visibleItems || isPaused) return;
    
    const timer = setInterval(() => {
      setCurrentIndex((prev) => {
        const nextIndex = prev + 1;
        if (nextIndex > premiumPlans.length - visibleItems) {
          return 0;
        }
        return nextIndex;
      });
    }, 5000);
    
    return () => clearInterval(timer);
  }, [premiumPlans.length, visibleItems, isPaused]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const toolsQ = query(collection(db, 'tools'), where('isActive', '==', true));
        const toolsSnapshot = await getDocs(toolsQ);
        const fetchedTools = toolsSnapshot.docs.map(doc => doc.data() as Tool);
        
        // Merge fetched tools with DEFAULT_TOOLS, avoiding duplicates by path
        const mergedTools = [...fetchedTools];
        DEFAULT_TOOLS.forEach(defaultTool => {
          if (!mergedTools.some(t => t.path === defaultTool.path)) {
            mergedTools.push(defaultTool);
          }
        });
        setTools(mergedTools);

        const adsQ = query(collection(db, 'adSlots'), where('isActive', '==', true));
        const adsSnapshot = await getDocs(adsQ);
        setAdSlots(adsSnapshot.docs.map(doc => doc.data() as AdSlotConfig));

        const plansQ = query(collection(db, 'premiumPlans'), where('isActive', '==', true));
        const plansSnapshot = await getDocs(plansQ);
        setPremiumPlans(plansSnapshot.docs.map(doc => doc.data() as PremiumPlan));
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const renderAds = (position: string) => {
    return adSlots
      .filter(ad => ad.position === position && ad.isActive)
      .map(ad => (
        <HtmlRenderer 
          key={ad.id}
          html={ad.script}
          className="w-full flex items-center justify-center overflow-hidden my-4"
        />
      ));
  };

  const animationClass = settings?.animationSpeed === 'slow' ? 'animate-slow' : settings?.animationSpeed === 'fast' ? 'animate-fast' : 'animate-normal';

  const filteredTools = tools.filter(tool => {
    if (activeCategory === 'All') return true;
    
    // Use category field if available
    if (tool.category === activeCategory) return true;
    
    // Fallback to keyword matching for compatibility
    const name = tool.name.toLowerCase();
    const desc = tool.description.toLowerCase();
    const cat = activeCategory.toLowerCase();
    
    if (cat.includes('student')) {
      const studentKeywords = [
        'gpa', 'marks', 'exam', 'notes', 'formula', 'mcq', 'planner', 'citation', 'flashcard', 'word counter',
        'study', 'academic', 'calculator', 'summarizer', 'generator', 'counter', 'planner', 'quote', 'layers', 'leave'
      ];
      const matchesKeyword = studentKeywords.some(keyword => 
        name.includes(keyword.toLowerCase()) || 
        desc.includes(keyword.toLowerCase()) ||
        tool.path.toLowerCase().includes(keyword.toLowerCase())
      );
      if (matchesKeyword) return true;
      
      // Path-based fallback
      const studentPaths = ['gpa', 'marks', 'exam', 'notes', 'formula', 'mcq', 'planner', 'citation', 'flashcard', 'word-counter'];
      if (studentPaths.some(p => tool.path.toLowerCase().includes(p))) return true;
    }
    if (cat.includes('organize')) return name.includes('pdf') || name.includes('grid') || name.includes('perspective');
    if (cat.includes('optimize')) return name.includes('compress') || name.includes('resizer');
    if (cat.includes('convert')) return name.includes('pdf') || name.includes('qrcode') || name.includes('resume');
    if (cat.includes('edit')) return name.includes('bg-remover') || name.includes('pencil') || name.includes('text');
    if (cat.includes('intelligence')) return name.includes('ai') || name.includes('ebook');
    if (cat.includes('security')) return name.includes('legal') || name.includes('qrcode');
    if (cat.includes('workflows')) return name.includes('invoice') || name.includes('leave') || name.includes('resume');
    
    return false;
  });

  const renderSection = (sectionId: string) => {
    switch (sectionId) {
      case 'banner':
        return settings?.showBannerSection !== false ? (
          <div key="banner">
            <HeroBanner settings={settings} heroSlides={heroSlides} />
          </div>
        ) : null;
      
      case 'hero':
        return settings?.showHeroSection !== false ? (
          <header key="hero" className="text-center space-y-4 md:space-y-6 max-w-4xl mx-auto py-12 md:py-16 lg:py-20 px-4">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-[#333333] leading-[1.1]">
              {settings?.heroTitle || 'All File Tools in One Place'}
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 font-medium max-w-3xl mx-auto leading-relaxed">
              {settings?.heroSubtitle || 'Files Made Easy'}
            </p>
          </header>
        ) : null;

      case 'tools':
        return settings?.showToolsSection !== false ? (
          <div key="tools" id="tools-section" className="space-y-12 scroll-mt-24">
            <div className="text-center space-y-3 md:space-y-4">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900">
                {settings?.toolsTitle || 'Our Tools'}
              </h2>
              <p className="text-sm sm:text-base text-gray-500 font-medium px-4">
                {settings?.toolsSubtitle || 'Explore our collection of powerful file processing tools'}
              </p>
            </div>

            {/* Categories Tabs */}
            <div className="flex flex-nowrap md:flex-wrap items-center justify-start md:justify-center gap-3 px-4 overflow-x-auto no-scrollbar pb-2 md:pb-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`category-tab ${activeCategory === cat ? 'category-tab-active' : ''}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="container mx-auto px-4">
              {filteredTools.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredTools.map((tool) => {
                    const Icon = IconMap[tool.icon] || SettingsIcon;
                    return (
                      <Link 
                        key={tool.id}
                        to={tool.path}
                        className="tool-card group"
                      >
                        <div className="flex items-center gap-4 w-full">
                          <div className="w-12 h-12 bg-[#fef2f2] rounded-lg flex items-center justify-center text-[#e5322d] shrink-0 group-hover:scale-110 transition-transform">
                            <Icon className="w-6 h-6" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h3 className="text-lg font-black text-[#333333] group-hover:text-[#e5322d] transition-colors">{tool.name}</h3>
                              {tool.isPremium && (
                                <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                              )}
                            </div>
                          </div>
                        </div>
                        <p className="text-gray-500 text-sm font-medium leading-relaxed line-clamp-3">
                          {tool.description}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="py-20 text-center space-y-4 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto text-gray-300 shadow-sm">
                    <Box className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-gray-900">No tools found in this category</h3>
                    <p className="text-gray-500 max-w-xs mx-auto">We're working on adding more tools here. Check back soon!</p>
                  </div>
                  <button
                    onClick={() => setActiveCategory('All')}
                    className="text-sm font-bold text-[#e5322d] hover:underline"
                  >
                    View all available tools
                  </button>
                </div>
              )}

              {activeCategory !== 'All' && filteredTools.length > 0 && (
                <div className="mt-12 text-center">
                  <button
                    onClick={() => setActiveCategory('All')}
                    className="inline-flex items-center gap-2 px-8 py-4 bg-gray-900 text-white rounded-2xl font-black hover:bg-[#e5322d] transition-all hover:scale-105 active:scale-95 shadow-lg shadow-gray-200"
                  >
                    View All Tools
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : null;

      case 'pricing':
        return settings?.showPricingSection !== false && premiumPlans.length > 0 ? (
          <div key="pricing" className="py-16 space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-black text-[#333333]">
                {settings?.pricingTitle || 'Choose Your Plan'}
              </h2>
              <p className="text-gray-500 max-w-2xl mx-auto font-medium">
                {settings?.pricingSubtitle || 'Unlock premium features and remove limits with our flexible pricing plans.'}
              </p>
            </div>

            <div 
              className="relative overflow-hidden px-4 py-8"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              <div className="max-w-7xl mx-auto overflow-hidden pt-6">
                <motion.div 
                  className="flex -mx-4"
                  animate={{ x: `-${currentIndex * (100 / visibleItems)}%` }}
                  transition={{ type: "spring", stiffness: 100, damping: 20 }}
                >
                  {premiumPlans.map((plan) => (
                    <div 
                      key={plan.id} 
                      className="shrink-0 px-4"
                      style={{ width: `${100 / visibleItems}%` }}
                    >
                      <motion.div 
                        whileHover={{ y: -8 }}
                        className={`relative p-8 rounded-3xl border transition-all h-full ${
                          plan.isPopular 
                            ? 'bg-white border-[#e5322d]/20 shadow-xl ring-1 ring-[#e5322d]/10' 
                            : 'bg-white border-gray-100 shadow-sm'
                        }`}
                      >
                        {plan.isPopular && (
                          <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#e5322d] text-white text-xs font-black rounded-full uppercase tracking-widest shadow-lg z-10">
                            Most Popular
                          </div>
                        )}

                        <div className="space-y-6 flex flex-col h-full">
                          <div>
                            <h3 className="text-xl font-bold text-[#333333]">{plan.name}</h3>
                            <p className="text-sm text-gray-500 mt-1 font-medium">{plan.description}</p>
                          </div>

                          <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-black text-[#333333]">
                              {plan.currency === 'INR' ? '₹' : plan.currency === 'USD' ? '$' : '€'}
                              {plan.price}
                            </span>
                            <span className="text-gray-400 font-medium">{plan.durationText}</span>
                          </div>

                          <div className="space-y-4 flex-1">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">What's Included</p>
                            <ul className="space-y-3">
                              {plan.features.map((feature, i) => (
                                <li key={i} className="flex items-start gap-3 text-sm text-gray-600 font-medium">
                                  <ShieldCheck className="w-5 h-5 text-green-500 shrink-0" />
                                  {feature}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <Link 
                            to="/upgrade"
                            className={`w-full py-4 rounded-2xl font-black text-center transition-all shadow-sm block mt-auto ${
                              plan.isPopular 
                                ? 'bg-[#e5322d] text-white hover:bg-[#c42b27] shadow-[#e5322d]/20' 
                                : 'bg-gray-900 text-white hover:bg-black'
                            }`}
                          >
                            Get Started
                          </Link>
                        </div>
                      </motion.div>
                    </div>
                  ))}
                </motion.div>
              </div>

              {/* Pagination Dots */}
              {premiumPlans.length > visibleItems && (
                <div className="flex justify-center gap-2 mt-12">
                  {Array.from({ length: premiumPlans.length - visibleItems + 1 }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentIndex(i)}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        currentIndex === i ? 'bg-[#e5322d] w-8' : 'bg-gray-200 w-2 hover:bg-gray-300'
                      }`}
                      aria-label={`Go to slide ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null;

      case 'reviews':
        return settings?.showReviewsSection !== false ? (
          <div key="reviews">
            <ReviewSection profile={profile} settings={settings} />
          </div>
        ) : null;

      case 'stats':
        return settings?.showStatsSection !== false ? (
          <div key="stats" className="py-16 bg-gray-900 rounded-[40px] text-white overflow-hidden relative">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500 rounded-full blur-[100px]" />
              <div className="absolute bottom-0 right-0 w-64 h-64 bg-red-500 rounded-full blur-[100px]" />
            </div>
            <div className="container mx-auto px-4 relative z-10 space-y-12">
              {(settings?.statsTitle || settings?.statsSubtitle) && (
                <div className="text-center space-y-4">
                  {settings?.statsTitle && (
                    <h2 className="text-3xl font-black">{settings.statsTitle}</h2>
                  )}
                  {settings?.statsSubtitle && (
                    <p className="text-gray-400 max-w-2xl mx-auto font-medium">{settings.statsSubtitle}</p>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                <div className="space-y-2">
                  <div className="text-4xl md:text-5xl font-black">{settings?.stat1Number || '10M+'}</div>
                  <div className="text-gray-400 font-bold uppercase tracking-wider text-xs">{settings?.stat1Label || 'Files Processed'}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-4xl md:text-5xl font-black">{settings?.stat2Number || '500K+'}</div>
                  <div className="text-gray-400 font-bold uppercase tracking-wider text-xs">{settings?.stat2Label || 'Happy Users'}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-4xl md:text-5xl font-black">{settings?.stat3Number || '20+'}</div>
                  <div className="text-gray-400 font-bold uppercase tracking-wider text-xs">{settings?.stat3Label || 'Powerful Tools'}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-4xl md:text-5xl font-black">{settings?.stat4Number || '99.9%'}</div>
                  <div className="text-gray-400 font-bold uppercase tracking-wider text-xs">{settings?.stat4Label || 'Uptime'}</div>
                </div>
              </div>
            </div>
          </div>
        ) : null;

      default:
        return null;
    }
  };

  const sectionOrder = settings?.sectionOrder || ['banner', 'hero', 'tools', 'stats', 'pricing', 'reviews'];

  return (
    <div className={`space-y-12 ${animationClass}`}>
      {/* Top Ad Slots */}
      <div className="space-y-4">
        {renderAds('top')}
        {adSlots.filter(ad => ad.position === 'top').length === 0 && settings?.adScriptTop && (
          <HtmlRenderer 
            html={settings.adScriptTop}
            className="w-full min-h-[100px] flex items-center justify-center overflow-hidden"
          />
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-[#e5322d]" />
        </div>
      ) : (
        <div className="space-y-20">
          {sectionOrder.map(sectionId => renderSection(sectionId))}
        </div>
      )}

      {/* Bottom Ad Slots */}
      <div className="space-y-4 pt-8">
        {renderAds('bottom')}
        {adSlots.filter(ad => ad.position === 'bottom' && ad.isActive).length === 0 && settings?.adScriptBottom && (
          <HtmlRenderer 
            html={settings.adScriptBottom}
            className="w-full min-h-[100px] flex items-center justify-center overflow-hidden"
          />
        )}
      </div>
    </div>
  );
}
