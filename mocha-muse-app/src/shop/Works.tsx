import { useEffect, useRef } from "react";
import type { Product } from "../lib/schemas";
import { imageSrc } from "../lib/catalog";
import { rs } from "../lib/format";
import { swipeAxis } from "./motion";

/* Paintings hang like prints on a drying line: it drifts on its own, follows drags, swipes and sideways
   trackpad scrolls, and stops while the mouse is on a print or a finger holds it. */
export function Works({ products, onOpen }: { products: Product[]; onOpen: (p: Product) => void }) {
  const zoneRef = useRef<HTMLDivElement>(null), railRef = useRef<HTMLDivElement>(null);
  const prev = useRef<() => void>(() => {}), next = useRef<() => void>(() => {});
  const openRef = useRef(onOpen); openRef.current = onOpen;
  const listRef = useRef(products); listRef.current = products;

  useEffect(() => {
    const zone = zoneRef.current!, rail = railRef.current!;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let setW = 0, hW = 0, off = 0, tgt = 0, idle = 9, hold = false, drag = false, moved = false, onPrint = false, vis = false;
    let x0 = 0, y0 = 0, lastX = 0, mode = 0, mx = -1, my = -1, hitT = 0, raf = 0, last = performance.now();
    const measure = () => { const k = rail.children; if (!k.length) { setW = 0; return; } const n = k.length / 3; hW = (k[0] as HTMLElement).getBoundingClientRect().width; setW = (k[n] as HTMLElement).offsetLeft - (k[0] as HTMLElement).offsetLeft; };
    measure();
    const poke = () => { idle = 0; };
    const io = new IntersectionObserver(e => { vis = !!e[0]?.isIntersecting; }); io.observe(zone);
    const onDown = (e: PointerEvent) => { if (e.pointerType !== "mouse") return; drag = true; moved = false; lastX = e.clientX; poke(); };
    const onMove = (e: PointerEvent) => { if (e.pointerType === "mouse") { mx = e.clientX; my = e.clientY; } if (!drag) return; const dx = e.clientX - lastX; if (!moved && Math.abs(dx) < 5) return; if (!moved) { moved = true; zone.classList.add("drag"); } lastX = e.clientX; tgt += dx; off = tgt; poke(); };
    const onUp = () => { if (!drag) return; drag = false; zone.classList.remove("drag"); setTimeout(() => (moved = false), 40); };
    const onLeave = () => { mx = -1; };
    const onWheel = (e: WheelEvent) => { if (swipeAxis !== "x") return; e.preventDefault(); tgt -= e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX; poke(); };
    const onTStart = (e: TouchEvent) => { const t = e.touches[0]!; x0 = lastX = t.clientX; y0 = t.clientY; mode = 0; hold = true; poke(); };
    const onTMove = (e: TouchEvent) => { const t = e.touches[0]!, dx = t.clientX - x0, dy = t.clientY - y0;
      if (!mode) { if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) mode = 1; else if (Math.abs(dy) > 8) mode = 2; }
      if (mode === 1) { e.preventDefault(); tgt += t.clientX - lastX; off = tgt; lastX = t.clientX; moved = true; poke(); } };
    const onTEnd = () => { hold = false; mode = 0; poke(); setTimeout(() => (moved = false), 40); };
    const onClick = (e: MouseEvent) => { if (moved) { e.preventDefault(); e.stopPropagation(); return; }
      const h = (e.target as Element).closest<HTMLElement>(".hang"); const p = h && listRef.current[Number(h.dataset.i)]; if (p) openRef.current(p); };
    const onDragStart = (e: DragEvent) => e.preventDefault();
    zone.addEventListener("pointerdown", onDown); addEventListener("pointermove", onMove, { passive: true }); addEventListener("pointerup", onUp);
    document.documentElement.addEventListener("pointerleave", onLeave);
    zone.addEventListener("wheel", onWheel, { passive: false });
    zone.addEventListener("touchstart", onTStart, { passive: true }); zone.addEventListener("touchmove", onTMove, { passive: false });
    zone.addEventListener("touchend", onTEnd); zone.addEventListener("touchcancel", onTEnd);
    zone.addEventListener("click", onClick, true); zone.addEventListener("dragstart", onDragStart);
    addEventListener("resize", measure); document.fonts?.ready.then(measure);
    prev.current = () => { tgt += hW; poke(); }; next.current = () => { tgt -= hW; poke(); };
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(64, now - last) / 1000; last = now;
      if (!setW) measure();
      if (!vis || !setW) return;
      if (now - hitT > 80) { hitT = now; const el = mx < 0 ? null : document.elementFromPoint(mx, my); onPrint = !!el?.closest(".line-zone .hang"); }
      idle += dt; if (hold || drag) idle = 0;
      if (!reduce && !hold && !drag && !onPrint && idle > 1.5) tgt -= dt * 30;
      off += (tgt - off) * (1 - Math.exp(-dt * 9));
      while (off < -setW) { off += setW; tgt += setW; } while (off > 0) { off -= setW; tgt -= setW; }
      rail.style.transform = `translate3d(${(off - setW).toFixed(2)}px,0,0)`;
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf); io.disconnect();
      zone.removeEventListener("pointerdown", onDown); removeEventListener("pointermove", onMove); removeEventListener("pointerup", onUp);
      document.documentElement.removeEventListener("pointerleave", onLeave); zone.removeEventListener("wheel", onWheel);
      zone.removeEventListener("touchstart", onTStart); zone.removeEventListener("touchmove", onTMove); zone.removeEventListener("touchend", onTEnd); zone.removeEventListener("touchcancel", onTEnd);
      zone.removeEventListener("click", onClick, true); zone.removeEventListener("dragstart", onDragStart); removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => { requestAnimationFrame(() => window.dispatchEvent(new Event("resize"))); }, [products]);

  const copies = products.length ? [0, 1, 2] : [];
  return (
    <section className="screen pad works" id="works">
      <span className="wash" style={{ left: "-6%", top: "30%", width: "36vw", height: "30vw", opacity: 0.7 }} />
      <svg className="letter" viewBox="0 0 1000 1000" aria-hidden="true"><text x="500" y="640" textAnchor="middle" fontSize="720">ب</text></svg>
      <div className="fit">
        <div className="wrap">
          <div className="works-head">
            <div><span className="cap" style={{ color: "var(--sepia)" }}>The collection · {String(products.length).padStart(2, "0")}</span><h2>Made to be <em>admired.</em></h2></div>
            <p>Fresh from the studio, drying on the line. Swipe or drag to browse, and tap a piece to see it up close.</p>
            <div className="ctrl"><button type="button" aria-label="Previous painting" onClick={() => prev.current()}>←</button><button type="button" aria-label="Next painting" onClick={() => next.current()}>→</button></div>
          </div>
        </div>
        <div className="line-zone" ref={zoneRef} aria-label="Paintings. Swipe or drag sideways to browse">
          <div className="rail" ref={railRef}>
            {copies.flatMap(c => products.map((p, i) => (
              <button type="button" className="hang" key={c + "-" + p.id} data-i={i} aria-hidden={c > 0 || undefined} tabIndex={c > 0 ? -1 : undefined} aria-label={`${p.title}, ${rs(p.price)}. View details`}>
                <span className="clip" />
                <span className="sheet-p">
                  <img src={imageSrc(p.img)} alt={p.alt || p.title} draggable={false} />
                  <b>{p.title}</b>
                  {p.ar && <span className="ar" lang="ar">{p.ar}</span>}
                  <span className="pr">{rs(p.price).toUpperCase()}{p.ref ? " · " + p.ref.toUpperCase() : ""}</span>
                </span>
              </button>
            )))}
          </div>
        </div>
      </div>
    </section>
  );
}
