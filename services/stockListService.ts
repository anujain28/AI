const STATIC_NSE_LIST = `Symbol
RELIANCE
TCS
HDFCBANK
BHARTIARTL
INFY
ICICIBANK
SBIN
LICI
HINDUNILVR
ITC
LT
BAJFINANCE
ADANIENT
SUNPHARMA
MARUTI
TATAMOTORS
AXISBANK
HCLTECH
TITAN
ONGC
ADANIPORTS
ASIANPAINT
KOTAKBANK
NTPC
TATASTEEL`;

export const getCompanyName = (symbol: string): string => {
    const upperSymbol = symbol.toUpperCase();
    if (!upperSymbol.includes('.')) return upperSymbol + '.NS';
    return upperSymbol; 
};

export const checkAndRefreshStockList = async (): Promise<string[]> => {
    const lines = STATIC_NSE_LIST.split('\n');
    return lines.slice(1).map(l => l.trim().toUpperCase() + '.NS');
}
