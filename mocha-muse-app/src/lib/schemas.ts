import { z } from "zod";

export const STATUSES = ["new", "confirmed", "painting", "shipped", "delivered", "cancelled"] as const;
export type Status = (typeof STATUSES)[number];
export const STATUS_LABEL: Record<Status, string> = {
  new: "New", confirmed: "Confirmed", painting: "Painting", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled",
};

const text = (max: number) => z.string().trim().max(max);

/* Product images are either one of the built-in paintings or a JPEG the admin uploaded (shrunk in the browser). */
export const IMG_PATTERN = /^(builtin:[0-9]|data:image\/jpeg;base64,[A-Za-z0-9+/=]+)$/;
export const MAX_IMG_CHARS = 900_000;

export const ProductFields = z.object({
  img: z.string().max(MAX_IMG_CHARS).regex(IMG_PATTERN, "Add a photo of the painting."),
  title: text(120).min(2, "Give the painting a title."),
  price: z.number({ error: "Add a price in rupees." }).int().min(0).max(10_000_000),
  ar: text(300).default(""),
  tr: text(400).default(""),
  ref: text(120).default(""),
  alt: text(200).default(""),
  visible: z.boolean(),
  created: z.number().int(),
});
export const ProductSchema = ProductFields.extend({ id: z.string() });
export type Product = z.infer<typeof ProductSchema>;

export const PHONE = /^[+0-9 ()-]{7,40}$/;
export const OrderInput = z.object({
  no: z.string().regex(/^MM-[A-Z0-9]{4,12}$/),
  name: text(120).min(2, "Please add your name."),
  phone: z.string().trim().regex(PHONE, "Please add a phone number we can reach."),
  city: text(120).min(2, "Please add your city."),
  address: text(600).min(6, "Please add the delivery address."),
  notes: text(1500).default(""),
  kind: z.enum(["ready", "custom"]),
  productId: text(64).default(""),
  title: text(200).min(1),
  price: z.number().int().min(0).max(10_000_000),
  status: z.literal("new"),
  created: z.number().int(),
  email: z.enum(["sent", "failed", "off"]),
});
export type OrderInput = z.infer<typeof OrderInput>;

export const OrderSchema = OrderInput.extend({
  id: z.string(),
  status: z.enum(STATUSES),
  studioNote: z.string().max(2000).optional(),
});
export type Order = z.infer<typeof OrderSchema>;

export const AdminSchema = z.object({
  id: z.string(),
  email: z.string().max(200),
  added: z.number().int(),
  addedBy: z.string().max(128),
});
export type Admin = z.infer<typeof AdminSchema>;
