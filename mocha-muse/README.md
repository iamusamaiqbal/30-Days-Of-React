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

**Storage:** the page connects to the Firebase project `brownique-art` (config near the top of the main script). Admin sign-in uses Firebase Authentication, and products and orders live in Firestore. Product photos are shrunk in the browser and saved inside each product's Firestore record, so Cloud Storage (which needs the paid Blaze plan) isn't required. Where Firebase can't be reached (for example the claude.ai preview, which blocks outside connections), the page falls back to an in-browser demo store with the demo login `admin` / `mocha123`.

### Firebase setup (one time)

1. **Firestore rules:** Firebase console > Firestore Database > Rules. Paste the contents of `firestore.rules` from this folder and click Publish.
2. **Turn on email sign-in:** Authentication > Sign-in method > Email/Password > Enable.
3. **Create your admin login:** Authentication > Users > Add user, with your email and a strong password. Copy the new user's **User UID**.
4. **Mark it as an admin:** Firestore Database > Start collection `admins` > Document ID = the User UID you copied > add any field (for example `role` = `owner`) > Save.
5. **Host the page:** for example Firebase Hosting or GitHub Pages. Then add that domain under Authentication > Settings > Authorized domains (Firebase Hosting domains are already there).
6. **Add the starter paintings:** open the site, go to Admin, sign in, open Products and click "copy in the 5 paintings already on the site".
