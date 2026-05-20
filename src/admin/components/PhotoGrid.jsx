import { useState } from "react";

export default function PhotoGrid({ photos, onUpdate, onRemove, onReorder }) {
  const [dragId, setDragId] = useState(null);
  const [editingSort, setEditingSort] = useState(null);
  const [localPhotos, setLocalPhotos] = useState(photos);

  // Sync when parent updates the list
  if (photos !== localPhotos && photos.length !== localPhotos.length) {
    setLocalPhotos(photos);
  }

  if (localPhotos.length === 0) return <p className="adm-empty">No photos match this filter.</p>;

  const handleDelete = (id) => {
    setLocalPhotos((prev) => prev.filter((p) => p.id !== id));
    onRemove(id);
  };

  const handleDragStart = (id) => setDragId(id);
  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = (targetId) => {
    if (!dragId || dragId === targetId) return;
    const from = photos.findIndex((p) => p.id === dragId);
    const to = photos.findIndex((p) => p.id === targetId);
    const reordered = [...photos];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    const items = reordered.map((p, i) => ({ id: p.id, sort_order: i }));
    onReorder(items);
    setDragId(null);
  };

  return (
    <div className="adm-photo-grid">
      {localPhotos.map((photo) => (
        <div
          key={photo.id}
          className={`adm-photo-card${dragId === photo.id ? " is-dragging" : ""}`}
          draggable
          onDragStart={() => handleDragStart(photo.id)}
          onDragOver={handleDragOver}
          onDrop={() => handleDrop(photo.id)}
          onDragEnd={() => setDragId(null)}
        >
          <img src={photo.url} alt={photo.alt_text} />
          <div className="adm-photo-card-body">
            <div className="adm-photo-card-top">
              <span className="adm-photo-slot">{photo.slot}</span>
              <span className={`adm-badge adm-badge-${photo.category}`}>{photo.category}</span>
            </div>
            <div className="adm-photo-card-sort">
              {editingSort === photo.id ? (
                <input
                  className="adm-sort-input"
                  type="number"
                  defaultValue={photo.sort_order}
                  autoFocus
                  onBlur={(e) => {
                    onUpdate(photo.id, { sort_order: parseInt(e.target.value) });
                    setEditingSort(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.target.blur();
                    if (e.key === "Escape") setEditingSort(null);
                  }}
                />
              ) : (
                <button
                  className="adm-sort-btn"
                  title="Click to edit sort order"
                  onClick={() => setEditingSort(photo.id)}
                >
                  #{photo.sort_order}
                </button>
              )}
            </div>
            <div className="adm-photo-card-actions">
              <button
                className={`adm-icon-btn${photo.published ? " is-published" : ""}`}
                title={photo.published ? "Unpublish" : "Publish"}
                onClick={() => onUpdate(photo.id, { published: !photo.published })}
              >
                👁
              </button>
              <button
                className="adm-icon-btn adm-icon-btn-danger"
                title="Delete photo"
                onClick={() => handleDelete(photo.id)}
              >
                🗑
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
