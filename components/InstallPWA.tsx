
import React, { useEffect, useState } from 'react';
import { Download, Share, PlusSquare, X, MonitorDown, Smartphone } from 'lucide-react';

export const InstallPWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(isInStandaloneMode);

    // Check for iOS
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIosDevice);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      // Show the install prompt (Android/Desktop Chrome)
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        }
        setDeferredPrompt(null);
      });
    } else {
      // Show manual instructions for iOS or if automatic prompt fails
      setShowInstructions(true);
    }
  };

  // If installed, don't show anything
  if (isStandalone) return null;

  return (
    <>
        <button 
          onClick={handleInstallClick} 
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 shadow-lg shadow-blue-500/30 animate-pulse transition-all border border-blue-400/50"
        >
          {isIOS ? <Download size={16} /> : <Smartphone size={16} />} 
          <span className="hidden md:inline">Install App</span>
          <span className="md:hidden">Get App</span>
        </button>

        {showInstructions && (
            <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-4 animate-fade-in" onClick={() => setShowInstructions(false)}>
                <div className="bg-surface border border-slate-700 w-full max-w-sm rounded-2xl p-6 relative shadow-2xl" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setShowInstructions(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={20}/></button>
                    
                    <div className="flex flex-col items-center mb-6">
                        <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-blue-500/30">
                            <Download size={28} className="text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-white">Install AI-Trade</h3>
                        <p className="text-xs text-slate-400 mt-1">Add to Home Screen for the full app experience</p>
                    </div>

                    <div className="space-y-4 text-sm text-slate-300 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                        {isIOS ? (
                            <>
                                <div className="flex items-center gap-4">
                                    <span className="flex-none flex items-center justify-center w-8 h-8 bg-slate-700 rounded-lg text-blue-400"><Share size={16} /></span>
                                    <p>1. Tap the <span className="font-bold text-white">Share</span> button in Safari.</p>
                                </div>
                                <div className="w-full h-px bg-slate-700/50"></div>
                                <div className="flex items-center gap-4">
                                    <span className="flex-none flex items-center justify-center w-8 h-8 bg-slate-700 rounded-lg text-blue-400"><PlusSquare size={16} /></span>
                                    <p>2. Scroll down and tap <span className="font-bold text-white">Add to Home Screen</span>.</p>
                                </div>
                            </>
                        ) : (
                             <>
                                <div className="flex items-center gap-4">
                                    <span className="flex-none flex items-center justify-center w-8 h-8 bg-slate-700 rounded-lg text-blue-400"><MonitorDown size={16} /></span>
                                    <p>1. Tap the <span className="font-bold text-white">Settings/Menu</span> button in Chrome.</p>
                                </div>
                                <div className="w-full h-px bg-slate-700/50"></div>
                                <div className="flex items-center gap-4">
                                    <span className="flex-none flex items-center justify-center w-8 h-8 bg-slate-700 rounded-lg text-blue-400"><Smartphone size={16} /></span>
                                    <p>2. Select <span className="font-bold text-white">Install App</span> or <span className="font-bold text-white">Add to Home Screen</span>.</p>
                                </div>
                            </>
                        )}
                    </div>
                    
                    <button onClick={() => setShowInstructions(false)} className="w-full mt-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors">
                        Close
                    </button>
                </div>
            </div>
        )}
    </>
  );
};
