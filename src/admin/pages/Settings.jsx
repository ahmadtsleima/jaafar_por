import { clearToken } from "../api.js";

export default function Settings() {
  const handleLogout = () => {
    clearToken();
    window.location.reload();
  };

  return (
    <div className="adm-settings-page">
      <div className="adm-settings-hero">
        <p className="adm-settings-kicker">Configuration</p>
        <h1 className="adm-settings-title">Settings</h1>
        <p className="adm-settings-subtitle">
          Slot specs, export guidelines, and session controls for the admin workspace.
        </p>
      </div>

      <div className="adm-settings-card">
        <div className="adm-settings-card-head">
          <div className="adm-settings-card-icon">IMG</div>
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

      <div className="adm-settings-card">
        <div className="adm-settings-card-head">
          <div className="adm-settings-card-icon">VID</div>
          <div>
            <h2 className="adm-settings-card-title">Video Slot Specifications</h2>
            <p className="adm-settings-card-note">
              Recommended export settings per slot. Uploads are stored on your server.
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

      <div className="adm-settings-card adm-settings-card-session">
        <div className="adm-settings-card-head">
          <div className="adm-settings-card-icon adm-settings-card-icon-danger">OFF</div>
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
  { slot: "motion_design",       resolution: "1080 x 1920", format: "MP4 (H.264)",        maxSize: "No limit", fps: "24-60", notes: "Vertical reels for the Motion Design section." },
  { slot: "filmmaking",          resolution: "1920 x 1080", format: "MP4 (H.264)",        maxSize: "No limit", fps: "24-60", notes: "Large horizontal cinematic cards." },
  { slot: "color_grading_video", resolution: "1080 x 1920", format: "MP4 / WebM / MOV", maxSize: "No limit", fps: "24-30", notes: "Vertical video placed between before/after slider sets. MOV works best when encoded as H.264." },
  { slot: "lighting_featured",   resolution: "1920 x 1080", format: "MP4 (H.264) / WebM", maxSize: "No limit", fps: "24-30", notes: "Featured video at the top of BTS." },
  { slot: "reel_showcase",       resolution: "1920 x 1080", format: "MP4 (H.264)",        maxSize: "No limit", fps: "24-60", notes: "Horizontal featured reel section. Multiple videos allowed." },
  { slot: "motion_brands",       resolution: "1920 x 1080", format: "MP4 (H.264)",        maxSize: "No limit", fps: "24-60", notes: "Brand project reels." },
  { slot: "motion_filmmaking",   resolution: "1920 x 1080", format: "MP4 (H.264)",        maxSize: "No limit", fps: "24-60", notes: "Legacy filmmaking reel slot, still supported." },
  { slot: "motion_commercial",   resolution: "1920 x 1080", format: "MP4 (H.264)",        maxSize: "No limit", fps: "24-60", notes: "Commercial reels." },
  { slot: "motion_fashion",      resolution: "1080 x 1920", format: "MP4 (H.264)",        maxSize: "No limit", fps: "24-60", notes: "Fashion or vertical motion reels." },
  { slot: "services_reel",       resolution: "1920 x 1080", format: "MP4 (H.264) / WebM", maxSize: "No limit", fps: "24-30", notes: "Ambient looping background. Keep short when possible." },
];

const SLOT_ROWS = [
  { slot: "hero_background",     size: "1920 x 1080", ratio: "16:9",   notes: "Full-bleed hero. Subject center-right. Top 80px clear." },
  { slot: "gallery_featured",    size: "1080 x 1350", ratio: "4:5",    notes: "Selected Frames image." },
  { slot: "gallery_landscape",   size: "1080 x 1350", ratio: "4:5",    notes: "Selected Frames image." },
  { slot: "gallery_portrait",    size: "1080 x 1350", ratio: "4:5",    notes: "Selected Frames image." },
  { slot: "gallery_square",      size: "1080 x 1350", ratio: "4:5",    notes: "Selected Frames image." },
  { slot: "photo_fnb",           size: "1080 x 1350", ratio: "4:5",    notes: "Food & Beverage gallery." },
  { slot: "photo_commercial",    size: "1080 x 1350", ratio: "4:5",    notes: "Commercial photography gallery." },
  { slot: "photo_jewelry",       size: "1080 x 1350", ratio: "4:5",    notes: "Jewelry photography gallery." },
  { slot: "photo_product",       size: "1080 x 1350", ratio: "4:5",    notes: "Product photography gallery." },
  { slot: "color_before",        size: "1080 x 1920", ratio: "9:16",   notes: "Vertical before frame for color grading sliders." },
  { slot: "color_after",         size: "1080 x 1920", ratio: "9:16",   notes: "Vertical after/graded frame for color grading sliders." },
  { slot: "compare_before",      size: "1400 x 1000", ratio: "7:5",    notes: "Legacy before slider image, still supported." },
  { slot: "compare_after",       size: "1400 x 1000", ratio: "7:5",    notes: "Legacy after slider image, still supported." },
  { slot: "lighting_setup",      size: "1600 x 1000", ratio: "8:5",    notes: "BTS gallery photo." },
  { slot: "about_portrait",      size: "800 x 1000",  ratio: "4:5",    notes: "Jaafar's photo. Face in upper 60%." },
  { slot: "services_bg_brands",  size: "1400 x 900",  ratio: "14:9",   notes: "Brands card hover image." },
  { slot: "services_bg_fashion", size: "1400 x 900",  ratio: "14:9",   notes: "Fashion card hover image." },
  { slot: "services_bg_events",  size: "1400 x 900",  ratio: "14:9",   notes: "Events card hover image." },
  { slot: "sticky_zoom",         size: "1200 x 800",  ratio: "3:2",    notes: "Scroll-animated image stack." },
  { slot: "og_image",            size: "1200 x 630",  ratio: "1.91:1", notes: "Social share image." },
];
