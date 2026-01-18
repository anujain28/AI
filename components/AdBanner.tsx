
import React, { useEffect } from 'react';

interface AdBannerProps {
  slotId?: string;
  format?: 'auto' | 'fluid' | 'rectangle';
  className?: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({ 
  slotId = "1234567890", // Replace with your default Slot ID 
  format = "auto",
  className = ""
}) => {
  
  useEffect(() => {
    try {
      // Fixed: Cast window to any to access adsbygoogle property safely in TS
      if ((window as any).adsbygoogle) {
          (window as any).adsbygoogle.push({});
      }
    } catch (e) {
      console.error("AdSense Error:", e);
    }
  }, []);

  return (
    <div className={`w-full overflow-hidden flex justify-center items-center bg-slate-900/50 border-y border-slate-800 py-2 ${className}`}>
        <div className="text-[10px] text-slate-600 uppercase tracking-widest text-center w-full mb-1">Sponsored</div>
        {/* Google AdSense Unit */}
        <ins className="adsbygoogle"
             style={{ display: 'block', minWidth: '300px', minHeight: '50px', width: '100%' }}
             data-ad-client="ca-pub-YOUR_ID_HERE" // REPLACE WITH YOUR ID
             data-ad-slot={slotId}
             data-ad-format={format}
             data-full-width-responsive="true"></ins>
    </div>
  );
};
