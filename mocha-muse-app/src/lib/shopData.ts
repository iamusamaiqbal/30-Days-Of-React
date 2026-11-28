import { collection, getDocs, addDoc, query, where } from "firebase/firestore/lite";
import { db } from "./firebase";
import { ProductSchema, OrderInput, type Product } from "./schemas";

/* What the public shop needs: visible paintings, and placing an order. Every read is schema-checked. */
export async function publicProducts(): Promise<Product[]> {
  const snap = await getDocs(query(collection(db, "products"), where("visible", "==", true)));
  const out: Product[] = [];
  for (const d of snap.docs) { const r = ProductSchema.safeParse({ id: d.id, ...d.data() }); if (r.success) out.push(r.data); }
  return out.sort((a, b) => b.created - a.created);
}
export async function placeOrder(input: unknown): Promise<string> {
  const data = OrderInput.parse(input);
  return (await addDoc(collection(db, "orders"), data)).id;
}
