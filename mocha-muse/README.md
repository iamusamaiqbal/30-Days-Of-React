# Mocha Muse landing pages

Four design versions of a single-page landing site for Mocha Muse, hand-painted Arabic calligraphy on canvas.

- `index.html`: the marbled-paint version. A live coffee-and-cream marble background, a 3D ring of paintings, and expanding custom-order panels.
- `studio/index.html`: the light studio version. Soft white cards on warm paper: a hero canvas you can switch between paintings, a "design your canvas" tool that previews custom words, colours and sizes on a wall, typed verses, a gallery of tilting canvases and a side drawer for painting details.

- `ink/index.html`: the calligrapher's ink version. Cream paper and black ink, a giant Arabic letter in each section that writes itself (starting with ن, after Al-Qalam 68:1), paintings drying on a line, and a tool that writes your words in the ink colour you choose.
- `sketch/index.html`: the hand-drawn sketchbook version. Dot-grid paper, handwritten type, pencil lines drawn with Rough.js that sketch themselves in, taped photos, sticky notes and a sketch-your-idea pad.

All pages move one full screen per scroll on phones, tablets and computers, and each section scales itself to fit the screen.

Open any of the files in a browser. Each one is self-contained: the artwork photos and logo are embedded, and the only outside requests are to Google Fonts (and, for the sketchbook version, the Rough.js drawing library from jsDelivr).

To turn on the order buttons, fill in the `CONTACT` object near the top of the main script in each file (WhatsApp number with country code, Instagram handle, or email).

## Ink version: admin, products and orders

The ink version (`ink/index.html`) has a small shop admin:

- **Admin sign-in:** the "Admin" link in the footer, or add `#admin` to the page address. Demo login: `admin` / `mocha123`.
- **Products:** add a painting (photo, title, price, Arabic verse, translation, reference), edit it, hide or show it, or delete it. The paintings line on the site reads from this list.
- **Orders:** customers place orders through a short form. The admin lists them with status filters (New, Confirmed, Painting, Shipped, Delivered, Cancelled) and opens each one for details, status changes, a studio note and a WhatsApp link.
- **Order emails:** fill in `NOTIFY` near the top of the main script. With FormSubmit, put the receiving address in `formsubmit.to`; the first order sends a one-time activation email. EmailJS is also supported. Emails only send when the page runs on a real website (for example GitHub Pages or Netlify).

**Demo storage:** until Firebase is connected, products, orders and the admin session are saved in the browser's local storage, so each device sees only its own data. All reads and writes go through the `Store` object in the script; replace its functions with Firebase Auth, Firestore and Storage to go live.
