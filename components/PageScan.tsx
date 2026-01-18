
import React, { useState, useMemo } from 'react';
import { MarketData, StockRecommendation, AppSettings } from '../types';
import { Activity, Loader2, Zap, BarChart3, Globe, Target, ShieldCheck, Cpu } from 'lucide-react';
import { getFnOUniverse } from '../services/stockListService';
import { fetchRealStockData } from '../services/marketDataService';
import { StockCard } from './StockCard';
import { getFnoTechnicalRecommendations } from '../services/fnoScanService';

interface PageScanProps {
  marketData: MarketData;
  settings: AppSettings;
  onTrade: (stock: StockRecommendation) => void;
}

export const PageScan: React.FC<PageScanProps> = ({ marketData: globalMarketData, settings, onTrade }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResults, setScanResults] = useState<StockRecommendation[]>([]);
  const [status, setStatus] = useState<string>('');

  const fnoUniverse = useMemo(() => {
      const symbols = getFnOUniverse();
      return ['^NSEI', '^NSEBANK', ...symbols.slice(0, 48)]; // Fixed Top 50 universe
  }, []);

  const runQuantScan = async () => {
    setIsScanning(true);
    setScanProgress(0);
    setScanResults([]);
    setStatus('SYNCING SHOONYA TICKS...');

    const snapshots: Record<string, any> = {};
    const batchSize = 6;

    try {
        for (let i = 0; i < fnoUniverse.length; i += batchSize) {
          const batch = fnoUniverse.slice(i, i + batchSize);
          await Promise.all(batch.map(async (symbol) => {
            const data = await fetchRealStockData(symbol, settings, "15m", "2d");
            if (data) snapshots[symbol] = data;
          }));
          setScanProgress(Math.round(((i + batchSize) / fnoUniverse.length) * 100));
        }

        setStatus('CALCULATING VOLATILITY ALPHA...');
        const picks = await getFnoTechnicalRecommendations(snapshots);
        setScanResults(picks);
    } catch (e) {
        setStatus('SCAN INTERRUPTED');
    } finally {
        setIsScanning(false);
        setStatus('');
    }
  };

  return (
    <div className="p-4 pb-24 animate-fade-in max-w-lg mx-auto md:max-w-none flex flex-col h-full">
      <div className="shrink-0 mb-6">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-600/20 rounded-xl text-blue-400 border border-blue-500/30">
                    <Cpu size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-white italic uppercase tracking-tighter leading-none">Quant Terminal</h1>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1 mt-1">
                        <Globe size={10} className="text-blue-500"/> Index & F&O Live Ticks
                    </p>
                </div>
            </div>
            {isScanning && (
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-600/10 border border-blue-500/30 rounded-full animate-pulse">
                    <Loader2 size={12} className="animate-spin text-blue-400" />
                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">{scanProgress}%</span>
                </div>
            )}
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 relative overflow-hidden group bg-gradient-to-br from-slate-900 to-black">
            <h2 className="text-sm font-black text-white uppercase italic tracking-wider mb-2">Alpha Momentum Scan</h2>
            <p className="text-[10px] text-slate-400 font-medium leading-relaxed mb-6">
                Analyzing Top 50 F&O stocks using Shoonya live price feeds. 
                Quantitative filters track institutional volume and range breakouts.
            </p>

            <button 
                onClick={runQuantScan}
                disabled={isScanning}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-blue-500/20 flex items-center justify-center gap-3 transition-all disabled:opacity-50 active:scale-[0.98] text-xs"
            >
                {isScanning ? (
                    <>
                        <Loader2 size={18} className="animate-spin" />
                        {status || 'SCANNING...'}
                    </>
                ) : (
                    <>
                        <Zap size={18} />
                        START QUANTITATIVE SCAN
                    </>
                )}
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pt-2">
        <div className="flex justify-between items-center mb-6 px-1">
          <h3 className="text-sm font-black text-white uppercase italic tracking-tighter flex items-center gap-2">
            <BarChart3 size={16} className="text-blue-500"/> 
            {scanResults.length > 0 ? 'Best Momentum Recommendations' : 'Analysis Feed'}
          </h3>
        </div>

        {scanResults.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scanResults.map(res => (
              <div key={res.symbol} className="relative group">
                  <div className="absolute -top-2 -left-2 z-10">
                      <div className="bg-blue-600 text-white text-[8px] font-black px-2 py-0.5 rounded shadow-lg border border-blue-400">
                          ROBOT PICK
                      </div>
                  </div>
                  <StockCard stock={res} marketData={globalMarketData} onTrade={onTrade} />
              </div>
            ))}
          </div>
        ) : !isScanning && (
          <div className="flex flex-col items-center justify-center py-20 bg-slate-900/30 border border-slate-800 border-dashed rounded-3xl text-center px-6">
            <Activity size={32} className="text-slate-800 mb-4 opacity-20" />
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Engine Standby</p>
            <p className="text-[9px] text-slate-500 uppercase font-bold mt-2 leading-relaxed max-w-[200px]">
                Run the scan to identify quantitative F&O setups.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
