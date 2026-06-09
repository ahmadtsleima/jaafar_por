import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";

const VALIDATION_LABELS = {
  format: "Format",
  duration: "Duration",
  resolution: "Resolution",
};

/** Extract a numeric Vimeo video ID from any Vimeo URL format */
function extractVimeoId(input) {
  const match = input.match(
    /(?:vimeo\.com\/(?:video\/|channels\/[^/]+\/)?|player\.vimeo\.com\/video\/)(\d+)/
  );
  return match ? match[1] : null;
}

const formatDate = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

export default function VideoManager({ slot, label, notes }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [validations, setValidations] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  // "file" | "vimeo"
  const [uploadTab, setUploadTab] = useState("vimeo");
  const [vimeoInput, setVimeoInput] = useState("");
  const [vimeoId, setVimeoId] = useState(null);
  const inputRef = useRef(null);
  const isMotionSlot = slot.startsWith("motion_");
  // scroll_scrub needs direct <video> frame control — Vimeo iframe can't do that
  const vimeoAllowed = slot !== "scroll_scrub";
  const liveCount = videos.filter((video) => video.published).length;
  const stagedCount = videos.length - liveCount;

  const fetchVideos = () => {
    setLoading(true);
    api.videos.list(slot).then(setVideos).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchVideos(); }, [slot]);

  const upload = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    const invalidFile = files.find((file) => !["mp4", "webm"].includes(file.name.split(".").pop().toLowerCase()));
    if (invalidFile) {
      setError(`${invalidFile.name} is not supported. Use MP4 or WebM.`);
      setMessage("");
      return;
    }

    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const totalMB = (totalSize / (1024 * 1024)).toFixed(1);
    if (totalMB > 200) {
      setError(`Total size (${totalMB} MB) exceeds recommended limit. Try splitting into smaller files.`);
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setValidations(null);
    setError("");
    setMessage(`Uploading ${totalMB} MB…`);

    try {
      const fd = new FormData();
      files.forEach((file) => fd.append(files.length === 1 ? "file" : "files", file));
      fd.append("slot", slot);

      const result = await api.videos.upload(fd, (pct) => setUploadProgress(pct));
      setUploadProgress(100);
      setValidations(result.validations);
      setMessage(`✓ ${files.length} video${files.length === 1 ? "" : "s"} uploaded${isMotionSlot ? " and published" : " as staged"}.`);
      fetchVideos();
      setTimeout(() => setUploadProgress(0), 1000);
    } catch (err) {
      setError(`Upload failed: ${err.message}. For large videos (>100 MB), try one at a time.`);
    } finally {
      setUploading(false);
    }
  };

  const addVimeo = async () => {
    const id = vimeoId;
    if (!id) { setError("Paste a valid Vimeo URL first."); return; }
    setUploading(true);
    setError("");
    setMessage("");
    try {
      const fd = new FormData();
      fd.append("vimeo_id", id);
      fd.append("slot", slot);
      await api.videos.upload(fd, () => {});
      setMessage(`✓ Vimeo video added${isMotionSlot ? " and published" : " as staged"}.`);
      setVimeoInput("");
      setVimeoId(null);
      fetchVideos();
    } catch (err) {
      setError(`Failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const removeVideo = (video) => {
    const shouldRemove = window.confirm("Remove this video from the dashboard?");
    if (!shouldRemove) return;
    api.videos.remove(video.id).then(fetchVideos).catch((err) => setError(`Remove failed: ${err.message}`));
  };

  return (
    <section className={`adm-video-manager ${isMotionSlot ? "is-motion-slot" : "is-single-slot"}`}>
      <div className="adm-video-manager-head">
        <div>
          <p className="adm-video-kicker">{slot}</p>
          <h3>{label}</h3>
          {notes && <p>{notes}</p>}
        </div>
        <div className="adm-video-counts" aria-label={`${videos.length} videos, ${liveCount} live`}>
          <span>{videos.length}<small>Total</small></span>
          <span>{liveCount}<small>Live</small></span>
          <span>{stagedCount}<small>Staged</small></span>
        </div>
      </div>

      <div className="adm-panel-card">
        <div className="adm-video-workspace">
          <div className="adm-video-upload-panel">

            {/* Tab bar — hide Vimeo tab for scroll_scrub */}
            {vimeoAllowed && (
              <div className="adm-video-tabs">
                <button
                  type="button"
                  className={`adm-video-tab${uploadTab === "vimeo" ? " is-active" : ""}`}
                  onClick={() => { setUploadTab("vimeo"); setError(""); setMessage(""); }}
                >
                  <span>🎬</span> Vimeo URL
                </button>
                <button
                  type="button"
                  className={`adm-video-tab${uploadTab === "file" ? " is-active" : ""}`}
                  onClick={() => { setUploadTab("file"); setError(""); setMessage(""); }}
                >
                  <span>⬆</span> Upload File
                </button>
              </div>
            )}

            {/* ── Vimeo tab ── */}
            {uploadTab === "vimeo" && vimeoAllowed ? (
              <div className="adm-vimeo-tab">
                <p className="adm-vimeo-hint">
                  Paste any Vimeo link — the video streams from Vimeo's CDN, zero storage cost.
                </p>
                <input
                  className="adm-vimeo-input"
                  type="url"
                  placeholder="https://vimeo.com/123456789"
                  value={vimeoInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setVimeoInput(val);
                    setVimeoId(extractVimeoId(val));
                  }}
                />
                {vimeoId && (
                  <div className="adm-vimeo-preview">
                    <iframe
                      src={`https://player.vimeo.com/video/${vimeoId}?autoplay=0&title=0&byline=0&portrait=0`}
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                      title="Vimeo preview"
                    />
                    <p className="adm-vimeo-preview-label">ID: {vimeoId} — looks good?</p>
                  </div>
                )}
                <button
                  className="adm-btn adm-btn-primary adm-vimeo-submit"
                  type="button"
                  disabled={!vimeoId || uploading}
                  onClick={addVimeo}
                >
                  {uploading ? "Saving…" : "Add Vimeo video →"}
                </button>
              </div>
            ) : (
              /* ── File upload tab ── */
              <div
                className={`adm-video-upload${dragOver ? " is-dragging" : ""}${uploading ? " is-uploading" : ""}`}
                onClick={() => inputRef.current?.click()}
                onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(event) => { event.preventDefault(); setDragOver(false); upload(event.dataTransfer.files); }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") { event.preventDefault(); inputRef.current?.click(); }
                }}
                role="button"
                tabIndex={0}
              >
                <span className="adm-video-upload-icon">{uploading ? "⦘" : "+"}</span>
                <strong>{uploading ? `Uploading ${Math.round(uploadProgress)}%` : "Add video"}</strong>
                <p>{isMotionSlot ? "Drop multiple project videos here." : "Drop the replacement video here."}</p>
                <small>{isMotionSlot ? "Auto-publishes to the landing carousel." : "Upload stays staged until you publish it."}</small>
                {uploading && (
                  <div className="adm-video-progress-container">
                    <div className="adm-video-progress-bar">
                      <div className="adm-video-progress-fill" style={{ width: `${Math.round(uploadProgress)}%` }} />
                    </div>
                  </div>
                )}
                <input
                  ref={inputRef}
                  type="file"
                  multiple={isMotionSlot}
                  accept="video/mp4,video/webm"
                  onChange={(event) => { upload(event.target.files); event.target.value = ""; }}
                />
              </div>
            )}
          </div>

          <div className="adm-video-library">
          <div className="adm-video-library-head">
            <div>
              <strong>Library</strong>
              <span>{isMotionSlot ? "Multiple live videos allowed" : "One live video at a time"}</span>
            </div>
            <button className="adm-video-refresh" type="button" onClick={fetchVideos}>
              Refresh
            </button>
          </div>

          {message && <p className="adm-video-message adm-video-message-ok">{message}</p>}
          {error && <p className="adm-video-message adm-video-message-error">{error}</p>}

          {validations && (
            <div className="adm-video-validations">
              {Object.entries(validations).map(([key, val]) => (
                <div key={key} className={`adm-validation-row${val.pass ? " pass" : " fail"}`}>
                  <span>{val.pass ? "OK" : "Fix"}</span>
                  <span>{VALIDATION_LABELS[key] ?? key}</span>
                </div>
              ))}
            </div>
          )}

          {loading ? (
            <div className="adm-video-empty">Loading videos...</div>
          ) : videos.length > 0 ? (
            <div className="adm-video-card-grid">
              {videos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  isMotionSlot={isMotionSlot}
                  onPublish={() => api.videos.publish(video.id).then(fetchVideos).catch((err) => setError(`Publish failed: ${err.message}`))}
                  onRemove={() => removeVideo(video)}
                />
              ))}
            </div>
          ) : (
            <div className="adm-video-empty">
              <strong>No videos yet</strong>
              <span>Upload one to activate this slot.</span>
            </div>
          )}
          </div>
        </div>
      </div>
    </section>
  );
}

