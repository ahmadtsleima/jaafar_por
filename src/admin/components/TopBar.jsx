const PAGE_TITLES = {
  dashboard: "Dashboard",
  photos: "Photos",
  videos: "Videos",
  settings: "Settings",
};

export default function TopBar({ page }) {
  return (
    <div className="adm-topbar">
      <h1 className="adm-topbar-title">{PAGE_TITLES[page] ?? "Admin"}</h1>
      <a
        className="adm-topbar-site"
        href="/"
        target="_blank"
        rel="noreferrer"
      >
        View site ↗
      </a>
    </div>
  );
}
