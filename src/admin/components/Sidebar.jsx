import { clearToken } from "../api.js";

const NAV = [
  { id: "dashboard", label: "Dashboard",  icon: "⊞" },
  { id: "photos",    label: "Photos",     icon: "⊟" },
  { id: "videos",    label: "Videos",     icon: "▷" },
  { id: "settings",  label: "Settings",   icon: "⊕" },
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
        <span className="adm-sidebar-icon">↩</span>
        Sign out
      </button>
    </aside>
  );
}
