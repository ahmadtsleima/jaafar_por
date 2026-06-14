import { useEffect, useRef, useState } from "react";
import { SLOTS } from "../data/slots.js";
import SlotSelector from "./SlotSelector.jsx";
import { api } from "../api.js";

const LEGACY_CATEGORY_OPTIONS = [
  { value: "brands", label: "Brands" },
  { value: "filmmaking", label: "Filmmaking" },
  { value: "commercial", label: "Commercial" },
  { value: "fashion", label: "Fashion" },
];

const PHOTOGRAPHY_CATEGORY_OPTIONS = [
  { value: "fnb", label: "Food & Beverage" },
  { value: "commercial_photography", label: "Commercial Photography" },
  { value: "jewelry_photography", label: "Jewelry Photography" },
  { value: "product_photography", label: "Product Photography" },
];

const categoryFromSlot = (slot) => {
  if (slot === "photo_fnb") return "fnb";
  if (slot === "photo_commercial") return "commercial_photography";
  if (slot === "photo_jewelry") return "jewelry_photography";
  if (slot === "photo_product") return "product_photography";
  return "brands";
};

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif", "heic", "heif", "tif", "tiff"]);

const isImageFile = (file) => {
  const ext = file.name.split(".").pop()?.toLowerCase();
  return file.type.startsWith("image/") || IMAGE_EXTENSIONS.has(ext);
};

const textFromFilename = (filename) =>
  filename
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };

    img.src = url;
  });

const canvasToBlob = (canvas, type, quality) =>
  new Promise((resolve) => canvas.toBlob(resolve, type, quality));

const optimizePhotographyImage = async (file, slotSpec, slot) => {
  if (!slot.startsWith("photo_")) return file;
  if (file.type === "image/gif") return file;

  const targetWidth = slotSpec?.width || 1080;
  const targetHeight = slotSpec?.height || 1350;

  try {
    const img = await loadImage(file);
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return file;

    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    const scale = Math.max(targetWidth / img.naturalWidth, targetHeight / img.naturalHeight);
    const sourceWidth = targetWidth / scale;
    const sourceHeight = targetHeight / scale;
    const sourceX = Math.max((img.naturalWidth - sourceWidth) / 2, 0);
    const sourceY = Math.max((img.naturalHeight - sourceHeight) / 2, 0);

    ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight);

    const blob = await canvasToBlob(canvas, "image/jpeg", 0.86);
    if (!blob) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "") || "photography";
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
};

// allowedSlots: string[] - if provided, only these slot IDs appear in the dropdown
export default function UploadZone({ onUploaded, allowedSlots = null }) {
  const [files, setFiles] = useState([]);
  const [preview, setPreview] = useState(null);
  const [dims, setDims] = useState([]);
  const availableSlots = allowedSlots
    ? SLOTS.filter((s) => allowedSlots.includes(s.id))
    : SLOTS;
  const initialSlot = (allowedSlots ? availableSlots[0]?.id : SLOTS[0].id) ?? SLOTS[0].id;
  const [slot, setSlot] = useState(initialSlot);
  const [category, setCategory] = useState(categoryFromSlot(initialSlot));
  const [title, setTitle] = useState("");
  const [altText, setAltText] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [publishNow, setPublishNow] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);
  const isPhotographySlot = slot.startsWith("photo_");
  const categoryOptions = isPhotographySlot ? PHOTOGRAPHY_CATEGORY_OPTIONS : LEGACY_CATEGORY_OPTIONS;

  useEffect(() => {
    const nextCategory = categoryFromSlot(slot);
    if (isPhotographySlot || !categoryOptions.some((option) => option.value === category)) {
      setCategory(nextCategory);
    }
  }, [slot]);

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
    const imageFiles = Array.from(fileList || []).filter(isImageFile);
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
        const baseText = altText.trim() || title.trim() || textFromFilename(file.name) || "Portfolio image";
        const numberedTitle = title && files.length > 1 ? `${title} ${index + 1}` : title;
        const numberedAlt = files.length > 1 ? `${baseText} ${index + 1}` : baseText;
        const startProgress = (index / files.length) * 100;

        setUploadStatus(`Preparing ${index + 1} of ${files.length}: ${file.name}`);
        setUploadProgress(Math.round(startProgress));
        const uploadFile = await optimizePhotographyImage(file, slotSpec, slot);
        const savedMB = Math.max(file.size - uploadFile.size, 0) / 1024 / 1024;
        const uploadName = uploadFile.name || file.name;

        fd.append("file", uploadFile);
        fd.append("slot", slot);
        if (!isCompareSlot) fd.append("category", category);
        fd.append("title", numberedTitle);
        fd.append("alt_text", numberedAlt);
        fd.append("sort_order", String(sortOrder + index));
        fd.append("published", String(publishNow));

        setUploadStatus(
          savedMB > 0.05
            ? `Uploading ${index + 1} of ${files.length}: ${uploadName} (${savedMB.toFixed(1)} MB optimized)`
            : `Uploading ${index + 1} of ${files.length}: ${uploadName}`,
        );
        await api.photos.upload(fd, (pct) => {
          const nextProgress = ((index + pct / 100) / files.length) * 100;
          setUploadProgress(Math.round(nextProgress));
        });
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
            <span>Alt text <em>(optional)</em></span>
            <input
              type="text"
              value={altText}
              onChange={(event) => setAltText(event.target.value)}
              placeholder={selectedCount > 1 ? "Optional - filename used if empty" : "Optional - filename used if empty"}
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
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
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
          disabled={files.length === 0 || uploading}
        >
          {uploading
            ? `Uploading ${Math.round(uploadProgress)}%...`
            : `Upload ${selectedCount || ""} photo${selectedCount === 1 ? "" : "s"} ->`}
        </button>
      </form>
    </div>
  );
}
