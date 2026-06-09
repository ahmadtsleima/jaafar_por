import { clearToken } from "../api.js";

export default function Settings() {
  const handleLogout = () => {
    clearToken();
    window.location.reload();
  };

  return (
    <div>
      <section className="adm-section">
        <h2 className="adm-section-title">Image Slot Specifications</h2>
        <p className="adm-settings-note">
          Share these dimensions with your photographer before each shoot.
        </p>
        <div className="adm-slots-table-wrap">
          <table className="adm-slots-table">
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
                  <td>{row.size}</td>
                  <td>{row.ratio}</td>
                  <td>{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="adm-section">
        <h2 className="adm-section-title">Video Slot Specifications</h2>
        <p className="adm-settings-note">
          Recommended export settings for each video slot. Keep files under the size limit for fast uploads.
        </p>
        <div className="adm-slots-table-wrap">
          <table className="adm-slots-table">
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
                  <td>{row.resolution}</td>
                  <td>{row.format}</td>
                  <td><strong>{row.maxSize}</strong></td>
                  <td>{row.fps}</td>
                  <td>{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="adm-section">
        <h2 className="adm-section-title">Session</h2>
        <button className="adm-btn adm-btn-danger" onClick={handleLogout}>
          Sign out
        </button>
      </section>
    </div>
  );
}

const VIDEO_SLOT_ROWS = [
  { slot: "scroll_scrub",      resolution: "1920 × 1080", format: "MP4 (H.264)", maxSize: "150 MB", fps: "24–30", notes: "Stop-motion frame sequence. Smooth scrub needs high frame count." },
  { slot: "motion_brands",     resolution: "1920 × 1080", format: "MP4 (H.264)", maxSize: "200 MB", fps: "24–60", notes: "Brand project reels. Multiple videos allowed per slot." },
  { slot: "motion_filmmaking", resolution: "1920 × 1080", format: "MP4 (H.264)", maxSize: "200 MB", fps: "24–60", notes: "Filmmaking reels. Compress to H.264 before uploading." },
  { slot: "motion_commercial", resolution: "1920 × 1080", format: "MP4 (H.264)", maxSize: "200 MB", fps: "24–60", notes: "Commercial reels. Aim for < 100 MB for faster load." },
  { slot: "motion_fashion",    resolution: "1920 × 1080", format: "MP4 (H.264)", maxSize: "200 MB", fps: "24–60", notes: "Fashion reels. Vertical (9:16) also accepted." },
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
