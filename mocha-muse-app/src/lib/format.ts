export const rs = (n: number) => "Rs " + n.toLocaleString("en-US");
export const fmtDate = (t: number) =>
  new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + ", " +
  new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
export const priceText = (p: number) => (p ? rs(p) : "To confirm");
export const isArabic = (t: string) => /[؀-ۿ]/.test(t);
export const newOrderNo = () => "MM-" + Date.now().toString(36).toUpperCase().slice(-6) + Math.floor(Math.random() * 36).toString(36).toUpperCase();
