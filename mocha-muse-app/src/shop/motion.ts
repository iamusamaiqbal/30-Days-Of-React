/* Page motion for the shop: one screen per scroll, sideways-vs-vertical gesture detection,
   letters that redraw on each visit, sections that shrink to fit short screens, and the nav colour. */

type Cleanup = () => void;
const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Each wheel/trackpad swipe is decided once, as it starts: sideways (the line of prints) or vertical (the page). */
export let swipeAxis: "x" | "y" | null = null;
export function watchSwipeAxis(): Cleanup {
  let last = 0;
  const h = (e: WheelEvent) => {
    const now = performance.now(), gap = now - last; last = now;
    const ax = Math.abs(e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX), ay = Math.abs(e.shiftKey ? 0 : e.deltaY);
    if (gap > 140) swipeAxis = null;
    if (!swipeAxis) { if (ax > ay * 1.3 + 1) swipeAxis = "x"; else if (ay > ax * 1.3 + 1) swipeAxis = "y"; else if (Math.max(ax, ay) > 3) swipeAxis = ax > ay ? "x" : "y"; }
    else if (swipeAxis === "x" && ay > ax * 3 + 10) swipeAxis = "y";
    else if (swipeAxis === "y" && ax > ay * 3 + 10) swipeAxis = "x";
  };
  addEventListener("wheel", h, { capture: true, passive: true });
  return () => removeEventListener("wheel", h, { capture: true });
}

const blocked = () => document.body.style.overflow === "hidden";

/* Mouse wheel, trackpad and keyboard move exactly one screen; phones and tablets use native scroll snapping. */
export function sectionPaging(selector: string, sidewaysZone: string): Cleanup {
  const root = document.documentElement;
  root.classList.add("shop");
  if (!matchMedia("(hover:hover) and (pointer:fine)").matches) return () => root.classList.remove("shop");
  root.classList.add("paged");
  const stops = () => [...new Set([...document.querySelectorAll<HTMLElement>(selector)].map(e => Math.round(e.getBoundingClientRect().top + scrollY)))].sort((a, b) => a - b);
  let busy = false, moving = false, started = 0, acc = 0, lastT = 0, lastAbs = 0;
  const behavior: ScrollBehavior = reduce() ? "auto" : "smooth";
  function go(dir: number) {
    const y = scrollY, list = stops();
    const next = dir > 0 ? list.find(t => t > y + 4) : [...list].reverse().find(t => t < y - 4);
    if (next === undefined) return;
    busy = true; moving = true; started = performance.now();
    scrollTo({ top: next, behavior });
  }
  const onWheel = (e: WheelEvent) => {
    if (e.ctrlKey || blocked()) return;
    if (swipeAxis === "x") { if ((e.target as Element).closest?.(sidewaysZone)) return; e.preventDefault(); return; }
    e.preventDefault();
    const now = performance.now(), gap = now - lastT, dy = e.deltaMode === 1 ? e.deltaY * 30 : e.deltaY, abs = Math.abs(dy);
    const fresh = gap > 120 || abs > lastAbs * 1.5 + 4;   // a new swipe, not trackpad momentum
    lastT = now; lastAbs = abs;
    if (busy) { if (now - started > 450 && fresh) busy = false; else return; }
    if (fresh && Math.sign(dy) !== Math.sign(acc)) acc = 0;
    acc += dy;
    if (Math.abs(acc) < 18) return;
    const dir = Math.sign(acc); acc = 0; go(dir);
  };
  const onKey = (e: KeyboardEvent) => {
    if (blocked() || (e.target as Element).closest?.("input,textarea,select,[contenteditable]")) return;
    const k = e.key;
    if (k === "ArrowDown" || k === "PageDown" || (k === " " && !e.shiftKey)) { e.preventDefault(); go(1); }
    else if (k === "ArrowUp" || k === "PageUp" || (k === " " && e.shiftKey)) { e.preventDefault(); go(-1); }
  };
  let settleT = 0;
  const onScroll = () => {
    clearTimeout(settleT);
    settleT = window.setTimeout(() => {
      if (blocked()) return;
      if (moving) { moving = false; return; }
      const y = scrollY, list = stops(); if (!list.length) return;
      const near = list.reduce((a, b) => (Math.abs(b - y) < Math.abs(a - y) ? b : a));
      if (Math.abs(near - y) > 2 && scrollY + innerHeight < root.scrollHeight - 2) scrollTo({ top: near, behavior });
    }, 160);
  };
  addEventListener("wheel", onWheel, { passive: false });
  addEventListener("keydown", onKey);
  addEventListener("scroll", onScroll, { passive: true });
  return () => {
    removeEventListener("wheel", onWheel); removeEventListener("keydown", onKey); removeEventListener("scroll", onScroll);
    clearTimeout(settleT); root.classList.remove("shop", "paged");
  };
}

/* Each room's giant letter writes itself when you arrive, and again on the next visit. */
export function roomsWriteOnArrival(selector: string): Cleanup {
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.intersectionRatio > 0.55) e.target.classList.add("on");
    else if (e.intersectionRatio < 0.05) e.target.classList.remove("on");
  }), { threshold: [0, 0.05, 0.55] });
  document.querySelectorAll(selector).forEach(r => io.observe(r));
  document.getElementById("hero")?.classList.add("on");
  return () => io.disconnect();
}

/* If a section is taller than the screen, its .fit wrapper shrinks to fit (decorations outside it stay put). */
export function fitScreens(pairs: [HTMLElement | null, HTMLElement | null][]) {
  for (const [cont, inner] of pairs) {
    if (!cont || !inner) continue;
    const f = inner.querySelector<HTMLElement>(":scope > .fit");   // each section renders its own .fit wrapper
    if (!f) continue;
    f.style.removeProperty("zoom");
    let z = 1;
    for (let i = 0; i < 4; i++) {
      const over = cont.getBoundingClientRect().height - innerHeight;
      if (over <= 1) break;
      const h = f.getBoundingClientRect().height; if (h <= over) break;
      z = Math.max(0.4, (z * (h - over - 3)) / h); f.style.setProperty("zoom", z.toFixed(3));
    }
  }
}

export function navTone(nav: HTMLElement): Cleanup {
  const h = () => nav.classList.toggle("light", [...document.querySelectorAll(".night")].some(s => { const r = s.getBoundingClientRect(); return r.top <= 40 && r.bottom > 40; }));
  addEventListener("scroll", h, { passive: true }); h();
  return () => removeEventListener("scroll", h);
}
