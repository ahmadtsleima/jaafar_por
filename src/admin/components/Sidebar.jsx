import { clearToken } from "../api.js";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "D" },
  { id: "photos", label: "Photos", icon: "P" },
  { id: "videos", label: "Videos", icon: "V" },
  { id: "texts", label: "Text", icon: "T" },
  { id: "settings", label: "Settings", icon: "S" },
];

export default function Sidebar({ activePage, onNavigate }) {
  return (
    <aside className="adm-sidebar">
      <div className="adm-sidebar-logo">JS</div>
      <nav className="adm-sidebar-nav">
        {NAV.map((item) => (
          <button
            key={item.id}
            className={`adm-sidebar-link${activePage === item.id ? " is-active" : ""}`}
            onClick={() => onNavigate(item.id)}
          >
            <span className="adm-sidebar-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
      <button
        className="adm-sidebar-link adm-sidebar-logout"
        onClick={() => { clearToken(); window.location.reload(); }}
      >
        <span className="adm-sidebar-icon">Out</span>
        Sign out
      </button>
    </aside>
  );
}
