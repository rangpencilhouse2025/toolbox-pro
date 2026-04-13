import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, updateDoc, doc, deleteDoc, where, orderBy, setDoc, deleteField, addDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { 
  ShieldCheck, Users, Settings as SettingsIcon, Zap, Loader2, Save, 
  Search, Trash2, RotateCcw, LayoutDashboard, UserCog, BarChart3,
  ChevronRight, Mail, User as UserIcon, Clock, Wrench as ToolIcon,
  Plus, Edit2, Globe, Layout, Palette, Sparkles, Check, ArrowRight, Wand2, MessageSquare, Camera, Image as ImageIcon,
  Ban, CheckCircle, RefreshCw, CreditCard, Filter, MoreVertical, X, Star
} from 'lucide-react';
import { auth, db } from '../firebase';
import { UserProfile, AppSettings, Tool, AdSlotConfig, PremiumPlan, HeroBannerSlide, Review, NavMenuItem, FooterLink } from '../types';
import { handleFirestoreError, OperationType } from '../lib/utils';
import { upgradePlan } from '../lib/subscriptionService';

type AdminTab = 'overview' | 'users' | 'tools' | 'settings' | 'ads' | 'payments' | 'plans' | 'banner' | 'reviews';

export default function AdminPage({ settings, heroSlides }: { settings: AppSettings | null, heroSlides: HeroBannerSlide[] }) {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [adSlots, setAdSlots] = useState<AdSlotConfig[]>([]);
  const [premiumPlans, setPremiumPlans] = useState<PremiumPlan[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isAddingTool, setIsAddingTool] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [newTool, setNewTool] = useState<Partial<Tool>>({
    name: '',
    description: '',
    icon: 'Wrench',
    isPremium: false,
    isActive: true,
    isCustom: true,
    htmlContent: '',
    category: 'General'
  });

  const [isAddingAd, setIsAddingAd] = useState(false);
  const [editingAd, setEditingAd] = useState<AdSlotConfig | null>(null);
  const [newAd, setNewAd] = useState<Partial<AdSlotConfig>>({
    name: '',
    script: '',
    position: 'top',
    isActive: true
  });

  const [isAddingPlan, setIsAddingPlan] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PremiumPlan | null>(null);
  const [isAddingReview, setIsAddingReview] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [newReview, setNewReview] = useState<Partial<Review>>({
    userName: '',
    userPhoto: '',
    rating: 5,
    comment: '',
    isFake: true,
    isApproved: true
  });
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [userFilter, setUserFilter] = useState<'all' | 'premium' | 'free' | 'blocked'>('all');
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploadingSlideImage, setIsUploadingSlideImage] = useState(false);
  const slideImageInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploadingReviewPhoto, setIsUploadingReviewPhoto] = useState(false);
  const reviewPhotoInputRef = React.useRef<HTMLInputElement>(null);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [newPlan, setNewPlan] = useState<Partial<PremiumPlan>>({
    name: '',
    price: 0,
    currency: 'INR',
    duration: 'monthly',
    durationText: '/ month',
    description: '',
    features: [],
    isActive: true,
    isPopular: false,
    paymentLink: '',
    paymentButtonText: ''
  });

  // Local state for settings to allow editing before saving
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings || {
    dailyLimit: 5,
    siteName: 'ToolBox Pro',
    siteDescription: 'All-in-one productivity suite',
    premiumPrice: 499,
    currency: 'INR',
    razorpayEnabled: false,
    razorpayKeyId: '',
    enableTestMode: false,
    adScriptTop: '',
    adScriptBottom: '',
    logoUrl: '',
    primaryColor: '#2563eb',
    secondaryColor: '#1e40af',
    accentColor: '#f59e0b',
    fontFamily: 'Inter',
    headerStyle: 'sticky',
    headerBgColor: '#ffffff',
    headerTextColor: '#111827',
    footerText: '© 2024 ToolBox Pro. All rights reserved.',
    footerBgColor: '#f9fafb',
    footerTextColor: '#4b5563',
    showHeroSection: true,
    showStatsSection: true,
    showPricingSection: true,
    showToolsSection: true,
    showReviewsSection: true,
    animationSpeed: 'normal',
    enableGlassmorphism: true,
    manualPaymentEnabled: false,
    enableWhatsApp: false,
    whatsAppNumber: '',
    enableScrollToTop: true,
    enableBackButton: true,
    maintenanceMode: false,
    showHeroBanner: true,
    heroBannerSlides: [],
    heroBannerHeight: '500px',
    heroBannerAutoPlay: true,
    heroBannerInterval: 5000,
    heroBannerEffect: 'slide',
    heroBannerShowDots: true,
    heroBannerShowArrows: true,
    heroBannerBorderRadius: '0px',
    heroBannerPadding: '0px',
    heroTitle: 'All-in-One Digital Toolbox',
    heroSubtitle: 'Powerful tools for developers, designers, and creators. Compress images, remove backgrounds, generate resumes, and more.',
    toolsTitle: 'Powerful Digital Tools',
    toolsSubtitle: 'Everything you need to boost your productivity in one place.',
    pricingTitle: 'Simple, Transparent Pricing',
    pricingSubtitle: 'Choose the plan that works best for you and your team.',
    reviewsTitle: 'What Our Users Say',
    reviewsSubtitle: 'Join thousands of satisfied users who trust ToolBox Pro.',
    navMenuItems: [
      { id: '1', label: 'Home', path: '/' },
      { id: '2', label: 'Tools', path: '/#tools' },
      { id: '3', label: 'Pricing', path: '/#pricing' },
      { id: '4', label: 'Reviews', path: '/#reviews' }
    ],
    footerLinks: [
      { id: '1', label: 'Privacy Policy', path: '/privacy' },
      { id: '2', label: 'Terms of Service', path: '/terms' },
      { id: '3', label: 'Contact Us', path: '/contact' }
    ],
    sectionOrder: ['hero', 'stats', 'tools', 'pricing', 'reviews'],
    customCss: ''
  });

  const [isAddingSlide, setIsAddingSlide] = useState(false);
  const [slideToDelete, setSlideToDelete] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (settings && JSON.stringify(localSettings) !== JSON.stringify(settings)) {
      setHasUnsavedChanges(true);
    } else {
      setHasUnsavedChanges(false);
    }
  }, [localSettings, settings]);
  const [editingSlide, setEditingSlide] = useState<HeroBannerSlide | null>(null);
  const [newSlide, setNewSlide] = useState<Partial<HeroBannerSlide>>({
    imageUrl: '',
    title: '',
    subtitle: '',
    buttonText: '',
    buttonLink: '',
    titleColor: '#ffffff',
    subtitleColor: '#e5e7eb',
    buttonBgColor: '#e5322d',
    buttonTextColor: '#ffffff',
    overlayOpacity: 0,
    textAlign: 'center',
    objectFit: 'cover',
    objectPosition: 'center'
  });

  useEffect(() => {
    if (settings) {
      setLocalSettings({
        ...settings,
        heroBannerSlides: heroSlides.length > 0 ? heroSlides : (settings.heroBannerSlides || [])
      });
    }
  }, [settings, heroSlides]);

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo file too large (max 2MB)");
      return;
    }

    setLogoUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 300;
          const MAX_HEIGHT = 100;
          let width = img.width;
          let height = img.height;

          if (width / height > MAX_WIDTH / MAX_HEIGHT) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const base64 = canvas.toDataURL('image/png', 0.8);
          setLocalSettings({ ...localSettings, logoUrl: base64 });
          setLogoUploading(false);
          toast.success("Logo uploaded to settings (Save to apply)");
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Logo upload error:", error);
      toast.error("Failed to process logo");
      setLogoUploading(false);
    }
  };

  const handleSlideImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file too large (max 5MB)");
      return;
    }

    setIsUploadingSlideImage(true);
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1920;
          const MAX_HEIGHT = 1080;
          let width = img.width;
          let height = img.height;

          if (width / height > MAX_WIDTH / MAX_HEIGHT) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const base64 = canvas.toDataURL('image/jpeg', 0.8);
          setNewSlide({ ...newSlide, imageUrl: base64 });
          setIsUploadingSlideImage(false);
          toast.success("Image uploaded successfully");
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
      setIsUploadingSlideImage(false);
    }
  };

  const handleReviewPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      toast.error("Image too large (max 1MB)");
      return;
    }

    setIsUploadingReviewPhoto(true);
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const base64 = canvas.toDataURL('image/jpeg', 0.7);
          setNewReview({ ...newReview, userPhoto: base64 });
          setIsUploadingReviewPhoto(false);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Review photo upload error:", error);
      toast.error("Failed to process photo");
      setIsUploadingReviewPhoto(false);
    }
  };

  const [isInitializingTools, setIsInitializingTools] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Users
      const usersQ = query(collection(db, 'users'), orderBy('lastUsedAt', 'desc'));
      const usersSnap = await getDocs(usersQ);
      setUsers(usersSnap.docs.map(doc => doc.data() as UserProfile));

      // Fetch Tools
      const toolsSnap = await getDocs(collection(db, 'tools'));
      const toolsList = toolsSnap.docs.map(doc => doc.data() as Tool);
      setTools(toolsList);

      // Fetch Ad Slots
      const adsSnap = await getDocs(collection(db, 'adSlots'));
      setAdSlots(adsSnap.docs.map(doc => doc.data() as AdSlotConfig));

      // Fetch Premium Plans
      const plansSnap = await getDocs(collection(db, 'premiumPlans'));
      setPremiumPlans(plansSnap.docs.map(doc => doc.data() as PremiumPlan));

      // Fetch Reviews
      const reviewsSnap = await getDocs(query(collection(db, 'reviews'), orderBy('createdAt', 'desc')));
      setReviews(reviewsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review)));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'data', auth);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNavItem = () => {
    const newItem: NavMenuItem = {
      id: Math.random().toString(36).substr(2, 9),
      label: 'New Link',
      path: '/'
    };
    setLocalSettings({
      ...localSettings,
      navMenuItems: [...(localSettings.navMenuItems || []), newItem]
    });
  };

  const handleRemoveNavItem = (id: string) => {
    setLocalSettings({
      ...localSettings,
      navMenuItems: localSettings.navMenuItems?.filter(item => item.id !== id)
    });
  };

  const handleUpdateNavItem = (id: string, updates: Partial<NavMenuItem>) => {
    setLocalSettings({
      ...localSettings,
      navMenuItems: localSettings.navMenuItems?.map(item => 
        item.id === id ? { ...item, ...updates } : item
      )
    });
  };

  const handleAddFooterLink = () => {
    const newItem: FooterLink = {
      id: Math.random().toString(36).substr(2, 9),
      label: 'New Link',
      path: '/'
    };
    setLocalSettings({
      ...localSettings,
      footerLinks: [...(localSettings.footerLinks || []), newItem]
    });
  };

  const handleRemoveFooterLink = (id: string) => {
    setLocalSettings({
      ...localSettings,
      footerLinks: localSettings.footerLinks?.filter(item => item.id !== id)
    });
  };

  const handleUpdateFooterLink = (id: string, updates: Partial<FooterLink>) => {
    setLocalSettings({
      ...localSettings,
      footerLinks: localSettings.footerLinks?.map(item => 
        item.id === id ? { ...item, ...updates } : item
      )
    });
  };

  const handleSaveSettings = async () => {
    try {
      const { heroBannerSlides, ...restSettings } = localSettings;
      
      // 1. Save settings without slides to avoid 1MB limit
      await setDoc(doc(db, 'settings', 'global'), { ...restSettings }, { merge: true });
      
      // 2. Save slides to separate collection
      // First, delete all existing slides in the collection to ensure sync
      const slidesSnap = await getDocs(collection(db, 'hero_slides'));
      const deletePromises = slidesSnap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);
      
      // Then save new slides
      if (heroBannerSlides && heroBannerSlides.length > 0) {
        const savePromises = heroBannerSlides.map((slide, index) => {
          const slideId = slide.id || `slide-${index}`;
          return setDoc(doc(db, 'hero_slides', slideId), { ...slide, order: index });
        });
        await Promise.all(savePromises);
      }
      
      // 3. Remove slides from global settings if they exist there to keep document small
      await updateDoc(doc(db, 'settings', 'global'), {
        heroBannerSlides: deleteField()
      });

      toast.success("Settings and slides saved successfully");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/global', auth);
    }
  };

  const initializeMissingTools = async () => {
    setIsInitializingTools(true);
    try {
      const initialTools: Tool[] = [
        { id: 'compressor', name: 'Image Compressor', description: 'Reduce image file size while maintaining quality.', icon: 'Image', path: '/tools/compressor', isPremium: false, isActive: true, category: 'Optimize Files' },
        { id: 'resizer', name: 'Image Resizer', description: 'Change image dimensions easily.', icon: 'Maximize', path: '/tools/resizer', isPremium: false, isActive: true, category: 'Optimize Files' },
        { id: 'bg-remover', name: 'Background Remover', description: 'Remove backgrounds from images using AI.', icon: 'Wand2', path: '/tools/bg-remover', isPremium: false, isActive: true, category: 'Edit Files' },
        { id: 'pencil-outline', name: 'Pencil Outline', description: 'Convert any photo into a pencil sketch or outline.', icon: 'Pencil', path: '/tools/pencil-outline', isPremium: false, isActive: true, category: 'Edit Files' },
        { id: 'grid-maker', name: 'Grid Maker', description: 'Overlay a customizable grid on images for artists.', icon: 'Grid', path: '/tools/grid-maker', isPremium: false, isActive: true, category: 'Organize Files' },
        { id: 'perspective', name: 'Perspective Grid', description: 'Overlay 1, 2, or 3-point perspective grids on photos.', icon: 'Box', path: '/tools/perspective', isPremium: false, isActive: true, category: 'Organize Files' },
        { id: 'social-resizer', name: 'Social Media Resizer', description: 'Resize images for Instagram, Facebook, and more.', icon: 'Share2', path: '/tools/social-resizer', isPremium: false, isActive: true, category: 'Optimize Files' },
        { id: 'pdf-tools', name: 'File Toolbox', description: 'Convert images/text to PDF, merge, and optimize PDFs.', icon: 'FileText', path: '/tools/pdf-tools', isPremium: false, isActive: true, category: 'Convert Files' },
        { id: 'resume-generator', name: 'Resume Generator', description: 'Create professional resumes with photos and signatures.', icon: 'FilePlus', path: '/tools/resume-generator', isPremium: false, isActive: true, category: 'Convert Files' },
        { id: 'legal-generators', name: 'Legal Generators', description: 'Generate Terms, Privacy Policy, Refund Policy, About Us, and Contact Us.', icon: 'ShieldCheck', path: '/tools/legal-generators', isPremium: false, isActive: true, category: 'Security' },
        { id: 'qrcode', name: 'QR Code Generator', description: 'Create custom QR codes for any URL or text.', icon: 'QrCode', path: '/tools/qrcode', isPremium: false, isActive: true, category: 'Convert Files' },
        { id: 'gpa-calculator', name: 'GPA Calculator', description: 'Calculate your semester or cumulative GPA easily.', icon: 'Calculator', path: '/tools/gpa-calculator', isPremium: false, isActive: true, category: 'Student Tools' },
        { id: 'marks-calculator', name: 'Marks Calculator', description: 'Quickly calculate your exam percentage.', icon: 'Percent', path: '/tools/marks-calculator', isPremium: false, isActive: true, category: 'Student Tools' },
        { id: 'exam-countdown', name: 'Exam Countdown', description: 'Track your upcoming exams and stay prepared.', icon: 'Timer', path: '/tools/exam-countdown', isPremium: false, isActive: true, category: 'Student Tools' },
        { id: 'notes-summarizer', name: 'Notes Summarizer', description: 'Paste your long notes and get a concise summary using AI.', icon: 'FileText', path: '/tools/notes-summarizer', isPremium: false, isActive: true, category: 'Student Tools' },
        { id: 'formula-generator', name: 'Formula Generator', description: 'Instantly create a cheat sheet for any subject using AI.', icon: 'BookOpen', path: '/tools/formula-generator', isPremium: false, isActive: true, category: 'Student Tools' },
        { id: 'mcq-generator', name: 'MCQ Generator', description: 'Create practice questions from any text or notes using AI.', icon: 'ListChecks', path: '/tools/mcq-generator', isPremium: false, isActive: true, category: 'Student Tools' },
        { id: 'study-planner', name: 'Study Planner', description: 'Organize your weekly study schedule and stay on track.', icon: 'Calendar', path: '/tools/study-planner', isPremium: false, isActive: true, category: 'Student Tools' },
        { id: 'citation-generator', name: 'Citation Generator', description: 'Create accurate citations in APA, MLA, or Chicago style.', icon: 'Quote', path: '/tools/citation-generator', isPremium: false, isActive: true, category: 'Student Tools' },
        { id: 'flashcard-maker', name: 'Flashcard Maker', description: 'Create and study digital flashcards for better memorization.', icon: 'Layers', path: '/tools/flashcard-maker', isPremium: false, isActive: true, category: 'Student Tools' },
        { id: 'word-counter', name: 'Word Counter', description: 'Analyze your text with real-time word and character counts.', icon: 'Type', path: '/tools/word-counter', isPremium: false, isActive: true, category: 'Student Tools' },
        { id: 'assignment-generator', name: 'Assignment Generator', description: 'Create high-quality academic assignments instantly using AI.', icon: 'BookOpen', path: '/tools/assignment-generator', isPremium: false, isActive: true, category: 'Student Tools' },
        { id: 'invoice-generator', name: 'Invoice Generator', description: 'Create professional, beautiful invoices with e-signatures and custom templates.', icon: 'FileText', path: '/tools/invoice-generator', isPremium: false, isActive: true, category: 'Workflows' },
        { id: 'ai-text', name: 'AI Text Generator', description: 'Generate creative text using Gemini AI.', icon: 'MessageSquare', path: '/tools/ai-text', isPremium: true, isActive: true, category: 'Intelligence' }
      ];

      for (const tool of initialTools) {
        const existingTool = tools.find(t => t.id === tool.id);
        if (!existingTool) {
          await setDoc(doc(db, 'tools', tool.id), tool);
        } else if (existingTool.category !== tool.category) {
          // Force update existing tool with correct category
          await updateDoc(doc(db, 'tools', tool.id), { category: tool.category });
        }
      }
      toast.success("Tools initialized!");
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'tools', auth);
    } finally {
      setIsInitializingTools(false);
    }
  };

  const toggleToolPremium = async (toolId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'tools', toolId), { isPremium: !currentStatus });
      setTools(tools.map(t => t.id === toolId ? { ...t, isPremium: !currentStatus } : t));
      toast.success("Tool status updated");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tools/${toolId}`, auth);
    }
  };

  const toggleToolActive = async (toolId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'tools', toolId), { isActive: !currentStatus });
      setTools(tools.map(t => t.id === toolId ? { ...t, isActive: !currentStatus } : t));
      toast.success("Tool visibility updated");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tools/${toolId}`, auth);
    }
  };

  const toggleAdActive = async (adId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'adSlots', adId), { isActive: !currentStatus });
      setAdSlots(adSlots.map(ad => ad.id === adId ? { ...ad, isActive: !currentStatus } : ad));
      toast.success("Ad slot status updated");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `adSlots/${adId}`, auth);
    }
  };

  const togglePlanActive = async (planId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'premiumPlans', planId), { isActive: !currentStatus });
      setPremiumPlans(premiumPlans.map(p => p.id === planId ? { ...p, isActive: !currentStatus } : p));
      toast.success("Plan status updated");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `premiumPlans/${planId}`, auth);
    }
  };

  const togglePremium = async (userId: string, currentStatus: boolean) => {
    setActionLoading(userId);
    try {
      await updateDoc(doc(db, 'users', userId), { premiumStatus: !currentStatus });
      setUsers(users.map(u => u.uid === userId ? { ...u, premiumStatus: !currentStatus } : u));
      toast.success("User status updated");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`, auth);
    } finally {
      setActionLoading(null);
    }
  };

  const resetUsage = async (userId: string) => {
    setActionLoading(userId);
    try {
      await updateDoc(doc(db, 'users', userId), { usageCount: 0 });
      setUsers(users.map(u => u.uid === userId ? { ...u, usageCount: 0 } : u));
      toast.success("Usage count reset");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`, auth);
    } finally {
      setActionLoading(null);
    }
  };

  const deleteUser = async (userId: string) => {
    setActionLoading(userId);
    try {
      await deleteDoc(doc(db, 'users', userId));
      setUsers(users.filter(u => u.uid !== userId));
      toast.success("User deleted");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}`, auth);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleBlockUser = async (userId: string, currentStatus: boolean) => {
    const userToToggle = users.find(u => u.uid === userId);
    if (userToToggle?.role === 'admin' && !currentStatus) {
      toast.error("Administrators cannot be blocked");
      return;
    }
    setActionLoading(userId);
    try {
      await updateDoc(doc(db, 'users', userId), { isBlocked: !currentStatus });
      setUsers(users.map(u => u.uid === userId ? { ...u, isBlocked: !currentStatus } : u));
      toast.success(currentStatus ? "User unblocked" : "User blocked");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`, auth);
    } finally {
      setActionLoading(null);
    }
  };

  const refundUser = async (userId: string) => {
    setActionLoading(userId);
    try {
      await updateDoc(doc(db, 'users', userId), { 
        premiumStatus: false, 
        currentPlanId: deleteField(), 
        planExpiresAt: deleteField() 
      });
      setUsers(users.map(u => u.uid === userId ? { ...u, premiumStatus: false, currentPlanId: undefined, planExpiresAt: undefined } : u));
      toast.success("User premium status reset (Refunded)");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`, auth);
    } finally {
      setActionLoading(null);
    }
  };

  const renewUser = async (userId: string, days: number = 30) => {
    setActionLoading(userId);
    try {
      const user = users.find(u => u.uid === userId);
      if (!user) return;
      
      const currentExpiry = user.planExpiresAt ? new Date(user.planExpiresAt) : new Date();
      const newExpiry = new Date(currentExpiry.getTime() + days * 24 * 60 * 60 * 1000);
      
      await updateDoc(doc(db, 'users', userId), { 
        premiumStatus: true,
        planExpiresAt: newExpiry.toISOString() 
      });
      setUsers(users.map(u => u.uid === userId ? { ...u, premiumStatus: true, planExpiresAt: newExpiry.toISOString() } : u));
      toast.success(`Plan renewed for ${days} days`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`, auth);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateUser = async (userData: UserProfile) => {
    setActionLoading(userData.uid);
    try {
      await updateDoc(doc(db, 'users', userData.uid), { ...userData });
      setUsers(users.map(u => u.uid === userData.uid ? userData : u));
      toast.success("User profile updated");
      setIsEditingUser(false);
      setEditingUser(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userData.uid}`, auth);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveSlide = () => {
    const slides = [...(localSettings.heroBannerSlides || [])];
    if (editingSlide) {
      const index = slides.findIndex(s => s.id === editingSlide.id);
      if (index !== -1) {
        slides[index] = { ...editingSlide, ...newSlide } as HeroBannerSlide;
      }
    } else {
      slides.push({
        ...newSlide,
        id: Math.random().toString(36).substr(2, 9)
      } as HeroBannerSlide);
    }
    setLocalSettings({ ...localSettings, heroBannerSlides: slides });
    setIsAddingSlide(false);
    setEditingSlide(null);
    setNewSlide({
      imageUrl: '',
      title: '',
      subtitle: '',
      buttonText: '',
      buttonLink: '',
      titleColor: '#ffffff',
      subtitleColor: '#e5e7eb',
      buttonBgColor: '#e5322d',
      buttonTextColor: '#ffffff',
      overlayOpacity: 0,
      textAlign: 'center'
    });
    toast.success("Slide updated locally. Don't forget to save settings!");
  };

  const handleDeleteSlide = (id: string) => {
    const slides = (localSettings.heroBannerSlides || []).filter(s => s.id !== id);
    setLocalSettings({ ...localSettings, heroBannerSlides: slides });
    setSlideToDelete(null);
    toast.success("Slide removed. Click 'Save Changes' to apply permanently.");
  };

  const moveSlide = (index: number, direction: 'up' | 'down') => {
    const slides = [...(localSettings.heroBannerSlides || [])];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= slides.length) return;
    
    [slides[index], slides[newIndex]] = [slides[newIndex], slides[index]];
    setLocalSettings({ ...localSettings, heroBannerSlides: slides });
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.displayName || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    if (userFilter === 'premium') return matchesSearch && u.premiumStatus;
    if (userFilter === 'free') return matchesSearch && !u.premiumStatus;
    if (userFilter === 'blocked') return matchesSearch && u.isBlocked;
    return matchesSearch;
  });

  const stats = {
    total: users.length,
    premium: users.filter(u => u.premiumStatus).length,
    totalUsage: users.reduce((acc, u) => acc + (u.usageCount || 0), 0)
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8">
      {/* Admin Sidebar Menu */}
      <aside className="w-full md:w-64 space-y-2 md:sticky md:top-24 h-fit">
        <div className="p-4 mb-4 bg-blue-600 rounded-2xl text-white flex items-center gap-3 shadow-sm">
          <ShieldCheck className="w-6 h-6" />
          <span className="font-bold text-lg">Admin Panel</span>
        </div>
        
        <nav className="space-y-1">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'overview' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'users' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <Users className="w-5 h-5" />
            Users
          </button>
          <button 
            onClick={() => setActiveTab('tools')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'tools' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <UserCog className="w-5 h-5" />
            Tools
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'settings' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <SettingsIcon className="w-5 h-5" />
            Site Config
          </button>
          <button 
            onClick={() => setActiveTab('banner')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'banner' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <ImageIcon className="w-5 h-5" />
            Hero Banner
          </button>
          <button 
            onClick={() => setActiveTab('ads')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'ads' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <BarChart3 className="w-5 h-5" />
            Ads Manager
          </button>
          <button 
            onClick={() => setActiveTab('payments')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'payments' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <Zap className="w-5 h-5" />
            Payments
          </button>
          <button 
            onClick={() => setActiveTab('plans')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'plans' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <ShieldCheck className="w-5 h-5" />
            Plans Manager
          </button>
          <button 
            onClick={() => setActiveTab('reviews')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'reviews' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <MessageSquare className="w-5 h-5" />
            Reviews
          </button>
        </nav>

        <div className="mt-8 p-4 bg-gray-50 rounded-2xl border border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase mb-3">Quick Stats</p>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Users</span>
              <span className="font-bold text-gray-900">{stats.total}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Premium</span>
              <span className="font-bold text-amber-600">{stats.premium}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 space-y-6">
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-2">
                <Users className="w-8 h-8 text-blue-600 mb-2" />
                <p className="text-sm font-medium text-gray-500">Total Users</p>
                <p className="text-3xl font-extrabold text-gray-900">{stats.total}</p>
              </div>
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-2">
                <Zap className="w-8 h-8 text-amber-500 mb-2" />
                <p className="text-sm font-medium text-gray-500">Premium Users</p>
                <p className="text-3xl font-extrabold text-gray-900">{stats.premium}</p>
              </div>
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-2">
                <BarChart3 className="w-8 h-8 text-green-500 mb-2" />
                <p className="text-sm font-medium text-gray-500">Total Usage</p>
                <p className="text-3xl font-extrabold text-gray-900">{stats.totalUsage}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-400" />
                Recent Activity
              </h2>
              <div className="space-y-4">
                {users.slice(0, 5).map(user => (
                  <div key={user.uid} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-gray-200 overflow-hidden">
                        {user.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover" /> : <UserIcon className="w-5 h-5 text-gray-400" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{user.displayName || 'ToolBox User'}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">
                      {user.lastUsedAt ? new Date(user.lastUsedAt).toLocaleDateString() : 'Never'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-2xl font-bold text-gray-900">Manage Users</h2>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
                  {(['all', 'premium', 'free', 'blocked'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setUserFilter(f)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all capitalize ${userFilter === f ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
                  />
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50">
                      <th className="pb-4 pl-2">User</th>
                      <th className="pb-4">Usage</th>
                      <th className="pb-4">Status</th>
                      <th className="pb-4 pr-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredUsers.map((user) => (
                      <tr key={user.uid} className="group hover:bg-gray-50 transition-colors">
                        <td className="py-4 pl-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden border border-gray-200">
                              {user.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover" /> : <UserIcon className="w-5 h-5 text-gray-400" />}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-gray-900">{user.displayName || 'ToolBox User'}</span>
                              <span className="text-xs text-gray-400">{user.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4">
                          <span className="text-sm font-medium text-gray-600">{user.usageCount}</span>
                        </td>
                        <td className="py-4">
                          <div className="flex flex-wrap gap-1">
                            {user.isBlocked && (
                              <span className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded-full">BLOCKED</span>
                            )}
                            {user.plan ? (
                              <span className={`px-2 py-1 text-[10px] font-bold rounded-full uppercase ${
                                user.plan === 'premium' ? 'bg-purple-100 text-purple-700' : 
                                user.plan === 'pro' ? 'bg-blue-100 text-blue-700' : 
                                'bg-gray-100 text-gray-500'
                              }`}>
                                {user.plan}
                              </span>
                            ) : user.premiumStatus ? (
                              <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full uppercase">PREMIUM</span>
                            ) : (
                              <span className="px-2 py-1 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-full uppercase">FREE</span>
                            )}
                            {user.role === 'admin' && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">ADMIN</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 pr-2 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => {
                                setEditingUser(user);
                                setIsEditingUser(true);
                              }}
                              disabled={actionLoading === user.uid}
                              title="View/Edit User Details"
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <UserCog className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => toggleBlockUser(user.uid, user.isBlocked || false)}
                              disabled={actionLoading === user.uid || user.role === 'admin'}
                              title={user.role === 'admin' ? "Admins cannot be blocked" : (user.isBlocked ? "Unblock User" : "Block User")}
                              className={`p-2 rounded-lg transition-colors ${user.isBlocked ? 'text-red-600 bg-red-50' : 'text-gray-400 hover:bg-gray-100 hover:text-red-600'} ${user.role === 'admin' ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setConfirmModal({
                                show: true,
                                title: 'Delete User',
                                message: 'Are you sure you want to delete this user? This action cannot be undone.',
                                onConfirm: () => deleteUser(user.uid)
                              })}
                              disabled={actionLoading === user.uid}
                              title="Delete User"
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'tools' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-2xl font-bold text-gray-900">Manage Tools</h2>
              <div className="flex gap-2">
                <button 
                  onClick={initializeMissingTools}
                  disabled={isInitializingTools}
                  className="px-4 py-2 bg-amber-500 text-white rounded-xl font-bold text-sm hover:bg-amber-600 transition-all flex items-center gap-2 disabled:opacity-50"
                  title="Fixes missing categories and syncs tools with the latest definitions"
                >
                  {isInitializingTools ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Initialize & Repair Tools
                </button>
                <button 
                  onClick={() => {
                    setEditingTool(null);
                    setNewTool({
                      name: '',
                      description: '',
                      icon: 'Wrench',
                      isPremium: false,
                      isActive: true,
                      isCustom: true,
                      htmlContent: '',
                      category: 'General'
                    });
                    setIsAddingTool(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Custom Tool
                </button>
              </div>
            </div>

            {isAddingTool && (
              <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                <h3 className="font-bold text-gray-900">{editingTool ? 'Edit Tool' : 'New Custom Tool'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Tool Name</label>
                    <input 
                      type="text"
                      value={newTool.name}
                      onChange={(e) => setNewTool({...newTool, name: e.target.value})}
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Icon (Lucide Name)</label>
                    <input 
                      type="text"
                      value={newTool.icon}
                      onChange={(e) => setNewTool({...newTool, icon: e.target.value})}
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Description</label>
                  <input 
                    type="text"
                    value={newTool.description}
                    onChange={(e) => setNewTool({...newTool, description: e.target.value})}
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Category</label>
                    <input 
                      type="text"
                      value={newTool.category || ''}
                      onChange={(e) => setNewTool({...newTool, category: e.target.value})}
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Optimize Files, Student Tools"
                    />
                  </div>
                </div>
                {newTool.isCustom && (
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">HTML Content (Full Editable)</label>
                    <textarea 
                      value={newTool.htmlContent}
                      onChange={(e) => setNewTool({...newTool, htmlContent: e.target.value})}
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 h-64 font-mono text-sm"
                      placeholder="<div>Your custom tool HTML here...</div>"
                    />
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={newTool.isPremium}
                      onChange={(e) => setNewTool({...newTool, isPremium: e.target.checked})}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm font-bold text-gray-700">Premium Only</span>
                  </label>
                </div>
                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={async () => {
                      if (!newTool.name) {
                        toast.error("Name is required");
                        return;
                      }
                      try {
                        const id = editingTool ? editingTool.id : (newTool.name || '').toLowerCase().replace(/\s+/g, '-');
                        const toolData = {
                          ...newTool,
                          id,
                          path: editingTool ? editingTool.path : `/tools/custom/${id}`,
                          isActive: editingTool ? editingTool.isActive : true,
                          isCustom: editingTool ? editingTool.isCustom : true
                        };
                        await setDoc(doc(db, 'tools', id), toolData);
                        toast.success(editingTool ? "Tool updated" : "Tool added");
                        setIsAddingTool(false);
                        fetchData();
                      } catch (error) {
                        handleFirestoreError(error, OperationType.WRITE, 'tools', auth);
                      }
                    }}
                    className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                  >
                    {editingTool ? 'Update Tool' : 'Create Tool'}
                  </button>
                  <button 
                    onClick={() => setIsAddingTool(false)}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              {tools.map(tool => (
                <div key={tool.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-gray-50 rounded-2xl border border-gray-100 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm flex-shrink-0">
                      <SettingsIcon className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-900 truncate">{tool.name}</h3>
                        {tool.isCustom && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">CUSTOM</span>}
                      </div>
                      <p className="text-sm text-gray-500 truncate">{tool.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap justify-end">
                    <div className="flex items-center gap-2 mr-4">
                      <button 
                        onClick={() => {
                          setEditingTool(tool);
                          setNewTool(tool);
                          setIsAddingTool(true);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Tool"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setConfirmModal({
                          show: true,
                          title: 'Delete Tool',
                          message: `Are you sure you want to delete "${tool.name}"? This action cannot be undone.`,
                          onConfirm: async () => {
                            try {
                              await deleteDoc(doc(db, 'tools', tool.id));
                              toast.success("Tool deleted");
                              fetchData();
                            } catch (error) {
                              handleFirestoreError(error, OperationType.DELETE, `tools/${tool.id}`, auth);
                            }
                          }
                        })}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Tool"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Premium</span>
                      <button 
                        onClick={() => toggleToolPremium(tool.id, tool.isPremium)}
                        className={`w-12 h-6 rounded-full transition-colors relative ${tool.isPremium ? 'bg-amber-500' : 'bg-gray-300'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${tool.isPremium ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Active</span>
                      <button 
                        onClick={() => toggleToolActive(tool.id, tool.isActive)}
                        className={`w-12 h-6 rounded-full transition-colors relative ${tool.isActive ? 'bg-green-500' : 'bg-gray-300'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${tool.isActive ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'banner' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl font-black text-gray-900">Hero Banner Management</h2>
                <p className="text-gray-500 font-medium">Manage your homepage hero slider and its settings.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button 
                  onClick={handleSaveSettings}
                  className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-lg ${
                    hasUnsavedChanges 
                      ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200 animate-pulse ring-4 ring-blue-100' 
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                  disabled={!hasUnsavedChanges}
                >
                  <Save className="w-5 h-5" />
                  {hasUnsavedChanges ? 'Save Changes' : 'All Saved'}
                </button>
                <button 
                  onClick={() => {
                    setEditingSlide(null);
                    setNewSlide({
                      imageUrl: '',
                      title: '',
                      subtitle: '',
                      buttonText: '',
                      buttonLink: '',
                      titleColor: '#ffffff',
                      subtitleColor: '#e5e7eb',
                      buttonBgColor: '#e5322d',
                      buttonTextColor: '#ffffff',
                      overlayOpacity: 0,
                      textAlign: 'center',
                      objectFit: 'cover',
                      objectPosition: 'center'
                    });
                    setIsAddingSlide(true);
                  }}
                  className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg"
                >
                  <Plus className="w-5 h-5" />
                  Add Slide
                </button>
              </div>
            </div>

            {/* Banner Global Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-gray-700">Show Banner</label>
                  <button 
                    onClick={() => setLocalSettings({...localSettings, showHeroBanner: !localSettings.showHeroBanner})}
                    className={`w-12 h-6 rounded-full transition-colors relative ${localSettings.showHeroBanner ? 'bg-blue-600' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${localSettings.showHeroBanner ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">Banner Height</label>
                  <input 
                    type="text"
                    value={localSettings.heroBannerHeight || '500px'}
                    onChange={(e) => setLocalSettings({...localSettings, heroBannerHeight: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    placeholder="e.g. 500px or 70vh"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">Banner Width</label>
                  <input 
                    type="text"
                    value={localSettings.heroBannerWidth || '100%'}
                    onChange={(e) => setLocalSettings({...localSettings, heroBannerWidth: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    placeholder="e.g. 100% or 1200px"
                  />
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-gray-700">Auto Play</label>
                  <button 
                    onClick={() => setLocalSettings({...localSettings, heroBannerAutoPlay: !localSettings.heroBannerAutoPlay})}
                    className={`w-12 h-6 rounded-full transition-colors relative ${localSettings.heroBannerAutoPlay ? 'bg-blue-600' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${localSettings.heroBannerAutoPlay ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">Interval (ms)</label>
                  <input 
                    type="number"
                    value={localSettings.heroBannerInterval || 5000}
                    onChange={(e) => setLocalSettings({...localSettings, heroBannerInterval: parseInt(e.target.value)})}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 uppercase">Transition Effect</label>
                  <select 
                    value={localSettings.heroBannerEffect || 'slide'}
                    onChange={(e) => setLocalSettings({...localSettings, heroBannerEffect: e.target.value as any})}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  >
                    <option value="slide">Slide (Horizontal)</option>
                    <option value="fade">Fade</option>
                    <option value="zoom">Zoom In</option>
                    <option value="slide-up">Slide Up</option>
                    <option value="slide-down">Slide Down</option>
                    <option value="blur">Blur Transition</option>
                  </select>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-gray-700">Show Dots</label>
                  <button 
                    onClick={() => setLocalSettings({...localSettings, heroBannerShowDots: !localSettings.heroBannerShowDots})}
                    className={`w-12 h-6 rounded-full transition-colors relative ${localSettings.heroBannerShowDots !== false ? 'bg-blue-600' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${localSettings.heroBannerShowDots !== false ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-gray-700">Show Arrows</label>
                  <button 
                    onClick={() => setLocalSettings({...localSettings, heroBannerShowArrows: !localSettings.heroBannerShowArrows})}
                    className={`w-12 h-6 rounded-full transition-colors relative ${localSettings.heroBannerShowArrows !== false ? 'bg-blue-600' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${localSettings.heroBannerShowArrows !== false ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">Border Radius</label>
                  <input 
                    type="text"
                    value={localSettings.heroBannerBorderRadius || '0px'}
                    onChange={(e) => setLocalSettings({...localSettings, heroBannerBorderRadius: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    placeholder="e.g. 20px or 2rem"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">Container Padding</label>
                  <input 
                    type="text"
                    value={localSettings.heroBannerPadding || '0px'}
                    onChange={(e) => setLocalSettings({...localSettings, heroBannerPadding: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    placeholder="e.g. 20px"
                  />
                </div>
              </div>
            </div>

            {/* Slides List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(localSettings.heroBannerSlides || []).map((slide, index) => (
                <div key={slide.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden group">
                  <div className="relative h-48 bg-gray-100">
                    {slide.imageUrl && (
                      <img 
                        src={slide.imageUrl} 
                        alt={slide.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button 
                        onClick={() => {
                          setEditingSlide(slide);
                          setNewSlide(slide);
                          setIsAddingSlide(true);
                        }}
                        className="p-3 bg-white text-blue-600 rounded-xl hover:scale-110 transition-transform shadow-lg"
                        title="Edit Slide"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => setSlideToDelete(slide.id)}
                        className="p-3 bg-white text-red-600 rounded-xl hover:scale-110 transition-transform shadow-lg"
                        title="Delete Slide"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="absolute top-2 right-2 flex flex-col gap-1">
                      <button 
                        onClick={() => moveSlide(index, 'up')}
                        disabled={index === 0}
                        className="p-1 bg-white/80 text-gray-700 rounded hover:bg-white disabled:opacity-50"
                      >
                        <ArrowRight className="w-4 h-4 -rotate-90" />
                      </button>
                      <button 
                        onClick={() => moveSlide(index, 'down')}
                        disabled={index === (localSettings.heroBannerSlides?.length || 0) - 1}
                        className="p-1 bg-white/80 text-gray-700 rounded hover:bg-white disabled:opacity-50"
                      >
                        <ArrowRight className="w-4 h-4 rotate-90" />
                      </button>
                    </div>
                  </div>
                  <div className="p-6 space-y-2">
                    <h3 className="font-bold text-gray-900 truncate">{slide.title || 'Untitled Slide'}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2">{slide.subtitle || 'No subtitle'}</p>
                    <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Slide {index + 1}</span>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setEditingSlide(slide);
                            setNewSlide(slide);
                            setIsAddingSlide(true);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setSlideToDelete(slide.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Permanent"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add New Slide Card at Bottom */}
              <button 
                onClick={() => {
                  setEditingSlide(null);
                  setNewSlide({
                    imageUrl: '',
                    title: '',
                    subtitle: '',
                    buttonText: '',
                    buttonLink: '',
                    titleColor: '#ffffff',
                    subtitleColor: '#e5e7eb',
                    buttonBgColor: '#e5322d',
                    buttonTextColor: '#ffffff',
                    overlayOpacity: 0,
                    textAlign: 'center',
                    objectFit: 'cover',
                    objectPosition: 'center'
                  });
                  setIsAddingSlide(true);
                }}
                className="h-full min-h-[240px] border-2 border-dashed border-gray-200 rounded-[40px] flex flex-col items-center justify-center gap-3 text-gray-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/30 transition-all group"
              >
                <div className="p-4 bg-gray-50 rounded-2xl group-hover:bg-blue-100/50 transition-colors">
                  <Plus className="w-8 h-8" />
                </div>
                <span className="font-bold">Add New Slide</span>
              </button>

              {(localSettings.heroBannerSlides || []).length === 0 && (
                <div className="col-span-full py-20 text-center bg-white rounded-[40px] border-2 border-dashed border-gray-100">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">No slides added yet</h3>
                  <p className="text-gray-500 mb-6">Add your first hero banner slide to get started.</p>
                  <button 
                    onClick={() => setIsAddingSlide(true)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
                  >
                    Add First Slide
                  </button>
                </div>
              )}
            </div>

            {/* Add/Edit Slide Modal */}
            {isAddingSlide && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-[40px] w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-300">
                  <div className="p-8 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
                    <div>
                      <h3 className="text-2xl font-black text-gray-900">{editingSlide ? 'Edit Slide' : 'Add New Slide'}</h3>
                      <p className="text-gray-500 font-medium">Customize your hero banner slide details.</p>
                    </div>
                    <button onClick={() => setIsAddingSlide(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                      <X className="w-6 h-6 text-gray-400" />
                    </button>
                  </div>

                  <div className="p-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Image & Basic Info */}                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-700">Slide Image</label>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <input 
                              type="text"
                              value={newSlide.imageUrl}
                              onChange={(e) => setNewSlide({...newSlide, imageUrl: e.target.value})}
                              className="flex-1 px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                              placeholder="https://example.com/image.jpg"
                            />
                            <div className="flex gap-2">
                              <input 
                                type="file"
                                ref={slideImageInputRef}
                                onChange={handleSlideImageUpload}
                                accept="image/*"
                                className="hidden"
                              />
                              <button
                                type="button"
                                onClick={() => slideImageInputRef.current?.click()}
                                disabled={isUploadingSlideImage}
                                className="flex-1 sm:flex-none px-5 py-3 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                              >
                                {isUploadingSlideImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                                Upload
                              </button>
                              {newSlide.imageUrl && (
                                <button
                                  type="button"
                                  onClick={() => setNewSlide({...newSlide, imageUrl: ''})}
                                  className="p-3 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-all"
                                  title="Remove Image"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-[10px] text-gray-400 ml-1">Provide a URL or upload an image from your device (Max 5MB)</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">Image Fit (Cropping)</label>
                            <select 
                              value={newSlide.objectFit || 'cover'}
                              onChange={(e) => setNewSlide({...newSlide, objectFit: e.target.value as any})}
                              className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                            >
                              <option value="cover">Cover (Fill & Crop)</option>
                              <option value="contain">Contain (Show All)</option>
                              <option value="fill">Fill (Stretch)</option>
                              <option value="none">Original</option>
                              <option value="scale-down">Scale Down</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">Image Position</label>
                            <input 
                              type="text"
                              value={newSlide.objectPosition || 'center'}
                              onChange={(e) => setNewSlide({...newSlide, objectPosition: e.target.value})}
                              className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                              placeholder="e.g. center, top, 50% 50%"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Preview */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase">Live Preview</label>
                      <div className="relative w-full h-64 rounded-3xl overflow-hidden bg-gray-900">
                        {newSlide.imageUrl && (
                          <img 
                            src={newSlide.imageUrl} 
                            alt="Preview" 
                            className="absolute inset-0 w-full h-full" 
                            style={{ 
                              objectFit: newSlide.objectFit || 'cover',
                              objectPosition: newSlide.objectPosition || 'center'
                            }}
                          />
                        )}
                        {!newSlide.imageUrl && (
                          <div className="absolute inset-0 flex items-center justify-center text-gray-500 font-bold">
                            No Image Selected
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                  <div className="p-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-0 bg-white">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      {editingSlide && (
                        <button 
                          onClick={() => setSlideToDelete(editingSlide.id)}
                          className="flex-1 sm:flex-none px-6 py-3 bg-red-50 text-red-600 font-bold rounded-2xl hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                        >
                          <Trash2 className="w-5 h-5" />
                          Delete Slide
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <button 
                        onClick={() => setIsAddingSlide(false)}
                        className="flex-1 sm:flex-none px-6 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-2xl transition-all"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleSaveSlide}
                        className="flex-1 sm:flex-none px-10 py-3 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                      >
                        {editingSlide ? 'Update Slide' : 'Add Slide'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Delete Confirmation Modal */}
            {slideToDelete && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-[40px] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
                  <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6 text-red-600">
                    <Trash2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2">Delete Slide?</h3>
                  <p className="text-gray-500 font-medium mb-8">
                    Are you sure you want to permanently delete this slide? This action cannot be undone once you save changes.
                  </p>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setSlideToDelete(null)}
                      className="flex-1 px-6 py-4 bg-gray-50 text-gray-600 font-bold rounded-2xl hover:bg-gray-100 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => {
                        handleDeleteSlide(slideToDelete);
                        setIsAddingSlide(false);
                      }}
                      className="flex-1 px-6 py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-100"
                    >
                      Delete Now
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-8 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between sticky top-[64px] bg-white/95 backdrop-blur-md py-4 z-20 border-b border-gray-100 -mx-4 sm:-mx-8 px-4 sm:px-8 mb-8 gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-gray-900">Site Customization</h2>
                <p className="text-xs sm:text-sm text-gray-500 font-medium">Manage your website's appearance, layout, and content.</p>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                {hasUnsavedChanges && (
                  <span className="text-[10px] sm:text-xs font-bold text-amber-600 bg-amber-50 px-2 sm:px-3 py-1 rounded-full animate-pulse whitespace-nowrap">
                    Unsaved Changes
                  </span>
                )}
                <button 
                  onClick={handleSaveSettings}
                  className="flex-1 sm:flex-none px-4 sm:px-8 py-2.5 sm:py-3 bg-blue-600 text-white rounded-xl sm:rounded-2xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                  Save Changes
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
              {/* Left Column: Branding & Layout */}
              <div className="space-y-10">
                {/* General Branding */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                      <Globe className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900">General Branding</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 ml-1">Site Name</label>
                      <input 
                        type="text" 
                        value={localSettings.siteName || ''}
                        onChange={(e) => setLocalSettings({...localSettings, siteName: e.target.value})}
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                        placeholder="Enter site name"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 ml-1">Site Description</label>
                      <textarea 
                        value={localSettings.siteDescription || ''}
                        onChange={(e) => setLocalSettings({...localSettings, siteDescription: e.target.value})}
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 font-medium"
                        placeholder="Enter site description for SEO"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 ml-1">Logo</label>
                      <div className="flex gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-white border border-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                          {localSettings.logoUrl ? (
                            <img src={localSettings.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                          ) : (
                            <ImageIcon className="w-6 h-6 text-gray-300" />
                          )}
                        </div>
                        <div className="flex-1 flex gap-2">
                          <input 
                            type="text" 
                            value={localSettings.logoUrl || ''}
                            onChange={(e) => setLocalSettings({...localSettings, logoUrl: e.target.value})}
                            placeholder="Logo URL or upload..."
                            className="flex-1 px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm"
                          />
                          <button 
                            onClick={() => logoInputRef.current?.click()}
                            disabled={logoUploading}
                            className="px-5 bg-gray-100 text-gray-600 rounded-2xl hover:bg-gray-200 transition-all disabled:opacity-50"
                          >
                            {logoUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Colors & Typography */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                    <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                      <Palette className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900">Colors & Typography</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 ml-1">Primary</label>
                      <div className="flex gap-2">
                        <input 
                          type="color" 
                          value={localSettings.primaryColor || '#000000'}
                          onChange={(e) => setLocalSettings({...localSettings, primaryColor: e.target.value})}
                          className="w-12 h-12 rounded-xl cursor-pointer border-none p-0 overflow-hidden"
                        />
                        <input 
                          type="text" 
                          value={localSettings.primaryColor || ''}
                          onChange={(e) => setLocalSettings({...localSettings, primaryColor: e.target.value})}
                          className="flex-1 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 ml-1">Secondary</label>
                      <div className="flex gap-2">
                        <input 
                          type="color" 
                          value={localSettings.secondaryColor || '#000000'}
                          onChange={(e) => setLocalSettings({...localSettings, secondaryColor: e.target.value})}
                          className="w-12 h-12 rounded-xl cursor-pointer border-none p-0 overflow-hidden"
                        />
                        <input 
                          type="text" 
                          value={localSettings.secondaryColor || ''}
                          onChange={(e) => setLocalSettings({...localSettings, secondaryColor: e.target.value})}
                          className="flex-1 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 ml-1">Accent</label>
                      <div className="flex gap-2">
                        <input 
                          type="color" 
                          value={localSettings.accentColor || '#000000'}
                          onChange={(e) => setLocalSettings({...localSettings, accentColor: e.target.value})}
                          className="w-12 h-12 rounded-xl cursor-pointer border-none p-0 overflow-hidden"
                        />
                        <input 
                          type="text" 
                          value={localSettings.accentColor || ''}
                          onChange={(e) => setLocalSettings({...localSettings, accentColor: e.target.value})}
                          className="flex-1 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 ml-1">Font Family</label>
                    <select 
                      value={localSettings.fontFamily || 'Inter'}
                      onChange={(e) => setLocalSettings({...localSettings, fontFamily: e.target.value})}
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                    >
                      <option value="Inter">Inter (Modern Sans)</option>
                      <option value="Outfit">Outfit (Geometric Sans)</option>
                      <option value="Space Grotesk">Space Grotesk (Tech)</option>
                      <option value="Playfair Display">Playfair Display (Elegant Serif)</option>
                      <option value="JetBrains Mono">JetBrains Mono (Developer)</option>
                    </select>
                  </div>
                </div>

                {/* Header & Navigation */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                    <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                      <Layout className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900">Header & Navigation</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 ml-1">Header Style</label>
                      <select 
                        value={localSettings.headerStyle || 'sticky'}
                        onChange={(e) => setLocalSettings({...localSettings, headerStyle: e.target.value as any})}
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                      >
                        <option value="sticky">Sticky (Scrolls with page)</option>
                        <option value="fixed">Fixed (Always at top)</option>
                        <option value="normal">Normal (Static)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 ml-1">Header Background</label>
                      <div className="flex gap-2">
                        <input 
                          type="color" 
                          value={localSettings.headerBgColor || '#ffffff'}
                          onChange={(e) => setLocalSettings({...localSettings, headerBgColor: e.target.value})}
                          className="w-12 h-12 rounded-xl cursor-pointer border-none p-0 overflow-hidden"
                        />
                        <input 
                          type="text" 
                          value={localSettings.headerBgColor || ''}
                          onChange={(e) => setLocalSettings({...localSettings, headerBgColor: e.target.value})}
                          className="flex-1 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-black text-gray-900">Navigation Menu Items</label>
                      <button 
                        onClick={handleAddNavItem}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add Item
                      </button>
                    </div>
                    <div className="space-y-3">
                      {localSettings.navMenuItems?.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 p-3 bg-white border border-gray-100 rounded-2xl shadow-sm group">
                          <input 
                            type="text" 
                            value={item.label}
                            onChange={(e) => handleUpdateNavItem(item.id, { label: e.target.value })}
                            placeholder="Label"
                            className="flex-1 px-3 py-2 bg-gray-50 border border-transparent rounded-xl focus:border-blue-500 focus:bg-white outline-none text-sm font-bold"
                          />
                          <input 
                            type="text" 
                            value={item.path}
                            onChange={(e) => handleUpdateNavItem(item.id, { path: e.target.value })}
                            placeholder="Path (e.g. /#tools)"
                            className="flex-1 px-3 py-2 bg-gray-50 border border-transparent rounded-xl focus:border-blue-500 focus:bg-white outline-none text-sm font-medium"
                          />
                          <button 
                            onClick={() => handleRemoveNavItem(item.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Sections & Footer */}
              <div className="space-y-10">
                {/* Section Management */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                    <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                      <LayoutDashboard className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900">Section Management</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { id: 'showHeroSection', label: 'Hero Section' },
                      { id: 'showStatsSection', label: 'Stats Section' },
                      { id: 'showToolsSection', label: 'Tools Section' },
                      { id: 'showPricingSection', label: 'Pricing Section' },
                      { id: 'showReviewsSection', label: 'Reviews Section' },
                      { id: 'showHeroBanner', label: 'Hero Banner' },
                      { id: 'showBannerSection', label: 'Banner Section' },
                      { id: 'enableWhatsApp', label: 'WhatsApp Widget' },
                      { id: 'enableScrollToTop', label: 'Scroll to Top' },
                      { id: 'enableGlassmorphism', label: 'Glassmorphism' },
                    ].map((section) => (
                      <div key={section.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <span className="text-sm font-bold text-gray-700">{section.label}</span>
                        <button 
                          onClick={() => setLocalSettings({...localSettings, [section.id]: !localSettings[section.id as keyof AppSettings]})}
                          className={`w-12 h-6 rounded-full transition-colors relative ${localSettings[section.id as keyof AppSettings] ? 'bg-blue-600' : 'bg-gray-300'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${localSettings[section.id as keyof AppSettings] ? 'right-1' : 'left-1'}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section Content */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900">Section Content</h3>
                  </div>

                  <div className="space-y-6">
                    {/* Hero Section Content */}
                    <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                      <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">Hero Section</h4>
                      <div className="space-y-3">
                        <input 
                          type="text" 
                          value={localSettings.heroTitle || ''}
                          onChange={(e) => setLocalSettings({...localSettings, heroTitle: e.target.value})}
                          placeholder="Hero Title"
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                        />
                        <textarea 
                          value={localSettings.heroSubtitle || ''}
                          onChange={(e) => setLocalSettings({...localSettings, heroSubtitle: e.target.value})}
                          placeholder="Hero Subtitle"
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 font-medium text-sm"
                        />
                      </div>
                    </div>

                    {/* Tools Section Content */}
                    <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                      <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">Tools Section</h4>
                      <div className="space-y-3">
                        <input 
                          type="text" 
                          value={localSettings.toolsTitle || ''}
                          onChange={(e) => setLocalSettings({...localSettings, toolsTitle: e.target.value})}
                          placeholder="Section Title"
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                        />
                        <textarea 
                          value={localSettings.toolsSubtitle || ''}
                          onChange={(e) => setLocalSettings({...localSettings, toolsSubtitle: e.target.value})}
                          placeholder="Section Subtitle"
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 font-medium text-sm"
                        />
                      </div>
                    </div>

                    {/* Pricing Section Content */}
                    <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                      <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">Pricing Section</h4>
                      <div className="space-y-3">
                        <input 
                          type="text" 
                          value={localSettings.pricingTitle || ''}
                          onChange={(e) => setLocalSettings({...localSettings, pricingTitle: e.target.value})}
                          placeholder="Section Title"
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                        />
                        <textarea 
                          value={localSettings.pricingSubtitle || ''}
                          onChange={(e) => setLocalSettings({...localSettings, pricingSubtitle: e.target.value})}
                          placeholder="Section Subtitle"
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 font-medium text-sm"
                        />
                      </div>
                    </div>

                    {/* Reviews Section Content */}
                    <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                      <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">Reviews Section</h4>
                      <div className="space-y-3">
                        <input 
                          type="text" 
                          value={localSettings.reviewsTitle || ''}
                          onChange={(e) => setLocalSettings({...localSettings, reviewsTitle: e.target.value})}
                          placeholder="Section Title"
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                        />
                        <textarea 
                          value={localSettings.reviewsSubtitle || ''}
                          onChange={(e) => setLocalSettings({...localSettings, reviewsSubtitle: e.target.value})}
                          placeholder="Section Subtitle"
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 font-medium text-sm"
                        />
                      </div>
                    </div>

                    {/* Stats Section Content */}
                    <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                      <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">Stats Section</h4>
                      <div className="space-y-3">
                        <input 
                          type="text" 
                          value={localSettings.statsTitle || ''}
                          onChange={(e) => setLocalSettings({...localSettings, statsTitle: e.target.value})}
                          placeholder="Section Title"
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                        />
                        <textarea 
                          value={localSettings.statsSubtitle || ''}
                          onChange={(e) => setLocalSettings({...localSettings, statsSubtitle: e.target.value})}
                          placeholder="Section Subtitle"
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 font-medium text-sm"
                        />
                        
                        <div className="grid grid-cols-2 gap-4 pt-2">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Stat 1 (Number & Label)</label>
                            <input 
                              type="text" 
                              value={localSettings.stat1Number || ''}
                              onChange={(e) => setLocalSettings({...localSettings, stat1Number: e.target.value})}
                              placeholder="10M+"
                              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                            />
                            <input 
                              type="text" 
                              value={localSettings.stat1Label || ''}
                              onChange={(e) => setLocalSettings({...localSettings, stat1Label: e.target.value})}
                              placeholder="Files Processed"
                              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-xs"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Stat 2 (Number & Label)</label>
                            <input 
                              type="text" 
                              value={localSettings.stat2Number || ''}
                              onChange={(e) => setLocalSettings({...localSettings, stat2Number: e.target.value})}
                              placeholder="500K+"
                              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                            />
                            <input 
                              type="text" 
                              value={localSettings.stat2Label || ''}
                              onChange={(e) => setLocalSettings({...localSettings, stat2Label: e.target.value})}
                              placeholder="Happy Users"
                              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-xs"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Stat 3 (Number & Label)</label>
                            <input 
                              type="text" 
                              value={localSettings.stat3Number || ''}
                              onChange={(e) => setLocalSettings({...localSettings, stat3Number: e.target.value})}
                              placeholder="20+"
                              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                            />
                            <input 
                              type="text" 
                              value={localSettings.stat3Label || ''}
                              onChange={(e) => setLocalSettings({...localSettings, stat3Label: e.target.value})}
                              placeholder="Powerful Tools"
                              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-xs"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Stat 4 (Number & Label)</label>
                            <input 
                              type="text" 
                              value={localSettings.stat4Number || ''}
                              onChange={(e) => setLocalSettings({...localSettings, stat4Number: e.target.value})}
                              placeholder="99.9%"
                              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                            />
                            <input 
                              type="text" 
                              value={localSettings.stat4Label || ''}
                              onChange={(e) => setLocalSettings({...localSettings, stat4Label: e.target.value})}
                              placeholder="Uptime"
                              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Upgrade Page Content */}
                    <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                      <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">Upgrade Page</h4>
                      <div className="space-y-3">
                        <input 
                          type="text" 
                          value={localSettings.upgradeTitle || ''}
                          onChange={(e) => setLocalSettings({...localSettings, upgradeTitle: e.target.value})}
                          placeholder="Page Title"
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                        />
                        <textarea 
                          value={localSettings.upgradeSubtitle || ''}
                          onChange={(e) => setLocalSettings({...localSettings, upgradeSubtitle: e.target.value})}
                          placeholder="Page Subtitle"
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 font-medium text-sm"
                        />
                      </div>
                    </div>

                    {/* Legal Pages Content */}
                    <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 space-y-6">
                      <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">Legal & Contact Pages</h4>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-700 ml-1">About Us Content (HTML supported)</label>
                          <textarea 
                            value={localSettings.aboutContent || ''}
                            onChange={(e) => setLocalSettings({...localSettings, aboutContent: e.target.value})}
                            placeholder="Enter About Us page content..."
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 font-medium text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-700 ml-1">Privacy Policy Content (HTML supported)</label>
                          <textarea 
                            value={localSettings.privacyContent || ''}
                            onChange={(e) => setLocalSettings({...localSettings, privacyContent: e.target.value})}
                            placeholder="Enter Privacy Policy content..."
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 font-medium text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-700 ml-1">Terms of Service Content (HTML supported)</label>
                          <textarea 
                            value={localSettings.termsContent || ''}
                            onChange={(e) => setLocalSettings({...localSettings, termsContent: e.target.value})}
                            placeholder="Enter Terms of Service content..."
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 font-medium text-sm"
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-700 ml-1">Contact Email</label>
                            <input 
                              type="email" 
                              value={localSettings.contactEmail || ''}
                              onChange={(e) => setLocalSettings({...localSettings, contactEmail: e.target.value})}
                              placeholder="info@example.com"
                              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-700 ml-1">Contact Phone</label>
                            <input 
                              type="text" 
                              value={localSettings.contactPhone || ''}
                              onChange={(e) => setLocalSettings({...localSettings, contactPhone: e.target.value})}
                              placeholder="+91 1234567890"
                              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-700 ml-1">Contact Address</label>
                            <input 
                              type="text" 
                              value={localSettings.contactAddress || ''}
                              onChange={(e) => setLocalSettings({...localSettings, contactAddress: e.target.value})}
                              placeholder="City, Country"
                              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Customization */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                    <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
                      <ArrowRight className="w-6 h-6 rotate-90" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900">Footer Customization</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 ml-1">Footer Background</label>
                      <div className="flex gap-2">
                        <input 
                          type="color" 
                          value={localSettings.footerBgColor || '#ffffff'}
                          onChange={(e) => setLocalSettings({...localSettings, footerBgColor: e.target.value})}
                          className="w-12 h-12 rounded-xl cursor-pointer border-none p-0 overflow-hidden"
                        />
                        <input 
                          type="text" 
                          value={localSettings.footerBgColor || ''}
                          onChange={(e) => setLocalSettings({...localSettings, footerBgColor: e.target.value})}
                          className="flex-1 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 ml-1">Footer Text Color</label>
                      <div className="flex gap-2">
                        <input 
                          type="color" 
                          value={localSettings.footerTextColor || '#000000'}
                          onChange={(e) => setLocalSettings({...localSettings, footerTextColor: e.target.value})}
                          className="w-12 h-12 rounded-xl cursor-pointer border-none p-0 overflow-hidden"
                        />
                        <input 
                          type="text" 
                          value={localSettings.footerTextColor || ''}
                          onChange={(e) => setLocalSettings({...localSettings, footerTextColor: e.target.value})}
                          className="flex-1 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 ml-1">Copyright Text</label>
                    <input 
                      type="text" 
                      value={localSettings.footerText || ''}
                      onChange={(e) => setLocalSettings({...localSettings, footerText: e.target.value})}
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                      placeholder="© 2024 Your Site. All rights reserved."
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-black text-gray-900">Footer Links</label>
                      <button 
                        onClick={handleAddFooterLink}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add Link
                      </button>
                    </div>
                    <div className="space-y-3">
                      {localSettings.footerLinks?.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 p-3 bg-white border border-gray-100 rounded-2xl shadow-sm group">
                          <input 
                            type="text" 
                            value={item.label}
                            onChange={(e) => handleUpdateFooterLink(item.id, { label: e.target.value })}
                            placeholder="Label"
                            className="flex-1 px-3 py-2 bg-gray-50 border border-transparent rounded-xl focus:border-blue-500 focus:bg-white outline-none text-sm font-bold"
                          />
                          <input 
                            type="text" 
                            value={item.path}
                            onChange={(e) => handleUpdateFooterLink(item.id, { path: e.target.value })}
                            placeholder="Path (e.g. /privacy)"
                            className="flex-1 px-3 py-2 bg-gray-50 border border-transparent rounded-xl focus:border-blue-500 focus:bg-white outline-none text-sm font-medium"
                          />
                          <button 
                            onClick={() => handleRemoveFooterLink(item.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Advanced Customization */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                    <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center text-white">
                      <Zap className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900">Advanced Customization</h3>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 ml-1">Custom CSS</label>
                    <textarea 
                      value={localSettings.customCss || ''}
                      onChange={(e) => setLocalSettings({...localSettings, customCss: e.target.value})}
                      className="w-full px-5 py-4 bg-gray-900 text-green-400 border border-gray-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 h-48 font-mono text-xs leading-relaxed"
                      placeholder="/* Add your custom CSS here */"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 ml-1">Header Scripts (e.g. Google Analytics)</label>
                    <textarea 
                      value={localSettings.headerScripts || ''}
                      onChange={(e) => setLocalSettings({...localSettings, headerScripts: e.target.value})}
                      className="w-full px-5 py-4 bg-gray-900 text-blue-400 border border-gray-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 font-mono text-xs leading-relaxed"
                      placeholder="<script>...</script>"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 ml-1">Footer Scripts</label>
                    <textarea 
                      value={localSettings.footerScripts || ''}
                      onChange={(e) => setLocalSettings({...localSettings, footerScripts: e.target.value})}
                      className="w-full px-5 py-4 bg-gray-900 text-blue-400 border border-gray-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 font-mono text-xs leading-relaxed"
                      placeholder="<script>...</script>"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ads' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Ad Management</h2>
              <button 
                onClick={handleSaveSettings}
                className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Ads
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Top Ad Slot (HTML/Script)</label>
                <textarea 
                  value={localSettings.adScriptTop || ''}
                  onChange={(e) => setLocalSettings({...localSettings, adScriptTop: e.target.value})}
                  placeholder="Paste AdSense or other ad script here..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Bottom Ad Slot (HTML/Script)</label>
                <textarea 
                  value={localSettings.adScriptBottom || ''}
                  onChange={(e) => setLocalSettings({...localSettings, adScriptBottom: e.target.value})}
                  placeholder="Paste AdSense or other ad script here..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 font-mono text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ads' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-2xl font-bold text-gray-900">Ads Manager</h2>
              <button 
                onClick={() => {
                  setEditingAd(null);
                  setNewAd({
                    name: '',
                    script: '',
                    position: 'top',
                    isActive: true
                  });
                  setIsAddingAd(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Ad Slot
              </button>
            </div>

            {isAddingAd && (
              <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                <h3 className="font-bold text-gray-900">{editingAd ? 'Edit Ad Slot' : 'New Ad Slot'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Slot Name</label>
                    <input 
                      type="text"
                      value={newAd.name}
                      onChange={(e) => setNewAd({...newAd, name: e.target.value})}
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Home Top Banner"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Position</label>
                    <select 
                      value={newAd.position}
                      onChange={(e) => setNewAd({...newAd, position: e.target.value as any})}
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="top">Top</option>
                      <option value="middle">Middle</option>
                      <option value="bottom">Bottom</option>
                      <option value="sidebar">Sidebar</option>
                      <option value="tool_top">Tool Page (Top)</option>
                      <option value="tool_bottom">Tool Page (Bottom)</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Ad Script (HTML/JS)</label>
                  <textarea 
                    value={newAd.script}
                    onChange={(e) => setNewAd({...newAd, script: e.target.value})}
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 h-48 font-mono text-sm"
                    placeholder="Paste your ad network script here..."
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={async () => {
                      if (!newAd.name || !newAd.script) {
                        toast.error("Name and Script are required");
                        return;
                      }
                      try {
                        const id = editingAd ? editingAd.id : `ad-${Date.now()}`;
                        const adData: AdSlotConfig = {
                          id,
                          name: newAd.name || '',
                          script: newAd.script || '',
                          position: (newAd.position as any) || 'top',
                          isActive: newAd.isActive !== undefined ? newAd.isActive : true
                        };
                        await setDoc(doc(db, 'adSlots', id), adData);
                        toast.success(editingAd ? "Ad slot updated" : "Ad slot added");
                        setIsAddingAd(false);
                        fetchData();
                      } catch (error) {
                        handleFirestoreError(error, OperationType.WRITE, 'adSlots', auth);
                      }
                    }}
                    className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                  >
                    {editingAd ? 'Update Slot' : 'Create Slot'}
                  </button>
                  <button 
                    onClick={() => setIsAddingAd(false)}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              {adSlots.map(ad => (
                <div key={ad.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-gray-50 rounded-2xl border border-gray-100 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-amber-600 shadow-sm flex-shrink-0">
                      <BarChart3 className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-900 truncate">{ad.name}</h3>
                        <span className="text-[10px] bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full font-bold uppercase">{ad.position}</span>
                      </div>
                      <p className="text-sm text-gray-500 truncate max-w-md">{ad.script.substring(0, 100)}...</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap justify-end">
                    <div className="flex items-center gap-2 mr-4">
                      <button 
                        onClick={() => {
                          setEditingAd(ad);
                          setNewAd(ad);
                          setIsAddingAd(true);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setConfirmModal({
                          show: true,
                          title: 'Delete Ad Slot',
                          message: 'Are you sure you want to delete this ad slot?',
                          onConfirm: async () => {
                            try {
                              await deleteDoc(doc(db, 'adSlots', ad.id));
                              toast.success("Ad slot deleted");
                              fetchData();
                            } catch (error) {
                              handleFirestoreError(error, OperationType.DELETE, `adSlots/${ad.id}`, auth);
                            }
                          }
                        })}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Active</span>
                      <button 
                        onClick={() => toggleAdActive(ad.id, ad.isActive)}
                        className={`w-12 h-6 rounded-full transition-colors relative ${ad.isActive ? 'bg-green-500' : 'bg-gray-300'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${ad.isActive ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {adSlots.length === 0 && !isAddingAd && (
                <div className="text-center py-12 text-gray-400">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No ad slots configured yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Payment & Pricing</h2>
              <button 
                onClick={handleSaveSettings}
                className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Config
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 ml-1">Premium Price</label>
                    <input 
                      type="number" 
                      value={localSettings.premiumPrice || 0}
                      onChange={(e) => setLocalSettings({...localSettings, premiumPrice: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 ml-1">Currency</label>
                    <select 
                      value={localSettings.currency || 'INR'}
                      onChange={(e) => setLocalSettings({...localSettings, currency: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>
                </div>

                <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-blue-900">Razorpay Integration</h4>
                    <button 
                      onClick={() => setLocalSettings({...localSettings, razorpayEnabled: !localSettings.razorpayEnabled})}
                      className={`w-12 h-6 rounded-full transition-colors relative ${localSettings.razorpayEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${localSettings.razorpayEnabled ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-white/50 rounded-xl border border-blue-100">
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-blue-900">Bypass Payment (Dev Only)</p>
                      <p className="text-xs text-blue-600">Instantly upgrade without payment modal (Devs only)</p>
                    </div>
                    <button 
                      onClick={() => setLocalSettings({...localSettings, enableTestMode: !localSettings.enableTestMode})}
                      className={`w-10 h-5 rounded-full transition-colors relative ${localSettings.enableTestMode ? 'bg-blue-600' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${localSettings.enableTestMode ? 'right-0.5' : 'left-0.5'}`} />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-blue-700 uppercase">Razorpay Key ID</label>
                    <input 
                      type="text" 
                      value={localSettings.razorpayKeyId || ''}
                      onChange={(e) => setLocalSettings({...localSettings, razorpayKeyId: e.target.value})}
                      placeholder="rzp_test_..."
                      className="w-full px-4 py-2 bg-white border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-[10px] text-blue-400 italic">Get this from Razorpay Dashboard {'>'} Settings {'>'} API Keys</p>
                  </div>
                </div>

                <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <h4 className="font-bold text-amber-900">Manual Payment Mode</h4>
                      <p className="text-xs text-amber-600">Use custom payment links instead of Razorpay</p>
                    </div>
                    <button 
                      onClick={() => setLocalSettings({...localSettings, manualPaymentEnabled: !localSettings.manualPaymentEnabled})}
                      className={`w-12 h-6 rounded-full transition-colors relative ${localSettings.manualPaymentEnabled ? 'bg-amber-600' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${localSettings.manualPaymentEnabled ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                  
                  {localSettings.manualPaymentEnabled && (
                    <div className="p-4 bg-white/50 rounded-xl border border-amber-100">
                      <p className="text-xs font-medium text-amber-800">
                        When enabled, the "Buy" button on the pricing page will redirect users to the custom payment link you set for each plan.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <Zap className="w-8 h-8 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Pricing Preview</h3>
                  <p className="text-3xl font-black text-blue-600">
                    {localSettings.currency === 'INR' ? '₹' : localSettings.currency === 'USD' ? '$' : '€'}
                    {localSettings.premiumPrice}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">One-time payment for lifetime access</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'plans' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-2xl font-bold text-gray-900">Plans Manager</h2>
              <button 
                onClick={() => {
                  setEditingPlan(null);
                  setNewPlan({
                    name: '',
                    price: 0,
                    currency: localSettings.currency,
                    duration: 'monthly',
                    durationText: '/ month',
                    description: '',
                    features: [],
                    isActive: true,
                    isPopular: false,
                    paymentLink: '',
                    paymentButtonText: ''
                  });
                  setIsAddingPlan(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Plan
              </button>
            </div>

            {isAddingPlan && (
              <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                <h3 className="font-bold text-gray-900">{editingPlan ? 'Edit Plan' : 'New Plan'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Plan Name</label>
                    <input 
                      type="text"
                      value={newPlan.name}
                      onChange={(e) => setNewPlan({...newPlan, name: e.target.value})}
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Pro Monthly"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Price</label>
                    <input 
                      type="number"
                      value={newPlan.price}
                      onChange={(e) => setNewPlan({...newPlan, price: parseInt(e.target.value)})}
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Duration</label>
                    <select 
                      value={newPlan.duration}
                      onChange={(e) => setNewPlan({...newPlan, duration: e.target.value as any})}
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                      <option value="lifetime">Lifetime</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Duration Text (e.g. / month)</label>
                    <input 
                      type="text"
                      value={newPlan.durationText}
                      onChange={(e) => setNewPlan({...newPlan, durationText: e.target.value})}
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Description</label>
                    <input 
                      type="text"
                      value={newPlan.description}
                      onChange={(e) => setNewPlan({...newPlan, description: e.target.value})}
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Payment Page Link (Manual Mode)</label>
                    <input 
                      type="text"
                      value={newPlan.paymentLink || ''}
                      onChange={(e) => setNewPlan({...newPlan, paymentLink: e.target.value})}
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://razorpay.me/@yourname or custom link"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Payment Button Text</label>
                    <input 
                      type="text"
                      value={newPlan.paymentButtonText || ''}
                      onChange={(e) => setNewPlan({...newPlan, paymentButtonText: e.target.value})}
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Pay Now, Buy Pro, etc."
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Features (one per line)</label>
                  <textarea 
                    value={newPlan.features?.join('\n')}
                    onChange={(e) => setNewPlan({...newPlan, features: e.target.value.split('\n').filter(f => f.trim())})}
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                    placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={newPlan.isPopular}
                      onChange={(e) => setNewPlan({...newPlan, isPopular: e.target.checked})}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-bold text-gray-700">Mark as Popular</span>
                  </label>
                </div>
                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={async () => {
                      if (!newPlan.name || !newPlan.durationText) {
                        toast.error("Please fill required fields");
                        return;
                      }
                      try {
                        const id = editingPlan ? editingPlan.id : `plan-${Date.now()}`;
                        const planData: PremiumPlan = {
                          id,
                          name: newPlan.name || '',
                          price: newPlan.price || 0,
                          currency: newPlan.currency || localSettings.currency,
                          duration: (newPlan.duration as any) || 'monthly',
                          durationText: newPlan.durationText || '',
                          description: newPlan.description || '',
                          features: newPlan.features || [],
                          isActive: newPlan.isActive !== undefined ? newPlan.isActive : true,
                          isPopular: newPlan.isPopular || false,
                          paymentLink: newPlan.paymentLink || '',
                          paymentButtonText: newPlan.paymentButtonText || ''
                        };
                        await setDoc(doc(db, 'premiumPlans', id), planData);
                        toast.success(editingPlan ? "Plan updated" : "Plan added");
                        setIsAddingPlan(false);
                        setEditingPlan(null);
                        fetchData();
                      } catch (error) {
                        handleFirestoreError(error, OperationType.WRITE, 'premiumPlans', auth);
                      }
                    }}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-sm"
                  >
                    {editingPlan ? 'Update Plan' : 'Create Plan'}
                  </button>
                  <button 
                    onClick={() => {
                      setIsAddingPlan(false);
                      setEditingPlan(null);
                    }}
                    className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {premiumPlans.map(plan => (
                <div key={plan.id} className={`p-6 rounded-2xl border transition-all ${plan.isActive ? 'bg-white border-gray-100 shadow-sm' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        {plan.name}
                        {plan.isPopular && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full uppercase tracking-wider">Popular</span>}
                      </h3>
                      <p className="text-xs text-gray-500">{plan.durationText}</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          setEditingPlan(plan);
                          setNewPlan(plan);
                          setIsAddingPlan(true);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setConfirmModal({
                          show: true,
                          title: 'Delete Plan',
                          message: 'Are you sure you want to delete this plan?',
                          onConfirm: async () => {
                            try {
                              await deleteDoc(doc(db, 'premiumPlans', plan.id));
                              setPremiumPlans(premiumPlans.filter(p => p.id !== plan.id));
                              toast.success("Plan deleted");
                            } catch (error) {
                              handleFirestoreError(error, OperationType.DELETE, `premiumPlans/${plan.id}`, auth);
                            }
                          }
                        })}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mb-4">
                    <span className="text-2xl font-black text-blue-600">
                      {plan.currency === 'INR' ? '₹' : plan.currency === 'USD' ? '$' : '€'}
                      {plan.price}
                    </span>
                    <span className="text-xs text-gray-400 ml-1">{plan.durationText}</span>
                  </div>
                  <div className="space-y-2 mb-6">
                    {plan.features.slice(0, 3).map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                        <ShieldCheck className="w-3 h-3 text-green-500" />
                        {f}
                      </div>
                    ))}
                    {plan.features.length > 3 && <p className="text-[10px] text-gray-400">+{plan.features.length - 3} more features</p>}
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Status</span>
                      <button 
                        onClick={() => togglePlanActive(plan.id, plan.isActive)}
                        className={`w-12 h-6 rounded-full transition-colors relative ${plan.isActive ? 'bg-green-500' : 'bg-gray-300'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${plan.isActive ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {premiumPlans.length === 0 && !isAddingPlan && (
                <div className="col-span-full text-center py-12 text-gray-400">
                  <ShieldCheck className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No premium plans configured yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-2xl font-bold text-gray-900">User Reviews</h2>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setEditingReview(null);
                    setNewReview({
                      userName: '',
                      userPhoto: '',
                      rating: 5,
                      comment: '',
                      isFake: true,
                      isApproved: true
                    });
                    setIsAddingReview(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add New Review
                </button>
              </div>
            </div>

            {isAddingReview && (
              <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                <h3 className="font-bold text-gray-900">{editingReview ? 'Edit Review' : 'Add New Review'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">User Name</label>
                    <input 
                      type="text"
                      value={newReview.userName}
                      onChange={(e) => setNewReview({...newReview, userName: e.target.value})}
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Sarah J."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">User Photo</label>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 border border-gray-100 flex-shrink-0">
                        {newReview.userPhoto ? (
                          <img src={newReview.userPhoto} alt="Review User" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <UserIcon className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 flex gap-2">
                        <input 
                          type="text"
                          value={newReview.userPhoto}
                          onChange={(e) => setNewReview({...newReview, userPhoto: e.target.value})}
                          className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          placeholder="Photo URL or upload..."
                        />
                        <button 
                          onClick={() => reviewPhotoInputRef.current?.click()}
                          disabled={isUploadingReviewPhoto}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors flex items-center gap-2"
                          title="Upload from device"
                        >
                          {isUploadingReviewPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                        </button>
                        <input 
                          type="file"
                          ref={reviewPhotoInputRef}
                          onChange={handleReviewPhotoUpload}
                          accept="image/*"
                          className="hidden"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Rating (1-5)</label>
                    <select 
                      value={newReview.rating}
                      onChange={(e) => setNewReview({...newReview, rating: Number(e.target.value)})}
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {[1, 2, 3, 4, 5].map(n => (
                        <option key={n} value={n}>{n} Stars</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-6 pt-8">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={newReview.isFake}
                        onChange={(e) => setNewReview({...newReview, isFake: e.target.checked})}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm font-bold text-gray-700">Fake/Sample Review</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={newReview.isApproved}
                        onChange={(e) => setNewReview({...newReview, isApproved: e.target.checked})}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm font-bold text-gray-700">Approved</span>
                    </label>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Comment</label>
                  <textarea 
                    value={newReview.comment}
                    onChange={(e) => setNewReview({...newReview, comment: e.target.value})}
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
                    placeholder="User's review comment..."
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={async () => {
                      if (!newReview.userName || !newReview.comment) {
                        toast.error("Name and comment are required");
                        return;
                      }
                      try {
                        const reviewData = {
                          ...newReview,
                          createdAt: editingReview ? editingReview.createdAt : new Date().toISOString()
                        };
                        
                        if (editingReview) {
                          await updateDoc(doc(db, 'reviews', editingReview.id), reviewData);
                          toast.success("Review updated");
                        } else {
                          await addDoc(collection(db, 'reviews'), reviewData);
                          toast.success("Review added");
                        }
                        
                        setIsAddingReview(false);
                        fetchData();
                      } catch (error) {
                        handleFirestoreError(error, OperationType.WRITE, 'reviews', auth);
                      }
                    }}
                    className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                  >
                    {editingReview ? 'Update Review' : 'Save Review'}
                  </button>
                  <button 
                    onClick={() => setIsAddingReview(false)}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-6">
              {reviews.map(review => (
                <div key={review.id} className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                        {review.userPhoto ? (
                          <img src={review.userPhoto} alt={review.userName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <UserIcon className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 flex items-center gap-2">
                          {review.userName}
                          {review.isFake && <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full uppercase tracking-wider">Fake</span>}
                        </h4>
                        <div className="flex gap-0.5 mt-0.5">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star key={star} className={`w-3 h-3 ${star <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          setEditingReview(review);
                          setNewReview(review);
                          setIsAddingReview(true);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setConfirmModal({
                          show: true,
                          title: 'Delete Review',
                          message: 'Are you sure you want to delete this review?',
                          onConfirm: async () => {
                            try {
                              await deleteDoc(doc(db, 'reviews', review.id));
                              setReviews(reviews.filter(r => r.id !== review.id));
                              toast.success("Review deleted");
                            } catch (error) {
                              handleFirestoreError(error, OperationType.DELETE, `reviews/${review.id}`, auth);
                            }
                          }
                        })}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-gray-700 text-sm italic">"{review.comment}"</p>

                  <div className="space-y-3 pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-2 text-blue-600">
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-xs font-black uppercase tracking-wider">Admin Reply</span>
                    </div>
                    
                    {review.adminReply ? (
                      <div className="p-4 bg-white rounded-xl border border-blue-100 relative group">
                        <p className="text-sm text-gray-700">{review.adminReply}</p>
                        <button 
                          onClick={() => {
                            setReplyText({ ...replyText, [review.id]: review.adminReply || '' });
                            // Clear the current reply to show the input
                            setReviews(reviews.map(r => r.id === review.id ? { ...r, adminReply: undefined } : r));
                          }}
                          className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-blue-600"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          value={replyText[review.id] || ''}
                          onChange={(e) => setReplyText({ ...replyText, [review.id]: e.target.value })}
                          placeholder="Write a reply..."
                          className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button 
                          onClick={async () => {
                            if (!replyText[review.id]) return;
                            try {
                              await updateDoc(doc(db, 'reviews', review.id), { adminReply: replyText[review.id] });
                              setReviews(reviews.map(r => r.id === review.id ? { ...r, adminReply: replyText[review.id] } : r));
                              toast.success("Reply sent");
                            } catch (error) {
                              handleFirestoreError(error, OperationType.UPDATE, `reviews/${review.id}`, auth);
                            }
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors"
                        >
                          Reply
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {reviews.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No reviews found.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      {/* Edit User Modal */}
      {isEditingUser && editingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <UserCog className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Edit User</h3>
                  <p className="text-xs text-gray-500">{editingUser.email}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsEditingUser(false);
                  setEditingUser(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">Display Name</label>
                  <input 
                    type="text"
                    value={editingUser.displayName || ''}
                    onChange={(e) => setEditingUser({...editingUser, displayName: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">Role</label>
                  <select 
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({...editingUser, role: e.target.value as any})}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">Subscription Plan</label>
                  <select 
                    value={editingUser.plan || 'free'}
                    onChange={(e) => setEditingUser({...editingUser, plan: e.target.value as any})}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">Plan Expiry</label>
                  <input 
                    type="datetime-local"
                    value={editingUser.expiry ? new Date(editingUser.expiry).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setEditingUser({...editingUser, expiry: e.target.value ? new Date(e.target.value).toISOString() : null})}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">Quick Actions</label>
                  <button 
                    onClick={async () => {
                      try {
                        await upgradePlan(editingUser.uid);
                        toast.success("User upgraded to Pro for 30 days");
                        // Refresh local state
                        const expiry = new Date();
                        expiry.setDate(expiry.getDate() + 30);
                        setEditingUser({
                          ...editingUser, 
                          plan: 'pro', 
                          expiry: expiry.toISOString(),
                          premiumStatus: true,
                          planExpiresAt: expiry.toISOString()
                        });
                        fetchData();
                      } catch (error) {
                        toast.error("Upgrade failed");
                      }
                    }}
                    className="w-full py-2 bg-green-50 text-green-700 border border-green-200 rounded-xl text-xs font-bold hover:bg-green-100 transition-all"
                  >
                    UPGRADE TO PRO (30 DAYS)
                  </button>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">Usage Count</label>
                  <input 
                    type="number"
                    value={editingUser.usageCount}
                    onChange={(e) => setEditingUser({...editingUser, usageCount: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">Premium Status</label>
                  <div className="flex items-center gap-4 h-10">
                    <button 
                      onClick={() => setEditingUser({...editingUser, premiumStatus: !editingUser.premiumStatus})}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${editingUser.premiumStatus ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}
                    >
                      {editingUser.premiumStatus ? 'PREMIUM' : 'FREE'}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">Plan ID</label>
                  <select 
                    value={editingUser.currentPlanId || ''}
                    onChange={(e) => setEditingUser({...editingUser, currentPlanId: e.target.value || undefined})}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No Plan</option>
                    {premiumPlans.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">Expires At</label>
                  <input 
                    type="datetime-local"
                    value={editingUser.planExpiresAt ? new Date(editingUser.planExpiresAt).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setEditingUser({...editingUser, planExpiresAt: e.target.value ? new Date(e.target.value).toISOString() : null})}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">Custom Daily Limit (0 = Global)</label>
                  <input 
                    type="number"
                    value={editingUser.customDailyLimit || 0}
                    onChange={(e) => setEditingUser({...editingUser, customDailyLimit: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Global: 5"
                  />
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                <label className="text-[10px] font-bold text-gray-400 uppercase block">System Details</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-gray-400 block">User UID</span>
                    <span className="text-xs font-mono text-gray-600 break-all">{editingUser.uid}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">Last Used</span>
                    <span className="text-xs text-gray-600">{editingUser.lastUsedAt ? new Date(editingUser.lastUsedAt).toLocaleString() : 'Never'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <label className="text-xs font-bold text-gray-400 uppercase mb-3 block">Quick Actions</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <button 
                    onClick={() => toggleBlockUser(editingUser.uid, editingUser.isBlocked || false)}
                    disabled={editingUser.role === 'admin'}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${editingUser.isBlocked ? 'bg-red-50 border-red-100 text-red-600' : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-red-50 hover:border-red-100 hover:text-red-600'} ${editingUser.role === 'admin' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={editingUser.role === 'admin' ? "Admins cannot be blocked" : ""}
                  >
                    <Ban className="w-5 h-5" />
                    <span className="text-[10px] font-bold uppercase">{editingUser.isBlocked ? 'Unblock' : 'Block'}</span>
                  </button>
                  <button 
                    onClick={() => setConfirmModal({
                      show: true,
                      title: 'Refund User',
                      message: "Are you sure you want to refund/reset this user's premium status?",
                      onConfirm: () => refundUser(editingUser.uid)
                    })}
                    className="flex flex-col items-center gap-2 p-3 rounded-2xl border border-gray-100 bg-gray-50 text-gray-600 hover:bg-amber-50 hover:border-amber-100 hover:text-amber-600 transition-all"
                  >
                    <CreditCard className="w-5 h-5" />
                    <span className="text-[10px] font-bold uppercase">Refund</span>
                  </button>
                  <button 
                    onClick={() => setConfirmModal({
                      show: true,
                      title: 'Renew User',
                      message: `Are you sure you want to renew this user's premium status for 30 days?`,
                      onConfirm: () => renewUser(editingUser.uid, 30)
                    })}
                    className="flex flex-col items-center gap-2 p-3 rounded-2xl border border-gray-100 bg-gray-50 text-gray-600 hover:bg-green-50 hover:border-green-100 hover:text-green-600 transition-all"
                  >
                    <RefreshCw className="w-5 h-5" />
                    <span className="text-[10px] font-bold uppercase">Renew 30d</span>
                  </button>
                  <button 
                    onClick={() => resetUsage(editingUser.uid)}
                    className="flex flex-col items-center gap-2 p-3 rounded-2xl border border-gray-100 bg-gray-50 text-gray-600 hover:bg-blue-50 hover:border-blue-100 hover:text-blue-600 transition-all"
                  >
                    <RotateCcw className="w-5 h-5" />
                    <span className="text-[10px] font-bold uppercase">Reset Use</span>
                  </button>
                  <button 
                    onClick={() => setConfirmModal({
                      show: true,
                      title: 'Delete User',
                      message: 'Are you sure you want to delete this user? This action cannot be undone.',
                      onConfirm: () => {
                        deleteUser(editingUser.uid);
                        setIsEditingUser(false);
                        setEditingUser(null);
                      }
                    })}
                    className="flex flex-col items-center gap-2 p-3 rounded-2xl border border-gray-100 bg-gray-50 text-gray-600 hover:bg-red-50 hover:border-red-100 hover:text-red-600 transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                    <span className="text-[10px] font-bold uppercase">Delete</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 flex gap-3">
              <button 
                onClick={() => handleUpdateUser(editingUser)}
                disabled={actionLoading === editingUser.uid}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-sm flex items-center justify-center gap-2"
              >
                {actionLoading === editingUser.uid ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
              <button 
                onClick={() => {
                  setIsEditingUser(false);
                  setEditingUser(null);
                }}
                className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
                <Trash2 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-gray-900">{confirmModal.title}</h3>
                <p className="text-gray-500 font-medium leading-relaxed">
                  {confirmModal.message}
                </p>
              </div>
            </div>
            <div className="p-6 bg-gray-50 flex gap-3">
              <button 
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal({ ...confirmModal, show: false });
                }}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-sm"
              >
                Confirm
              </button>
              <button 
                onClick={() => setConfirmModal({ ...confirmModal, show: false })}
                className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
