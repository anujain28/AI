import { AssetType } from "../types";

export interface MarketStatus {
    isOpen: boolean;
    message: string;
    color: string;
}

/**
 * Returns the current market status for the specified asset type (defaulting to Indian Stock Market/NSE).
 */
export const getMarketStatus = (type: AssetType): MarketStatus => {
    const now = new Date();
    // Calculate IST time (UTC + 5:30)
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const istOffset = 5.5 * 60 * 60 * 1000;
    const ist = new Date(utc + istOffset);
    
    const day = ist.getDay(); // 0 is Sunday, 6 is Saturday
    const hour = ist.getHours();
    const minute = ist.getMinutes();
    const currentMinutes = hour * 60 + minute;

    // Weekend Check
    if (day === 0 || day === 6) {
        return { 
            isOpen: false, 
            message: `Market Closed (Weekend: ${day === 0 ? 'Sunday' : 'Saturday'})`, 
            color: 'text-red-400' 
        };
    }
    
    // NSE Market Hours: 09:15 to 15:30
    const nseOpen = 9 * 60 + 15; 
    const nseClose = 15 * 60 + 30; 
    
    if (currentMinutes >= nseOpen && currentMinutes < nseClose) {
        return { 
            isOpen: true, 
            message: 'NSE Market Open', 
            color: 'text-green-400' 
        };
    }

    // Pre-Market check
    if (currentMinutes >= 9 * 60 && currentMinutes < nseOpen) {
        return { 
            isOpen: false, 
            message: 'Pre-Market Session', 
            color: 'text-yellow-400' 
        };
    }

    return { 
        isOpen: false, 
        message: 'Market Closed (After Hours)', 
        color: 'text-red-400' 
    };
};