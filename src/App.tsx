import { useEffect, useState, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, onSnapshot, updateDoc, collection } from 'firebase/firestore';
import { Toaster, toast } from 'react-hot-toast';
import { 
  LogOut, User as UserIcon, Settings as SettingsIcon, Home, Zap, 
  ShieldCheck, ChevronDown, Image, Maximize, QrCode, MessageSquare,
  Wand2, Menu, X, Pencil, Grid, Box, Share2, FileText, FilePlus, Ban,
  MoreHorizontal, Info, Scale, Mail, Shield, Calculator, Percent, Timer, BookOpen, ListChecks,
  Calendar, Quote, Layers, Type, Search
} from 'lucide-react';
import { auth, db } from './firebase';
import { UserProfile, AppSettings, HeroBannerSlide } from './types';
import { handleFirestoreError, OperationType } from './lib/utils';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import SubscriptionManager from './components/SubscriptionManager';
import UpgradePage from './pages/UpgradePage';
import ImageCompressor from './pages/tools/ImageCompressor';
import ImageResizer from './pages/tools/ImageResizer';
import QRCodeGenerator from './pages/tools/QRCodeGenerator';
import AITextGenerator from './pages/tools/AITextGenerator';
import ImageBackgroundRemover from './pages/tools/ImageBackgroundRemover';
import PencilOutlineGenerator from './pages/tools/PencilOutlineGenerator';
import GridMaker from './pages/tools/GridMaker';
import PerspectiveGridTool from './pages/tools/PerspectiveGridTool';
import SocialMediaResizer from './pages/tools/SocialMediaResizer';
import PDFTools from './pages/tools/PDFTools';
import ResumeGenerator from './pages/tools/ResumeGenerator';
import LegalGenerators from './pages/tools/LegalGenerators';
import GPACalculator from './pages/tools/GPACalculator';
import MarksPercentageCalculator from './pages/tools/MarksPercentageCalculator';
import ExamCountdown from './pages/tools/ExamCountdown';
import NotesSummarizer from './pages/tools/NotesSummarizer';
import FormulaSheetGenerator from './pages/tools/FormulaSheetGenerator';
import MCQGenerator from './pages/tools/MCQGenerator';
import StudyPlanner from './pages/tools/StudyPlanner';
import CitationGenerator from './pages/tools/CitationGenerator';
import FlashcardMaker from './pages/tools/FlashcardMaker';
import WordCounter from './pages/tools/WordCounter';
import AssignmentGenerator from './pages/tools/AssignmentGenerator';
import InvoiceGenerator from './pages/tools/InvoiceGenerator';
import LeaveApplicationGenerator from './pages/tools/LeaveApplicationGenerator';
import EBookGenerator from './pages/tools/EBookGenerator';
import BlogContentTools from './pages/tools/BlogContentTools';
import FloatingWidgets from './components/FloatingWidgets';
import CustomToolPage from './pages/CustomToolPage';
import LegalPage from './pages/LegalPage';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [heroSlides, setHeroSlides] = useState<HeroBannerSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const settingsInitialized = useRef(false);
  const adminFixed = useRef(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (!user) {
        setProfile(null);
        setLoading(false);
      }
    });

    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'global'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as AppSettings;
        setSettings(data);
      } else {
        // Initialize default settings if they don't exist
        const defaultSettings: AppSettings = {
          dailyLimit: 5,
          siteName: 'ToolBox Pro',
          siteDescription: 'All-in-one productivity suite',
          premiumPrice: 499,
          currency: 'INR',
          razorpayEnabled: false,
          razorpayKeyId: '',
          enableTestMode: false,
          logoUrl: '',
          primaryColor: '#2563eb',
          secondaryColor: '#1e40af',
          accentColor: '#f59e0b',
          fontFamily: 'Inter',
          headerStyle: 'sticky',
          footerText: '© 2024 ToolBox Pro. All rights reserved.',
          showHeroSection: true,
          showStatsSection: true,
          showPricingSection: true,
          enableWhatsApp: false,
          enableScrollToTop: true,
          enableBackButton: true,
          showHeroBanner: true,
          heroBannerHeight: '500px',
          heroBannerWidth: '100%',
          heroBannerAutoPlay: true,
          heroBannerInterval: 5000,
          heroBannerEffect: 'slide'
        };
        import('firebase/firestore').then(({ setDoc, doc }) => {
          if (!settingsInitialized.current) {
            settingsInitialized.current = true;
            setDoc(doc(db, 'settings', 'global'), defaultSettings).catch(err => {
              console.error("Failed to initialize settings:", err);
              // Only allow retry if it wasn't a quota error
              if (!err.message?.includes('resource-exhausted') && !err.message?.includes('Quota exceeded')) {
                settingsInitialized.current = false;
              }
            });
          }
        });
        setSettings(defaultSettings);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/global', auth);
    });

    const unsubscribeSlides = onSnapshot(collection(db, 'hero_slides'), (snapshot) => {
      const slides = snapshot.docs.map(doc => doc.data() as HeroBannerSlide);
      // Sort by order if available, otherwise by id
      slides.sort((a, b) => (a.order || 0) - (b.order || 0));
      setHeroSlides(slides);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'hero_slides', auth);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeSettings();
      unsubscribeSlides();
    };
  }, []);

  useEffect(() => {
    if (user) {
      const unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as UserProfile;
          setProfile(data);
          
          // Auto-fix admin role if missing for the primary admin
          if (user.email === 'rangpencilhouse@gmail.com' && (data.role !== 'admin' || data.isBlocked)) {
            if (!adminFixed.current) {
              adminFixed.current = true;
              updateDoc(doc(db, 'users', user.uid), { role: 'admin', premiumStatus: true, isBlocked: false }).catch(err => {
                console.error("Failed to auto-fix admin:", err);
                // Only allow retry if it wasn't a quota error
                if (!err.message?.includes('resource-exhausted') && !err.message?.includes('Quota exceeded')) {
                  adminFixed.current = false;
                }
              });
            }
          }
        }
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`, auth);
        setLoading(false);
      });
      return () => unsubscribeProfile();
    }
  }, [user]);

  useEffect(() => {
    if (settings) {
      const root = document.documentElement;
      root.style.setProperty('--primary-color', settings.primaryColor || '#2563eb');
      root.style.setProperty('--secondary-color', settings.secondaryColor || '#1e40af');
      root.style.setProperty('--accent-color', settings.accentColor || '#f59e0b');
      root.style.setProperty('--font-family', settings.fontFamily || 'Inter');
      
      // Apply custom CSS
      const styleId = 'custom-app-styles';
      let styleElement = document.getElementById(styleId);
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
      }
      styleElement.textContent = settings.customCss || '';
      
      // Update document title
      if (settings.siteName) {
        document.title = settings.siteName;
      }

      // Inject Header Scripts
      const headerScriptId = 'custom-header-scripts';
      let headerScriptElement = document.getElementById(headerScriptId);
      if (settings.headerScripts) {
        if (!headerScriptElement) {
          headerScriptElement = document.createElement('div');
          headerScriptElement.id = headerScriptId;
          document.head.appendChild(headerScriptElement);
        }
        headerScriptElement.innerHTML = settings.headerScripts;
        
        // Execute scripts manually as innerHTML doesn't execute them
        const scripts = headerScriptElement.getElementsByTagName('script');
        for (let i = 0; i < scripts.length; i++) {
          const s = document.createElement('script');
          s.text = scripts[i].text;
          if (scripts[i].src) s.src = scripts[i].src;
          document.head.appendChild(s);
        }
      } else if (headerScriptElement) {
        headerScriptElement.remove();
      }
    }
  }, [settings]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (profile?.isBlocked && profile.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <Ban className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-gray-900">Account Blocked</h1>
            <p className="text-gray-500">Your account has been suspended by the administrator. Please contact support if you believe this is a mistake.</p>
          </div>
          <button 
            onClick={() => signOut(auth)}
            className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const headerStyle = settings?.headerStyle || 'sticky';
  const mainPadding = headerStyle === 'fixed' || headerStyle === 'sticky' ? 'pt-24' : 'py-8';

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        <Navbar user={user} profile={profile} settings={settings} />
      <SubscriptionManager profile={profile} settings={settings} />
        <main className={`container mx-auto px-4 max-w-7xl ${mainPadding}`}>
          <Routes>
            <Route path="/" element={<HomePage profile={profile} settings={settings} heroSlides={heroSlides} />} />
            <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
            <Route path="/signup" element={!user ? <SignupPage /> : <Navigate to="/" />} />
            <Route path="/dashboard" element={user ? <DashboardPage profile={profile} settings={settings} /> : <Navigate to="/login" />} />
            <Route path="/upgrade" element={<UpgradePage profile={profile} settings={settings} />} />
            <Route path="/pricing" element={<UpgradePage profile={profile} settings={settings} />} />
            <Route path="/admin" element={(profile?.role === 'admin' || user?.email === 'rangpencilhouse@gmail.com') ? <AdminPage settings={settings} heroSlides={heroSlides} /> : <Navigate to="/" />} />
            
            {/* Tools */}
            <Route path="/tools/compressor" element={<ImageCompressor profile={profile} settings={settings} />} />
            <Route path="/tools/resizer" element={<ImageResizer profile={profile} settings={settings} />} />
            <Route path="/tools/qrcode" element={<QRCodeGenerator profile={profile} settings={settings} />} />
            <Route path="/tools/ai-text" element={<AITextGenerator profile={profile} settings={settings} />} />
            <Route path="/tools/bg-remover" element={<ImageBackgroundRemover profile={profile} settings={settings} />} />
            <Route path="/tools/pencil-outline" element={<PencilOutlineGenerator profile={profile} settings={settings} />} />
            <Route path="/tools/grid-maker" element={<GridMaker profile={profile} settings={settings} />} />
            <Route path="/tools/perspective" element={<PerspectiveGridTool profile={profile} settings={settings} />} />
            <Route path="/tools/social-resizer" element={<SocialMediaResizer profile={profile} settings={settings} />} />
            <Route path="/tools/pdf-tools" element={<PDFTools profile={profile} settings={settings} />} />
            <Route path="/tools/resume-generator" element={<ResumeGenerator profile={profile} settings={settings} />} />
            <Route path="/tools/legal-generators" element={<LegalGenerators profile={profile} settings={settings} />} />
            <Route path="/tools/gpa-calculator" element={<GPACalculator profile={profile} settings={settings} />} />
            <Route path="/tools/marks-calculator" element={<MarksPercentageCalculator profile={profile} settings={settings} />} />
            <Route path="/tools/exam-countdown" element={<ExamCountdown profile={profile} settings={settings} />} />
            <Route path="/tools/notes-summarizer" element={<NotesSummarizer profile={profile} settings={settings} />} />
            <Route path="/tools/formula-generator" element={<FormulaSheetGenerator profile={profile} settings={settings} />} />
            <Route path="/tools/mcq-generator" element={<MCQGenerator profile={profile} settings={settings} />} />
            <Route path="/tools/study-planner" element={<StudyPlanner profile={profile} settings={settings} />} />
            <Route path="/tools/citation-generator" element={<CitationGenerator profile={profile} settings={settings} />} />
            <Route path="/tools/flashcard-maker" element={<FlashcardMaker profile={profile} settings={settings} />} />
            <Route path="/tools/word-counter" element={<WordCounter profile={profile} settings={settings} />} />
            <Route path="/tools/assignment-generator" element={<AssignmentGenerator profile={profile} settings={settings} />} />
            <Route path="/tools/invoice-generator" element={<InvoiceGenerator profile={profile} settings={settings} />} />
            <Route path="/tools/leave-generator" element={<LeaveApplicationGenerator profile={profile} settings={settings} />} />
            <Route path="/tools/ebook-generator" element={<EBookGenerator />} />
            <Route path="/tools/blog-tools" element={<BlogContentTools />} />
            <Route path="/tools/custom/:toolId" element={<CustomToolPage profile={profile} settings={settings} />} />
            
            {/* Legal & Info Pages */}
            <Route path="/about" element={<LegalPage settings={settings} />} />
            <Route path="/privacy" element={<LegalPage settings={settings} />} />
            <Route path="/terms" element={<LegalPage settings={settings} />} />
            <Route path="/contact" element={<LegalPage settings={settings} />} />
          </Routes>
        </main>
        <Toaster position="bottom-right" />
        
        <footer 
          className="mt-20 py-12 border-t border-gray-100"
          style={{ 
            backgroundColor: settings?.footerBgColor || '#ffffff',
            color: settings?.footerTextColor || '#4b5563'
          }}
        >
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
              <Link to="/" className="flex items-center gap-1 text-2xl font-black tracking-tighter">
                {settings?.logoUrl ? (
                  <img src={settings.logoUrl} alt={settings.siteName} className="h-8 w-auto object-contain" referrerPolicy="no-referrer" />
                ) : (
                  <>
                    <span style={{ color: settings?.footerTextColor || 'black' }}>I</span>
                    <span className="text-[#e5322d] text-3xl">❤</span>
                    <span style={{ color: settings?.footerTextColor || 'black' }}>{settings?.siteName || 'ToolBox Pro'}</span>
                  </>
                )}
              </Link>
              <p className="text-sm font-medium opacity-80">
                {settings?.footerText || `© ${new Date().getFullYear()} ${settings?.siteName || 'ToolBox Pro'}. All rights reserved.`}
              </p>
              <div className="flex items-center gap-6">
                {settings?.footerLinks && settings.footerLinks.length > 0 ? (
                  settings.footerLinks.map(link => (
                    <Link 
                      key={link.id} 
                      to={link.path} 
                      className="hover:text-[#e5322d] transition-colors text-sm font-bold opacity-80 hover:opacity-100"
                    >
                      {link.label}
                    </Link>
                  ))
                ) : (
                  <>
                    <Link to="/about" className="hover:text-[#e5322d] transition-colors text-sm font-bold opacity-80 hover:opacity-100">About Us</Link>
                    <Link to="/privacy" className="hover:text-[#e5322d] transition-colors text-sm font-bold opacity-80 hover:opacity-100">Privacy</Link>
                    <Link to="/terms" className="hover:text-[#e5322d] transition-colors text-sm font-bold opacity-80 hover:opacity-100">Terms</Link>
                    <Link to="/contact" className="hover:text-[#e5322d] transition-colors text-sm font-bold opacity-80 hover:opacity-100">Contact</Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </footer>
      </div>
      <FloatingWidgets settings={settings} />
      {settings?.footerScripts && (
        <div dangerouslySetInnerHTML={{ __html: settings.footerScripts }} />
      )}
    </Router>
  );
}

function Navbar({ user, profile, settings }: { user: User | null, profile: UserProfile | null, settings: AppSettings | null }) {
  const navigate = useNavigate();
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isSiteMenuOpen, setIsSiteMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const siteMenuRef = useRef<HTMLDivElement>(null);
  const mobileSiteMenuRef = useRef<HTMLDivElement>(null);

  const headerStyle = settings?.headerStyle || 'sticky';
  const headerClass = headerStyle === 'fixed' ? 'fixed top-0 left-0 right-0' : headerStyle === 'sticky' ? 'sticky top-0' : 'relative';
  const glassClass = settings?.enableGlassmorphism ? 'glass' : 'border-b border-gray-200';
  const headerBgColor = settings?.headerBgColor || '#ffffff';
  const headerTextColor = settings?.headerTextColor || '#111827';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsToolsOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
      
      // Combined check for site menu to avoid conflicts between mobile and desktop refs
      const isInSiteMenu = (siteMenuRef.current && siteMenuRef.current.contains(event.target as Node)) ||
                          (mobileSiteMenuRef.current && mobileSiteMenuRef.current.contains(event.target as Node));
      
      if (!isInSiteMenu) {
        setIsSiteMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out successfully");
      navigate('/login');
    } catch (error) {
      toast.error("Logout failed");
    }
  };

  const navItems = settings?.navMenuItems && settings.navMenuItems.length > 0 
    ? settings.navMenuItems 
    : [
        { id: '1', label: 'MERGE FILES', path: '/tools/pdf-tools' },
        { id: '2', label: 'SPLIT FILES', path: '/tools/pdf-tools' },
        { id: '3', label: 'COMPRESS FILES', path: '/tools/compressor' },
        { id: '4', label: 'CONVERT FILES', path: '/tools/pdf-tools' },
        { id: '6', label: 'ALL TOOLS', path: '/' },
      ];

  const studentTools = [
    { name: 'GPA Calculator', path: '/tools/gpa-calculator', icon: Calculator },
    { name: 'Marks Calculator', path: '/tools/marks-calculator', icon: Percent },
    { name: 'Exam Countdown', path: '/tools/exam-countdown', icon: Timer },
    { name: 'Notes Summarizer', path: '/tools/notes-summarizer', icon: FileText },
    { name: 'Formula Generator', path: '/tools/formula-generator', icon: BookOpen },
    { name: 'MCQ Generator', path: '/tools/mcq-generator', icon: ListChecks },
    { name: 'Study Planner', path: '/tools/study-planner', icon: Calendar },
    { name: 'Citation Generator', path: '/tools/citation-generator', icon: Quote },
    { name: 'Flashcard Maker', path: '/tools/flashcard-maker', icon: Layers },
    { name: 'Word Counter', path: '/tools/word-counter', icon: Type },
    { name: 'Leave Application', path: '/tools/leave-generator', icon: FileText },
    { name: 'E-Book Generator', path: '/tools/ebook-generator', icon: BookOpen },
    { name: 'Blog & Content Tools', path: '/tools/blog-tools', icon: Pencil },
  ];

  const allTools = [
    { name: 'Image Compressor', path: '/tools/compressor', icon: Image },
    { name: 'Image Resizer', path: '/tools/resizer', icon: Maximize },
    { name: 'Background Remover', path: '/tools/bg-remover', icon: Wand2 },
    { name: 'Pencil Outline', path: '/tools/pencil-outline', icon: Pencil },
    { name: 'Grid Maker', path: '/tools/grid-maker', icon: Grid },
    { name: 'Perspective Grid', path: '/tools/perspective', icon: Box },
    { name: 'Social Media Resizer', path: '/tools/social-resizer', icon: Share2 },
    { name: 'File Toolbox', path: '/tools/pdf-tools', icon: FileText },
    { name: 'Resume Generator', path: '/tools/resume-generator', icon: FilePlus },
    { name: 'Legal Generators', path: '/tools/legal-generators', icon: ShieldCheck },
    { name: 'QR Code Generator', path: '/tools/qrcode', icon: QrCode },
    { name: 'GPA Calculator', path: '/tools/gpa-calculator', icon: Calculator },
    { name: 'Marks Calculator', path: '/tools/marks-calculator', icon: Percent },
    { name: 'Exam Countdown', path: '/tools/exam-countdown', icon: Timer },
    { name: 'Notes Summarizer', path: '/tools/notes-summarizer', icon: FileText },
    { name: 'Formula Generator', path: '/tools/formula-generator', icon: BookOpen },
    { name: 'MCQ Generator', path: '/tools/mcq-generator', icon: ListChecks },
    { name: 'Study Planner', path: '/tools/study-planner', icon: Calendar },
    { name: 'Citation Generator', path: '/tools/citation-generator', icon: Quote },
    { name: 'Flashcard Maker', path: '/tools/flashcard-maker', icon: Layers },
    { name: 'Word Counter', path: '/tools/word-counter', icon: Type },
    { name: 'Invoice Generator', path: '/tools/invoice-generator', icon: FileText },
    { name: 'Leave Application', path: '/tools/leave-generator', icon: FileText },
    { name: 'E-Book Generator', path: '/tools/ebook-generator', icon: BookOpen },
    { name: 'Blog & Content Tools', path: '/tools/blog-tools', icon: Pencil },
    { name: 'AI Text Generator', path: '/tools/ai-text', icon: MessageSquare, isPremium: true },
  ];

  return (
    <nav 
      className={`${glassClass} ${headerClass} z-50 shadow-sm transition-all duration-300`}
      style={{ 
        backgroundColor: settings?.enableGlassmorphism ? undefined : headerBgColor,
        color: headerTextColor
      }}
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Mobile Header Layout */}
        <div className="flex lg:hidden items-center justify-between w-full">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 hover:bg-black/5 rounded-lg"
            style={{ color: headerTextColor }}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <Link to="/" className="flex items-center gap-1 text-2xl font-black tracking-tighter">
            {settings?.logoUrl ? (
              <img src={settings.logoUrl} alt={settings.siteName} className="h-8 w-auto object-contain" referrerPolicy="no-referrer" />
            ) : (
              <>
                <span style={{ color: headerTextColor }}>I</span>
                <span className="text-[#e5322d] text-3xl">❤</span>
                <span style={{ color: headerTextColor }}>{settings?.siteName || 'ToolBox Pro'}</span>
              </>
            )}
          </Link>

          <div className="relative" ref={mobileSiteMenuRef}>
            <button 
              onClick={() => setIsSiteMenuOpen(!isSiteMenuOpen)}
              className={`p-2 rounded-lg transition-all ${isSiteMenuOpen ? 'bg-black/5 text-[#e5322d]' : 'hover:bg-black/5'}`}
              style={{ color: headerTextColor }}
            >
              <Grid className="w-6 h-6" />
            </button>

            {isSiteMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-[70] animate-in fade-in zoom-in duration-200 origin-top-right">
                <div className="px-4 py-2 border-b border-gray-50 mb-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Site Menu</p>
                </div>
                <Link 
                  to="/about" 
                  onClick={() => setIsSiteMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-[#e5322d] transition-colors"
                >
                  <Info className="w-4 h-4" />
                  About Us
                </Link>
                <Link 
                  to="/contact" 
                  onClick={() => setIsSiteMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-[#e5322d] transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  Contact Us
                </Link>
                <Link 
                  to="/privacy" 
                  onClick={() => setIsSiteMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-[#e5322d] transition-colors"
                >
                  <Shield className="w-4 h-4" />
                  Privacy Policy
                </Link>
                <Link 
                  to="/terms" 
                  onClick={() => setIsSiteMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-[#e5322d] transition-colors"
                >
                  <Scale className="w-4 h-4" />
                  Terms & Conditions
                </Link>
                <div className="my-1 border-t border-gray-50" />
                <Link 
                  to={user ? "/dashboard" : "/login"} 
                  onClick={() => setIsSiteMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-[#e5322d] transition-colors"
                >
                  <UserIcon className="w-4 h-4" />
                  {user ? 'User Profile' : 'Login / Sign Up'}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Header Layout */}
        <div className="hidden lg:flex items-center justify-between w-full gap-4">
          <div className="flex items-center gap-4 xl:gap-8 flex-1">
            <Link to="/" className="flex items-center gap-1 text-2xl font-black tracking-tighter shrink-0">
              {settings?.logoUrl ? (
                <img src={settings.logoUrl} alt={settings.siteName} className="h-8 w-auto object-contain" referrerPolicy="no-referrer" />
              ) : (
                <>
                  <span style={{ color: headerTextColor }}>I</span>
                  <span className="text-[#e5322d] text-3xl">❤</span>
                  <span style={{ color: headerTextColor }}>{settings?.siteName || 'ToolBox Pro'}</span>
                </>
              )}
            </Link>

            {/* Desktop Search Box */}
            <div className="relative w-full max-w-xs xl:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#e5322d]/20 focus:border-[#e5322d] transition-all"
              />
              {searchQuery && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-[100] max-h-[60vh] overflow-y-auto custom-scrollbar">
                  {allTools
                    .filter(tool => tool.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((tool, index) => (
                      <Link
                        key={index}
                        to={tool.path}
                        onClick={() => setSearchQuery('')}
                        className="flex items-center gap-3 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-[#e5322d] transition-colors"
                      >
                        <tool.icon className="w-4 h-4" />
                        {tool.name}
                      </Link>
                    ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 xl:gap-6 overflow-x-auto no-scrollbar">
              {navItems.map((item) => (
                <div key={item.id} className="relative group shrink-0">
                  {item.label === 'STUDENT TOOLS' ? (
                    <Link 
                      to="/"
                      state={{ activeCategory: 'Student Tools' }}
                      className={`text-[13px] font-bold hover:text-[#e5322d] transition-colors flex items-center gap-1 uppercase tracking-tight whitespace-nowrap`}
                      style={{ color: headerTextColor }}
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <Link 
                      to={item.path}
                      className={`text-[13px] font-bold hover:text-[#e5322d] transition-colors flex items-center gap-1 uppercase tracking-tight whitespace-nowrap`}
                      style={{ color: headerTextColor }}
                    >
                      {item.label}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                {!profile?.premiumStatus && (
                  <Link to="/upgrade" className="text-sm font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 whitespace-nowrap">
                    <Zap className="w-4 h-4" />
                    Upgrade
                  </Link>
                )}
                <Link to="/dashboard" className="text-sm font-bold hover:text-[#e5322d] whitespace-nowrap" style={{ color: headerTextColor }}>Dashboard</Link>
                {(profile?.role === 'admin' || user.email === 'rangpencilhouse@gmail.com') && (
                  <Link to="/admin" className="text-sm font-bold hover:text-[#e5322d] whitespace-nowrap" style={{ color: headerTextColor }}>Admin</Link>
                )}
                <button 
                  onClick={handleLogout}
                  className="text-sm font-bold hover:text-red-600 whitespace-nowrap"
                  style={{ color: headerTextColor }}
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link to="/login" className="text-sm font-bold hover:text-[#e5322d] whitespace-nowrap" style={{ color: headerTextColor }}>Login</Link>
                <Link to="/signup" className="px-5 py-2 bg-[#e5322d] text-white rounded-md hover:bg-[#c42b27] transition-colors font-bold text-sm shadow-sm whitespace-nowrap">
                  Sign up
                </Link>
              </div>
            )}
            <div className="relative ml-2" ref={siteMenuRef}>
              <button 
                onClick={() => setIsSiteMenuOpen(!isSiteMenuOpen)}
                className={`p-2 rounded-lg transition-all ${isSiteMenuOpen ? 'bg-black/5 text-[#e5322d]' : 'hover:bg-black/5'}`}
                style={{ color: headerTextColor }}
              >
                <Grid className="w-6 h-6" />
              </button>

              {isSiteMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 py-4 z-[70] animate-in fade-in zoom-in duration-200 origin-top-right">
                  <div className="px-6 pb-3 border-b border-gray-50 mb-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Site Navigation</p>
                  </div>
                  <div className="grid grid-cols-1 gap-1 px-2">
                    <Link 
                      to="/about" 
                      onClick={() => setIsSiteMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-[#e5322d] rounded-xl transition-all"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                        <Info className="w-4 h-4" />
                      </div>
                      About Us
                    </Link>
                    <Link 
                      to="/contact" 
                      onClick={() => setIsSiteMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-[#e5322d] rounded-xl transition-all"
                    >
                      <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
                        <Mail className="w-4 h-4" />
                      </div>
                      Contact Us
                    </Link>
                    <Link 
                      to="/privacy" 
                      onClick={() => setIsSiteMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-[#e5322d] rounded-xl transition-all"
                    >
                      <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                        <Shield className="w-4 h-4" />
                      </div>
                      Privacy Policy
                    </Link>
                    <Link 
                      to="/terms" 
                      onClick={() => setIsSiteMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-[#e5322d] rounded-xl transition-all"
                    >
                      <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                        <Scale className="w-4 h-4" />
                      </div>
                      Terms & Conditions
                    </Link>
                    <div className="my-2 border-t border-gray-50" />
                    <Link 
                      to={user ? "/dashboard" : "/login"} 
                      onClick={() => setIsSiteMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-[#e5322d] rounded-xl transition-all"
                    >
                      <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      {user ? 'User Profile' : 'Login / Sign Up'}
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* More Menu (Dot Menu) */}
            <div className="relative ml-2" ref={moreMenuRef}>
              <button 
                onClick={() => setIsMoreOpen(!isMoreOpen)}
                className={`p-2 rounded-lg transition-all ${isMoreOpen ? 'bg-gray-100 text-[#e5322d]' : 'text-gray-600 hover:bg-gray-100'}`}
                title="More Options"
              >
                <MoreHorizontal className="w-6 h-6" />
              </button>

              {isMoreOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-[70] animate-in fade-in zoom-in duration-200 origin-top-right">
                  <Link 
                    to="/about" 
                    onClick={() => setIsMoreOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-[#e5322d] transition-colors"
                  >
                    <Info className="w-4 h-4" />
                    About Us
                  </Link>
                  <Link 
                    to="/contact" 
                    onClick={() => setIsMoreOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-[#e5322d] transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    Contact Us
                  </Link>
                  <div className="my-1 border-t border-gray-50" />
                  <Link 
                    to="/privacy" 
                    onClick={() => setIsMoreOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-[#e5322d] transition-colors"
                  >
                    <Shield className="w-4 h-4" />
                    Privacy Policy
                  </Link>
                  <Link 
                    to="/terms" 
                    onClick={() => setIsMoreOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-[#e5322d] transition-colors"
                  >
                    <Scale className="w-4 h-4" />
                    Terms & Conditions
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-white z-[60] overflow-y-auto animate-in slide-in-from-left duration-300">
          <div className="p-4 flex items-center justify-between border-b">
            <Link to="/" className="flex items-center gap-1 text-2xl font-black tracking-tighter">
              <span className="text-black">I</span>
              <span className="text-[#e5322d] text-3xl">❤</span>
              <span className="text-black">ToolBox Pro</span>
            </Link>
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="p-4 space-y-6">
            {/* Tools Search Box */}
            <div className="space-y-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3">Search Tools</p>
              <div className="relative px-3">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search for tools..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#e5322d]/20 focus:border-[#e5322d] transition-all"
                />
              </div>

              {searchQuery && (
                <div className="px-3 space-y-2 max-h-[40vh] overflow-y-auto custom-scrollbar">
                  {allTools
                    .filter(tool => tool.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((tool, index) => (
                      <Link
                        key={index}
                        to={tool.path}
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          setSearchQuery('');
                        }}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors group"
                      >
                        <div className="w-8 h-8 bg-white border border-gray-100 rounded-lg flex items-center justify-center text-gray-600 group-hover:text-[#e5322d] shadow-sm">
                          <tool.icon className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-gray-700 group-hover:text-[#e5322d]">{tool.name}</span>
                      </Link>
                    ))}
                  {allTools.filter(tool => tool.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                    <p className="text-center py-4 text-sm text-gray-400">No tools found matching "{searchQuery}"</p>
                  )}
                </div>
              )}
            </div>

            <div className="pt-6 border-t space-y-4">
              {user ? (
                <>
                  <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-2xl transition-all">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-600">
                      <UserIcon className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-gray-800">Dashboard</span>
                  </Link>
                  
                  {(profile?.role === 'admin' || user.email === 'rangpencilhouse@gmail.com') && (
                    <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-2xl transition-all">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                        <SettingsIcon className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-blue-600">Admin Panel</span>
                    </Link>
                  )}

                  <button 
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }} 
                    className="flex items-center gap-4 p-4 w-full hover:bg-red-50 rounded-2xl transition-all text-red-600"
                  >
                    <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                      <LogOut className="w-5 h-5" />
                    </div>
                    <span className="font-bold">Logout</span>
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-1 gap-3 px-3">
                  <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="w-full py-4 text-center font-bold text-gray-700 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all">
                    Login
                  </Link>
                  <Link to="/signup" onClick={() => setIsMobileMenuOpen(false)} className="w-full py-4 bg-[#e5322d] text-white text-center rounded-xl font-bold shadow-lg shadow-[#e5322d]/20 hover:bg-[#c42b27] transition-all">
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
