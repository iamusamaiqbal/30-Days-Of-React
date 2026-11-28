import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, collection, getDocs, query, where, setLogLevel } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

const OWNER = "nSHXZzEjzrRZHyMMKeZJLOzuwLv1";
let env: RulesTestEnvironment;

const product = (over: object = {}) => ({ img: "builtin:0", title: "With Hardship, Ease", price: 3000, ar: "", tr: "", ref: "", alt: "", visible: true, created: 1, ...over });
const order = (over: object = {}) => ({
  no: "MM-ABC123", name: "Test Buyer", phone: "+92 300 1234567", city: "Lahore", address: "House 1, Street 2", notes: "",
  kind: "ready", productId: "p1", title: "With Hardship, Ease", price: 3000, status: "new", created: Date.now(), email: "off", ...over,
});

beforeAll(async () => {
  setLogLevel("error");
  env = await initializeTestEnvironment({ projectId: "demo-mocha-muse", firestore: { rules: readFileSync("firestore.rules", "utf8") } });
});
afterAll(async () => { await env.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, "products/p1"), product());
    await setDoc(doc(db, "products/hidden"), product({ title: "Hidden one", visible: false }));
    await setDoc(doc(db, "admins/helper"), { email: "helper@example.com", added: 1, addedBy: OWNER });
    await setDoc(doc(db, "orders/o1"), { ...order(), created: 1 });
  });
});

const anon = () => env.unauthenticatedContext().firestore();
const owner = () => env.authenticatedContext(OWNER).firestore();
const helper = () => env.authenticatedContext("helper").firestore();
const stranger = () => env.authenticatedContext("stranger").firestore();

describe("products", () => {
  it("visitors see visible paintings only", async () => {
    await assertSucceeds(getDoc(doc(anon(), "products/p1")));
    await assertFails(getDoc(doc(anon(), "products/hidden")));
    await assertSucceeds(getDocs(query(collection(anon(), "products"), where("visible", "==", true))));
    await assertFails(getDocs(collection(anon(), "products")));
  });
  it("admins see hidden paintings", async () => {
    await assertSucceeds(getDoc(doc(owner(), "products/hidden")));
    await assertSucceeds(getDoc(doc(helper(), "products/hidden")));
    await assertFails(getDoc(doc(stranger(), "products/hidden")));
  });
  it("only admins can add, change or delete paintings", async () => {
    await assertFails(setDoc(doc(anon(), "products/x"), product()));
    await assertFails(setDoc(doc(stranger(), "products/x"), product()));
    await assertSucceeds(setDoc(doc(owner(), "products/x"), product()));
    await assertSucceeds(setDoc(doc(helper(), "products/y"), product({ img: "data:image/jpeg;base64,/9j/4AAQ" })));
    await assertFails(deleteDoc(doc(stranger(), "products/p1")));
    await assertSucceeds(deleteDoc(doc(helper(), "products/p1")));
  });
  it("rejects bad product data even from admins", async () => {
    await assertFails(setDoc(doc(owner(), "products/x"), product({ img: "javascript:alert(1)" })));
    await assertFails(setDoc(doc(owner(), "products/x"), product({ img: "data:image/svg+xml;base64,AAAA" })));
    await assertFails(setDoc(doc(owner(), "products/x"), product({ price: -5 })));
    await assertFails(setDoc(doc(owner(), "products/x"), product({ price: 99.5 })));
    await assertFails(setDoc(doc(owner(), "products/x"), product({ title: "" })));
    await assertFails(setDoc(doc(owner(), "products/x"), { ...product(), extra: true }));
  });
});

describe("orders", () => {
  it("anyone can place a valid order", async () => {
    await assertSucceeds(addDoc(collection(anon(), "orders"), order()));
    await assertSucceeds(addDoc(collection(anon(), "orders"), order({ kind: "custom", productId: "", title: "Custom: Bismillah in gold", price: 0 })));
    await assertSucceeds(addDoc(collection(anon(), "orders"), order({ productId: "", price: 0 })));
  });
  it("blocks price tampering", async () => {
    await assertFails(addDoc(collection(anon(), "orders"), order({ price: 1 })));
    await assertFails(addDoc(collection(anon(), "orders"), order({ productId: "hidden", price: 3000 })));
    await assertFails(addDoc(collection(anon(), "orders"), order({ productId: "missing", price: 3000 })));
    await assertFails(addDoc(collection(anon(), "orders"), order({ kind: "custom", productId: "", price: 500 })));
  });
  it("blocks malformed orders", async () => {
    await assertFails(addDoc(collection(anon(), "orders"), order({ status: "delivered" })));
    await assertFails(addDoc(collection(anon(), "orders"), { ...order(), admin: true }));
    await assertFails(addDoc(collection(anon(), "orders"), order({ name: "x".repeat(500) })));
    await assertFails(addDoc(collection(anon(), "orders"), order({ phone: "<script>" })));
    await assertFails(addDoc(collection(anon(), "orders"), order({ created: Date.now() - 86400000 })));
    const { email: _e, ...noEmail } = order();
    await assertFails(addDoc(collection(anon(), "orders"), noEmail));
  });
  it("only admins can read orders", async () => {
    await assertFails(getDoc(doc(anon(), "orders/o1")));
    await assertFails(getDoc(doc(stranger(), "orders/o1")));
    await assertFails(getDocs(collection(anon(), "orders")));
    await assertSucceeds(getDoc(doc(owner(), "orders/o1")));
    await assertSucceeds(getDocs(collection(helper(), "orders")));
  });
  it("admins change only status and studio note", async () => {
    await assertSucceeds(updateDoc(doc(helper(), "orders/o1"), { status: "confirmed" }));
    await assertSucceeds(updateDoc(doc(owner(), "orders/o1"), { studioNote: "Agreed Rs 3,000, ships Friday" }));
    await assertFails(updateDoc(doc(owner(), "orders/o1"), { price: 1 }));
    await assertFails(updateDoc(doc(owner(), "orders/o1"), { status: "lost" }));
    await assertFails(updateDoc(doc(anon(), "orders/o1"), { status: "cancelled" }));
    await assertFails(updateDoc(doc(stranger(), "orders/o1"), { status: "cancelled" }));
  });
});

describe("team", () => {
  it("only the owner can add or remove admins", async () => {
    const entry = { email: "new@example.com", added: Date.now(), addedBy: OWNER };
    await assertSucceeds(setDoc(doc(owner(), "admins/newbie"), entry));
    await assertFails(setDoc(doc(helper(), "admins/evil"), { ...entry, addedBy: "helper" }));
    await assertFails(setDoc(doc(stranger(), "admins/stranger"), { ...entry, addedBy: "stranger" }));
    await assertFails(setDoc(doc(owner(), "admins/x"), { ...entry, addedBy: "someone-else" }));
    await assertFails(deleteDoc(doc(helper(), "admins/newbie")));
    await assertSucceeds(deleteDoc(doc(owner(), "admins/newbie")));
  });
  it("admins can see the team, others cannot", async () => {
    await assertSucceeds(getDocs(collection(helper(), "admins")));
    await assertFails(getDocs(collection(stranger(), "admins")));
    await assertFails(getDoc(doc(anon(), "admins/helper")));
  });
  it("nothing else in the database is reachable", async () => {
    await assertFails(setDoc(doc(owner(), "settings/site"), { a: 1 }));
    await assertFails(getDoc(doc(owner(), "users/x")));
  });
});
