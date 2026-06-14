import { useRef, useState } from "react";
import { SLOTS } from "../data/slots.js";
import SlotSelector from "./SlotSelector.jsx";
import { api } from "../api.js";

// allowedSlots: string[] - if provided, only these slot IDs appear in the dropdown
export default function UploadZone({ onUploaded, allowedSlots = null }) {
  const [files, setFiles] = useState([]);
  const [preview, setPreview] = useState(null);
  const [dims, setDims] = useState([]);
  const availableSlots = allowedSlots
    ? SLOTS.filter((s) => allowedSlots.includes(s.id))
    : SLOTS;
  const [slot, setSlot] = useState((allowedSlots ? availableSlots[0]?.id : SLOTS[0].id) ?? SLOTS[0].id);
  const [category, setCategory] = useState("brands");
  const [title, setTitle] = useState("");
  const [altText, setAltText] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [publishNow, setPublishNow] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const readImageDims = (file) =>
    new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({
          name: file.name,
          w: img.naturalWidth,
          h: img.naturalHeight,
          size: file.size,
        });
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ name: file.name, w: 0, h: 0, size: file.size });
      };

      img.src = url;
    });

  const acceptFiles = async (fileList) => {
    const imageFiles = Array.from(fileList || []).filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length === 0) return;

    setFiles(imageFiles);
    setUploadProgress(0);
    setUploadStatus("");

    const reader = new FileReader();
    reader.onload = (event) => setPreview(event.target.result);
    reader.readAsDataURL(imageFiles[0]);

    setDims(await Promise.all(imageFiles.map(readImageDims)));
  };

  const onDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    acceptFiles(event.dataTransfer.files);
  };

  const resetForm = () => {
    setFiles([]);
    setPreview(null);
    setDims([]);
    setTitle("");
    setAltText("");
    setSortOrder(0);
    setUploadProgress(0);
    setUploadStatus("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const slotSpec = SLOTS.find((s) => s.id === slot);
  const isCompareSlot = slot === "compare_before" || slot === "compare_after" || slot === "color_before" || slot === "color_after";
  const mismatchCount =
    slotSpec && dims.length
      ? dims.filter((item) => item.w !== slotSpec.width || item.h !== slotSpec.height).length
      : 0;
  const totalSize = dims.reduce((sum, item) => sum + item.size, 0);
  const selectedCount = files.length;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadStatus(`Uploading 1 of ${files.length}`);

    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const fd = new FormData();
        const numberedTitle = title && files.length > 1 ? `${title} ${index + 1}` : title;
        const numberedAlt = files.length > 1 ? `${altText} ${index + 1}` : altText;

        fd.append("file", file);
        fd.append("slot", slot);
        if (!isCompareSlot) fd.append("category", category);
        fd.append("title", numberedTitle);
        fd.append("alt_text", numberedAlt);
        fd.append("sort_order", String(sortOrder + index));
        fd.append("published", String(publishNow));

        setUploadStatus(`Uploading ${index + 1} of ${files.length}: ${file.name}`);
        await api.photos.upload(fd);
        setUploadProgress(Math.round(((index + 1) / files.length) * 100));
      }

      setUploadStatus(`Uploaded ${files.length} photo${files.length === 1 ? "" : "s"}`);
      onUploaded?.();

      setTimeout(resetForm, 800);
    } catch (err) {
      alert("Upload failed: " + err.message);
      setUploadStatus("");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="adm-panel-card">
      <form className="adm-upload-form" onSubmit={handleSubmit}>
        <div
          className={`adm-dropzone${dragOver ? " drag-over" : ""}${selectedCount ? " has-file" : ""}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          {preview ? (
            <>
              <img className="adm-dropzone-preview" src={preview} alt="Preview" />
              <p>
                {selectedCount} image{selectedCount === 1 ? "" : "s"} selected.
                Click or drop again to replace the batch.
              </p>
            </>
          ) : (
            <>
              <span className="adm-dropzone-icon">+</span>
              <p>Drag &amp; drop images, or click to browse</p>
              <small>Select more than one photo to upload a batch.</small>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={(event) => acceptFiles(event.target.files)}
          />
        </div>

        {dims.length > 0 && (
          <div className="adm-upload-dims">
            <div>
              {selectedCount} photo{selectedCount === 1 ? "" : "s"} selected
              {" · "}
              {(totalSize / 1024 / 1024).toFixed(2)} MB total
            </div>
            <div>
              First image: {dims[0].w} x {dims[0].h} px
              {" · "}
              {(dims[0].size / 1024).toFixed(0)} KB
            </div>
          </div>
        )}

        {mismatchCount > 0 && (
          <div className="adm-upload-warn">
            {mismatchCount} selected image{mismatchCount === 1 ? "" : "s"} do not match this slot.
            Expected {slotSpec.width}x{slotSpec.height}px.
          </div>
        )}

        <div className="adm-upload-fields">
          <label className="adm-field">
            <span>Assign to slot</span>
            <SlotSelector value={slot} onChange={setSlot} allowedSlots={availableSlots} />
          </label>

          <label className="adm-field">
            <span>Alt text <em>(required)</em></span>
            <input
              type="text"
              value={altText}
              required
              onChange={(event) => setAltText(event.target.value)}
              placeholder={selectedCount > 1 ? "Base alt text, number added automatically" : ""}
            />
          </label>

          <label className="adm-field">
            <span>Title</span>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={selectedCount > 1 ? "Base title, number added automatically" : ""}
            />
          </label>

          {isCompareSlot ? (
            <div className="adm-field adm-field-note">
              <span>Category</span>
              <p>Not required for before / after color grading images.</p>
            </div>
          ) : (
            <label className="adm-field">
              <span>Category</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
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
              onChange={(event) => setSortOrder(Number(event.target.value))}
            />
          </label>

          <label className="adm-field adm-field-row">
            <input
              type="checkbox"
              checked={publishNow}
              onChange={(event) => setPublishNow(event.target.checked)}
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
            <p className="adm-upload-progress-text">
              {uploadStatus || `${Math.round(uploadProgress)}%`}
            </p>
          </div>
        )}

        <button
          className="adm-btn adm-btn-primary"
          type="submit"
          disabled={files.length === 0 || !altText || uploading}
        >
          {uploading
            ? `Uploading ${Math.round(uploadProgress)}%...`
            : `Upload ${selectedCount || ""} photo${selectedCount === 1 ? "" : "s"} ->`}
        </button>
      </form>
    </div>
  );
}
