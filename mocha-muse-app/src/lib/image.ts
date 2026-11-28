import { MAX_IMG_CHARS } from "./schemas";

/* Shrinks a photo in the browser to a JPEG data URL small enough for a Firestore document (free plan, no Storage). */
export async function shrinkPhoto(file: File): Promise<string> {
  if (!/^image\/(jpeg|png|webp|gif|heic|heif)$/i.test(file.type)) throw new Error("type");
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error("type"); });
  for (const [max, q] of [[1000, 0.82], [800, 0.75], [640, 0.7]] as const) {
    const s = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bitmap.width * s); c.height = Math.round(bitmap.height * s);
    c.getContext("2d")!.drawImage(bitmap, 0, 0, c.width, c.height);
    const url = c.toDataURL("image/jpeg", q);
    if (url.length <= MAX_IMG_CHARS) return url;
  }
  throw new Error("size");
}
