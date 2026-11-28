import { describe, it, expect } from "vitest";
import { OrderInput, ProductFields, MAX_IMG_CHARS } from "../../src/lib/schemas";
import { imageSrc } from "../../src/lib/catalog";
import { newOrderNo, priceText } from "../../src/lib/format";

const order = {
  no: newOrderNo(), name: "Test Buyer", phone: "+92 300 1234567", city: "Lahore", address: "House 1, Street 2",
  notes: "", kind: "ready", productId: "p1", title: "Ayat al-Kursi", price: 4500, status: "new", created: Date.now(), email: "off",
} as const;

describe("order validation", () => {
  it("accepts a normal order", () => expect(OrderInput.safeParse(order).success).toBe(true));
  it("generates order numbers the rules accept", () => {
    for (let i = 0; i < 50; i++) expect(newOrderNo()).toMatch(/^MM-[A-Z0-9]{4,12}$/);
  });
  it("rejects a bad phone number", () => expect(OrderInput.safeParse({ ...order, phone: "<script>" }).success).toBe(false));
  it("rejects a status other than new", () => expect(OrderInput.safeParse({ ...order, status: "delivered" }).success).toBe(false));
  it("rejects extra-long text", () => expect(OrderInput.safeParse({ ...order, address: "x".repeat(601) }).success).toBe(false));
  it("rejects negative and fractional prices", () => {
    expect(OrderInput.safeParse({ ...order, price: -1 }).success).toBe(false);
    expect(OrderInput.safeParse({ ...order, price: 1.5 }).success).toBe(false);
  });
  it("trims whitespace-only names", () => expect(OrderInput.safeParse({ ...order, name: "   " }).success).toBe(false));
});

describe("product images", () => {
  const p = { img: "builtin:0", title: "Test", price: 100, visible: true, created: 1 };
  it("accepts built-in and JPEG photos", () => {
    expect(ProductFields.safeParse(p).success).toBe(true);
    expect(ProductFields.safeParse({ ...p, img: "data:image/jpeg;base64,QUJD" }).success).toBe(true);
  });
  it("rejects remote URLs, SVG and javascript: images", () => {
    for (const img of ["https://evil.example/x.jpg", "data:image/svg+xml;base64,PHN2Zz4=", "javascript:alert(1)", "data:image/jpeg;base64,QUJD\"onerror=x"])
      expect(ProductFields.safeParse({ ...p, img }).success).toBe(false);
  });
  it("rejects oversized photos", () =>
    expect(ProductFields.safeParse({ ...p, img: "data:image/jpeg;base64," + "A".repeat(MAX_IMG_CHARS) }).success).toBe(false));
  it("never renders an unknown image source", () => {
    expect(imageSrc("https://evil.example/x.jpg")).not.toContain("evil");
    expect(imageSrc("javascript:alert(1)")).not.toContain("javascript");
  });
});

describe("formatting", () => {
  it("shows unpriced items as to confirm", () => {
    expect(priceText(0)).toBe("To confirm");
    expect(priceText(4500)).toBe("Rs 4,500");
  });
});
