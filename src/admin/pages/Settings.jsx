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
        <h2 className="adm-section-title">Session</h2>
        <button className="adm-btn adm-btn-danger" onClick={handleLogout}>
          Sign out
        </button>
      </section>
    </div>
  );
}

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
