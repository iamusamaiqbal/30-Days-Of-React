import { useEffect, useRef, useState } from "react";
import { isArabic } from "../lib/format";

export const INKS = [["Black ink", "#151210"], ["Sepia", "#6e4129"], ["Gold", "#b88a2e"], ["Vermilion", "#a8402a"], ["Lapis", "#2c4f86"]] as const;
const PHRASES = [["Bismillah", "بِسْمِ اللَّهِ"], ["Alhamdulillah", "الْحَمْدُ لِلَّهِ"], ["Mashallah", "مَا شَاءَ اللَّهُ"]] as const;

export type CustomDesign = { words: string; ink: string };

/* Visitors pick or type words and an ink colour; the words write themselves on paper. */
export function Custom({ onOrder }: { onOrder: (d: CustomDesign) => void }) {
  const [ink, setInk] = useState(0);
  const [phrase, setPhrase] = useState(0);
  const [typed, setTyped] = useState("");
  const [words, setWords] = useState<string>(PHRASES[0][1]);
  const textRef = useRef<SVGTextElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setWords(typed.trim() || PHRASES[phrase]![1]), typed ? 450 : 0);
    return () => clearTimeout(t);
  }, [typed, phrase]);

  useEffect(() => {
    const el = textRef.current; if (!el) return;
    const ar = isArabic(words);
    let fs = ar ? 170 : 150; el.setAttribute("font-size", String(fs));
    try { for (let i = 0; i < 12 && el.getComputedTextLength() > 640; i++) { fs *= 0.9; el.setAttribute("font-size", String(fs)); } } catch { /* not laid out yet */ }
    el.setAttribute("y", String(225 + fs * 0.3));
    el.classList.remove("go"); void el.getBoundingClientRect();
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) el.classList.add("go");
    else { el.style.fillOpacity = "1"; el.style.strokeWidth = "0"; }
  }, [words, ink]);

  const ar = isArabic(words);
  return (
    <section className="screen night pad custom" id="custom">
      <svg className="letter" viewBox="0 0 1000 1000" aria-hidden="true"><text x="500" y="640" textAnchor="middle" fontSize="720">ك</text></svg>
      <div className="fit">
        <div className="wrap cust-grid">
          <div>
            <span className="cap" style={{ color: "#c99b74" }}>Make it yours</span>
            <h2>Your words, <em>in ink.</em></h2>
            <ol className="steps">
              <li><span className="n">١</span><div><b>Share your words</b><span>A verse, a name, or a phrase you love.</span></div></li>
              <li><span className="n">٢</span><div><b>Choose the ink</b><span>Black, sepia, gold, vermilion or lapis.</span></div></li>
              <li><span className="n">٣</span><div><b>We paint it by hand</b><span>Progress shared along the way.</span></div></li>
              <li><span className="n">٤</span><div><b>It comes home</b><span>Ready to hang on your wall.</span></div></li>
            </ol>
          </div>
          <div className="desk" style={{ ["--wink" as string]: INKS[ink]![1] }}>
            <div className="sheet-w">
              <svg viewBox="0 0 800 450" role="img" aria-label={`“${words}” written in ${INKS[ink]![0].toLowerCase()}`}>
                <text ref={textRef} className="w" x="400" y="270" textAnchor="middle"
                  style={{ fontFamily: ar ? "'Aref Ruqaa','Amiri',serif" : "'Cormorant Garamond',serif", fontStyle: ar ? "normal" : "italic", fontWeight: ar ? 700 : 500 }}>{words}</text>
              </svg>
            </div>
            <div className="row inks" role="group" aria-label="Ink colour"><span className="lab">Ink</span>
              {INKS.map(([name, c], i) => <button key={name} type="button" aria-label={name} aria-pressed={ink === i} style={{ ["--c" as string]: c }} onClick={() => setInk(i)} />)}
            </div>
            <div className="row phr" role="group" aria-label="Words"><span className="lab">Words</span>
              {PHRASES.map(([label], i) => <button key={label} type="button" aria-pressed={!typed && phrase === i} onClick={() => { setPhrase(i); setTyped(""); }}>{label}</button>)}
            </div>
            <div className="row"><label className="lab" htmlFor="wInput">Or write</label>
              <input id="wInput" type="text" maxLength={24} placeholder="Your name or verse" autoComplete="off" value={typed} onChange={e => setTyped(e.target.value)} />
            </div>
            <button className="btn fill" type="button" onClick={() => onOrder({ words, ink: INKS[ink]![0] })}>Place an order <span aria-hidden="true">→</span></button>
          </div>
        </div>
      </div>
    </section>
  );
}
