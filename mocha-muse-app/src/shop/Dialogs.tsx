import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Product } from "../lib/schemas";
import { OrderInput } from "../lib/schemas";
import { imageSrc } from "../lib/catalog";
import { rs, newOrderNo } from "../lib/format";
import { emailNewOrder } from "../lib/notify";
import { placeOrder } from "../lib/shopData";
import type { CustomDesign } from "./Custom";

/* Locks page scrolling (and section paging) while a dialog is open, and closes on Escape. */
function useModal(open: boolean, onClose: () => void) {
  const close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") close.current(); };
    addEventListener("keydown", k);
    return () => { document.body.style.overflow = ""; removeEventListener("keydown", k); };
  }, [open]);
}

export function DetailDialog({ product, onClose, onOrder }: { product: Product | null; onClose: () => void; onOrder: (p: Product) => void }) {
  useModal(!!product, onClose);
  const xRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (product) xRef.current?.focus(); }, [product]);
  const p = product;
  return (
    <>
      <div className={"scrim" + (p ? " on" : "")} onClick={onClose} />
      <div className={"detail" + (p ? " on" : "")} role="dialog" aria-modal="true" aria-label="Painting details" aria-hidden={!p}>
        <button className="x" ref={xRef} type="button" aria-label="Close" onClick={onClose}>✕</button>
        {p && <>
          <div className="pic"><img src={imageSrc(p.img)} alt={p.alt || p.title} /></div>
          <div className="body">
            <span className="cap" style={{ color: "var(--sepia)" }}>{p.ref}</span>
            <h3>{p.title}</h3>
            {p.ar && <div className="ar" lang="ar">{p.ar}</div>}
            {p.tr && <p className="tr">{p.tr}</p>}
            <span className="price">{rs(p.price)}</span>
            <div><button className="btn fill" type="button" onClick={() => onOrder(p)}>Place an order <span aria-hidden="true">→</span></button></div>
          </div>
        </>}
      </div>
    </>
  );
}

export type OrderTarget = { kind: "ready"; product: Product } | { kind: "custom"; design: CustomDesign } | { kind: "pick" };
type Fields = { name: string; phone: string; city: string; size: string; address: string; notes: string };
const empty: Fields = { name: "", phone: "", city: "", size: "", address: "", notes: "" };
const SAVED = "mm.customer";

