import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";

export default function Texts() {
  const [fields, setFields] = useState([]);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.content
      .list()
      .then((data) => {
        const nextFields = data.fields || [];
        setFields(nextFields);
        setValues(Object.fromEntries(nextFields.map((field) => [field.key, field.value ?? ""])));
      })
      .catch((err) => setMessage(`Failed to load text: ${err.message}`))
      .finally(() => setLoading(false));
  }, []);

  const groupedFields = useMemo(() => {
    const groups = new Map();
    for (const field of fields) {
      if (!groups.has(field.section)) groups.set(field.section, []);
      groups.get(field.section).push(field);
    }
    return Array.from(groups.entries());
  }, [fields]);

  const updateValue = (key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setMessage("");
  };

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      await api.content.update(values);
      setMessage("Saved. Refresh the website to see the latest text.");
    } catch (err) {
      setMessage(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="adm-loading">Loading text...</div>;

  return (
    <div className="adm-text-page">
      <div className="adm-settings-hero">
        <p className="adm-settings-kicker">Website copy</p>
        <h1 className="adm-settings-title">Text Editor</h1>
        <p className="adm-settings-subtitle">
          Edit the public website text from here. Media, links, and layout stay controlled by the existing pages.
        </p>
      </div>

      <div className="adm-text-actions">
        {message && <span className="adm-text-message">{message}</span>}
        <button className="adm-btn adm-btn-primary" type="button" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save text"}
        </button>
      </div>

      <div className="adm-text-groups">
        {groupedFields.map(([section, sectionFields]) => (
          <section className="adm-settings-card" key={section}>
            <div className="adm-settings-card-head">
              <div className="adm-settings-card-icon">TXT</div>
              <div>
                <h2 className="adm-settings-card-title">{section}</h2>
                <p className="adm-settings-card-note">Public website text for this section.</p>
              </div>
            </div>
            <div className="adm-text-field-grid">
              {sectionFields.map((field) => (
                <label className="adm-field" key={field.key}>
                  <span>{field.label}</span>
                  {field.type === "textarea" ? (
                    <textarea
                      value={values[field.key] ?? ""}
                      onChange={(event) => updateValue(field.key, event.target.value)}
                      rows={4}
                    />
                  ) : (
                    <input
                      type="text"
                      value={values[field.key] ?? ""}
                      onChange={(event) => updateValue(field.key, event.target.value)}
                    />
                  )}
                  <em>{field.key}</em>
                </label>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
