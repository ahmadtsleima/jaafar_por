import { useEffect, useState, useCallback } from "react";
import { api } from "../api.js";
import UploadZone from "../components/UploadZone.jsx";
import PhotoGrid from "../components/PhotoGrid.jsx";

// ─── Slot groups — each section only sees its own slots ──────────────────────

const SECTION_GROUPS = [
  {
    id: "gallery",
    label: "Selected Frames",
    kicker: "Portfolio gallery",
    icon: "⊞",
    description: "These photos appear in the carousel on the home page. Assign a category (Brands, Filmmaking, Commercial, Fashion) so the filter tabs work.",
    slots: ["gallery_featured", "gallery_landscape", "gallery_portrait", "gallery_square"],
    filterKey: "gallery", // used to filter the photo list below
  },
  {
    id: "hero",
    label: "Hero Background",
    kicker: "Landing page",
    icon: "⬛",
    description: "Full-bleed image behind the hero headline. Only one photo is shown at a time.",
    slots: ["hero_background"],
    filterKey: "hero",
  },
  {
    id: "compare",
    label: "Color Film — Before & After",
    kicker: "Color grading section",
    icon: "◧",
    description: "Upload a Before and an After image with matching sort orders to create a drag comparison pair.",
    slots: ["compare_before", "compare_after"],
    filterKey: "compare",
  },
  {
    id: "services",
    label: "Services Cards",
    kicker: "Services section",
    icon: "◈",
    description: "Background hover images for the three service cards (Brands, Fashion, Events).",
    slots: ["services_bg_brands", "services_bg_fashion", "services_bg_events"],
    filterKey: "services",
  },
  {
    id: "other",
    label: "Other Page Slots",
    kicker: "About · OG · Sticky zoom",
    icon: "○",
    description: "About portrait, Open Graph social share image, and sticky scroll zoom images.",
    slots: ["about_portrait", "og_image", "sticky_zoom"],
    filterKey: "other",
  },
];

// Which DB slot names belong to each filterKey
const SLOT_PREFIX_MAP = {
  gallery:  (slot) => slot.startsWith("gallery_"),
  hero:     (slot) => slot === "hero_background",
  compare:  (slot) => slot.startsWith("compare_"),
  services: (slot) => slot.startsWith("services_bg"),
  other:    (slot) => ["about_portrait", "og_image", "sticky_zoom"].includes(slot),
};

export default function Photos() {
  const [openSection, setOpenSection] = useState("gallery");
  const [showUpload, setShowUpload] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);

  const activeGroup = SECTION_GROUPS.find((g) => g.id === openSection);

  const fetchPhotos = useCallback(() => {
    setLoading(true);
    api.photos
      .list("all")
      .then((all) => {
        const predicate = SLOT_PREFIX_MAP[openSection];
        setPhotos(predicate ? all.filter((p) => predicate(p.slot)) : all);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [openSection]);

  useEffect(() => {
    setShowUpload(false);
    fetchPhotos();
  }, [fetchPhotos]);

  const handleUploaded = () => {
    setShowUpload(false);
    fetchPhotos();
  };

  return (
    <div className="adm-photos-page">

      {/* ── Section tabs ── */}
      <div className="adm-photos-tabs">
        {SECTION_GROUPS.map((g) => (
          <button
            key={g.id}
            className={`adm-photos-tab${openSection === g.id ? " is-active" : ""}`}
            onClick={() => setOpenSection(g.id)}
            type="button"
          >
            <span className="adm-photos-tab-icon">{g.icon}</span>
            <span>{g.label}</span>
          </button>
        ))}
      </div>

      {/* ── Active section ── */}
      {activeGroup && (
        <div className="adm-photos-section">

          {/* Header */}
          <div className="adm-photos-section-head">
            <div>
              <p className="adm-photos-section-kicker">{activeGroup.kicker}</p>
              <h2 className="adm-photos-section-title">{activeGroup.label}</h2>
              <p className="adm-photos-section-desc">{activeGroup.description}</p>
            </div>
            <button
              className={`adm-btn ${showUpload ? "adm-btn-danger" : "adm-btn-primary"}`}
              onClick={() => setShowUpload((v) => !v)}
              type="button"
            >
              {showUpload ? "Close ✕" : `+ Upload to ${activeGroup.label}`}
            </button>
          </div>

          {/* Upload zone — only shows slots for THIS section */}
          {showUpload && (
            <div className="adm-photos-upload-wrap">
              <UploadZone
                onUploaded={handleUploaded}
                allowedSlots={activeGroup.slots}
              />
            </div>
          )}

          {/* Photo grid — only shows photos for THIS section */}
          <div className="adm-panel-card">
            {loading ? (
              <div className="adm-loading">Loading…</div>
            ) : photos.length === 0 ? (
              <div className="adm-photos-empty">
                <span>{activeGroup.icon}</span>
                <strong>No photos in this section yet</strong>
                <p>Click "Upload to {activeGroup.label}" above to add the first one.</p>
              </div>
            ) : (
              <PhotoGrid
                photos={photos}
                onUpdate={(id, data) =>
                  api.photos.update(id, data).then(fetchPhotos).catch(console.error)
                }
                onRemove={(id) =>
                  api.photos.remove(id).then(fetchPhotos).catch(console.error)
                }
                onReorder={(items) =>
                  api.photos.reorder(items).then(fetchPhotos).catch(console.error)
                }
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
