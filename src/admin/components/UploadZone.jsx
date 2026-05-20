import { useState, useRef } from "react";
import { SLOTS } from "../data/slots.js";
import SlotSelector from "./SlotSelector.jsx";
import { api } from "../api.js";

export default function UploadZone({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dims, setDims] = useState(null);
  const [slot, setSlot] = useState(SLOTS[0].id);
  const [category, setCategory] = useState("brands");
  const [title, setTitle] = useState("");
  const [altText, setAltText] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [publishNow, setPublishNow] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const acceptFile = (f) => {
    if (!f || !f.type.startsWith("image/")) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(f);
    const img = new Image();
    img.onload = () => setDims({ w: img.naturalWidth, h: img.naturalHeight, size: f.size });
    img.src = URL.createObjectURL(f);
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
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("slot", slot);
      if (!isCompareSlot) fd.append("category", category);
      fd.append("title", title);
      fd.append("alt_text", altText);
      fd.append("sort_order", String(sortOrder));
      fd.append("published", String(publishNow));
      await api.photos.upload(fd);
      onUploaded?.();
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
          {dims.w} × {dims.h} px · {(dims.size / 1024).toFixed(0)} KB
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

      <button
        className="adm-btn adm-btn-primary"
        type="submit"
        disabled={!file || !altText || uploading}
      >
        {uploading ? "Uploading…" : "Upload photo →"}
      </button>
    </form>
  );
}
