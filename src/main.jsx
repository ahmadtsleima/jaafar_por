import React, { Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import "../styles.css";

const App = lazy(() => import("./App.jsx"));
const AdminApp = lazy(() => import("./admin/AdminApp.jsx"));
const isAdmin = window.location.pathname.startsWith("/admin");

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Suspense fallback={null}>
      {isAdmin ? <AdminApp /> : <App />}
    </Suspense>
  </React.StrictMode>,
);
