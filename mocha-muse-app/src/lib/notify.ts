import type { OrderInput } from "./schemas";
import { priceText } from "./format";

/* New-order email through FormSubmit (free). The receiving address comes from VITE_FORMSUBMIT_TO;
   use FormSubmit's private alias there rather than your real address. */
export async function emailNewOrder(o: Omit<OrderInput, "email">): Promise<"sent" | "failed" | "off"> {
  const to = import.meta.env.VITE_FORMSUBMIT_TO?.trim();
  if (!to) return "off";
  const fields = { Order: o.no, Item: o.title, Price: priceText(o.price), Customer: o.name, Phone: o.phone, City: o.city, Address: o.address, Notes: o.notes || "—" };
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch("https://formsubmit.co/ajax/" + encodeURIComponent(to), {
      method: "POST", signal: ctrl.signal,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ _subject: `New order ${o.no}: ${o.title}`, _template: "table", _captcha: "false", ...fields }),
    });
    clearTimeout(timer);
    return r.ok ? "sent" : "failed";
  } catch { return "failed"; }
}
