import { useState } from "react";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Photos from "./pages/Photos.jsx";
import Videos from "./pages/Videos.jsx";
import Settings from "./pages/Settings.jsx";
import Sidebar from "./components/Sidebar.jsx";
import TopBar from "./components/TopBar.jsx";
import { isAuthenticated } from "./api.js";
import "./admin.css";

const PAGES = { dashboard: Dashboard, photos: Photos, videos: Videos, settings: Settings };

export default function AdminApp() {
  const [authed, setAuthed] = useState(isAuthenticated);
  const [page, setPage] = useState("dashboard");

  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;

  const Page = PAGES[page] ?? Dashboard;

  return (
    <div className="adm-shell">
      <Sidebar activePage={page} onNavigate={setPage} />
      <div className="adm-main">
        <TopBar page={page} />
        <div className="adm-content">
          <Page />
        </div>
      </div>
    </div>
  );
}
