import {
  collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc, query, orderBy, writeBatch,
} from "firebase/firestore/lite";
import {
  signInWithEmailAndPassword, signOut as fbSignOut, sendPasswordResetEmail, onAuthStateChanged, initializeAuth,
  inMemoryPersistence, createUserWithEmailAndPassword, type User,
} from "firebase/auth";
import { initializeApp, getApps } from "firebase/app";
import { db, OWNER_UID, firebaseConfig, usingEmulators } from "./firebase";
import { auth } from "./auth";
import { ProductSchema, ProductFields, OrderSchema, AdminSchema, type Product, type Order, type Admin, type Status } from "./schemas";
import { STARTER_PRODUCTS } from "./catalog";

/* Admin-side data (signed-in only). Every read is checked against its schema; anything malformed is skipped instead of reaching the page. */
function parseAll<T>(schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false } }, snap: { docs: { id: string; data: () => object }[] }): T[] {
  const out: T[] = [];
  for (const d of snap.docs) { const r = schema.safeParse({ id: d.id, ...d.data() }); if (r.success) out.push(r.data); }
  return out;
}

/* ---------- products ---------- */
export async function allProducts(): Promise<Product[]> {
  return parseAll(ProductSchema, await getDocs(collection(db, "products"))).sort((a, b) => b.created - a.created);
}
export async function saveProduct(id: string | null, fields: unknown): Promise<void> {
  const data = ProductFields.parse(fields);
  if (id) await setDoc(doc(db, "products", id), data);
  else await addDoc(collection(db, "products"), data);
}
export async function setProductVisible(p: Product, visible: boolean) {
  const { id, ...rest } = p; await setDoc(doc(db, "products", id), ProductFields.parse({ ...rest, visible }));
}
export async function deleteProduct(id: string) { await deleteDoc(doc(db, "products", id)); }
export async function seedStarterProducts() {
  const b = writeBatch(db); const now = Date.now();
  STARTER_PRODUCTS.forEach((p, i) => b.set(doc(db, "products", "p" + (i + 1)), ProductFields.parse({ ...p, created: now - i })));
  await b.commit();
}

/* ---------- orders ---------- */
export async function listOrders(): Promise<Order[]> {
  return parseAll(OrderSchema, await getDocs(query(collection(db, "orders"), orderBy("created", "desc"))));
}
export async function setOrderStatus(id: string, status: Status) { await updateDoc(doc(db, "orders", id), { status }); }
export async function setStudioNote(id: string, studioNote: string) { await updateDoc(doc(db, "orders", id), { studioNote: studioNote.slice(0, 2000) }); }

/* ---------- admins ---------- */
export type Session = { uid: string; email: string; owner: boolean };
const adminCache = new Map<string, boolean>();
async function isAdmin(u: User): Promise<boolean> {
  if (u.uid === OWNER_UID) return true;
  if (adminCache.has(u.uid)) return adminCache.get(u.uid)!;
  let ok = false;
  try { ok = (await getDoc(doc(db, "admins", u.uid))).exists(); } catch { ok = false; }
  adminCache.set(u.uid, ok); return ok;
}
export function watchSession(cb: (s: Session | null) => void): () => void {
  return onAuthStateChanged(auth, async u => {
    if (!u) return cb(null);
    cb((await isAdmin(u)) ? { uid: u.uid, email: u.email ?? "", owner: u.uid === OWNER_UID } : null);
  });
}
export class NotAdminError extends Error { code = "not_admin"; }
export async function signIn(email: string, password: string): Promise<void> {
  const c = await signInWithEmailAndPassword(auth, email.trim(), password);
  if (!(await isAdmin(c.user))) { await fbSignOut(auth); throw new NotAdminError("not_admin"); }
}
export const signOut = () => fbSignOut(auth);

export async function listAdmins(): Promise<Admin[]> {
  return parseAll(AdminSchema, await getDocs(collection(db, "admins"))).sort((a, b) => a.added - b.added);
}
/* Creates the new admin's sign-in on a separate in-memory auth instance (so the owner stays signed in),
   then Firebase emails them a link to set their own password. */
export class AccountExistsError extends Error { code = "exists"; }
export async function addAdmin(email: string, existingUid?: string): Promise<void> {
  email = email.trim().toLowerCase();
  let uid = (existingUid ?? "").trim();
  if (!uid) {
    const second = getApps().find(a => a.name === "team") ?? initializeApp(usingEmulators ? { ...firebaseConfig, projectId: "demo-mocha-muse" } : firebaseConfig, "team");
    const tAuth = initializeAuth(second, { persistence: inMemoryPersistence });
    if (usingEmulators) { const { connectAuthEmulator } = await import("firebase/auth"); try { connectAuthEmulator(tAuth, "http://127.0.0.1:9099", { disableWarnings: true }); } catch { /* already connected */ } }
    const pw = Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(36).padStart(2, "0")).join("") + "Aa1!";
    try { uid = (await createUserWithEmailAndPassword(tAuth, email, pw)).user.uid; await fbSignOut(tAuth); }
    catch (e) { if ((e as { code?: string }).code === "auth/email-already-in-use") throw new AccountExistsError("exists"); throw e; }
    try { await sendPasswordResetEmail(auth, email); } catch { /* the account still works; they can use "forgot password" */ }
  }
  await setDoc(doc(db, "admins", uid), { email, added: Date.now(), addedBy: auth.currentUser!.uid });
  adminCache.delete(uid);
}
export async function removeAdmin(uid: string) { await deleteDoc(doc(db, "admins", uid)); adminCache.delete(uid); }
