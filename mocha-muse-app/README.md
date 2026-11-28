# Mocha Muse: shop and studio admin

The Mocha Muse "Ink" shop rebuilt in **React + Vite + TypeScript**. It runs on Firebase's free Spark plan: Hosting, Firestore and Authentication, with no Cloud Functions or Cloud Storage.

- `/` is the shop: the paintings, custom orders, and the order form.
- `/admin` is the studio. Sign-in, orders, products and the Team page (Team is owner only). The admin code and the sign-in SDK load only on this page.

## How it is kept safe

| Layer | What it does |
|---|---|
| **Firestore rules** (`firestore.rules`) | Deny by default. Visitors can read visible paintings and *create* an order, nothing else. Every order field is checked: type, length, phone format, a timestamp within 10 minutes. The **price must equal the painting's real price**, so a tampered browser can't order at Rs 1. Admins can change only an order's status and studio note. Only the owner UID can add or remove admins. |
| **Rules tests** (`tests/rules`) | 12 tests run the rules on the Firebase emulator in CI before every deploy. A rules change that opens a hole fails the build. |
| **App Check** (reCAPTCHA v3) | When it's enforced, Firestore and Auth accept requests only from this website, not from scripts using the public config. |
| **Input validation** (zod, `src/lib/schemas.ts`) | Everything written *and* everything read is schema-checked. Product images may only be a built-in painting or a JPEG the admin uploaded. Remote URLs, SVG and `javascript:` are rejected (`tests/unit`). |
| **Security headers** (`firebase.json`) | A strict Content-Security-Policy that allows only this site, Firebase and reCAPTCHA (no inline scripts, no framing). Also HSTS, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy, Permissions-Policy and COOP. |
| **No third-party code at runtime** | Fonts and libraries are bundled at build time. The shop makes no requests to font or script CDNs. |
| **Dependencies** | Versions are pinned exactly. `npm audit` runs in CI and fails on high-severity issues in shipped code. Dependabot opens weekly update PRs. |
| **Accounts** | There is no demo login. Admins are invited by the owner and set their own password from an email link. A removed admin loses access immediately. |

## One-time setup in the Firebase console (project `brownique-art`)

1. **Authentication → Sign-in method:** enable **Email/Password**.
2. **App Check:**
   - Register the web app with **reCAPTCHA v3**. Google gives you a *site key*. It is public, so put it in `.env.production`:
     ```
     VITE_RECAPTCHA_SITE_KEY=your-site-key
     ```
   - Deploy, open the site and the admin once, then in App Check press **Enforce** for **Cloud Firestore** and **Authentication**.
   - Enforce only after the deploy. Enforcing before the site sends App Check tokens would block it.
3. **API key restriction** (Google Cloud console → APIs & Services → Credentials → the "Browser key"):
   - Under *Website restrictions*, add `https://brownique-art.web.app/*` and `https://brownique-art.firebaseapp.com/*`, plus your own domain if you add one.
4. **Order emails (optional):** set `VITE_FORMSUBMIT_TO` in `.env.production` to the studio's email.
   - The first order sends FormSubmit's confirmation email; click it once.
   - Then swap the address for the random alias FormSubmit gives you, so your real email isn't in the site's code.

## Deploying

Each push to `main` (or this branch) that touches `mocha-muse-app/` runs `.github/workflows/firebase-deploy.yml`:

1. **test:**
   - `npm ci`
   - `npm audit`
   - typecheck
   - unit tests
   - Firestore rules tests (emulator)
   - build
2. **deploy:** runs only if *test* passed. It publishes Hosting and the Firestore rules.

Deploying needs one GitHub secret, **`FIREBASE_SERVICE_ACCOUNT_BROWNIQUE_ART`**:

1. Firebase console → ⚙ Project settings → **Service accounts** → **Generate new private key**.
2. GitHub repo → Settings → Secrets and variables → Actions → **New repository secret**. Paste the whole JSON file as the value.
3. Delete the downloaded file.

## Working on it locally

```bash
npm ci
npm run dev                 # shop against the live project
npm test                    # unit tests
npm run test:rules          # rules tests (needs Java 11+)
```

To run fully offline against the emulators, use two terminals:

```bash
npm run dev:emulators
npx vite --mode emulators
```

## Notes on the free plan

- Product photos are shrunk in the browser to a JPEG of about 600 KB or less and stored inside the product document. Cloud Storage needs the paid plan.
- Spark limits: 50k reads and 20k writes a day. That is plenty for a small studio.
- If the shop ever grows past that, move to Blaze. Then add a Cloud Function to send order emails and check orders server-side.
