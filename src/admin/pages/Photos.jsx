import { useEffect, useState, useCallback } from "react";
import { api } from "../api.js";
import UploadZone from "../components/UploadZone.jsx";
import PhotoGrid from "../components/PhotoGrid.jsx";

const FILTER_TABS = ["all", "brands", "filmmaking", "commercial", "fashion", "unpublished"];

export default function Photos() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  const fetchPhotos = useCallback(() => {
    setLoading(true);
    api.photos
      .list(activeFilter)
      .then(setPhotos)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeFilter]);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  const handleUploaded = () => {
    setShowUpload(false);
    fetchPhotos();
  };

  return (
    <div>
      <div className="adm-toolbar">
        <div className="adm-filter-tabs">
          {FILTER_TABS.map((f) => (
            <button
              key={f}
              className={`adm-filter-tab${activeFilter === f ? " is-active" : ""}`}
              onClick={() => setActiveFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <button
          className="adm-btn adm-btn-primary"
          onClick={() => setShowUpload((v) => !v)}
        >
          {showUpload ? "Close ✕" : "+ Upload photo"}
        </button>
      </div>

      {showUpload && (
        <div className="adm-section">
          <UploadZone onUploaded={handleUploaded} />
        </div>
      )}

      <div className="adm-section">
        {loading ? (
          <div className="adm-loading">Loading…</div>
        ) : (
          <div className="adm-panel-card">
            <PhotoGrid
              photos={photos}
              onUpdate={(id, data) =>
                api.photos.update(id, data).then(() => fetchPhotos()).catch(console.error)
              }
              onRemove={(id) =>
                api.photos.remove(id).then(fetchPhotos).catch(console.error)
              }
              onReorder={(items) =>
                api.photos.reorder(items).then(fetchPhotos).catch(console.error)
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
