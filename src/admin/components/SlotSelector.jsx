import { SLOTS } from "../data/slots.js";

// Simple page-layout wireframe showing the selected slot highlighted in gold
const WIREFRAME_ZONES = [
  { id: "hero_background",     label: "Hero",      style: { top: "0%", left: "0%", width: "100%", height: "28%" } },
  { id: "gallery_featured",    label: "Feat.",     style: { top: "32%", left: "0%", width: "36%", height: "32%" } },
  { id: "gallery_landscape",   label: "Land.",     style: { top: "32%", left: "38%", width: "62%", height: "15%" } },
  { id: "gallery_portrait",    label: "Port.",     style: { top: "49%", left: "38%", width: "30%", height: "18%" } },
  { id: "gallery_square",      label: "Sq.",       style: { top: "49%", left: "70%", width: "30%", height: "18%" } },
  { id: "about_portrait",      label: "About",     style: { top: "70%", left: "0%", width: "24%", height: "22%" } },
  { id: "services_bg_brands",  label: "Srv B",     style: { top: "70%", left: "26%", width: "24%", height: "10%" } },
  { id: "services_bg_fashion", label: "Srv F",     style: { top: "70%", left: "52%", width: "24%", height: "10%" } },
  { id: "services_bg_events",  label: "Srv E",     style: { top: "70%", left: "76%", width: "24%", height: "10%" } },
  { id: "og_image",            label: "OG",        style: { top: "93%", left: "0%", width: "45%", height: "7%" } },
];

// three_js_plane_1–6 share one zone
const THREE_PLANES_IDS = ["three_js_plane_1","three_js_plane_2","three_js_plane_3","three_js_plane_4","three_js_plane_5","three_js_plane_6"];
const THREE_ZONE = { label: "3D", style: { top: "82%", left: "0%", width: "100%", height: "10%" } };

export default function SlotSelector({ value, onChange }) {
  const selected = SLOTS.find((s) => s.id === value) ?? SLOTS[0];
  const isThreePlane = THREE_PLANES_IDS.includes(value);

  return (
    <div className="adm-slot-selector">
      <select className="adm-slot-select" value={value} onChange={(e) => onChange(e.target.value)}>
        {SLOTS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label} ({s.width}×{s.height})
          </option>
        ))}
      </select>

      {selected.notes && (
        <p className="adm-slot-notes">{selected.notes}</p>
      )}

      <div className="adm-slot-wireframe" aria-hidden="true">
        {WIREFRAME_ZONES.map((zone) => {
          const active = zone.id === value;
          return (
            <div
              key={zone.id}
              className={`adm-wf-zone${active ? " is-active" : ""}`}
              style={zone.style}
              title={zone.label}
            >
              <span>{zone.label}</span>
            </div>
          );
        })}
        <div
          className={`adm-wf-zone${isThreePlane ? " is-active" : ""}`}
          style={THREE_ZONE.style}
          title="3D planes"
        >
          <span>3D planes 1–6</span>
        </div>
      </div>
    </div>
  );
}
