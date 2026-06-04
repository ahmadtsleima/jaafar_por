import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";

const VALIDATION_LABELS = {
  format: "Format",
  duration: "Duration",
  resolution: "Resolution",
};

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
  const inputRef = useRef(null);
  const isMotionSlot = slot.startsWith("motion_");
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

    // Check file sizes and warn if large
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const totalMB = (totalSize / (1024 * 1024)).toFixed(1);
    if (totalMB > 200) {
      setError(`Total size (${totalMB} MB) exceeds recommended limit. Videos may take 2-5+ minutes to upload. Try splitting into smaller files.`);
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setValidations(null);
    setError("");
    setMessage(`Uploading ${totalMB} MB...`);

    try {
      const fd = new FormData();
      files.forEach((file) => fd.append(files.length === 1 ? "file" : "files", file));
      fd.append("slot", slot);
      
      // Simulate progress (0-90% during upload)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + Math.random() * 15, 90));
      }, 500);

      const result = await api.videos.upload(fd);
      clearInterval(progressInterval);
      setUploadProgress(100);
      setValidations(result.validations);
      setMessage(`✓ ${files.length} video${files.length === 1 ? "" : "s"} uploaded${isMotionSlot ? " and published" : " as staged"}.`);
      fetchVideos();
      
      setTimeout(() => {
        setUploadProgress(0);
      }, 1000);
    } catch (err) {
      setError(`Upload failed: ${err.message}. For large videos (>100 MB), try uploading one at a time.`);
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

      <div className="adm-video-workspace">
        <div
          className={`adm-video-upload${dragOver ? " is-dragging" : ""}${uploading ? " is-uploading" : ""}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => { event.preventDefault(); setDragOver(false); upload(event.dataTransfer.files); }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              inputRef.current?.click();
            }
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
                <div
                  className="adm-video-progress-fill"
                  style={{ width: `${Math.round(uploadProgress)}%` }}
                />
              </div>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            multiple={isMotionSlot}
            accept="video/mp4,video/webm"
            onChange={(event) => {
              upload(event.target.files);
              event.target.value = "";
            }}
          />
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
    </section>
  );
}

function VideoCard({ video, isMotionSlot, onPublish, onRemove }) {
  const dimensions = video.resolution_width && video.resolution_height
    ? `${video.resolution_width}x${video.resolution_height}`
    : "Auto";

  return (
    <article className="adm-video-card">
      <div className="adm-video-preview">
        <video
          className="adm-video-card-player"
          src={video.url}
          controls
          muted
          playsInline
          preload="metadata"
        />
        <span className={`adm-video-status ${video.published ? "is-live" : "is-staged"}`}>
          {video.published ? "Live" : "Staged"}
        </span>
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
