import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router";
import type { Admin, Order, Product, Status } from "../lib/schemas";
import { STATUSES, STATUS_LABEL, ProductFields } from "../lib/schemas";
import * as store from "../lib/adminData";
import { imageSrc } from "../lib/catalog";
import { rs, fmtDate, priceText } from "../lib/format";
import { shrinkPhoto } from "../lib/image";

type View = "orders" | "products" | "team";
const codeOf = (e: unknown) => (e as { code?: string })?.code ?? "";

function useToast() {
  const [msg, setMsg] = useState(""); const t = useRef(0);
  const show = useCallback((m: string) => { setMsg(m); clearTimeout(t.current); t.current = window.setTimeout(() => setMsg(""), 2600); }, []);
  const el = <div className={"toast" + (msg ? " on" : "")} role="status" aria-live="polite">{msg}</div>;
  return [show, el] as const;
}

export function AdminApp() {
  const [session, setSession] = useState<store.Session | null | undefined>(undefined);
  const [view, setView] = useState<View>("orders");
  const [toast, toastEl] = useToast();
  const [newCount, setNewCount] = useState(0);
  useEffect(() => store.watchSession(setSession), []);
  useEffect(() => { document.title = "Studio admin · Mocha Muse"; return () => { document.title = "Mocha Muse"; }; }, []);
  useEffect(() => { if (view === "team" && session && !session.owner) setView("orders"); }, [view, session]);

  if (session === undefined) return <div className="ad"><p className="loading">Loading…</p></div>;
  if (!session) return <div className="ad"><Login onDone={() => toast("Signed in")} />{toastEl}</div>;

  const tabs: [View, string][] = [["orders", "Orders"], ["products", "Products"], ...(session.owner ? [["team", "Team"] as [View, string]] : [])];
  return (
    <div className="ad">
      <div className="ad-shell">
        <aside className="side">
          <div className="brand"><span className="mark" aria-hidden="true" /><span>MOCHA MUSE</span></div>
          {tabs.map(([v, l]) => (
            <button key={v} type="button" aria-current={view === v ? "page" : undefined} onClick={() => setView(v)}>
              {l}{v === "orders" && newCount > 0 && <span className="badge" aria-label={`${newCount} new`}>{newCount}</span>}
            </button>
          ))}
          <span className="spacer" />
          <Link to="/">View site ↗</Link>
          <button type="button" onClick={() => store.signOut()}>Sign out</button>
          <div className="who">Signed in as {session.email}</div>
        </aside>
        <main className="main">
          {view === "orders" && <Orders toast={toast} onNewCount={setNewCount} />}
          {view === "products" && <Products toast={toast} />}
          {view === "team" && session.owner && <Team toast={toast} me={session} />}
        </main>
      </div>
      {toastEl}
    </div>
  );
}

/* ---------- sign-in ---------- */
function Login({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState(""), [pw, setPw] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    try { await store.signIn(email, pw); setPw(""); onDone(); }
    catch (x) {
      const c = codeOf(x);
      setErr(c === "not_admin" ? "This account isn’t set up as a studio admin."
        : /too-many-requests/.test(c) ? "Too many attempts. Wait a minute and try again."
        : /network|unavailable/.test(c) ? "We couldn’t reach the server. Check your connection and try again."
        : "That email and password don’t match.");
    }
    setBusy(false);
  }
  async function reset() {
    if (!email.trim()) { setErr("Enter your email first, then choose “Forgot password”."); return; }
    try { const { sendPasswordResetEmail } = await import("firebase/auth"); const { auth } = await import("../lib/auth"); await sendPasswordResetEmail(auth, email.trim()); } catch { /* same message either way */ }
    setResetSent(true); setErr("");
  }
  return (
    <div className="login">
      <div className="login-card">
        <span className="mark" aria-hidden="true" />
        <h2>Studio admin</h2>
        <p>Sign in to manage paintings and orders.</p>
        <form onSubmit={submit} noValidate>
          <div className="fld"><label htmlFor="lEmail">Email</label><input id="lEmail" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required /></div>
          <div className="fld"><label htmlFor="lPass">Password</label><input id="lPass" type="password" autoComplete="current-password" value={pw} onChange={e => setPw(e.target.value)} required />{err && <span className="err" role="alert">{err}</span>}</div>
          <button className="btn fill" type="submit" disabled={busy} style={{ justifyContent: "center" }}>{busy ? "Signing in…" : "Sign in"} <span aria-hidden="true">→</span></button>
          <button className="lnk" type="button" onClick={reset} style={{ justifySelf: "center" }}>Forgot password</button>
          {resetSent && <p className="note" role="status">If that email belongs to an admin, a reset link is on its way.</p>}
          <Link className="lnk" to="/" style={{ justifySelf: "center" }}>Back to the site</Link>
        </form>
      </div>
    </div>
  );
}

