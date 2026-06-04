import { useState, useRef, useEffect } from "react";
import { SLOTS } from "../data/slots.js";
import SlotSelector from "./SlotSelector.jsx";
import { api } from "../api.js";
import imageCompression from "browser-image-compression";

export default function UploadZone({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [originalFile, setOriginalFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dims, setDims] = useState(null);
  const [slot, setSlot] = useState(SLOTS[0].id);
  const [category, setCategory] = useState("brands");
  const [title, setTitle] = useState("");
  const [altText, setAltText] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [publishNow, setPublishNow] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [savedBytes, setSavedBytes] = useState(0);
  const inputRef = useRef(null);

  const acceptFile = async (f) => {
    if (!f || !f.type.startsWith("image/")) return;
    setOriginalFile(f);
    setCompressing(true);
    setSavedBytes(0);

    try {
      // Compress image client-side
      const options = {
        maxSizeMB: 2,
        maxWidthOrHeight: 4000,
        useWebWorker: true,
        alwaysKeepResolution: true,
        fileType: "image/webp",
      };

      const compressed = await imageCompression(f, options);
      const originalSize = f.size;
      const compressedSize = compressed.size;
      const saved = originalSize - compressedSize;
      setSavedBytes(saved);

      // Create new File object with WebP type
      const webpFile = new File([compressed], f.name.replace(/\.[^.]+$/, ".webp"), {
        type: "image/webp",
      });

      setFile(webpFile);

      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(webpFile);

      const img = new Image();
      img.onload = () =>
        setDims({ w: img.naturalWidth, h: img.naturalHeight, size: compressedSize, original: originalSize });
      img.src = URL.createObjectURL(webpFile);
    } catch (err) {
      console.error("Compression failed:", err);
      // Fallback to original file if compression fails
      setFile(f);
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(f);
      const img = new Image();
      img.onload = () => setDims({ w: img.naturalWidth, h: img.naturalHeight, size: f.size });
      img.src = URL.createObjectURL(f);
    } finally {
      setCompressing(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    acceptFile(e.dataTransfer.files[0]);
  };

  const slotSpec = SLOTS.find((s) => s.id === slot);
  const isCompareSlot = slot === "compare_before" || slot === "compare_after";
  const dimMismatch =
    dims &&
    slotSpec &&
    (dims.w !== slotSpec.width || dims.h !== slotSpec.height);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("slot", slot);
      if (!isCompareSlot) fd.append("category", category);
      fd.append("title", title);
      fd.append("alt_text", altText);
      fd.append("sort_order", String(sortOrder));
      fd.append("published", String(publishNow));

      // Simulate progress (0-90% during upload, complete at 100%)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + Math.random() * 20, 90));
      }, 300);

      await api.photos.upload(fd);
      clearInterval(progressInterval);
      setUploadProgress(100);
      onUploaded?.();

      // Reset form
      setTimeout(() => {
        setFile(null);
        setOriginalFile(null);
        setPreview(null);
        setDims(null);
        setTitle("");
        setAltText("");
        setSortOrder(0);
        setUploadProgress(0);
        setSavedBytes(0);
      }, 800);
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form className="adm-upload-form" onSubmit={handleSubmit}>
      <div
        className={`adm-dropzone${dragOver ? " drag-over" : ""}${file ? " has-file" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        {preview ? (
          <img className="adm-dropzone-preview" src={preview} alt="Preview" />
        ) : (
          <>
            <span className="adm-dropzone-icon">⊞</span>
            <p>Drag &amp; drop an image, or click to browse</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => acceptFile(e.target.files[0])}
        />
      </div>

      {dims && (
        <div className="adm-upload-dims">
          <div>{dims.w} × {dims.h} px · {(dims.size / 1024).toFixed(0)} KB</div>
          {dims.original && savedBytes > 0 && (
            <div className="adm-upload-savings">
              ✓ Compressed: {(dims.original / 1024).toFixed(0)} KB → {(dims.size / 1024).toFixed(0)} KB (saved {(savedBytes / 1024).toFixed(0)} KB)
            </div>
          )}
        </div>
      )}

      {compressing && (
        <div className="adm-upload-status">
          <span>Compressing image...</span>
        </div>
      )}

      {dimMismatch && (
        <div className="adm-upload-warn">
          ⚠ This slot expects {slotSpec.width}×{slotSpec.height}px — your image is {dims.w}×{dims.h}px. Consider resizing.
        </div>
      )}

      <div className="adm-upload-fields">
        <label className="adm-field">
          <span>Assign to slot</span>
          <SlotSelector value={slot} onChange={setSlot} />
        </label>

        <label className="adm-field">
          <span>Alt text <em>(required)</em></span>
          <input
            type="text"
            value={altText}
            required
            onChange={(e) => setAltText(e.target.value)}
          />
        </label>

        <label className="adm-field">
          <span>Title</span>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>

        {isCompareSlot ? (
          <div className="adm-field adm-field-note">
            <span>Category</span>
            <p>Not required for before / after color grading images.</p>
          </div>
        ) : (
          <label className="adm-field">
            <span>Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="brands">Brands</option>
              <option value="filmmaking">Filmmaking</option>
              <option value="commercial">Commercial</option>
              <option value="fashion">Fashion</option>
            </select>
          </label>
        )}

        <label className="adm-field">
          <span>Sort order</span>
          <input
            type="number"
            value={sortOrder}
            min={0}
            onChange={(e) => setSortOrder(Number(e.target.value))}
          />
        </label>

        <label className="adm-field adm-field-row">
          <input
            type="checkbox"
            checked={publishNow}
            onChange={(e) => setPublishNow(e.target.checked)}
          />
          <span>Publish immediately</span>
        </label>
      </div>

      {uploading && (
        <div className="adm-upload-progress-container">
          <div className="adm-upload-progress-bar">
            <div
              className="adm-upload-progress-fill"
              style={{ width: `${Math.round(uploadProgress)}%` }}
            />
          </div>
          <p className="adm-upload-progress-text">{Math.round(uploadProgress)}%</p>
        </div>
      )}

      <button
        className="adm-btn adm-btn-primary"
        type="submit"
        disabled={!file || !altText || uploading || compressing}
      >
        {uploading ? `Uploading ${Math.round(uploadProgress)}%…` : compressing ? "Compressing…" : "Upload photo →"}
      </button>
    </form>
  );
}
