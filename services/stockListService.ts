
const INDUSTRY_MAP: Record<string, string> = {
  // Banking & Financial Services
  'AUBANK': 'Banking', 'ABCAPITAL': 'Finance', 'AXISBANK': 'Banking', 'BAJFINANCE': 'Finance', 'BAJAJFINSV': 'Finance', 'BAJAJHLDNG': 'Finance', 'BAJAJHFL': 'Finance', 'BANKBARODA': 'Banking', 'BANKINDIA': 'Banking', 'BSE': 'Finance', 'CANBK': 'Banking', 'CHOLAFIN': 'Finance', 'FEDERALBNK': 'Banking', 'HDFCAMC': 'Finance', 'HDFCBANK': 'Banking', 'HDFCLIFE': 'Insurance', 'ICICIBANK': 'Banking', 'ICICIGI': 'Insurance', 'IDFCFIRSTB': 'Banking', 'INDIANB': 'Banking', 'INDUSINDBK': 'Banking', 'JIOFIN': 'Finance', 'KOTAKBANK': 'Banking', 'LICI': 'Insurance', 'LICHSGFIN': 'Finance', 'LTF': 'Finance', 'M&MFIN': 'Finance', 'MFSL': 'Finance', 'MOTILALOFS': 'Finance', 'MUTHOOTFIN': 'Finance', 'PFC': 'Finance', 'PNB': 'Banking', 'RECLTD': 'Finance', 'SBICARD': 'Finance', 'SBILIFE': 'Insurance', 'SBIN': 'Banking', 'SHRIRAMFIN': 'Finance', 'UNIONBANK': 'Banking', 'YESBANK': 'Banking',
  // IT & Tech
  'COFORGE': 'IT', 'HCLTECH': 'IT', 'INFY': 'IT', 'KPITTECH': 'IT', 'LTIM': 'IT', 'MPHASIS': 'IT', 'OFSS': 'IT', 'PERSISTENT': 'IT', 'TCS': 'IT', 'TECHM': 'IT', 'WIPRO': 'IT', 'NAUKRI': 'Internet', 'PAYTM': 'Internet', 'POLICYBZR': 'Internet', 'NYKAA': 'Internet', 'SWIGGY': 'Internet',
  // Auto & Ancillaries
  'ASHOKLEY': 'Auto', 'BAJAJ-AUTO': 'Auto', 'BHARATFORG': 'Auto', 'BOSCHLTD': 'Auto', 'EICHERMOT': 'Auto', 'HEROMOTOCO': 'Auto', 'HYUNDAI': 'Auto', 'M&M': 'Auto', 'MARUTI': 'Auto', 'MOTHERSON': 'Auto', 'SONACOMS': 'Auto', 'TATATECH': 'Auto', 'TIINDIA': 'Auto', 'TVSMOTOR': 'Auto', 'TMPV': 'Auto',
  // Energy & Power
  'ADANIENSOL': 'Energy', 'ADANIGREEN': 'Energy', 'ADANIPOWER': 'Energy', 'BPCL': 'Energy', 'COALINDIA': 'Energy', 'GAIL': 'Energy', 'HINDPETRO': 'Energy', 'IOC': 'Energy', 'IREDA': 'Energy', 'IRFC': 'Finance', 'JSWENERGY': 'Energy', 'NTPC': 'Energy', 'NTPCGREEN': 'Energy', 'OIL': 'Energy', 'ONGC': 'Energy', 'POWERGRID': 'Energy', 'RELIANCE': 'Energy', 'TATAPOWER': 'Energy', 'PREMIERENE': 'Energy', 'WAAREEENER': 'Energy', 'SOLARINDS': 'Energy',
  // Pharma & Healthcare
  'ALKEM': 'Pharma', 'AUROPHARMA': 'Pharma', 'BIOCON': 'Pharma', 'CIPLA': 'Pharma', 'DIVISLAB': 'Pharma', 'DRREDDY': 'Pharma', 'FORTIS': 'Healthcare', 'GLENMARK': 'Pharma', 'LUPIN': 'Pharma', 'MANKIND': 'Pharma', 'MAXHEALTH': 'Healthcare', 'SUNPHARMA': 'Pharma', 'TORNTPHARM': 'Pharma', 'ZYDUSLIFE': 'Pharma',
  // Consumer Goods & Retail
  'ASIANPAINT': 'Consumer', 'BRITANNIA': 'Consumer', 'COLPAL': 'Consumer', 'DABUR': 'Consumer', 'DMART': 'Retail', 'GODREJCP': 'Consumer', 'HINDUNILVR': 'Consumer', 'ITC': 'Consumer', 'ITCHOTELS': 'Consumer', 'JUBLFOOD': 'Consumer', 'MARICO': 'Consumer', 'NESTLEIND': 'Consumer', 'PAGEIND': 'Consumer', 'PIDILITIND': 'Consumer', 'TATACONSUM': 'Consumer', 'TITAN': 'Consumer', 'TRENT': 'Retail', 'VBL': 'Consumer', 'PATANJALI': 'Consumer', 'BLUESTARCO': 'Consumer', 'VOLTAS': 'Consumer',
  // Metals & Mining
  'HINDALCO': 'Metals', 'HINDZINC': 'Metals', 'JSWSTEEL': 'Metals', 'JINDALSTEL': 'Metals', 'NATIONALUM': 'Metals', 'NMDC': 'Metals', 'SAIL': 'Metals', 'TATASTEEL': 'Metals', 'VEDL': 'Metals',
  // Infrastructure & Cement
  'ABB': 'Industrials', 'ACC': 'Cement', 'AMBUJACEM': 'Cement', 'APLAPOLLO': 'Metals', 'ASTRAL': 'Industrials', 'BEL': 'Defence', 'BDL': 'Defence', 'BHEL': 'Energy', 'CGPOWER': 'Industrials', 'COCHINSHIP': 'Defence', 'CONCOR': 'Logistics', 'CUMMINSIND': 'Industrials', 'DLF': 'Real Estate', 'GODREJPROP': 'Real Estate', 'GRASIM': 'Cement', 'HAL': 'Defence', 'HUDCO': 'Finance', 'IRCTC': 'Logistics', 'IRB': 'Infrastructure', 'KEI': 'Industrials', 'LT': 'Industrials', 'LODHA': 'Real Estate', 'MAZDOCK': 'Defence', 'OBEROIRLTY': 'Real Estate', 'PHOENIXLTD': 'Real Estate', 'POLYCAB': 'Industrials', 'PRESTIGE': 'Real Estate', 'RVNL': 'Infrastructure', 'SHREECEM': 'Cement', 'SIEMENS': 'Industrials', 'ULTRACEMCO': 'Cement', 'UNITDSPR': 'Consumer', 'IDEA': 'Telecom', 'INDUSTOWER': 'Telecom', 'INDIGO': 'Logistics', 'GMRAIRPORT': 'Infrastructure',
};

