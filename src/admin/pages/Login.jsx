import { useState, useRef } from "react";
import { api, setToken } from "../api.js";

export default function Login({ onSuccess }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(false);
    setLoading(true);

    try {
      const data = await api.login(password);
      setToken(data.token);
      onSuccess();
    } catch {
      setError(true);
      setPassword("");
      inputRef.current?.classList.add("adm-login-shake");
      setTimeout(() => inputRef.current?.classList.remove("adm-login-shake"), 400);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="adm-login">
      <div className="adm-login-card">
        <div className="adm-login-mono">JS</div>
        <form className="adm-login-form" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            className={`adm-login-input${error ? " adm-login-error" : ""}`}
            type="password"
            placeholder="Password"
            value={password}
            autoFocus
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="adm-login-btn" type="submit" disabled={loading || !password}>
            {loading ? "…" : "→"}
          </button>
        </form>
        {error && <p className="adm-login-msg">Incorrect password</p>}
      </div>
    </div>
  );
}
