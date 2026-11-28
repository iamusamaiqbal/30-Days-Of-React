import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import yusra from "../assets/paintings/with-hardship-ease.jpg";
import type { Product } from "../lib/schemas";
import { publicProducts } from "../lib/shopData";
import { fallbackProducts } from "../lib/catalog";
import { watchSwipeAxis, sectionPaging, roomsWriteOnArrival, fitScreens, navTone } from "./motion";
import { Letter } from "./Letter";
import { Works } from "./Works";
import { Custom, type CustomDesign } from "./Custom";
import { DetailDialog, OrderDialog, type OrderTarget } from "./Dialogs";

export function ShopPage() {
  const [products, setProducts] = useState<Product[]>(fallbackProducts());
  const [detail, setDetail] = useState<Product | null>(null);
  const [order, setOrder] = useState<OrderTarget | null>(null);
  const navRef = useRef<HTMLElement>(null);

  /* Paintings come from Firestore; until the admin adds them, the five built-in pieces show. */
  useEffect(() => {
    let live = true;
    publicProducts().then(ps => { if (live && ps.length) setProducts(ps); }).catch(() => { /* offline: keep the built-in five */ });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    const offs = [watchSwipeAxis(), sectionPaging(".screen,.end", ".line-zone"), roomsWriteOnArrival(".screen,.end"), navTone(navRef.current!)];
    const fit = () => fitScreens([
      ...[...document.querySelectorAll<HTMLElement>(".screen")].map(s => [s, s] as [HTMLElement | null, HTMLElement | null]),
      [document.querySelector<HTMLElement>(".end"), document.getElementById("order")],
    ]);
    fit(); addEventListener("resize", fit); document.fonts?.ready.then(fit);
    return () => { offs.forEach(o => o()); removeEventListener("resize", fit); };
  }, []);

  const orderCustom = (d: CustomDesign) => setOrder({ kind: "custom", design: d });

  return (
    <>
      <a className="skip" href="#works">Skip to the paintings</a>
      <header className="nav pad" ref={navRef}>
        <a className="home" href="#hero" aria-label="Mocha Muse home"><span className="mark" aria-hidden="true" /><b>MOCHA MUSE</b></a>
        <nav aria-label="Main"><a href="#story">Studio</a><a href="#works">Works</a><a href="#custom">Custom</a><a className="o" href="#order">Order</a></nav>
      </header>

      <main>
        <section className="screen hero pad" id="hero">
          <span className="wash" style={{ right: "4%", top: "10%", width: "46vw", height: "46vw" }} />
          <span className="wash" style={{ left: "-10%", bottom: "-20%", width: "40vw", height: "34vw", opacity: 0.6 }} />
          <Letter ch="ن" />
          <span className="drop" style={{ left: "47%", top: "74%", width: 20, height: 20 }} /><span className="drop" style={{ left: "50%", top: "79%", width: 9, height: 9 }} /><span className="drop" style={{ right: "22%", top: "16%", width: 13, height: 13 }} />
          <div className="fit">
            <div className="wrap hero-grid">
              <div>
                <span className="cap" style={{ color: "var(--sepia)" }}>Hand-painted Arabic calligraphy</span>
                <h1>Mocha <em>Muse</em></h1>
                <svg className="stroke" viewBox="0 0 340 28" preserveAspectRatio="none" aria-hidden="true"><path pathLength={1} d="M4 18 C60 2, 120 26, 180 12 S 290 4, 336 16" /></svg>
                <p className="lede">Every stroke made by hand, with ink, gold and patience. Verses on canvas, ready to hang or painted to your words.</p>
                <div className="btns"><a className="btn fill" href="#works">See the works <span aria-hidden="true">→</span></a><a className="btn" href="#custom">Write your own</a></div>
              </div>
              <figure className="print" style={{ margin: 0 }}><img src={yusra} alt="Fa inna ma'al usri yusra in gold on a black canvas" /><span>With Hardship, Ease</span></figure>
            </div>
            <div className="ayah pad"><b lang="ar">ن ۚ وَالْقَلَمِ وَمَا يَسْطُرُونَ</b><span>Nūn. By the pen and what they inscribe. · Al-Qalam 68:1</span></div>
          </div>
        </section>

        <section className="screen night pad story" id="story">
          <span className="wash" style={{ left: "30%", top: "-10%", width: "50vw", height: "40vw" }} />
          <Letter ch="و" />
          <div className="fit">
            <div className="wrap story-grid">
              <div className="side"><b lang="ar">كُلُّ لَوْحَةٍ حِكَايَة</b><span>Every canvas, a story.</span></div>
              <div>
                <span className="cap" style={{ color: "#c99b74" }}>The studio</span>
                <h2>Every canvas deserves <em>a story.</em></h2>
                <p className="lede">Mocha Muse paints Qur’anic verses and meaningful words by hand, one stroke at a time. Each piece is made once, for one home, to bring warmth and calm to your walls.</p>
                <ul className="facts">
                  <li><i className="nuqta" /><span><b>Hand-painted.</b>Never printed, never copied.</span></li>
                  <li><i className="nuqta" /><span><b>From Rs 2,000.</b>Ready-made pieces to hang today.</span></li>
                  <li><i className="nuqta" /><span><b>Any verse.</b>Your words, in the ink you choose.</span></li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <Works products={products} onOpen={setDetail} />
        <Custom onOrder={orderCustom} />
      </main>

      <div className="end" id="endScreen">
        <Letter ch="م" />
        <section className="pad" id="order">
          <div className="fit">
            <span className="cap" style={{ color: "var(--sepia)" }}>How to order</span>
            <h2>Let’s paint <em>yours.</em></h2>
            <p>Message us with the piece you love or the words in your heart. We reply with sizes, price and delivery time.</p>
            <div className="btns"><button className="btn fill" type="button" onClick={() => setOrder({ kind: "pick" })}>Place an order <span aria-hidden="true">→</span></button><a className="btn" href="#custom">Write your own</a></div>
          </div>
        </section>
        <footer className="pad">
          <a className="home" href="#hero" aria-label="Mocha Muse, back to top"><span className="mark" aria-hidden="true" />MOCHA MUSE</a>
          <span>Thank you for being part of our little creative world.</span>
          <span>© {new Date().getFullYear()} · <Link className="admin-link" to="/admin">Admin</Link></span>
        </footer>
      </div>

      <DetailDialog product={detail} onClose={() => setDetail(null)} onOrder={p => { setDetail(null); setOrder({ kind: "ready", product: p }); }} />
      <OrderDialog target={order} products={products} onClose={() => setOrder(null)} />
    </>
  );
}
