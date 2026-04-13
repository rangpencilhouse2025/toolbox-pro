export type UserRole = 'user' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  bio?: string;
  usageCount: number;
  premiumStatus: boolean;
  role: UserRole;
  lastUsedAt?: string;
  currentPlanId?: string;
  planExpiresAt?: string | null;
  isBlocked?: boolean;
  customDailyLimit?: number;
  plan?: 'free' | 'pro' | 'premium';
  expiry?: string | null;
}

export interface AdSlotConfig {
  id: string;
  name: string;
  script: string;
  position: 'top' | 'bottom' | 'middle' | 'sidebar' | 'tool_top' | 'tool_bottom';
  isActive: boolean;
}

export interface HeroBannerSlide {
  id: string;
  imageUrl: string;
  title?: string;
  subtitle?: string;
  buttonText?: string;
  buttonLink?: string;
  titleColor?: string;
  subtitleColor?: string;
  buttonBgColor?: string;
  buttonTextColor?: string;
  overlayOpacity?: number;
  textAlign?: 'left' | 'center' | 'right';
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  objectPosition?: string;
  order?: number;
}

export interface Review {
  id: string;
  userId?: string;
  userName: string;
  userPhoto?: string;
  rating: number;
  comment: string;
  createdAt: string;
  adminReply?: string;
  isFake?: boolean;
  isApproved?: boolean;
}

export interface NavMenuItem {
  id: string;
  label: string;
  path: string;
  icon?: string;
  isExternal?: boolean;
}

export interface FooterLink {
  id: string;
  label: string;
  path: string;
}

export interface AppSettings {
  dailyLimit: number;
  maintenanceMode?: boolean;
  siteName: string;
  siteDescription: string;
  premiumPrice: number;
  currency: string;
  adScriptTop?: string;
  adScriptBottom?: string;
  razorpayKeyId?: string;
  razorpayEnabled: boolean;
  manualPaymentEnabled?: boolean;
  enableTestMode?: boolean;
  // New Customization Options
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  headerStyle?: 'sticky' | 'fixed' | 'normal';
  headerBgColor?: string;
  headerTextColor?: string;
  headerScripts?: string;
  footerText?: string;
  footerBgColor?: string;
  footerTextColor?: string;
  footerScripts?: string;
  showHeroSection?: boolean;
  showStatsSection?: boolean;
  showPricingSection?: boolean;
  showToolsSection?: boolean;
  showReviewsSection?: boolean;
  animationSpeed?: 'slow' | 'normal' | 'fast';
  enableGlassmorphism?: boolean;
  // Widgets
  enableWhatsApp?: boolean;
  whatsAppNumber?: string;
  enableScrollToTop?: boolean;
  enableBackButton?: boolean;
  // Hero Banner
  showHeroBanner?: boolean;
  heroBannerSlides?: HeroBannerSlide[];
  heroBannerHeight?: string;
  heroBannerWidth?: string;
  heroBannerAutoPlay?: boolean;
  heroBannerInterval?: number;
  heroBannerEffect?: 'slide' | 'fade' | 'zoom' | 'slide-up' | 'slide-down' | 'blur';
  heroBannerShowDots?: boolean;
  heroBannerShowArrows?: boolean;
  heroBannerBorderRadius?: string;
  heroBannerPadding?: string;
  // Section Content
  heroTitle?: string;
  heroSubtitle?: string;
  toolsTitle?: string;
  toolsSubtitle?: string;
  pricingTitle?: string;
  pricingSubtitle?: string;
  reviewsTitle?: string;
  reviewsSubtitle?: string;
  upgradeTitle?: string;
  upgradeSubtitle?: string;
  statsTitle?: string;
  statsSubtitle?: string;
  stat1Number?: string;
  stat1Label?: string;
  stat2Number?: string;
  stat2Label?: string;
  stat3Number?: string;
  stat3Label?: string;
  stat4Number?: string;
  stat4Label?: string;
  // Legal Pages Content
  aboutContent?: string;
  privacyContent?: string;
  termsContent?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
  showBannerSection?: boolean;
  // Navigation
  navMenuItems?: NavMenuItem[];
  footerLinks?: FooterLink[];
  sectionOrder?: string[];
  customCss?: string;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string;
  path: string;
  isPremium: boolean;
  isActive: boolean;
  category?: string;
  htmlContent?: string;
  isCustom?: boolean;
}

export interface PremiumPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  duration: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'lifetime' | 'custom';
  durationText: string; // e.g., "per day", "per month", "one-time"
  description: string;
  features: string[];
  isActive: boolean;
  isPopular?: boolean;
  paymentLink?: string;
  paymentButtonText?: string;
}
