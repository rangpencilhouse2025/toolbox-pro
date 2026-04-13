import React, { useState, useRef } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { User as UserIcon, Mail, Zap, ShieldCheck, Clock, BarChart3, Edit2, Save, X, Camera, Loader2 } from 'lucide-react';
import { auth, db, storage } from '../firebase';
import { UserProfile, AppSettings } from '../types';
import { handleFirestoreError, OperationType, getDailyLimit, handleApiRequest } from '../lib/utils';

export default function DashboardPage({ profile, settings }: { profile: UserProfile | null, settings: AppSettings | null }) {
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.displayName || 'ToolBox User');
  const [bio, setBio] = useState(profile?.bio || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const glassClass = settings?.enableGlassmorphism ? 'glass' : 'bg-white border border-gray-100';

  if (!profile) return null;

  const dailyLimit = getDailyLimit(profile, settings);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        displayName,
        bio
      });
      toast.success("Profile updated!");
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`, auth);
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB for initial selection)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large. Please select an image under 5MB.");
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      
      reader.onerror = () => {
        toast.error("Failed to read file");
        setUploading(false);
      };

      reader.onload = (event) => {
        const img = new Image();
        
        img.onerror = () => {
          toast.error("Failed to load image");
          setUploading(false);
        };

        img.onload = async () => {
          try {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 400; // Increased quality slightly
            const MAX_HEIGHT = 400;
            let width = img.width;
            let height = img.height;

            if (width > height) {
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
            if (!ctx) throw new Error("Could not get canvas context");
            
            ctx.drawImage(img, 0, 0, width, height);

            // Convert to Base64 (JPEG for better compression)
            const base64 = canvas.toDataURL('image/jpeg', 0.7);
            
            await updateDoc(doc(db, 'users', profile.uid), { photoURL: base64 });
            toast.success("Photo updated!");
          } catch (err) {
            console.error("Photo processing/upload error:", err);
            toast.error("Failed to save photo");
          } finally {
            setUploading(false);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Photo upload error:", error);
      toast.error("An unexpected error occurred");
      setUploading(false);
    }
  };

  const handleCheckout = async () => {
    if (settings?.manualPaymentEnabled) {
      window.location.href = '/upgrade';
      return;
    }

    if (settings?.razorpayEnabled && settings?.razorpayKeyId) {
      const loadingToast = toast.loading("Initializing payment...");
      
      // Load Razorpay Script
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      
      script.onload = async () => {
        try {
          // Create order on backend
          const order = await handleApiRequest<any>(fetch('/api/payments/order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: settings.premiumPrice || 499,
              currency: settings.currency || 'INR',
              receipt: `lifetime_user_${profile.uid}`
            }),
          }));

          const options = {
            key: settings.razorpayKeyId,
            amount: order.amount,
            currency: order.currency,
            name: settings.siteName || 'ToolBox Pro',
            description: 'Lifetime Premium Access',
            order_id: order.id,
            handler: async (response: any) => {
              if (response.razorpay_payment_id) {
                try {
                  // Verify payment on backend
                  await handleApiRequest(fetch('/api/payments/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      razorpay_order_id: response.razorpay_order_id,
                      razorpay_payment_id: response.razorpay_payment_id,
                      razorpay_signature: response.razorpay_signature,
                    }),
                  }));

                  await updateDoc(doc(db, 'users', profile.uid), { premiumStatus: true });
                  toast.dismiss(loadingToast);
                  toast.success("Payment successful! Welcome to Premium.");
                } catch (error) {
                  toast.dismiss(loadingToast);
                  console.error("Verification error:", error);
                }
              }
            },
            prefill: {
              email: profile.email,
              name: profile.displayName || ''
            },
            theme: {
              color: '#2563eb'
            }
          };
          
          const rzp = new (window as any).Razorpay(options);
          rzp.open();
          toast.dismiss(loadingToast);
        } catch (error) {
          toast.dismiss(loadingToast);
          console.error("Razorpay error:", error);
          toast.error("Failed to initialize payment gateway");
        }
      };
      
      script.onerror = () => {
        toast.dismiss(loadingToast);
        toast.error("Failed to load payment gateway");
      };
      
      document.body.appendChild(script);
    } else {
      toast.error("Payment gateway is not configured by admin.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-gray-900">User Dashboard</h1>
        <div className="flex items-center gap-3">
          {profile.premiumStatus && (
            <span className="flex items-center gap-1 px-4 py-1.5 bg-amber-100 text-amber-700 text-sm font-bold rounded-full border border-amber-200">
              <Zap className="w-4 h-4" />
              PREMIUM MEMBER
            </span>
          )}
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
          >
            {isEditing ? <X className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className={`${glassClass} rounded-2xl shadow-sm p-8 space-y-6`}>
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="relative group">
              <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center text-primary overflow-hidden border-2 border-white shadow-sm">
                {profile.photoURL ? (
                  <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-12 h-12" />
                )}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full shadow-lg hover:bg-secondary transition-all disabled:opacity-70"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              </button>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handlePhotoUpload}
                accept="image/*"
                className="hidden"
              />
            </div>

            <div className="space-y-1 w-full">
              {isEditing ? (
                <input 
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-center font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                />
              ) : (
                <h2 className="text-xl font-bold text-gray-900">{profile.displayName || 'ToolBox User'}</h2>
              )}
              <p className="text-sm text-gray-500 flex items-center justify-center gap-1">
                <Mail className="w-3 h-3" />
                {profile.email}
              </p>
            </div>

            <div className="w-full">
              {isEditing ? (
                <textarea 
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px] resize-none"
                />
              ) : (
                <p className="text-sm text-gray-600 italic">
                  {profile.bio || 'No bio provided yet.'}
                </p>
              )}
            </div>

            {isEditing && (
              <button 
                onClick={handleSave}
                disabled={saving}
                className="w-full py-2 bg-primary text-white rounded-lg font-bold hover:bg-secondary transition-all flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            )}
          </div>

          <div className="pt-6 border-t border-gray-50 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                Status
              </span>
              <span className={profile.premiumStatus ? "text-amber-600 font-bold" : "text-gray-900 font-medium"}>
                {profile.premiumStatus ? "Premium" : "Free User"}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Last Used
              </span>
              <span className="text-gray-900 font-medium">
                {profile.lastUsedAt ? new Date(profile.lastUsedAt).toLocaleDateString() : 'Never'}
              </span>
            </div>
          </div>
        </div>

        {/* Usage Stats */}
        <div className={`md:col-span-2 ${glassClass} rounded-2xl shadow-sm p-8 space-y-6`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center text-primary">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Usage Statistics</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-6 bg-gray-50 rounded-2xl space-y-2">
              <p className="text-sm font-medium text-gray-500">Daily Usage</p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-extrabold text-gray-900">{profile.usageCount}</span>
                <span className="text-gray-400 mb-1">/ {profile.premiumStatus ? '∞' : dailyLimit}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-4 overflow-hidden">
                <div 
                  className="bg-primary h-full rounded-full transition-all duration-500" 
                  style={{ width: `${profile.premiumStatus ? 0 : Math.min((profile.usageCount / dailyLimit) * 100, 100)}%` }}
                />
              </div>
            </div>

            <div className="p-6 bg-primary rounded-2xl space-y-2 text-white">
              <p className="text-sm font-medium text-white/80">Premium Benefits</p>
              <ul className="text-sm space-y-2">
                <li className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-300" />
                  Unlimited daily tool usage
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-300" />
                  Access to AI Text Generator
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-300" />
                  Ad-free experience
                </li>
              </ul>
            </div>
          </div>

          {!profile.premiumStatus && (
            <button 
              onClick={handleCheckout}
              className="w-full py-4 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-colors shadow-sm"
            >
              Upgrade to Premium ({settings?.currency === 'INR' ? '₹' : settings?.currency === 'USD' ? '$' : '€'}{settings?.premiumPrice || 499})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
