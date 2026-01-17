
const STORAGE_KEY = 'aitrade_watchlist';
const DEFAULT_WATCHLIST = ['BSE.NS', 'SBIN.NS', 'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS'];

export const checkAndRefreshStockList = async (): Promise<string[]> => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            return DEFAULT_WATCHLIST;
        }
    }
    return DEFAULT_WATCHLIST;
};

export const addToWatchlist = (symbol: string) => {
    const formatted = symbol.toUpperCase().endsWith('.NS') ? symbol.toUpperCase() : `${symbol.toUpperCase()}.NS`;
    const saved = localStorage.getItem(STORAGE_KEY);
    const list = saved ? JSON.parse(saved) : DEFAULT_WATCHLIST;
    if (!list.includes(formatted)) {
        const newList = [...list, formatted];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
        return newList;
    }
    return list;
};

export const removeFromWatchlist = (symbol: string) => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const list = saved ? JSON.parse(saved) : DEFAULT_WATCHLIST;
    const newList = list.filter((s: string) => s !== symbol);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
    return newList;
};
