import { useEffect, useState } from "react";
import { api } from "../api.js";

function MetricCard({ label, value, sub }) {
  return (
    <div className="adm-metric">
      <span className="adm-metric-label">{label}</span>
      <strong className="adm-metric-value">{value ?? "—"}</strong>
      {sub && <span className="adm-metric-sub">{sub}</span>}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.stats(), api.photos.list()])
      .then(([s, photos]) => {
        setStats(s);
        setRecent(photos.slice(0, 5));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const togglePublish = async (photo) => {
    try {
      const updated = await api.photos.update(photo.id, { published: !photo.published });
      setRecent((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="adm-loading">Loading…</div>;

  const lastDate = stats?.lastUpload
    ? new Date(stats.lastUpload).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "—";

  return (
    <div>
      <div className="adm-metric-row">
        <MetricCard label="Total Photos" value={stats?.total} />
        <MetricCard label="Published" value={stats?.published} />
        <MetricCard
          label="By Category"
          value={`B ${stats?.brands ?? 0} · F ${stats?.fashion ?? 0} · E ${stats?.events ?? 0}`}
        />
        <MetricCard label="Last Upload" value={lastDate} />
      </div>

      <section className="adm-section">
        <h2 className="adm-section-title">Recent Uploads</h2>
        <div className="adm-recent-list">
          {recent.length === 0 && <p className="adm-empty">No photos yet.</p>}
          {recent.map((photo) => (
            <div className="adm-recent-row" key={photo.id}>
              <img
                className="adm-recent-thumb"
                src={photo.url}
                alt={photo.alt_text}
                width={56}
                height={40}
              />
              <div className="adm-recent-meta">
                <span className="adm-recent-slot">{photo.slot}</span>
                <span className={`adm-badge adm-badge-${photo.category}`}>{photo.category}</span>
              </div>
              <span className="adm-recent-date">
                {new Date(photo.uploaded_at).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
              <button
                className={`adm-toggle-btn${photo.published ? " is-published" : ""}`}
                title={photo.published ? "Unpublish" : "Publish"}
                onClick={() => togglePublish(photo)}
              >
                {photo.published ? "●" : "○"}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
