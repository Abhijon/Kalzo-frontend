export const isIndianMobile = (v: string) => /^[6-9]\d{9}$/.test(v.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, ""));
export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
export const isIFSC = (v: string) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v.trim().toUpperCase());
export const isAccountNumber = (v: string) => /^\d{9,18}$/.test(v.trim());