const FULL_STOCK_LIST_STRING = `ABB,ACC,APLAPOLLO,AUBANK,ADANIENSOL,ADANIENT,ADANIGREEN,ADANIPORTS,ADANIPOWER,ATGL,ABCAPITAL,ALKEM,AMBUJACEM,APOLLOHOSP,ASHOKLEY,ASIANPAINT,ASTRAL,AUROPHARMA,DMART,AXISBANK,BSE,BAJAJ-AUTO,BAJFINANCE,BAJAJFINSV,BAJAJHLDNG,BAJAJHFL,BANKBARODA,BANKINDIA,BDL,BEL,BHARATFORG,BHEL,BPCL,BHARTIARTL,BHARTIHEXA,BIOCON,BLUESTARCO,BOSCHLTD,BRITANNIA,CGPOWER,CANBK,CHOLAFIN,CIPLA,COALINDIA,COCHINSHIP,COFORGE,COLPAL,CONCOR,COROMANDEL,CUMMINSIND,DLF,DABUR,DIVISLAB,DIXON,DRREDDY,EICHERMOT,ETERNAL,EXIDEIND,NYKAA,FEDERALBNK,FORTIS,GAIL,GMRAIRPORT,GLENMARK,GODFRYPHLP,GODREJCP,GODREJPROP,GRASIM,HCLTECH,HDFCAMC,HDFCBANK,HDFCLIFE,HAVELLS,HEROMOTOCO,HINDALCO,HAL,HINDPETRO,HINDUNILVR,HINDZINC,POWERINDIA,HUDCO,HYUNDAI,ICICIBANK,ICICIGI,IDFCFIRSTB,IRB,ITCHOTELS,ITC,INDIANB,INDHOTEL,IOC,IRCTC,IRFC,IREDA,IGL,INDUSTOWER,INDUSINDBK,NAUKRI,INFY,INDIGO,JSWENERGY,JSWSTEEL,JINDALSTEL,JIOFIN,JUBLFOOD,KEI,KPITTECH,KALYANKJIL,KOTAKBANK,LTF,LICHSGFIN,LTIM,LT,LICI,LODHA,Lupin,MRF,M&MFIN,M&M,MANKIND,MARICO,MARUTI,MFSL,MAXHEALTH,MAZDOCK,MOTILALOFS,MPHASIS,MUTHOOTFIN,NHPC,NMDC,NTPCGREEN,NTPC,NATIONALUM,NESTLEIND,OBEROIRLTY,ONGC,OIL,PAYTM,OFSS,POLICYBZR,PIIND,PAGEIND,PATANJALI,PERSISTENT,PHOENIXLTD,PIDILITIND,POLYCAB,PFC,POWERGRID,PREMIERENE,PRESTIGE,PNB,RECLTD,RVNL,RELIANCE,SBICARD,SBILIFE,SRF,MOTHERSON,SHREECEM,SHRIRAMFIN,ENRIN,SIEMENS,SOLARINDS,SONACOMS,SBIN,SAIL,SUNPHARMA,SUPREMEIND,SUZLON,SWIGGY,TVSMOTOR,TATACOMM,TCS,TATACONSUM,TATAELXSI,TMPV,TATAPOWER,TATASTEEL,TATATECH,TECHM,TITAN,TORNTPHARM,TORNTPOWER,TRENT,TIINDIA,UPL,ULTRACEMCO,UNIONBANK,UNITDSPR,VBL,VEDL,VMM,IDEA,VOLTAS,WAAREEENER,WIPRO,YESBANK,ZYDUSLIFE`;

