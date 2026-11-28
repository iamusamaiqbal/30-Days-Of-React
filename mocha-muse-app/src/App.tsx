import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router";
import { ShopPage } from "./shop/ShopPage";

/* The admin is a separate bundle, loaded only when someone opens /admin. */
const AdminApp = lazy(() => import("./admin/AdminApp").then(m => ({ default: m.AdminApp })));

export function App() {
  return (
    <Routes>
      <Route path="/" element={<ShopPage />} />
      <Route path="/admin" element={<Suspense fallback={<p className="loading">Loading…</p>}><AdminApp /></Suspense>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