/* ---------- orders ---------- */
function Pill({ s }: { s: Status }) { return <span className={"pill st-" + s}>{STATUS_LABEL[s]}</span>; }

function Orders({ toast, onNewCount }: { toast: (m: string) => void; onNewCount: (n: number) => void }) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [filter, setFilter] = useState<Status | "all">("all");
  const [open, setOpen] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try { const o = await store.listOrders(); setOrders(o); onNewCount(o.filter(x => x.status === "new").length); setError(""); }
    catch { setError("Couldn’t load orders. Check your connection and try again."); setOrders(v => v ?? []); }
  }, [onNewCount]);
  useEffect(() => { load(); }, [load]);
  if (!orders) return <p className="loading">Loading orders…</p>;
  const list = filter === "all" ? orders : orders.filter(o => o.status === filter);
  const value = orders.filter(o => o.status !== "cancelled").reduce((a, o) => a + o.price, 0);
  const stat = (l: string, v: string | number) => <div className="stat"><span>{l}</span><b>{v}</b></div>;
  return (
    <section>
      <div className="main-head"><div><h2>Orders</h2><div className="sub">{orders.length} order{orders.length === 1 ? "" : "s"} in total</div></div>
        <button className="btn sm" type="button" onClick={load}>Refresh</button></div>
      {error && <div className="err-banner" role="alert">{error}</div>}
      <div className="stats">
        {stat("New", orders.filter(o => o.status === "new").length)}
        {stat("In progress", orders.filter(o => ["confirmed", "painting", "shipped"].includes(o.status)).length)}
        {stat("Delivered", orders.filter(o => o.status === "delivered").length)}
        {stat("Order value", rs(value))}
      </div>
      <div className="filters" role="group" aria-label="Filter orders by status">
        {(["all", ...STATUSES] as const).map(k => (
          <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}>
            {k === "all" ? "All" : STATUS_LABEL[k]} <em>{k === "all" ? orders.length : orders.filter(o => o.status === k).length}</em>
          </button>
        ))}
      </div>
      {list.length ? <>
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Item</th><th>Total</th><th>Status</th></tr></thead>
          <tbody>{list.map(o => (
            <tr key={o.id} className="row" tabIndex={0} onClick={() => setOpen(o)} onKeyDown={e => { if (e.key === "Enter") setOpen(o); }}>
              <td className="num"><b>{o.no}</b></td><td className="num">{fmtDate(o.created)}</td>
              <td className="cust"><b>{o.name}</b><small>{o.city}</small></td><td>{o.title}</td><td className="num">{priceText(o.price)}</td><td><Pill s={o.status} /></td>
            </tr>))}</tbody>
        </table></div>
        <div className="cards">{list.map(o => (
          <button key={o.id} type="button" className="ocard" onClick={() => setOpen(o)}>
            <span className="top"><b>{o.no}</b><Pill s={o.status} /></span><span>{o.title}</span>
            <span className="meta">{o.name} · {o.city} · {priceText(o.price)} · {fmtDate(o.created)}</span>
          </button>))}</div>
      </> : <div className="empty">No orders here yet.</div>}
      <OrderPanel order={open} onClose={() => setOpen(null)} onChanged={async (msg) => { toast(msg); await load(); }} />
    </section>
  );
}

