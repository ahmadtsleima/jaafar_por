import { clearToken } from "../api.js";

export default function Settings() {
  const handleLogout = () => {
    clearToken();
    window.location.reload();
  };

  return (
    <div className="adm-settings-page">

      {/* ── Hero ── */}
      <div className="adm-settings-hero">
        <p className="adm-settings-kicker">Configuration</p>
        <h1 className="adm-settings-title">Settings</h1>
        <p className="adm-settings-subtitle">
          Slot specs, export guidelines, and session controls for the admin workspace.
        </p>
      </div>

      {/* ── Image specs ── */}
      <div className="adm-settings-card">
        <div className="adm-settings-card-head">
          <div className="adm-settings-card-icon">⊞</div>
          <div>
            <h2 className="adm-settings-card-title">Image Slot Specifications</h2>
            <p className="adm-settings-card-note">
              Share these dimensions with your photographer before each shoot.
            </p>
          </div>
        </div>
        <div className="adm-settings-table-wrap">
          <table className="adm-settings-table">
            <thead>
              <tr>
                <th>Slot</th>
                <th>Size (px)</th>
                <th>Ratio</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {SLOT_ROWS.map((row) => (
                <tr key={row.slot}>
                  <td><code>{row.slot}</code></td>
                  <td className="adm-settings-td-mono">{row.size}</td>
                  <td><span className="adm-settings-badge">{row.ratio}</span></td>
                  <td className="adm-settings-td-muted">{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Video specs ── */}
      <div className="adm-settings-card">
        <div className="adm-settings-card-head">
          <div className="adm-settings-card-icon">▶</div>
          <div>
            <h2 className="adm-settings-card-title">Video Slot Specifications</h2>
            <p className="adm-settings-card-note">
              Recommended export settings per slot. Stay under the size limit for fast uploads.
            </p>
          </div>
        </div>
        <div className="adm-settings-table-wrap">
          <table className="adm-settings-table">
            <thead>
              <tr>
                <th>Slot</th>
                <th>Resolution</th>
                <th>Format</th>
                <th>Max Size</th>
                <th>FPS</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {VIDEO_SLOT_ROWS.map((row) => (
                <tr key={row.slot}>
                  <td><code>{row.slot}</code></td>
                  <td className="adm-settings-td-mono">{row.resolution}</td>
                  <td>{row.format}</td>
                  <td><span className="adm-settings-size-pill">{row.maxSize}</span></td>
                  <td className="adm-settings-td-mono">{row.fps}</td>
                  <td className="adm-settings-td-muted">{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Session ── */}
      <div className="adm-settings-card adm-settings-card-session">
        <div className="adm-settings-card-head">
          <div className="adm-settings-card-icon adm-settings-card-icon-danger">⏻</div>
          <div>
            <h2 className="adm-settings-card-title">Session</h2>
            <p className="adm-settings-card-note">
              Sign out and clear the stored authentication token from this browser.
            </p>
          </div>
        </div>
        <div className="adm-settings-session-actions">
          <button className="adm-settings-logout-btn" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </div>

    </div>
  );
}

const VIDEO_SLOT_ROWS = [
  { slot: "scroll_scrub",      resolution: "1920 × 1080", format: "MP4 (H.264)",        maxSize: "150 MB", fps: "24–30", notes: "Stop-motion frame sequence. Smooth scrub needs high frame count." },
  { slot: "motion_brands",     resolution: "1920 × 1080", format: "MP4 (H.264)",        maxSize: "200 MB", fps: "24–60", notes: "Brand project reels. Multiple videos allowed per slot." },
  { slot: "motion_filmmaking", resolution: "1920 × 1080", format: "MP4 (H.264)",        maxSize: "200 MB", fps: "24–60", notes: "Filmmaking reels. Compress to H.264 before uploading." },
  { slot: "motion_commercial", resolution: "1920 × 1080", format: "MP4 (H.264)",        maxSize: "200 MB", fps: "24–60", notes: "Commercial reels. Aim for < 100 MB for faster load." },
  { slot: "motion_fashion",    resolution: "1920 × 1080", format: "MP4 (H.264)",        maxSize: "200 MB", fps: "24–60", notes: "Fashion reels. Vertical (9:16) also accepted." },
  { slot: "services_reel",     resolution: "1920 × 1080", format: "MP4 (H.264) / WebM", maxSize: "80 MB",  fps: "24–30", notes: "Ambient looping background. Keep short (10–30 s) and muted." },
];

const SLOT_ROWS = [
  { slot: "hero_background",     size: "1920 × 1080", ratio: "16:9",   notes: "Full-bleed hero. Subject center-right. Top 80px clear." },
  { slot: "gallery_featured",    size: "1200 × 1600", ratio: "3:4",    notes: "Large portrait, spans 2 rows." },
  { slot: "gallery_landscape",   size: "1200 × 800",  ratio: "3:2",    notes: "Brand/event wide shots." },
  { slot: "gallery_portrait",    size: "800 × 1100",  ratio: "8:11",   notes: "Fashion close-ups or model shots." },
  { slot: "gallery_square",      size: "900 × 900",   ratio: "1:1",    notes: "Product detail, texture, brand object." },
  { slot: "about_portrait",      size: "800 × 1000",  ratio: "4:5",    notes: "Jaafar's photo. Face in upper 60%." },
  { slot: "services_bg_brands",  size: "1400 × 900",  ratio: "14:9",   notes: "Brands card hover image." },
  { slot: "services_bg_fashion", size: "1400 × 900",  ratio: "14:9",   notes: "Fashion card hover image." },
  { slot: "services_bg_events",  size: "1400 × 900",  ratio: "14:9",   notes: "Events card hover image." },
  { slot: "three_js_plane_1–6",  size: "1200 × 800",  ratio: "3:2",    notes: "B&W / desaturated. Avoid heavy white areas." },
  { slot: "og_image",            size: "1200 × 630",  ratio: "1.91:1", notes: "Include name lockup or strong single image." },
];
