import { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { Tool, UserProfile, AppSettings } from '../types';
import { Loader2, AlertCircle, Zap } from 'lucide-react';
import { getDailyLimit } from '../lib/utils';
import HtmlRenderer from '../components/HtmlRenderer';
import ToolAdWrapper from '../components/ToolAdWrapper';

export default function CustomToolPage({ profile, settings }: { profile: UserProfile | null, settings: AppSettings | null }) {
  const { toolId } = useParams();
  const [tool, setTool] = useState<Tool | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTool = async () => {
      if (!toolId) return;
      try {
        const docRef = doc(db, 'tools', toolId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as Tool;
          setTool(data);
          
          // Increment usage if allowed
          if (profile && !profile.premiumStatus) {
            await updateDoc(doc(db, 'users', profile.uid), {
              usageCount: increment(1),
              lastUsedAt: new Date().toISOString()
            });
          }
        }
      } catch (error) {
        console.error("Error fetching custom tool:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTool();
  }, [toolId, profile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!tool || !tool.isActive) {
    return <Navigate to="/" />;
  }

  const dailyLimit = getDailyLimit(profile, settings);
  const isRestricted = tool.isPremium && (!profile || !profile.premiumStatus);
  const isOverLimit = !profile?.premiumStatus && (profile?.usageCount || 0) >= dailyLimit;

  if (isRestricted || isOverLimit) {
    return (
      <div className="max-w-2xl mx-auto mt-12 p-8 bg-white rounded-3xl border border-gray-100 shadow-sm text-center space-y-6">
        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mx-auto">
          <Zap className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          {isOverLimit ? "Daily Limit Reached" : "Premium Tool"}
        </h2>
        <p className="text-gray-600">
          {isOverLimit 
            ? `You've reached your free limit of ${dailyLimit} tools per day.` 
            : "This tool is only available for Premium members."}
        </p>
        <button 
          onClick={() => window.location.href = '/dashboard'}
          className="inline-block px-8 py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-colors shadow-lg"
        >
          Upgrade to Premium
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <ToolAdWrapper position="tool_top" />
      
      <header className="space-y-2">
        <h1 className="text-3xl font-extrabold text-gray-900">{tool.name}</h1>
        <p className="text-gray-600">{tool.description}</p>
      </header>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 min-h-[500px]">
        {tool.htmlContent ? (
          <HtmlRenderer 
            html={tool.htmlContent}
            className="custom-tool-container"
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-4">
            <AlertCircle className="w-12 h-12" />
            <p>No content defined for this tool.</p>
          </div>
        )}
      </div>

      <ToolAdWrapper position="tool_bottom" />
    </div>
  );
}
