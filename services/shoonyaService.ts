
import { AppSettings } from "../types";

const SHOONYA_API_BASE = "https://api.shoonya.com/NorenWS/";
let sessionToken: string | null = null;

async function generateHash(input: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const loginToShoonya = async (settings: AppSettings): Promise<boolean> => {
  if (sessionToken) return true;
  
  const userId = settings.shoonyaUserId;
  const password = settings.shoonyaPassword;
  const apiKey = settings.shoonyaApiKey;
  const vendorCode = settings.shoonyaVendorCode;

  if (!userId || !password || !apiKey) {
    console.debug("Shoonya credentials missing in Config tab.");
    return false;
  }

  try {
    // Shoonya requires SHA256(password) and SHA256(apiKey + userId)
    const hashedPassword = await generateHash(password);
    const appKey = await generateHash(`${apiKey}${userId}`);
    
    const payload = {
      apkversion: "1.0.0",
      uid: userId,
      pwd: hashedPassword,
      vc: vendorCode || userId,
      appkey: appKey,
      imei: 'abc1234',
      source: "API"
    };

    // Use CORS proxy to bypass browser restrictions
    const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(SHOONYA_API_BASE + 'QuickAuthenticate')}`, {
      method: 'POST',
      body: `jData=${JSON.stringify(payload)}`
    });

    const data = await res.json();
    if (data.stat === "Ok") {
      sessionToken = data.susertoken;
      console.info("Shoonya: Session established successfully.");
      return true;
    }
    console.warn("Shoonya Login Failed:", data.emsg || "Invalid Credentials");
    return false;
  } catch (e) {
    console.error("Shoonya Connection Error:", e);
    return false;
  }
};

export const fetchShoonyaQuote = async (symbol: string, settings: AppSettings): Promise<number | null> => {
  if (!sessionToken) {
    const success = await loginToShoonya(settings);
    if (!success) return null;
  }

  try {
    const pureSym = symbol.includes('.') ? symbol.split('.')[0] : symbol;
    const isIndex = symbol.startsWith('^');
    
    const payload = {
      uid: settings.shoonyaUserId,
      actid: settings.shoonyaUserId,
      exch: "NSE", 
      tsym: isIndex 
        ? (pureSym === '^NSEI' ? 'Nifty 50' : 'Nifty Bank') 
        : `${pureSym}-EQ`
    };

    const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(SHOONYA_API_BASE + 'GetQuotes')}`, {
      method: 'POST',
      body: `jData=${JSON.stringify(payload)}&jKey=${sessionToken}`
    });

    const data = await res.json();
    return data.lp ? parseFloat(data.lp) : null;
  } catch (e) {
    return null;
  }
};