export function OrderDialog({ target, products, onClose }: { target: OrderTarget | null; products: Product[]; onClose: () => void }) {
  useModal(!!target, onClose);
  const [f, setF] = useState<Fields>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof Fields | "form", string>>>({});
  const [pick, setPick] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<{ no: string; phone: string } | null>(null);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!target) return;
    setDone(null); setErrors({}); setPick(products[0]?.id ?? "__custom");
    try { const s = JSON.parse(localStorage.getItem(SAVED) || "null"); if (s) setF(v => ({ ...v, ...s })); } catch { /* storage unavailable */ }
    setTimeout(() => firstRef.current?.focus(), 60);
  }, [target, products]);

  if (!target) return <div className={"om"} aria-hidden="true" />;

  const chosen: OrderTarget = target.kind !== "pick" ? target
    : pick === "__custom" ? { kind: "custom", design: { words: "To be discussed", ink: "Your choice" } }
    : { kind: "ready", product: products.find(p => p.id === pick)! };

  const item = chosen.kind === "ready"
    ? { kind: "ready" as const, productId: chosen.product.id.startsWith("builtin") ? "" : chosen.product.id, title: chosen.product.title,
        price: chosen.product.id.startsWith("builtin") ? 0 : chosen.product.price }
    : chosen.kind === "custom" ? { kind: "custom" as const, productId: "", title: `Custom: ${chosen.design.words} in ${chosen.design.ink.toLowerCase()}`.slice(0, 200), price: 0 }
    : null;

  const set = (k: keyof Fields) => (e: { target: { value: string } }) => setF(v => ({ ...v, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!item || sending) return;
    const base = { no: newOrderNo(), name: f.name, phone: f.phone, city: f.city, address: f.address,
      notes: [f.size.trim() && "Size: " + f.size.trim(), f.notes.trim()].filter(Boolean).join(" · "), ...item, status: "new" as const, created: Date.now() };
    const check = OrderInput.omit({ email: true }).safeParse(base);
    if (!check.success) {
      const errs: typeof errors = {};
      for (const i of check.error.issues) { const k = i.path[0] as keyof Fields; if (k && !errs[k]) errs[k] = i.message; }
      setErrors(errs); return;
    }
    setErrors({}); setSending(true);
    const email = await emailNewOrder(check.data);
    try {
      await placeOrder({ ...check.data, email });
      try { localStorage.setItem(SAVED, JSON.stringify({ name: f.name, phone: f.phone, city: f.city, address: f.address })); } catch { /* fine */ }
      setDone({ no: check.data.no, phone: check.data.phone }); setF(v => ({ ...v, size: "", notes: "" }));
    } catch {
      setErrors({ form: "We couldn’t send your order. Check your connection and try again." });
    } finally { setSending(false); }
  }

  const fld = (k: keyof Fields, label: string, el: JSX.Element, full = false) => (
    <div className={"fld" + (full ? " full" : "") + (errors[k] ? " bad" : "")}>
      <label htmlFor={"o-" + k}>{label}</label>{el}{errors[k] && <span className="err">{errors[k]}</span>}
    </div>
  );

  return (
    <>
      <div className="scrim on" onClick={onClose} />
      <div className="om on" role="dialog" aria-modal="true" aria-labelledby="omTitle">
        <button className="x" type="button" aria-label="Close" onClick={onClose}>✕</button>
        {!done ? (
          <div>
            <span className="cap" style={{ color: "var(--sepia)" }}>Place an order</span>
            <h3 id="omTitle">Your order</h3>
            {target.kind === "pick" && (
              <div className="fld full" style={{ marginBottom: 14 }}><label htmlFor="omPick">Which piece?</label>
                <select id="omPick" value={pick} onChange={e => setPick(e.target.value)}>
                  {products.map(p => <option key={p.id} value={p.id}>{p.title} · {rs(p.price)}</option>)}
                  <option value="__custom">A custom piece (describe it in the notes)</option>
                </select></div>
            )}
            {chosen.kind === "ready" ? (
              <div className="om-item"><img src={imageSrc(chosen.product.img)} alt="" /><div><b>{chosen.product.title}</b><small>{chosen.product.ref || "Ready-made painting"}</small></div><span className="p">{rs(chosen.product.price)}</span></div>
            ) : chosen.kind === "custom" ? (
              <div className="om-item"><span className="sw">✎</span><div><b>Custom canvas</b><small>“{chosen.design.words}” in {chosen.design.ink.toLowerCase()}</small></div><span className="p" style={{ fontSize: 14 }}>Price to confirm</span></div>
            ) : null}
            <form onSubmit={submit} noValidate>
              {errors.form && <div className="err-banner" role="alert">{errors.form}</div>}
              <div className="fgrid">
                {fld("name", "Your name", <input ref={firstRef} id="o-name" autoComplete="name" maxLength={120} value={f.name} onChange={set("name")} />)}
                {fld("phone", "Phone / WhatsApp", <input id="o-phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={40} placeholder="+92 3xx xxxxxxx" value={f.phone} onChange={set("phone")} />)}
                {fld("city", "City", <input id="o-city" autoComplete="address-level2" maxLength={120} value={f.city} onChange={set("city")} />)}
                {fld("size", "Size (optional)", <input id="o-size" maxLength={60} placeholder="e.g. 40 × 50 cm" value={f.size} onChange={set("size")} />)}
                {fld("address", "Delivery address", <textarea id="o-address" autoComplete="street-address" maxLength={600} value={f.address} onChange={set("address")} />, true)}
                {fld("notes", "Notes (optional)", <textarea id="o-notes" maxLength={1300} placeholder="Colours, a name to add, a date you need it by…" value={f.notes} onChange={set("notes")} />, true)}
              </div>
              <p className="note">Mocha Muse will message you to confirm the price and delivery time before anything is painted.</p>
              <div className="actions"><button className="btn fill" type="submit" disabled={sending}>{sending ? "Sending…" : "Send order"} <span aria-hidden="true">→</span></button></div>
            </form>
          </div>
        ) : (
          <div className="done">
            <div className="tick" aria-hidden="true">✓</div>
            <h3>Order received</h3>
            <div className="cap" style={{ color: "var(--sepia)" }}>Order {done.no}</div>
            <p>Thank you. We’ll message you on <b>{done.phone}</b> to confirm the price and delivery time.</p>
            <div className="actions" style={{ justifyContent: "center" }}><button className="btn fill" type="button" onClick={onClose}>Done</button></div>
          </div>
        )}
      </div>
    </>
  );
}