function OrderPanel({ order, onClose, onChanged }: { order: Order | null; onClose: () => void; onChanged: (m: string) => Promise<void> }) {
  const [status, setStatus] = useState<Status>("new"), [note, setNote] = useState("");
  useEffect(() => { if (order) { setStatus(order.status); setNote(order.studioNote ?? ""); } }, [order]);
  const o = order;
  const digits = o ? o.phone.replace(/[^0-9]/g, "") : "";
  return (
    <aside className={"panel" + (o ? " on" : "")} aria-label="Order details" aria-hidden={!o}>
      <button className="x" type="button" aria-label="Close" onClick={onClose}>✕</button>
      {o && <>
        <span className="cap" style={{ color: "var(--sepia)" }}>{o.no}</span>
        <h3>{o.name}</h3>
        <div className="om-item"><span className="sw">✎</span><div><b>{o.title}</b><small>{o.kind === "custom" ? "Custom piece" : "Ready-made painting"}</small></div><span className="p">{priceText(o.price)}</span></div>
        <dl className="kv">
          <dt>Placed</dt><dd>{fmtDate(o.created)}</dd><dt>Phone</dt><dd>{o.phone}</dd><dt>City</dt><dd>{o.city}</dd>
          <dt>Address</dt><dd>{o.address}</dd><dt>Notes</dt><dd>{o.notes || "—"}</dd>
          <dt>Email</dt><dd>{o.email === "sent" ? "Sent to you ✓" : o.email === "failed" ? "Couldn’t send" : "Email not set up"}</dd>
        </dl>
        <div className="cap" style={{ color: "#6a5d52" }}>Status</div>
        <div className="steps-st" role="group" aria-label="Order status">
          {STATUSES.map(s => <button key={s} type="button" aria-pressed={status === s}
            onClick={async () => { try { await store.setOrderStatus(o.id, s); setStatus(s); await onChanged(`${o.no} marked ${STATUS_LABEL[s].toLowerCase()}`); } catch { await onChanged("Couldn’t update the status."); } }}>{STATUS_LABEL[s]}</button>)}
        </div>
        <div className="fld"><label htmlFor="opNote">Studio note</label><textarea id="opNote" maxLength={2000} value={note} onChange={e => setNote(e.target.value)} placeholder="Agreed price, size, delivery date…" /></div>
        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <button className="btn fill sm" type="button" onClick={async () => { try { await store.setStudioNote(o.id, note); await onChanged("Note saved"); } catch { await onChanged("Couldn’t save the note."); } }}>Save note</button>
          {digits.length >= 8 && <a className="btn sm" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${digits}?text=${encodeURIComponent(`Assalamu alaikum ${o.name}, this is Mocha Muse about your order ${o.no} (${o.title}).`)}`}>Message on WhatsApp</a>}
        </div>
      </>}
    </aside>
  );
}

/* ---------- products ---------- */
function Products({ toast }: { toast: (m: string) => void }) {
  const [list, setList] = useState<Product[] | null>(null);
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [sure, setSure] = useState("");
  const load = useCallback(async () => { try { setList(await store.allProducts()); } catch { toast("Couldn’t load products."); setList(v => v ?? []); } }, [toast]);
  useEffect(() => { load(); }, [load]);
  if (!list) return <p className="loading">Loading products…</p>;
  return (
    <section>
      <div className="main-head"><div><h2>Products</h2><div className="sub">{list.filter(p => p.visible).length} on the website · {list.length} in total</div></div>
        <button className="btn fill sm" type="button" onClick={() => setEditing("new")}>Add product <span aria-hidden="true">+</span></button></div>
      {list.length ? <div className="pgrid">{list.map(p => (
        <article className="pcard" key={p.id}>
          <div className="im"><img src={imageSrc(p.img)} alt="" />{!p.visible && <span className="hid">Hidden</span>}</div>
          <div className="bd"><b>{p.title}</b>{p.ar && <span className="ar" lang="ar">{p.ar}</span>}<span className="pr">{rs(p.price)}</span></div>
          <div className="ft">
            <label className="sw-tog"><input type="checkbox" checked={p.visible} onChange={async e => { try { await store.setProductVisible(p, e.target.checked); toast(e.target.checked ? "Now showing on the website" : "Hidden from the website"); load(); } catch { toast("Couldn’t update."); } }} /> On site</label>
            <span><button className="lnk" type="button" onClick={() => setEditing(p)}>Edit</button>
              <button className="lnk danger" type="button" onClick={async () => {
                if (sure !== p.id) { setSure(p.id); setTimeout(() => setSure(s => (s === p.id ? "" : s)), 3000); return; }
                try { await store.deleteProduct(p.id); toast("Product deleted"); load(); } catch { toast("Couldn’t delete."); } }}>{sure === p.id ? "Tap again to delete" : "Delete"}</button></span>
          </div>
        </article>))}</div>
      : <div className="empty">No products yet. Add your first painting, or <button className="lnk" type="button" onClick={async () => { try { await store.seedStarterProducts(); toast("Starter paintings added"); load(); } catch { toast("Couldn’t add them."); } }}>copy in the 5 paintings already on the site</button>.</div>}
      <ProductPanel editing={editing} onClose={() => setEditing(null)} onSaved={m => { toast(m); setEditing(null); load(); }} />
    </section>
  );
}

type PF = { img: string; title: string; price: string; ref: string; ar: string; tr: string; alt: string; visible: boolean };
function ProductPanel({ editing, onClose, onSaved }: { editing: Product | "new" | null; onClose: () => void; onSaved: (m: string) => void }) {
  const blank: PF = { img: "", title: "", price: "", ref: "", ar: "", tr: "", alt: "", visible: true };
  const [f, setF] = useState<PF>(blank); const [errs, setErrs] = useState<Record<string, string>>({}); const [busy, setBusy] = useState(false); const [over, setOver] = useState(false);
  useEffect(() => {
    if (!editing) return; setErrs({});
    setF(editing === "new" ? blank : { img: editing.img, title: editing.title, price: String(editing.price), ref: editing.ref, ar: editing.ar, tr: editing.tr, alt: editing.alt, visible: editing.visible });
  }, [editing]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k: keyof PF) => (e: { target: { value: string } }) => setF(v => ({ ...v, [k]: e.target.value }));
  async function take(file?: File) {
    if (!file) return;
    try { const img = await shrinkPhoto(file); setF(v => ({ ...v, img })); setErrs(e => ({ ...e, img: "" })); }
    catch (x) { setErrs(e => ({ ...e, img: (x as Error).message === "size" ? "That photo is too large even after shrinking. Try a smaller one." : "That file isn’t a photo we can use. Try a JPG or PNG." })); }
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    const candidate = { ...f, price: f.price.trim() === "" ? NaN : Number(f.price), alt: f.alt || f.title, created: editing && editing !== "new" ? editing.created : Date.now() };
    const r = ProductFields.safeParse(candidate);
    if (!r.success) { const m: Record<string, string> = {}; r.error.issues.forEach(i => { const k = String(i.path[0]); if (!m[k]) m[k] = k === "price" ? "Add a whole-rupee price." : k === "img" ? "Add a photo of the painting." : i.message; }); setErrs(m); return; }
    setBusy(true);
    try { await store.saveProduct(editing && editing !== "new" ? editing.id : null, r.data); onSaved(editing === "new" ? "Product added" : "Product updated"); }
    catch { setErrs({ img: "Couldn’t save. Check your connection and that you’re signed in as an admin." }); }
    setBusy(false);
  }
  const fld = (k: keyof PF, label: string, el: JSX.Element, full = true) => <div className={"fld" + (full ? " full" : "") + (errs[k] ? " bad" : "")}><label htmlFor={"p-" + k}>{label}</label>{el}{errs[k] && <span className="err">{errs[k]}</span>}</div>;
  return (
    <aside className={"panel" + (editing ? " on" : "")} aria-label="Product editor" aria-hidden={!editing}>
      <button className="x" type="button" aria-label="Close" onClick={onClose}>✕</button>
      <span className="cap" style={{ color: "var(--sepia)" }}>{editing === "new" ? "New product" : "Edit product"}</span>
      <h3>{editing === "new" || !editing ? "Add a painting" : editing.title}</h3>
      <form onSubmit={save} noValidate>
        <div className={"fld" + (errs.img ? " bad" : "")} style={{ marginBottom: 12 }}><span className="lab-like">Photo</span>
          <label className={"drop" + (over ? " over" : "")} htmlFor="pFile"
            onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={e => { e.preventDefault(); setOver(false); take(e.dataTransfer.files[0]); }}>
            {f.img ? <img src={imageSrc(f.img)} alt="" /> : <span>Drop a photo here, or tap to choose one</span>}
          </label>
          <input id="pFile" type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => take(e.target.files?.[0])} />
          {errs.img && <span className="err">{errs.img}</span>}
        </div>
        <div className="fgrid">
          {fld("title", "Title", <input id="p-title" maxLength={120} value={f.title} onChange={set("title")} placeholder="e.g. Ayat al-Kursi" />)}
          {fld("price", "Price (Rs)", <input id="p-price" type="number" min={0} step={100} inputMode="numeric" value={f.price} onChange={set("price")} />, false)}
          {fld("ref", "Reference", <input id="p-ref" maxLength={120} value={f.ref} onChange={set("ref")} placeholder="e.g. Al-Baqarah 2:255" />, false)}
          {fld("ar", "Arabic verse", <input id="p-ar" dir="rtl" lang="ar" maxLength={300} style={{ fontFamily: "var(--f-ar)", fontSize: 20 }} value={f.ar} onChange={set("ar")} />)}
          {fld("tr", "Translation", <input id="p-tr" maxLength={400} value={f.tr} onChange={set("tr")} />)}
          {fld("alt", "Photo description (for screen readers)", <input id="p-alt" maxLength={200} value={f.alt} onChange={set("alt")} placeholder="What the painting shows" />)}
          <label className="sw-tog full"><input type="checkbox" checked={f.visible} onChange={e => setF(v => ({ ...v, visible: e.target.checked }))} /> Show on the website</label>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
          <button className="btn fill sm" type="submit" disabled={busy}>{busy ? "Saving…" : "Save product"}</button>
          <button className="btn sm" type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </aside>
  );
}

/* ---------- team (owner only) ---------- */
function Team({ toast, me }: { toast: (m: string) => void; me: store.Session }) {
  const [list, setList] = useState<Admin[] | null>(null);
  const [email, setEmail] = useState(""), [uid, setUid] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false), [sure, setSure] = useState("");
  const load = useCallback(async () => { try { setList(await store.listAdmins()); } catch { toast("Couldn’t load the team."); setList(v => v ?? []); } }, [toast]);
  useEffect(() => { load(); }, [load]);
  async function add(e: FormEvent) {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setErr("Enter their email address."); return; }
    setBusy(true); setErr("");
    try { await store.addAdmin(email, uid || undefined); toast(uid ? "Admin added" : "Admin added. They’ll get an email to set their password."); setEmail(""); setUid(""); load(); }
    catch (x) {
      const c = codeOf(x);
      setErr(c === "exists" ? "That email already has an account. Open “They already have an account?” and paste their User UID."
        : /invalid-email/.test(c) ? "That email address doesn’t look right."
        : /operation-not-allowed/.test(c) ? "Turn on Email/Password sign-in in Firebase (Authentication › Sign-in method)."
        : /permission-denied/.test(c) ? "Only the owner can add admins."
        : "Couldn’t add them. Check your connection and try again.");
    }
    setBusy(false);
  }
  return (
    <section>
      <div className="main-head"><div><h2>Team</h2><div className="sub">People who can manage paintings and orders. Only you, the owner, can change this list.</div></div></div>
      <form className="team-add" onSubmit={add} noValidate>
        <div className={"fld" + (err ? " bad" : "")}><label htmlFor="tEmail">Email</label><input id="tEmail" type="email" autoComplete="off" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} />{err && <span className="err" role="alert">{err}</span>}</div>
        <details className="tadv"><summary>They already have an account?</summary><div className="fld"><label htmlFor="tUid">Their User UID (Firebase console › Authentication › Users)</label><input id="tUid" autoComplete="off" value={uid} onChange={e => setUid(e.target.value)} /></div></details>
        <button className="btn fill sm" type="submit" disabled={busy}>{busy ? "Adding…" : "Add admin"} <span aria-hidden="true">+</span></button>
        <p className="note">We create their sign-in and Firebase emails them a link to set their own password.</p>
      </form>
      <table className="tbl"><thead><tr><th>Admin</th><th>Added</th><th /></tr></thead>
        <tbody>
          <tr><td><b>{me.email}</b> <span className="sample">owner · you</span></td><td className="num">—</td><td /></tr>
          {(list ?? []).map(a => (
            <tr key={a.id}><td>{a.email}</td><td className="num">{new Date(a.added).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td>
              <td style={{ textAlign: "right" }}><button className="lnk danger" type="button" onClick={async () => {
                if (sure !== a.id) { setSure(a.id); setTimeout(() => setSure(s => (s === a.id ? "" : s)), 3000); return; }
                try { await store.removeAdmin(a.id); toast("Admin removed"); load(); } catch { toast("Couldn’t remove. Only the owner can change the team."); } }}>{sure === a.id ? "Tap again to remove" : "Remove"}</button></td></tr>))}
        </tbody></table>
    </section>
  );
}
