
import { StockData, AppSettings } from "../types";

const SHOONYA_API_BASE = "https://api.shoonya.com/NorenWS/";

// These would ideally be in process.env, but integrated here as requested for the engine
const SHOONYA_CONFIG = {
  userId: 'FA357399_U',
  apiKey: 'a0e3d441de41aebf4cb2ad7898e02fdd',
  vendorCode: 'FA357399_U',
  imei: 'abc1234'
};

let sessionToken: string | null = null;

/**
 * Generates the SHA256 hash required for Shoonya Login
 * In a real production environment, this should happen on a backend.
 */
async function generateHash(input: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const loginToShoonya = async (): Promise<boolean> => {
  if (sessionToken) return true;

  try {
    const appKey = await generateHash(`${SHOONYA_CONFIG.apiKey}${SHOONYA_CONFIG.userId}`);
    const payload = {
      apkversion: "1.0.0",
      uid: SHOONYA_CONFIG.userId,
      pwd: appKey, // Shoonya uses hashed API key as password for API login
      vc: SHOONYA_CONFIG.vendorCode,
      appkey: appKey,
      imei: SHOONYA_CONFIG.imei,
      source: "API"
    };

    // Note: This requires a proxy in local dev to avoid CORS. 
    // The marketDataService fetchWithProxy logic is used here.
    const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(SHOONYA_API_BASE + 'QuickAuthenticate')}`, {
      method: 'POST',
      body: `jData=${JSON.stringify(payload)}`
    });

    const data = await res.json();
    if (data.stat === "Ok") {
      sessionToken = data.susertoken;
      return true;
    }
    return false;
  } catch (e) {
    console.warn("Shoonya Login Failed", e);
    return false;
  }
};

export const fetchShoonyaQuote = async (symbol: string): Promise<number | null> => {
  if (!sessionToken) await loginToShoonya();
  if (!sessionToken) return null;

  try {
    const payload = {
      uid: SHOONYA_CONFIG.userId,
      actid: SHOONYA_CONFIG.userId,
      exch: "NSE",
      tsym: symbol.split('.')[0] + "-EQ"
    };

    const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(SHOONYA_API_BASE + 'GetQuotes')}`, {
      method: 'POST',
      body: `jData=${JSON.stringify(payload)}&jKey=${sessionToken}`
    });

    const data = await res.json();
    return data.lp ? parseFloat(data.lp) : null;
  } catch (e) {
    return null;
  }
};
