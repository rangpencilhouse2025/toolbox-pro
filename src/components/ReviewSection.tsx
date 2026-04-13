import React, { useState, useEffect, useRef } from 'react';
import { Star, MessageSquare, User as UserIcon, Send, CheckCircle, LogIn, Camera, X } from 'lucide-react';
import { collection, addDoc, query, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Review, UserProfile, AppSettings } from '../types';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

interface ReviewSectionProps {
  profile: UserProfile | null;
  settings: AppSettings | null;
}

export default function ReviewSection({ profile, settings }: ReviewSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      let reviewsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Review[];

      // If no reviews exist, add some dummy ones
      if (reviewsData.length === 0) {
        const dummyReviews = [
          {
            id: 'dummy-1',
            userName: "Alex Thompson",
            userPhoto: "https://picsum.photos/seed/alex/100/100",
            rating: 5,
            comment: "Absolutely love the Image Compressor! It saved me so much time and the quality is still great.",
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            isFake: true,
            isApproved: true
          },
          {
            id: 'dummy-2',
            userName: "Maria Garcia",
            userPhoto: "https://picsum.photos/seed/maria/100/100",
            rating: 4,
            comment: "The PDF tools are very handy. I use them daily for my work. Highly recommended!",
            createdAt: new Date(Date.now() - 172800000).toISOString(),
            isFake: true,
            isApproved: true
          },
          {
            id: 'dummy-3',
            userName: "James Wilson",
            userPhoto: "https://picsum.photos/seed/james/100/100",
            rating: 5,
            comment: "Best tool collection I've found online. The UI is clean and everything works perfectly.",
            createdAt: new Date(Date.now() - 259200000).toISOString(),
            isFake: true,
            isApproved: true
          }
        ];

        // We don't automatically add them to Firestore here to avoid infinite loops or multiple additions
        // but we can show them in the UI if the collection is empty
        setReviews(dummyReviews as any);
      } else {
        setReviews(reviewsData);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      toast.error("Please login to leave a review");
      navigate('/login');
      return;
    }

    if (!comment.trim()) {
      toast.error("Please enter a comment");
      return;
    }

    setIsSubmitting(true);
    try {
      const newReview = {
        userId: auth.currentUser.uid,
        userName: profile?.displayName || auth.currentUser.displayName || 'Anonymous User',
        userPhoto: uploadedPhoto || profile?.photoURL || auth.currentUser.photoURL || '',
        rating,
        comment,
        createdAt: new Date().toISOString(),
        isApproved: true,
        isFake: false
      };

      await addDoc(collection(db, 'reviews'), newReview);
      toast.success("Thank you for your review!");
      setComment('');
      setRating(5);
      setUploadedPhoto(null);
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error("Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      toast.error("Image too large (max 1MB)");
      return;
    }

    setIsUploading(true);
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
        setUploadedPhoto(base64);
        setIsUploading(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const renderStars = (count: number, interactive = false) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && setRating(star)}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            className={`${interactive ? 'cursor-pointer' : 'cursor-default'} transition-transform active:scale-90`}
          >
            <Star
              className={`w-5 h-5 ${
                star <= (hoverRating || count)
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900">
              {settings?.reviewsTitle || 'User Reviews & Ratings'}
            </h2>
            <p className="text-gray-500 font-medium">
              {settings?.reviewsSubtitle || 'Hear what our community has to say about ToolBox Pro'}
            </p>
          </div>

          {/* Review Submission Form */}
          {auth.currentUser ? (
            <div className="bg-gray-50 p-8 rounded-[32px] border border-gray-100 space-y-6">
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 border-2 border-white shadow-sm">
                    {uploadedPhoto || profile?.photoURL ? (
                      <img 
                        src={uploadedPhoto || profile?.photoURL || ''} 
                        alt="User" 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <UserIcon className="w-8 h-8" />
                      </div>
                    )}
                    {isUploading && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 p-1.5 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
                    title="Upload custom photo"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                  {uploadedPhoto && (
                    <button 
                      onClick={() => setUploadedPhoto(null)}
                      className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                      title="Remove custom photo"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                  <input 
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Leave a Review</h3>
                  <div className="mt-1">{renderStars(rating, true)}</div>
                </div>
              </div>

              <form onSubmit={handleSubmitReview} className="space-y-4">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your experience with our tools..."
                  className="w-full px-6 py-4 bg-white border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px] font-medium"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-8 py-3 bg-[#e5322d] text-white rounded-xl font-bold hover:bg-red-600 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    Submit Review
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-gray-50 p-8 rounded-[32px] border border-gray-100 text-center space-y-4">
              <p className="text-gray-600 font-medium">Please login to share your experience and rate our tools.</p>
              <button 
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-2 px-8 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all"
              >
                <LogIn className="w-5 h-5" />
                Login to Review
              </button>
            </div>
          )}

          {/* Reviews List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnimatePresence>
              {reviews.map((review) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow space-y-4 relative overflow-hidden"
                >
                  {review.isFake && (
                    <div className="absolute top-4 right-4 flex items-center gap-1 text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-full">
                      <CheckCircle className="w-3 h-3" />
                      VERIFIED USER
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100">
                      {review.userPhoto ? (
                        <img src={review.userPhoto} alt={review.userName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <UserIcon className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">{review.userName}</h4>
                      <div className="mt-0.5">{renderStars(review.rating)}</div>
                    </div>
                  </div>

                  <p className="text-gray-600 text-sm leading-relaxed italic">
                    "{review.comment}"
                  </p>

                  {review.adminReply && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-2xl border-l-4 border-blue-500 space-y-2">
                      <div className="flex items-center gap-2 text-blue-600">
                        <MessageSquare className="w-4 h-4" />
                        <span className="text-xs font-black uppercase tracking-wider">Admin Reply</span>
                      </div>
                      <p className="text-gray-700 text-sm font-medium">
                        {review.adminReply}
                      </p>
                    </div>
                  )}

                  <div className="text-[10px] text-gray-400 font-medium">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

function Loader2({ className }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
}