function VideoCard({ video, isMotionSlot, onPublish, onRemove }) {
  const isVimeo = typeof video.url === "string" && video.url.includes("player.vimeo.com");
  const dimensions = video.resolution_width && video.resolution_height
    ? `${video.resolution_width}x${video.resolution_height}`
    : isVimeo ? "Vimeo CDN" : "Auto";

  return (
    <article className="adm-video-card">
      <div className="adm-video-preview">
        {isVimeo ? (
          <iframe
            className="adm-video-card-player"
            src={`${video.url}?title=0&byline=0&portrait=0`}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title="Vimeo preview"
          />
        ) : (
          <video
            className="adm-video-card-player"
            src={video.url}
            controls
            muted
            playsInline
            preload="metadata"
          />
        )}
        <span className={`adm-video-status ${video.published ? "is-live" : "is-staged"}`}>
          {video.published ? "Live" : "Staged"}
        </span>
        {isVimeo && <span className="adm-video-status-vimeo">Vimeo</span>}
      </div>

      <div className="adm-video-card-body">
        <div className="adm-video-card-meta">
          <span>{Number(video.duration_seconds || 0).toFixed(1)}s</span>
          <span>{video.fps || 0}fps</span>
          <span>{dimensions}</span>
        </div>
        <p>Uploaded {formatDate(video.uploaded_at)}</p>
        <code>{video.url}</code>
      </div>

      <div className="adm-video-card-actions">
        {!video.published && (
          <button className="adm-btn adm-btn-primary" type="button" onClick={onPublish}>
            Publish
          </button>
        )}
        {video.published && !isMotionSlot && (
          <span className="adm-video-live-note">Current live video</span>
        )}
        <button className="adm-btn adm-btn-danger" type="button" onClick={onRemove}>
          Remove
        </button>
      </div>
    </article>
  );
}
