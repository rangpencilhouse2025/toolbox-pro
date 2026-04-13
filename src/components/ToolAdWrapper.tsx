import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { AdSlotConfig } from '../types';
import HtmlRenderer from './HtmlRenderer';

interface ToolAdWrapperProps {
  position: 'tool_top' | 'tool_bottom';
  children?: React.ReactNode;
}

export default function ToolAdWrapper({ position, children }: ToolAdWrapperProps) {
  const [ads, setAds] = useState<AdSlotConfig[]>([]);

  useEffect(() => {
    const fetchAds = async () => {
      try {
        const q = query(
          collection(db, 'adSlots'), 
          where('isActive', '==', true),
          where('position', '==', position)
        );
        const snapshot = await getDocs(q);
        setAds(snapshot.docs.map(doc => doc.data() as AdSlotConfig));
      } catch (error) {
        console.error(`Error fetching ${position} ads:`, error);
      }
    };
    fetchAds();
  }, [position]);

  if (ads.length === 0) return children ? <>{children}</> : null;

  return (
    <div className="space-y-4">
      {ads.map(ad => (
        <HtmlRenderer 
          key={ad.id}
          html={ad.script}
          className="w-full flex items-center justify-center overflow-hidden my-4"
        />
      ))}
      {children}
    </div>
  );
}
