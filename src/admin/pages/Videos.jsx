import VideoManager from "../components/VideoManager.jsx";
import { VIDEO_SLOTS } from "../data/slots.js";

export default function Videos() {
  const motionSlots = VIDEO_SLOTS.filter((slot) => slot.id.startsWith("motion_"));
  const systemSlots = VIDEO_SLOTS.filter((slot) => !slot.id.startsWith("motion_"));

  return (
    <div className="adm-video-page">
      <section className="adm-video-page-hero">
        <div>
          <p className="adm-video-kicker">Media control</p>
          <h1>Video Library</h1>
          <p>
            Upload stop-motion reels, landing page motion projects, and section videos from one focused workspace.
          </p>
        </div>
        <div className="adm-video-page-help">
          <span>Motion categories accept multiple videos.</span>
          <span>Reel Showcase scrolls horizontally on the page.</span>
        </div>
      </section>

      <section className="adm-video-group" aria-labelledby="showcase-videos-title">
        <div className="adm-video-group-head">
          <p className="adm-video-kicker">Home page · horizontal reel</p>
          <h2 id="showcase-videos-title">Reel Showcase</h2>
        </div>
        <div className="adm-video-manager-stack">
          {systemSlots.filter((s) => s.id === "reel_showcase").map((slot) => (
            <VideoManager key={slot.id} slot={slot.id} label={slot.label} notes={slot.notes} />
          ))}
        </div>
      </section>

      <section className="adm-video-group" aria-labelledby="motion-videos-title">
        <div className="adm-video-group-head">
          <p className="adm-video-kicker">Landing page carousel</p>
          <h2 id="motion-videos-title">Motion Projects</h2>
        </div>
        <div className="adm-video-manager-stack adm-video-manager-stack-motion">
          {motionSlots.map((slot) => (
            <VideoManager key={slot.id} slot={slot.id} label={slot.label} notes={slot.notes} />
          ))}
        </div>
      </section>

      <section className="adm-video-group" aria-labelledby="system-videos-title">
        <div className="adm-video-group-head">
          <p className="adm-video-kicker">Single video slots</p>
          <h2 id="system-videos-title">Other Slots</h2>
        </div>
        <div className="adm-video-manager-stack">
          {systemSlots.filter((s) => s.id !== "reel_showcase").map((slot) => (
            <VideoManager key={slot.id} slot={slot.id} label={slot.label} notes={slot.notes} />
          ))}
        </div>
      </section>
    </div>
  );
}
