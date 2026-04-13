import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { UserProfile } from "../types";

/**
 * Checks if a user has access to tools based on their subscription plan and role.
 * @param userData The user profile data from Firestore
 * @returns true if access is granted, false otherwise
 */
export function checkSubscription(userData: UserProfile | null): boolean {
  if (!userData) return false;
  
  // 1. Admin always has full access
  if (userData.role === 'admin' || userData.email === 'rangpencilhouse@gmail.com') {
    return true;
  }

  // 2. Normal User Logic
  const plan = userData.plan || 'free';
  const expiry = userData.expiry || userData.planExpiresAt;
  const now = new Date();

  // If no expiry date is set, we treat it as expired for control purposes
  if (!expiry) return false;

  const expiryDate = new Date(expiry);
  const isNotExpired = now <= expiryDate;

  // Pro or Premium users must not be expired
  if (plan === 'pro' || plan === 'premium') {
    return isNotExpired;
  }

  // Free users can use tools ONLY until expiry date
  if (plan === 'free') {
    return isNotExpired;
  }

  return false;
}

/**
 * Simulates an upgrade to a Pro plan for 30 days.
 * @param uid The user's unique ID
 */
export async function upgradePlan(uid: string) {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 30);
  const expiryISO = expiry.toISOString();
  
  await updateDoc(doc(db, 'users', uid), {
    plan: 'pro',
    expiry: expiryISO,
    // Keep legacy fields in sync for compatibility
    premiumStatus: true,
    planExpiresAt: expiryISO
  });
}
