/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_RECAPTCHA_SITE_KEY?: string;
  readonly VITE_FORMSUBMIT_TO?: string;
  readonly VITE_USE_EMULATORS?: string;
}
interface ImportMeta { readonly env: ImportMetaEnv; }
