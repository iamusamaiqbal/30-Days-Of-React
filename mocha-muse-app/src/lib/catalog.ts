import yusra from "../assets/paintings/with-hardship-ease.jpg";
import kursi from "../assets/paintings/ayat-al-kursi.jpg";
import sirat from "../assets/paintings/the-straight-path.jpg";
import bismillah from "../assets/paintings/bismillah.jpg";
import favours from "../assets/paintings/which-of-the-favours.jpg";
import type { Product } from "./schemas";

/* The five paintings that ship with the site. Firestore products point at these as "builtin:0".."builtin:4". */
export const BUILTIN_IMAGES = [yusra, kursi, sirat, bismillah, favours];

export const STARTER_PRODUCTS: Omit<Product, "id" | "created">[] = [
  { img: "builtin:0", title: "With Hardship, Ease", ar: "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا", tr: "“For indeed, with hardship comes ease.”", ref: "Ash-Sharh 94:5–6", price: 3000, alt: "Fa inna ma'al usri yusra in gold on a black canvas", visible: true },
  { img: "builtin:1", title: "Ayat al-Kursi", ar: "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ", tr: "“Allah, there is no god but He, the Ever-Living, the Sustainer.”", ref: "Al-Baqarah 2:255", price: 4000, alt: "Ayat al-Kursi painted in a circle on a violet canvas", visible: true },
  { img: "builtin:2", title: "The Straight Path", ar: "اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ", tr: "“Guide us to the straight path.”", ref: "Al-Fatiha 1:6", price: 2500, alt: "Ihdina as-sirat al-mustaqim in white on a charcoal canvas", visible: true },
  { img: "builtin:3", title: "Bismillah", ar: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", tr: "“In the name of Allah, the Most Gracious, the Most Merciful.”", ref: "The Basmala", price: 2000, alt: "Bismillah in mocha lettering on a stone grey canvas", visible: true },
  { img: "builtin:4", title: "Which of the Favours", ar: "فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ", tr: "“Which of the favours of your Lord will you deny?”", ref: "Ar-Rahman 55:13", price: 2000, alt: "Fabi ayyi ala'i rabbikuma in white on a mocha canvas", visible: true },
];

/* Only built-in images or uploaded JPEG data URLs are ever used as an image source. */
export function imageSrc(img: string): string {
  const m = /^builtin:([0-9])$/.exec(img);
  if (m) return BUILTIN_IMAGES[Number(m[1])] ?? BUILTIN_IMAGES[0]!;
  return img.startsWith("data:image/jpeg;base64,") ? img : BUILTIN_IMAGES[0]!;
}

export const fallbackProducts = (): Product[] =>
  STARTER_PRODUCTS.map((p, i) => ({ ...p, id: "builtin" + i, created: 0 }));