const FULL_LIST_ARRAY = FULL_STOCK_LIST_STRING.split(',').map(s => s.trim().toUpperCase() + '.NS');

export const getFullUniverse = () => FULL_LIST_ARRAY;

export const getGroupedUniverse = () => {
  const groups: Record<string, string[]> = {};
  FULL_LIST_ARRAY.forEach(sym => {
    const pureSym = sym.split('.')[0];
    const industry = INDUSTRY_MAP[pureSym] || 'Others';
    if (!groups[industry]) groups[industry] = [];
    groups[industry].push(sym);
  });
  return groups;
};

const STORAGE_KEY_IDEAS = 'aitrade_ideas_watchlist';
const STORAGE_KEY_ENGINE = 'aitrade_engine_universe';

export const getIdeasWatchlist = (): string[] => {
    const saved = localStorage.getItem(STORAGE_KEY_IDEAS);
    return saved ? JSON.parse(saved) : FULL_LIST_ARRAY;
};

export const saveIdeasWatchlist = (list: string[]) => {
    localStorage.setItem(STORAGE_KEY_IDEAS, JSON.stringify(list));
};

export const getEngineUniverse = (): string[] => {
    const saved = localStorage.getItem(STORAGE_KEY_ENGINE);
    return saved ? JSON.parse(saved) : FULL_LIST_ARRAY;
};

export const saveEngineUniverse = (list: string[]) => {
    localStorage.setItem(STORAGE_KEY_ENGINE, JSON.stringify(list));
};

export const checkAndRefreshStockList = async (): Promise<string[]> => {
    return getIdeasWatchlist();
};
