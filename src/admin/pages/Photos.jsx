import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import UploadZone from "../components/UploadZone.jsx";
import PhotoGrid from "../components/PhotoGrid.jsx";
import { SLOTS } from "../data/slots.js";

const SECTION_GROUPS = [
  {
    id: "all",
    label: "All Sections",
    kicker: "Every image slot",
    icon: "*",
    description: "Upload or manage any image slot from one place.",
    slots: SLOTS.map((slot) => slot.id),
    filterKey: "all",
  },
  {
    id: "photography",
    label: "Photography",
    kicker: "Still image archive",
    icon: "P",
    description: "Upload the photos shown in the Photography carousel: F&B, Commercial, Jewelry, and Product.",
    slots: ["photo_fnb", "photo_commercial", "photo_jewelry", "photo_product"],
    filterKey: "photography",
  },
  {
    id: "gallery",
    label: "Legacy Gallery",
    kicker: "Old selected frames",
    icon: "G",
    description: "Older gallery slots kept for existing uploads. Use Photography for the new public section.",
    slots: ["gallery_featured", "gallery_landscape", "gallery_portrait", "gallery_square"],
    filterKey: "gallery",
  },
  {
    id: "hero",
    label: "Hero Background",
    kicker: "Landing page",
    icon: "H",
    description: "Full-bleed image behind the hero headline. Only one photo is shown at a time.",
    slots: ["hero_background"],
    filterKey: "hero",
  },
  {
    id: "compare",
    label: "Color Grading",
    kicker: "Before and after",
    icon: "C",
    description: "Upload before and after images with matching sort orders to create drag comparison pairs.",
    slots: ["color_before", "color_after", "compare_before", "compare_after"],
    filterKey: "compare",
  },
  {
    id: "services",
    label: "Services Cards",
    kicker: "Legacy service images",
    icon: "S",
    description: "Background hover images for legacy service cards.",
    slots: ["services_bg_brands", "services_bg_fashion", "services_bg_events"],
    filterKey: "services",
  },
  {
    id: "bts",
    label: "BTS",
    kicker: "Behind the scenes",
    icon: "B",
    description: "Upload BTS setup photos shown below the featured BTS video.",
    slots: ["lighting_setup"],
    filterKey: "bts",
  },
  {
    id: "other",
    label: "Other Page Slots",
    kicker: "About / OG / sticky zoom",
    icon: "O",
    description: "About portrait, Open Graph social share image, and sticky scroll zoom images.",
    slots: ["about_portrait", "og_image", "sticky_zoom"],
    filterKey: "other",
  },
];

const SLOT_PREFIX_MAP = {
  all: () => true,
  photography: (slot) => slot.startsWith("photo_"),
  gallery: (slot) => slot.startsWith("gallery_"),
  hero: (slot) => slot === "hero_background",
  compare: (slot) => slot.startsWith("color_") || slot.startsWith("compare_"),
  services: (slot) => slot.startsWith("services_bg"),
  bts: (slot) => slot === "lighting_setup",
  other: (slot) => ["about_portrait", "og_image", "sticky_zoom"].includes(slot),
};

export default function Photos() {
  const [openSection, setOpenSection] = useState("photography");
  const [showUpload, setShowUpload] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);

  const activeGroup = SECTION_GROUPS.find((group) => group.id === openSection);

  const fetchPhotos = useCallback(() => {
    setLoading(true);
    api.photos
      .list("all")
      .then((all) => {
        const predicate = SLOT_PREFIX_MAP[openSection];
        setPhotos(predicate ? all.filter((photo) => predicate(photo.slot)) : all);
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
      <div className="adm-photos-tabs">
        {SECTION_GROUPS.map((group) => (
          <button
            key={group.id}
            className={`adm-photos-tab${openSection === group.id ? " is-active" : ""}`}
            onClick={() => setOpenSection(group.id)}
            type="button"
          >
            <span className="adm-photos-tab-icon">{group.icon}</span>
            <span>{group.label}</span>
          </button>
        ))}
      </div>

      {activeGroup && (
        <div className="adm-photos-section">
          <div className="adm-photos-section-head">
            <div>
              <p className="adm-photos-section-kicker">{activeGroup.kicker}</p>
              <h2 className="adm-photos-section-title">{activeGroup.label}</h2>
              <p className="adm-photos-section-desc">{activeGroup.description}</p>
            </div>
            <button
              className={`adm-btn ${showUpload ? "adm-btn-danger" : "adm-btn-primary"}`}
              onClick={() => setShowUpload((value) => !value)}
              type="button"
            >
              {showUpload ? "Close" : `+ Upload to ${activeGroup.label}`}
            </button>
          </div>

          {showUpload && (
            <div className="adm-photos-upload-wrap">
              <UploadZone
                onUploaded={handleUploaded}
                allowedSlots={activeGroup.slots}
              />
            </div>
          )}

          <div className="adm-panel-card">
            {loading ? (
              <div className="adm-loading">Loading...</div>
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
