import { AssetType } from "../types";

export interface MarketStatus {
    isOpen: boolean;
    message: string;
    color: string;
}

export const getMarketStatus = (type: AssetType): MarketStatus => {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const istOffset = 5.5 * 60 * 60 * 1000;
    const ist = new Date(utc + istOffset);
    
    const day = ist.getDay(); // 0 = Sun, 6 = Sat
    const hour = ist.getHours();
    const minute = ist.getMinutes();
    const currentMinutes = hour * 60 + minute;

    // NSE Equity market hours
    if (day === 0 || day === 6) return { isOpen: false, message: 'Closed (Weekend)', color: 'text-red-400' };
    
    const nseOpen = 9 * 60 + 15; // 09:15
    const nseClose = 15 * 60 + 30; // 15:30
    
    if (currentMinutes >= nseOpen && currentMinutes < nseClose) {
        return { isOpen: true, message: 'Market Open', color: 'text-green-400' };
    }
    return { isOpen: false, message: 'Market Closed', color: 'text-red-400' };
};
