import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Auth } from 'firebase/auth';
import { toast } from 'react-hot-toast';

import { UserProfile, AppSettings } from '../types';

export function getDailyLimit(profile: UserProfile | null, settings: AppSettings | null): number {
  if (profile?.customDailyLimit && profile.customDailyLimit > 0) {
    return profile.customDailyLimit;
  }
  return settings?.dailyLimit || 5;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, auth: Auth) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  if (errorMessage.includes('resource-exhausted') || errorMessage.includes('Quota exceeded')) {
    toast.error("Firestore Quota Exceeded. The free daily write limit (20,000) has been reached. Quota will reset tomorrow. To avoid this, please enable billing in the Firebase Console.", {
      duration: 6000,
      id: 'firestore-quota-error'
    });
  }

  if (errorMessage.includes('unavailable') || errorMessage.includes('Could not reach Cloud Firestore backend')) {
    toast.error("Could not reach Cloud Firestore backend. This might be a temporary connection issue or an incorrect configuration. Please refresh the page.", {
      duration: 6000,
      id: 'firestore-unavailable-error'
    });
  }

  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function handleApiRequest<T>(request: Promise<Response>): Promise<T> {
  try {
    const response = await request;
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = typeof errorData.error === 'string' 
        ? errorData.error 
        : (Array.isArray(errorData.error) ? errorData.error[0]?.message : `Request failed with status ${response.status}`);
      throw new Error(message || "API request failed");
    }
    return await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    toast.error(message);
    throw error;
  }
}
