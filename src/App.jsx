import { useEffect, useMemo, useRef, useState } from "react";

import { createPortal } from "react-dom";

const videoFilters = ["Brands", "Filmmaking", "Commercial", "Fashion"];

/** Returns true when the URL is a Vimeo embed URL */
const isVimeoUrl = (src) => typeof src === "string" && src.includes("player.vimeo.com");

/**
 * Build a Vimeo embed URL with the right params.
 * background=1  → auto-plays muted, no controls (for carousel preview)
 * autoplay=1    → full player with controls (for popup)
 */
function vimeoSrc(baseUrl, { background = false } = {}) {
  const url = new URL(baseUrl);
  if (background) {
    url.searchParams.set("background", "1");
    url.searchParams.set("autoplay", "1");
    url.searchParams.set("muted", "1");
    url.searchParams.set("loop", "1");
  } else {
    url.searchParams.set("autoplay", "1");
    url.searchParams.set("title", "0");
    url.searchParams.set("byline", "0");
    url.searchParams.set("portrait", "0");
  }
  return url.toString();
}

const mapRange = (value, inMin, inMax, outMin, outMax) => {
  if (value <= inMin) return outMin;
  if (value >= inMax) return outMax;
  const progress = (value - inMin) / (inMax - inMin);
  return outMin + (outMax - outMin) * progress;
};

const zoomImages = [];
const portfolioItems = [];
const motionItems = [];
let cachedHeroSrc = "";

const motionVideoSlots = {
  Brands: "motion_brands",
  Filmmaking: "motion_filmmaking",
  Commercial: "motion_commercial",
  Fashion: "motion_fashion",
};

const fallbackCompareItems = [];



function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("top");
  const headerRef = useRef(null);
  const progressBarRef = useRef(null);

  useEffect(() => {
    let scrollFrame = null;

    const updateScrollState = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;

      headerRef.current?.classList.toggle("is-scrolled", window.scrollY > 80);
      progressBarRef.current?.style.setProperty("--scroll-progress", `${Math.min(progress, 100)}%`);

      const vignette = document.getElementById("bottom-vignette");
      if (vignette) {
        const maxScroll = Math.max(scrollable, 1);
        const scrollPct = window.scrollY / maxScroll;

        if (window.scrollY > 80) {
          const intensity = Math.min(scrollPct * 2.5, 1);
          const blurVal = (2 + intensity * 12).toFixed(1);
          vignette.style.setProperty("--vignette-opacity", (0.32 + intensity * 0.42).toFixed(2));
          vignette.style.setProperty("--vignette-blur", `${blurVal}px`);
          vignette.style.setProperty("--vignette-height", `${170 + intensity * 90}px`);
          vignette.style.setProperty("--vignette-y", `${Math.round((1 - intensity) * 24)}px`);
          vignette.style.setProperty("--vignette-warmth", (0.025 + intensity * 0.035).toFixed(3));
          vignette.style.setProperty("--vignette-shade", (0.34 + intensity * 0.42).toFixed(3));
          vignette.style.setProperty("--vignette-softness", (0.25 + intensity * 0.45).toFixed(2));
        } else {
          vignette.style.setProperty("--vignette-opacity", "0");
          vignette.style.setProperty("--vignette-blur", "0px");
          vignette.style.setProperty("--vignette-height", "180px");
          vignette.style.setProperty("--vignette-y", "28px");
          vignette.style.setProperty("--vignette-warmth", "0.025");
          vignette.style.setProperty("--vignette-shade", "0.34");
          vignette.style.setProperty("--vignette-softness", "0");
        }
      }

      const navSections = ["top", "motion-design", "filmmaking", "color-grading", "photography", "lighting"];
      const currentSection =
        [...navSections].reverse().find((sectionId) => {
          const section = document.getElementById(sectionId);
          if (!section) return false;

          return section.getBoundingClientRect().top <= 120;
        }) || "top";
      setActiveSection((section) => (section === currentSection ? section : currentSection));
    };

    const requestScrollUpdate = () => {
      if (scrollFrame) return;

      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = null;
        updateScrollState();
      });
    };

    const tiltCards = document.querySelectorAll(".collection-list article");
    const cleanupTilt = [];

    tiltCards.forEach((item) => {
      const handlePointerMove = (event) => {
        const rect = item.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width - 0.5) * 8;
        const y = ((event.clientY - rect.top) / rect.height - 0.5) * -8;
        item.style.setProperty("--tilt-x", `${y}deg`);
        item.style.setProperty("--tilt-y", `${x}deg`);
      };
      const handlePointerLeave = () => {
        item.style.setProperty("--tilt-x", "0deg");
        item.style.setProperty("--tilt-y", "0deg");
      };

      item.addEventListener("pointermove", handlePointerMove);
      item.addEventListener("pointerleave", handlePointerLeave);
      cleanupTilt.push(() => {
        item.removeEventListener("pointermove", handlePointerMove);
        item.removeEventListener("pointerleave", handlePointerLeave);
      });
    });

    if ("IntersectionObserver" in window) {
      const revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              revealObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.18 },
      );

      document.querySelectorAll(".reveal-block").forEach((block) => revealObserver.observe(block));
      cleanupTilt.push(() => revealObserver.disconnect());

      const imageRevealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              imageRevealObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.16 },
      );

      document.querySelectorAll(".editorial-reveal").forEach((item) => imageRevealObserver.observe(item));
      cleanupTilt.push(() => imageRevealObserver.disconnect());
    } else {
      document.querySelectorAll(".reveal-block").forEach((block) => block.classList.add("is-visible"));
      document.querySelectorAll(".editorial-reveal").forEach((item) => item.classList.add("is-visible"));
    }

    window.addEventListener("scroll", requestScrollUpdate, { passive: true });
    window.addEventListener("resize", requestScrollUpdate);
    window.visualViewport?.addEventListener("resize", requestScrollUpdate, { passive: true });
    updateScrollState();

    return () => {
      if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
      window.removeEventListener("scroll", requestScrollUpdate);
      window.removeEventListener("resize", requestScrollUpdate);
      window.visualViewport?.removeEventListener("resize", requestScrollUpdate);
      cleanupTilt.forEach((cleanup) => cleanup());
    };
  }, []);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setIsMenuOpen(false);
    };
    const closeOnDesktop = () => {
      if (window.innerWidth > 900) setIsMenuOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", closeOnDesktop);

    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", closeOnDesktop);
    };
  }, []);

  useEffect(() => {
    headerRef.current?.classList.toggle("menu-open", isMenuOpen);
    document.body.classList.toggle("nav-menu-open", isMenuOpen);

    return () => {
      document.body.classList.remove("nav-menu-open");
    };
  }, [isMenuOpen]);

  const handleImageError = (event) => {
    event.currentTarget.closest(".collection-feature, .photo-card, .selected-carousel-card, .about-image, .spatial-fallback-card, .compare-widget")?.classList.add("image-fallback");
  };

  return (
    <>
      <div className="scroll-progress" aria-hidden="true">
        <span ref={progressBarRef} />
      </div>

      <Header
        headerRef={headerRef}
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        activeSection={activeSection}
      />

      <main id="top">
        <Hero onImageError={handleImageError} />
        <MotionDesignSection />
        <FilmmakingSection />
        <ColorGradingPortfolio onImageError={handleImageError} />
        <PhotographyPortfolio onImageError={handleImageError} />
        <LightingTechniquesSection onImageError={handleImageError} />
        <MiniFooter />
      </main>

    </>
  );
}

function Header({ headerRef, isMenuOpen, setIsMenuOpen, activeSection }) {
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className={`site-header${isMenuOpen ? " menu-open" : ""}`} ref={headerRef} aria-label="Primary navigation">
      <div className="nav-shell">
        <div className="nav-left">
          <a className="brand" href="#top" aria-label="Jaafar Sleiman home" onClick={closeMenu}>
            <strong>Jaafar Sleiman</strong>
          </a>

          <button
            className="menu-toggle"
            type="button"
            aria-controls="mobile-menu"
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path className="line line-top" d="M4 12H20" />
              <path className="line line-mid" d="M4 12H20" />
              <path className="line line-bot" d="M4 12H20" />
            </svg>
          </button>
        </div>

        <nav className="desktop-nav" aria-label="Desktop navigation">
          <a className="nav-link" href="#top" aria-current={activeSection === "top" ? "page" : undefined}>Home</a>
          <a className="nav-link" href="#motion-design" aria-current={activeSection === "motion-design" ? "page" : undefined}>Motion</a>
          <a className="nav-link" href="#filmmaking" aria-current={activeSection === "filmmaking" ? "page" : undefined}>Films</a>
          <a className="nav-link" href="#color-grading" aria-current={activeSection === "color-grading" ? "page" : undefined}>Color</a>
          <a className="nav-link" href="#photography" aria-current={activeSection === "photography" ? "page" : undefined}>Photo</a>
          <a className="nav-link" href="#lighting" aria-current={activeSection === "lighting" ? "page" : undefined}>Lighting</a>
        </nav>

        <div className="nav-actions">
          <a className="nav-ghost" href="https://www.instagram.com/" target="_blank" rel="noreferrer">Instagram</a>
          <a className="nav-cta" href="mailto:hello@jaafarsleiman.com">Book a Shoot</a>
        </div>
      </div>

      <nav className="mobile-menu" id="mobile-menu" aria-label="Mobile navigation" hidden={!isMenuOpen}>
        <div className="mobile-menu-inner">
          <span className="mobile-menu-kicker">Menu</span>
          <a href="#top" onClick={closeMenu}>Home</a>
          <a href="#motion-design" onClick={closeMenu}>Motion</a>
          <a href="#filmmaking" onClick={closeMenu}>Films</a>
          <a href="#color-grading" onClick={closeMenu}>Color</a>
          <a href="#photography" onClick={closeMenu}>Photo</a>
          <a href="#lighting" onClick={closeMenu}>Lighting</a>
        </div>
      </nav>
    </header>
  );
}

function Hero({ onImageError }) {
  const heroRef = useRef(null);
  const [heroSrc, setHeroSrc] = useState(() => cachedHeroSrc || sessionStorage.getItem("hero_background_src") || "");
  const [heroLoaded, setHeroLoaded] = useState(Boolean(cachedHeroSrc || sessionStorage.getItem("hero_background_src")));

  useEffect(() => {
    let isMounted = true;

    const useHeroSource = (src) => {
      if (!src) return;

      cachedHeroSrc = src;
      sessionStorage.setItem("hero_background_src", src);

      const image = new Image();
      image.decoding = "async";
      image.src = src;

      const commit = () => {
        if (!isMounted) return;
        setHeroSrc(src);
        setHeroLoaded(true);
      };

      if (image.complete) {
        commit();
      } else if (image.decode) {
        image.decode().then(commit).catch(commit);
      } else {
        image.onload = commit;
        image.onerror = commit;
      }
    };

    if (heroSrc) useHeroSource(heroSrc);

    fetch("/api/photos?slot=hero_background", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data[0]?.url) {
          useHeroSource(data[0].url);
        } else {
          cachedHeroSrc = "";
          sessionStorage.removeItem("hero_background_src");
          if (isMounted) {
            setHeroSrc("");
            setHeroLoaded(false);
          }
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let frame = null;

    const updateHeroScroll = () => {
      if (!heroRef.current) return;

      const rect = heroRef.current.getBoundingClientRect();
      const distance = Math.max(rect.height * 0.9, 1);
      const progress = Math.min(Math.max(-rect.top / distance, 0), 1);
      const fade = mapRange(progress, 0.08, 0.58, 1, 0);

      heroRef.current.style.setProperty("--hero-scroll", progress.toFixed(3));
      heroRef.current.style.setProperty("--hero-content-opacity", fade.toFixed(3));
      heroRef.current.style.setProperty("--hero-content-y", `${Math.round(progress * -64)}px`);
      heroRef.current.style.setProperty("--hero-meta-opacity", mapRange(progress, 0.02, 0.42, 1, 0).toFixed(3));
    };

    const requestUpdate = () => {
      if (frame) return;

      frame = window.requestAnimationFrame(() => {
        frame = null;
        updateHeroScroll();
      });
    };

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    updateHeroScroll();

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, []);

  return (
    <section className="hero" aria-labelledby="hero-title" ref={heroRef}>
      <div className="grain-overlay" aria-hidden="true" />
      <div className={`hero-media${heroSrc ? "" : " hero-media-empty"}${heroLoaded ? " is-loaded" : ""}`} aria-hidden="true">
        {heroSrc ? (
          <img
            src={heroSrc}
            alt=""
            loading="eager"
            fetchPriority="high"
            decoding="async"
            onError={onImageError}
          />
        ) : (
          <span />
        )}
      </div>
      <div className="hero-edge-blur" aria-hidden="true" />
      <div className="hero-content">
        <div className="hero-index" aria-hidden="true">
          <span>01</span>
          <span>Portfolio concept</span>
        </div>
        <p className="eyebrow">Editorial / Commercial / Cultural</p>
        <h1 id="hero-title">
          <span className="hero-name-line hero-name-line-1">Jaafar</span>
          <span className="hero-name-line hero-name-line-2">Sleiman</span>
        </h1>
        <p className="hero-copy">
          A black and white visual studio for quiet emotion, sharp light, and stories that feel composed without feeling staged.
        </p>
        <div className="hero-actions" aria-label="Hero actions">
          <a className="button button-primary" href="#work">View Work</a>
          <a className="button button-secondary" href="#contact">Start a Shoot</a>
        </div>
      </div>
      <aside className="hero-meta" aria-label="Studio highlights">
        <span>Brands &amp; Campaigns</span>
        <span>Fashion Editorial</span>
        <span>Events &amp; Culture</span>
      </aside>
      <div className="scroll-indicator" aria-hidden="true" />
    </section>
  );
}

const motionDesignSlots = ["motion_design", "motion_brands", "motion_commercial", "motion_fashion"];
const filmmakingSlots = ["filmmaking", "motion_filmmaking", "reel_showcase"];
const photoCategoryLabels = [
  "Food & Beverage",
  "Commercial Photography",
  "Jewelry Photography",
  "Product Photography",
];

const fetchJson = (url) =>
  fetch(url, { cache: "no-store" })
    .then((response) => (response.ok ? response.json() : null))
    .catch(() => null);

function useVideosFromSlots(slots) {
  const [videos, setVideos] = useState([]);

  useEffect(() => {
    let isMounted = true;

    Promise.all(slots.map((slot) => fetchJson(`/api/videos?slot=${slot}&all=1`)))
      .then((results) => {
        if (!isMounted) return;
        const nextVideos = results.flatMap((items, slotIndex) =>
          (Array.isArray(items) ? items : []).map((item, itemIndex) => ({
            ...item,
            slot: slots[slotIndex],
            title: item.title || `${slots[slotIndex].replaceAll("_", " ")} ${itemIndex + 1}`,
          })),
        );
        setVideos(nextVideos);
      });

    return () => {
      isMounted = false;
    };
  }, [slots.join("|")]);

  return videos;
}

function usePhotos() {
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    let isMounted = true;
    fetchJson("/api/photos").then((items) => {
      if (isMounted) setPhotos(Array.isArray(items) ? items : []);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return photos;
}

function SectionHeading({ kicker, title, children }) {
  return (
    <div className="cinema-heading">
      <p>{kicker}</p>
      <h2>{title}</h2>
      {children && <span>{children}</span>}
    </div>
  );
}

function CinematicVideo({ video, vertical = false, featured = false, label, autoPlay = false, onOpen }) {
  const videoRef = useRef(null);
  const src = video?.url || video?.src || "";

  const play = () => videoRef.current?.play?.().catch(() => {});
  const pause = () => {
    if (autoPlay) return;
    if (!videoRef.current) return;
    videoRef.current.pause();
    try { videoRef.current.currentTime = 0; } catch { /* metadata may not be ready */ }
  };

  useEffect(() => {
    if (!autoPlay || !src || isVimeoUrl(src)) return;
    play();
  }, [autoPlay, src]);

  const handleKeyDown = (event) => {
    if (!onOpen) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen(video);
    }
  };

  return (
    <article
      className={`cinema-video-card${vertical ? " is-vertical" : ""}${featured ? " is-featured" : ""}${onOpen ? " is-openable" : ""}`}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={() => src && onOpen?.(video)}
      onKeyDown={handleKeyDown}
    >
      <div className="cinema-video-frame">
        {src ? (
          isVimeoUrl(src) ? (
            <iframe
              src={vimeoSrc(src, { background: true })}
              title={video?.title || label || "Portfolio video"}
              loading="lazy"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video
              ref={videoRef}
              src={src}
              muted
              loop
              playsInline
              autoPlay={autoPlay}
              preload={featured || autoPlay ? "auto" : "metadata"}
              onCanPlay={autoPlay ? play : undefined}
              onPointerEnter={play}
              onPointerLeave={pause}
              onFocus={play}
              onBlur={pause}
            />
          )
        ) : (
          <div className="cinema-empty-media">Add video in admin</div>
        )}
        <span className="cinema-play-pulse" aria-hidden="true" />
      </div>
      <div className="cinema-video-meta">
        <span>{label || video?.slot?.replaceAll("_", " ") || "Film"}</span>
        <strong>{video?.title || "Untitled study"}</strong>
      </div>
    </article>
  );
}

function MotionDesignSection() {
  const videos = useVideosFromSlots(motionDesignSlots);
  const [activeVideo, setActiveVideo] = useState(null);
  const closeVideo = () => setActiveVideo(null);

  return (
    <section className="cinema-section cinema-motion" id="motion-design">
      <SectionHeading kicker="Vertical reels / 1080x1920" title="Motion Design">
        Designed for thumb-stopping vertical rhythm, kinetic cuts, and high-retention brand motion.
      </SectionHeading>
      <div className="motion-reel-grid">
        {(videos.length ? videos : Array.from({ length: 4 })).slice(0, 8).map((video, index) => (
          <CinematicVideo
            key={video?.id || `motion-placeholder-${index}`}
            video={video}
            vertical
            autoPlay
            onOpen={setActiveVideo}
            label={`Motion ${String(index + 1).padStart(2, "0")}`}
          />
        ))}
      </div>
      {activeVideo && createPortal(
        <div className="video-lightbox" role="dialog" aria-modal="true" aria-label="Motion Design video viewer">
          <button type="button" className="video-lightbox-backdrop" onClick={closeVideo} aria-label="Close video" />
          <figure>
            <button type="button" onClick={closeVideo} aria-label="Close video">Close</button>
            {isVimeoUrl(activeVideo.url || activeVideo.src) ? (
              <iframe
                src={vimeoSrc(activeVideo.url || activeVideo.src)}
                title={activeVideo.title || "Motion Design video"}
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video src={activeVideo.url || activeVideo.src} controls autoPlay playsInline />
            )}
            <figcaption>{activeVideo.title || "Motion Design"}</figcaption>
          </figure>
        </div>,
        document.body,
      )}
    </section>
  );
}

function FilmmakingSection() {
  const videos = useVideosFromSlots(filmmakingSlots);

  return (
    <section className="cinema-section cinema-filmmaking" id="filmmaking">
      <SectionHeading kicker="Narrative / campaign / editorial" title="Filmmaking">
        Full-width cinematic work built around pacing, atmosphere, and visual storytelling.
      </SectionHeading>
      <div className="film-strip">
        {(videos.length ? videos : Array.from({ length: 3 })).slice(0, 5).map((video, index) => (
          <CinematicVideo
            key={video?.id || `film-placeholder-${index}`}
            video={video}
            featured={index === 0}
            label={`Scene ${String(index + 1).padStart(2, "0")}`}
          />
        ))}
      </div>
    </section>
  );
}

function ColorGradingPortfolio({ onImageError }) {
  const [items, setItems] = useState([]);
  const videos = useVideosFromSlots(["color_grading_video", "services_reel", "reel_showcase"]);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      fetchJson("/api/photos?slot=color_before"),
      fetchJson("/api/photos?slot=compare_before"),
      fetchJson("/api/photos?slot=color_after"),
      fetchJson("/api/photos?slot=compare_after"),
    ]).then(([colorBefore, compareBefore, colorAfter, compareAfter]) => {
      if (!isMounted) return;
      const beforePhotos = [...(Array.isArray(colorBefore) ? colorBefore : []), ...(Array.isArray(compareBefore) ? compareBefore : [])];
      const afterPhotos = [...(Array.isArray(colorAfter) ? colorAfter : []), ...(Array.isArray(compareAfter) ? compareAfter : [])];
      const pairCount = Math.min(beforePhotos.length, afterPhotos.length);
      const nextItems = Array.from({ length: pairCount }, (_, index) => ({
        before: beforePhotos[index].url,
        after: afterPhotos[index].url,
        title: afterPhotos[index].title || beforePhotos[index].title || `Grade ${index + 1}`,
        label: "Original / Final grade",
      }));
      setItems(nextItems);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="cinema-section cinema-color" id="color-grading">
      <SectionHeading kicker="Before / after / final grade" title="Color Grading">
        Drag through the frame and feel the tone shift from neutral capture to finished cinematic image.
      </SectionHeading>
      <div className="grading-sequence">
        <div className="grading-compare-row">
          {items[0] ? (
            <CompareWidget item={items[0]} onImageError={onImageError} />
          ) : (
            <div className="cinema-empty-panel">Add compare_before and compare_after images in admin.</div>
          )}
          {items[1] ? (
            <CompareWidget item={items[1]} onImageError={onImageError} />
          ) : items[0] ? (
            <CompareWidget item={items[0]} onImageError={onImageError} />
          ) : (
            <div className="cinema-empty-panel">Add a second before/after pair to complete the sequence.</div>
          )}
        </div>
        <div className="grading-video-row">
          <CinematicVideo video={videos[0]} vertical featured label="Cinematic grade film" />
        </div>
      </div>
    </section>
  );
}

function categorizePhoto(photo, index) {
  if (photo?.slot === "photo_fnb") return "Food & Beverage";
  if (photo?.slot === "photo_commercial") return "Commercial Photography";
  if (photo?.slot === "photo_jewelry") return "Jewelry Photography";
  if (photo?.slot === "photo_product") return "Product Photography";
  const text = `${photo?.title || ""} ${photo?.alt_text || ""} ${photo?.category || ""}`.toLowerCase();
  if (/food|beverage|drink|coffee|restaurant|f&b|fnb/.test(text)) return "Food & Beverage";
  if (/jewel|jewelry|ring|diamond|gold|silver|watch/.test(text)) return "Jewelry Photography";
  if (/product|pack|bottle|object|item/.test(text)) return "Product Photography";
  if (/commercial|brand|campaign|advert/.test(text)) return "Commercial Photography";
  return photoCategoryLabels[index % photoCategoryLabels.length];
}

function PhotographyPortfolio({ onImageError }) {
  const photos = usePhotos();
  const [activeCategory, setActiveCategory] = useState(photoCategoryLabels[0]);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const photoTrackRef = useRef(null);

  const galleryPhotos = useMemo(
    () => photos.filter((photo) => String(photo.slot || "").startsWith("gallery_") || String(photo.slot || "").startsWith("photo_")),
    [photos],
  );

  const grouped = useMemo(() => {
    const next = Object.fromEntries(photoCategoryLabels.map((label) => [label, []]));
    galleryPhotos.forEach((photo, index) => {
      next[categorizePhoto(photo, index)].push(photo);
    });
    return next;
  }, [galleryPhotos]);

  const visiblePhotos = grouped[activeCategory]?.length ? grouped[activeCategory] : galleryPhotos;
  const carouselPhotos = (visiblePhotos.length ? visiblePhotos : Array.from({ length: 8 })).slice(0, 16);

  useEffect(() => {
    photoTrackRef.current?.scrollTo({ left: 0, behavior: "smooth" });
  }, [activeCategory]);

  const scrollPhotoTrack = (direction) => {
    const track = photoTrackRef.current;
    if (!track) return;
    const distance = Math.min(track.clientWidth * 0.86, 520);
    track.scrollBy({ left: direction * distance, behavior: "smooth" });
  };

  return (
    <section className="cinema-section cinema-photo" id="photography">
      <SectionHeading kicker="Still image archive" title="Photography">
        Premium image studies across food, commercial, jewelry, and product work.
      </SectionHeading>
      <div className="photo-carousel-head">
        <div className="photo-category-tabs" aria-label="Photography categories">
          {photoCategoryLabels.map((label) => (
            <button
              key={label}
              type="button"
              className={activeCategory === label ? "is-active" : ""}
              onClick={() => setActiveCategory(label)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="photo-carousel-controls" aria-label="Photography carousel controls">
          <button type="button" onClick={() => scrollPhotoTrack(-1)} aria-label="Previous photos">&lt;</button>
          <button type="button" onClick={() => scrollPhotoTrack(1)} aria-label="Next photos">&gt;</button>
        </div>
      </div>
      <div className="photo-carousel-shell">
        <div className="photo-card-track" ref={photoTrackRef}>
          {carouselPhotos.map((photo, index) => (
          <button
            key={photo?.id || `photo-placeholder-${index}`}
            className="photo-carousel-card"
            type="button"
            onClick={() => photo?.url && setLightboxPhoto(photo)}
          >
            {photo?.url ? (
              <>
                <img src={photo.url} alt={photo.alt_text || ""} loading="lazy" onError={onImageError} />
                <span>{photo.title || photo.alt_text || activeCategory}</span>
              </>
            ) : (
              <span>Add gallery photo</span>
            )}
          </button>
          ))}
        </div>
      </div>
      {lightboxPhoto && createPortal(
        <div className="photo-lightbox" role="dialog" aria-modal="true" aria-label="Photography preview">
          <button type="button" className="photo-lightbox-backdrop" onClick={() => setLightboxPhoto(null)} aria-label="Close preview" />
          <figure>
            <button type="button" onClick={() => setLightboxPhoto(null)} aria-label="Close preview">Close</button>
            <img src={lightboxPhoto.url} alt={lightboxPhoto.alt_text || ""} />
            <figcaption>{lightboxPhoto.title || lightboxPhoto.alt_text || activeCategory}</figcaption>
          </figure>
        </div>,
        document.body,
      )}
    </section>
  );
}

function LightingTechniquesSection({ onImageError }) {
  const videos = useVideosFromSlots(["lighting_featured", "services_reel", "reel_showcase"]);
  const photos = usePhotos();
  const lightingPhotos = photos.filter((photo) =>
    ["lighting_setup", "services_bg_brands", "services_bg_fashion", "services_bg_events", "sticky_zoom"].includes(photo.slot),
  );

  return (
    <section className="cinema-section cinema-lighting" id="lighting">
      <SectionHeading kicker="Set craft / light logic" title="Lighting Techniques">
        A practical look at how contrast, falloff, and motivated sources shape the final frame.
      </SectionHeading>
      <CinematicVideo video={videos[0]} featured label="Featured lighting study" />
      <div className="lighting-gallery">
        {(lightingPhotos.length ? lightingPhotos : Array.from({ length: 6 })).slice(0, 10).map((photo, index) => (
          <figure key={photo?.id || `lighting-placeholder-${index}`} className="lighting-card">
            {photo?.url ? (
              <img src={photo.url} alt={photo.alt_text || ""} loading="lazy" onError={onImageError} />
            ) : (
              <span>Add lighting setup photo</span>
            )}
            <figcaption>{photo?.title || `Lighting setup ${String(index + 1).padStart(2, "0")}`}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function IntroBand() {
  return (
    <section className="intro-band" aria-label="Selected services">
      {["Brands", "Fashion", "Events", "Editorial"].map((service) => (
        <p key={service}>{service}</p>
      ))}
    </section>
  );
}

function CompareSection({ onImageError }) {
  const [items, setItems] = useState(fallbackCompareItems);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      fetch("/api/photos?slot=compare_before").then((r) => r.json()),
      fetch("/api/photos?slot=compare_after").then((r) => r.json()),
    ])
      .then(([beforePhotos, afterPhotos]) => {
        if (!isMounted || !Array.isArray(beforePhotos) || !Array.isArray(afterPhotos)) return;

        const pairCount = Math.min(beforePhotos.length, afterPhotos.length);
        if (pairCount === 0) return;

        const nextItems = Array.from({ length: pairCount }, (_, index) => {
          const before = beforePhotos[index];
          const after = afterPhotos[index];

          return {
            before: before.url,
            after: after.url,
            title: after.title || before.title || `Color study ${index + 1}`,
            label: before.title && after.title ? `${before.title} / ${after.title}` : "Before / After",
          };
        });

        setItems(nextItems);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="compare-section reveal-block is-visible" id="color-grading" aria-labelledby="compare-title">
      <div className="compare-heading">
        <p className="eyebrow">Color Grading</p>
        <h2 id="compare-title">Drag through the final grade.</h2>
        <p>
          A simple before-and-after view for clients to feel the difference between an untouched frame
          and the finished editorial direction.
        </p>
      </div>

      <div className="compare-grid">
        {items.map((item) => (
          <CompareWidget item={item} onImageError={onImageError} key={item.title} />
        ))}
      </div>
    </section>
  );
}

function CompareWidget({ item, onImageError }) {
  const [position, setPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const widgetRef = useRef(null);

  const updatePosition = (clientX) => {
    if (!widgetRef.current) return;

    const rect = widgetRef.current.getBoundingClientRect();
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(Math.max(next, 4), 96));
  };

  const handlePointerDown = (event) => {
    setIsDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    updatePosition(event.clientX);
  };

  const handlePointerMove = (event) => {
    if (!isDragging) return;
    updatePosition(event.clientX);
  };

  const stopDragging = () => setIsDragging(false);

  const handleKeyDown = (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setPosition((value) => Math.max(value - 5, 4));
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      setPosition((value) => Math.min(value + 5, 96));
    }
  };

  return (
    <article
      className="compare-widget editorial-reveal"
      ref={widgetRef}
      style={{ "--compare-position": `${position}%` }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      onLostPointerCapture={stopDragging}
      onKeyDown={handleKeyDown}
      role="slider"
      aria-label={`${item.title} comparison`}
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={Math.round(position)}
      tabIndex={0}
    >
      <img className="compare-before" src={item.before} alt={`${item.title} before edit`} onError={onImageError} draggable="false" loading="lazy" />
      <div className="compare-after" aria-hidden="true">
        <img src={item.after} alt="" onError={onImageError} draggable="false" loading="lazy" />
      </div>
      <div className="compare-divider" aria-hidden="true">
        <span></span>
      </div>
      <div className="compare-caption">
        <span>{item.label}</span>
        <strong>{item.title}</strong>
      </div>
    </article>
  );
}

function ReelShowcase() {
  const [reels, setReels]       = useState(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [popup, setPopup]       = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const thumbsRef = useRef(null);

  useEffect(() => {
    fetch("/api/videos?slot=reel_showcase&all=1")
      .then((r) => r.json())
      .then((data) => setReels(Array.isArray(data) ? data : []))
      .catch(() => setReels([]));
  }, []);

  /* Close popup on Escape */
  useEffect(() => {
    if (!popup) return;
    const fn = (e) => { if (e.key === "Escape") setPopup(false); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", fn);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", fn); };
  }, [popup]);

  /* Keyboard nav on the section */
  useEffect(() => {
    if (!reels?.length) return;
    const fn = (e) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft")  go(-1);
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [reels, activeIdx]);

  /* Scroll active thumb into view */
  useEffect(() => {
    const el = thumbsRef.current?.children[activeIdx];
    el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeIdx]);

  if (!reels || reels.length === 0) return null;

  const active = reels[activeIdx];
  const total  = reels.length;

  const go = (dir) => {
    if (transitioning) return;
    setTransitioning(true);
    setTimeout(() => {
      setActiveIdx((i) => (i + dir + total) % total);
      setTransitioning(false);
    }, 220);
  };

  return (
    <section className="reel-section" id="reels" aria-labelledby="reels-title">
      {/* ── Bordered card wrapper — same pattern as Selected Frames & Video Projects ── */}
      <div className="reel-card-wrap reel-fade-in">

        {/* ── Centered section header ── */}
        <header className="reel-sec-header">
          <p className="eyebrow">Featured Work</p>
          <h2 id="reels-title">Selected Reels</h2>
          <p className="reel-sec-desc">
            A curated showcase of motion work — brand films, fashion edits, and
            commercial reels. Click any reel to watch in full.
          </p>
        </header>

        {/* ── Controls row: counter + arrows ── */}
        <div className="reel-controls">
          <span className="reel-counter" aria-label={`${activeIdx + 1} of ${total}`}>
            <strong>{String(activeIdx + 1).padStart(2, "0")}</strong>
            <span className="reel-counter-sep">/</span>
            <span>{String(total).padStart(2, "0")}</span>
          </span>

          {active.title && (
            <span className="reel-active-title">{active.title}</span>
          )}

          <div className="reel-nav-btns" role="group" aria-label="Reel navigation">
            <button className="reel-nav-btn" type="button" onClick={() => go(-1)} aria-label="Previous reel">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <button className="reel-nav-btn" type="button" onClick={() => go(1)} aria-label="Next reel">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
        </div>

        {/* ── Featured video ── */}
        <div className="reel-stage-wrap">
          <div className={`reel-stage${transitioning ? " is-transitioning" : ""}`}>
            {/* video / iframe */}
            {isVimeoUrl(active.url) ? (
              <iframe
                key={active.id || activeIdx}
                src={vimeoSrc(active.url, { background: true })}
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                title={active.title || `Reel ${activeIdx + 1}`}
              />
            ) : (
              <video
                key={active.id || activeIdx}
                src={active.url}
                muted playsInline loop autoPlay preload="metadata"
              />
            )}

            {/* bottom gradient so text is legible */}
            <div className="reel-stage-gradient" aria-hidden="true" />

            {/* bottom-left: index + title */}
            <div className="reel-stage-meta">
              <span className="reel-stage-idx" aria-hidden="true">
                {String(activeIdx + 1).padStart(2, "0")}
              </span>
              {active.title && <p className="reel-stage-name">{active.title}</p>}
            </div>

            {/* centre play button — appears on hover */}
            <button
              className="reel-play-btn"
              type="button"
              onClick={() => setPopup(true)}
              aria-label={`Play ${active.title || "reel"} in fullscreen`}
            >
              <span className="reel-play-circle">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              </span>
              <span className="reel-play-text">Watch Full Reel</span>
            </button>
          </div>

          {/* progress dots */}
          {total > 1 && (
            <div className="reel-dots" role="group" aria-label="Reel selector">
              {reels.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`reel-dot${i === activeIdx ? " is-active" : ""}`}
                  onClick={() => {
                    if (!transitioning) {
                      setTransitioning(true);
                      setTimeout(() => { setActiveIdx(i); setTransitioning(false); }, 220);
                    }
                  }}
                  aria-label={`Go to reel ${i + 1}`}
                  aria-current={i === activeIdx ? "true" : undefined}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Thumbnail strip ── */}
        {total > 1 && (
          <div className="reel-strip-wrap">
            <div className="reel-strip" ref={thumbsRef}>
              {reels.map((reel, i) => (
                <button
                  key={reel.id || i}
                  type="button"
                  className={`reel-strip-item${i === activeIdx ? " is-active" : ""}`}
                  onClick={() => {
                    if (!transitioning && i !== activeIdx) {
                      setTransitioning(true);
                      setTimeout(() => { setActiveIdx(i); setTransitioning(false); }, 220);
                    }
                  }}
                  aria-label={reel.title || `Reel ${i + 1}`}
                  aria-current={i === activeIdx ? "true" : undefined}
                >
                  <div className="reel-strip-media">
                    {isVimeoUrl(reel.url) ? (
                      <iframe
                        src={`https://player.vimeo.com/video/${reel.url.match(/\/(\d+)/)?.[1]}?background=1&muted=1`}
                        allow="autoplay"
                        title=""
                        loading="lazy"
                        tabIndex={-1}
                      />
                    ) : (
                      <video src={reel.url} muted playsInline preload="metadata" tabIndex={-1} />
                    )}
                    <div className="reel-strip-overlay" aria-hidden="true" />
                    {i === activeIdx && (
                      <div className="reel-strip-playing" aria-hidden="true">
                        <span /><span /><span />
                      </div>
                    )}
                  </div>
                  <span className="reel-strip-num">{String(i + 1).padStart(2, "0")}</span>
                  {reel.title && <span className="reel-strip-label">{reel.title}</span>}
                </button>
              ))}
            </div>
          </div>
        )}

      </div>{/* end .reel-card-wrap */}

      {/* ── Fullscreen popup ── */}
      {popup && createPortal(
        <div className="video-popup" role="dialog" aria-modal="true" aria-label="Reel player">
          <button className="video-popup-backdrop" type="button" onClick={() => setPopup(false)} aria-label="Close" />
          <div className="video-popup-panel">
            <button className="video-popup-close" type="button" onClick={() => setPopup(false)} aria-label="Close">×</button>
            <div className="video-popup-media">
              {isVimeoUrl(active.url) ? (
                <iframe src={vimeoSrc(active.url)} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title={active.title || "Reel"} />
              ) : (
                <video src={active.url} controls autoPlay playsInline />
              )}
            </div>
            {active.title && (
              <div className="video-popup-caption">
                <span>Selected Reel — {String(activeIdx + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
                <strong>{active.title}</strong>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}

function SelectedFrames({ onImageError }) {
  const photoCategories = useMemo(() => ["Brands", "Filmmaking", "Commercial", "Fashion"], []);
  const [activeFilter, setActiveFilter] = useState(photoCategories[0]);
  const [isFiltering, setIsFiltering] = useState(false);
  const [centerIndex, setCenterIndex] = useState(1);
  const [apiPhotos, setApiPhotos] = useState(null);

  useEffect(() => {
    fetch("/api/photos")
      .then((r) => r.json())
      .then((data) => setApiPhotos(Array.isArray(data) ? data : []))
      .catch(() => setApiPhotos([]));
  }, []);

  const items = useMemo(() => {
    if (!apiPhotos) return [];

    // STRICT: only gallery_* slots ever appear in Selected Frames.
    // Hero, compare_before/after, services, about, og — all excluded.
    return apiPhotos
      .filter((p) => String(p.slot || "").startsWith("gallery_"))
      .map((p) => ({
        id: p.id,
        src: p.url,
        alt: p.alt_text,
        category: photoCategories.find(
          (f) => f.toLowerCase() === String(p.category || "").toLowerCase()
        ) || photoCategories[0],
        title: p.title || "",
      }));
  }, [apiPhotos, photoCategories]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => item.category === activeFilter);
  }, [activeFilter, items]);

  const normalizedCenterIndex =
    filteredItems.length > 0 ? ((centerIndex % filteredItems.length) + filteredItems.length) % filteredItems.length : 0;

  const visibleCards = useMemo(() => {
    if (filteredItems.length === 0) return [];

    const wrapIndex = (index) => (index + filteredItems.length) % filteredItems.length;
    const offsets = filteredItems.length > 2 ? [-1, 0, 1] : Array.from({ length: filteredItems.length }, (_, index) => index);

    return offsets.map((offset, slotIndex) => {
      const itemIndex = filteredItems.length > 2 ? wrapIndex(normalizedCenterIndex + offset) : offset;
      return {
        item: filteredItems[itemIndex],
        itemIndex,
        slotIndex,
      };
    });
  }, [filteredItems, normalizedCenterIndex]);

  const handleFilter = (filter) => {
    if (filter === activeFilter) return;

    setIsFiltering(true);
    window.setTimeout(() => {
      setActiveFilter(filter);
      setCenterIndex(1);
      setIsFiltering(false);
    }, 220);
  };

  const showPrevious = () => {
    setCenterIndex((index) => (index - 1 + filteredItems.length) % Math.max(filteredItems.length, 1));
  };

  const showNext = () => {
    setCenterIndex((index) => (index + 1) % Math.max(filteredItems.length, 1));
  };

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16 },
    );

    document.querySelectorAll(".editorial-reveal:not(.is-visible)").forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, [activeFilter, centerIndex]);

  return (
    <section className="selected-frames-section reveal-block" id="work" aria-labelledby="work-title">
      <div className="selected-frames-inner">
        <div className="selected-frames-header">
          <p className="eyebrow">Selected Frames</p>
          <h2 id="work-title">Curious what else I&apos;ve created?</h2>
          <p>
            Explore a focused carousel of campaigns, films, commercial scenes, and fashion stories.
          </p>
          <a className="selected-frames-cta" href="#motion">
            See more projects <span aria-hidden="true">-&gt;</span>
          </a>
        </div>

        <div className="selected-filter-bar" aria-label="Work filters">
          {photoCategories.map((filter) => (
            <button
              className={activeFilter === filter ? "is-active" : ""}
              type="button"
              onClick={() => handleFilter(filter)}
              key={filter}
            >
              {filter}
            </button>
          ))}
        </div>

        {visibleCards.length > 0 ? (
          <>
            <div className="selected-carousel-shell">
              <button className="selected-arrow selected-arrow-prev" type="button" onClick={showPrevious} aria-label="Previous projects">
                <span aria-hidden="true">&larr;</span>
              </button>

              <div className={`selected-carousel ${isFiltering ? "is-filtering" : ""}`} aria-live="polite">
                {visibleCards.map(({ item, itemIndex, slotIndex }) => (
                  <article
                    className={`selected-carousel-card selected-slot-${slotIndex} editorial-reveal is-visible`}
                    style={{ "--reveal-delay": `${slotIndex * 90}ms` }}
                    key={`${activeFilter}-${itemIndex}-${item.id || item.title}`}
                  >
                    <div className="selected-card-media">
                      <img src={item.src} alt={item.alt} onError={onImageError} loading="lazy" />
                    </div>
                    <div className="selected-card-caption">
                      <span>#{String(itemIndex + 1).padStart(2, "0")}</span>
                      <strong>{item.title}</strong>
                      <p>{item.category}</p>
                    </div>
                  </article>
                ))}
              </div>

              <button className="selected-arrow selected-arrow-next" type="button" onClick={showNext} aria-label="Next projects">
                <span aria-hidden="true">&rarr;</span>
              </button>
            </div>

            <div className="selected-carousel-status" aria-hidden="true">
              <span>{String(normalizedCenterIndex + 1).padStart(2, "0")}</span>
              <i />
              <span>{String(filteredItems.length).padStart(2, "0")}</span>
            </div>
          </>
        ) : (
          <div className="media-empty-state">
            <span>Selected Frames</span>
            <p>Add published gallery photos from the admin dashboard to show this section.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function VideoProjects() {
  const [activeCategory, setActiveCategory] = useState(videoFilters[0]);
  const [centerIndex, setCenterIndex] = useState(1);
  const [popupVideo, setPopupVideo] = useState(null);
  const [apiVideos, setApiVideos] = useState(null);
  const carouselRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    Promise.all(
      videoFilters.map((category) =>
        fetch(`/api/videos?slot=${motionVideoSlots[category]}&all=1`, { cache: "no-store" })
          .then((response) => response.json())
          .catch(() => []),
      ),
    ).then((results) => {
      if (!isMounted) return;

      const nextVideos = results.flatMap((videos, categoryIndex) => {
        const category = videoFilters[categoryIndex];
        const safeVideos = Array.isArray(videos) ? videos : [];

        return safeVideos.map((video, index) => ({
          id: video.id,
          src: video.url,
          poster: video.poster || "",
          category,
          label: `${String(index + 1).padStart(2, "0")} / ${category}`,
          title: video.title || `${category} Film ${index + 1}`,
        }));
      });

      setApiVideos(nextVideos);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredVideos = useMemo(
    () => {
      const publishedItems = apiVideos?.filter((item) => item.category === activeCategory) || [];
      return publishedItems;
    },
    [activeCategory, apiVideos],
  );
  const normalizedCenterIndex =
    filteredVideos.length > 0 ? ((centerIndex % filteredVideos.length) + filteredVideos.length) % filteredVideos.length : 0;

  const visibleVideos = useMemo(() => {
    if (filteredVideos.length === 0) return [];

    const wrapIndex = (index) => (index + filteredVideos.length) % filteredVideos.length;
    if (filteredVideos.length === 1) {
      return [{
        item: filteredVideos[0],
        itemIndex: 0,
        slotIndex: 1,
      }];
    }

    if (filteredVideos.length === 2) {
      const nextIndex = wrapIndex(normalizedCenterIndex + 1);
      return [
        {
          item: filteredVideos[normalizedCenterIndex],
          itemIndex: normalizedCenterIndex,
          slotIndex: 1,
        },
        {
          item: filteredVideos[nextIndex],
          itemIndex: nextIndex,
          slotIndex: 2,
        },
      ];
    }

    const offsets = [-1, 0, 1];

    return offsets.map((offset, slotIndex) => {
      const itemIndex = filteredVideos.length > 2 ? wrapIndex(normalizedCenterIndex + offset) : offset;
      return {
        item: filteredVideos[itemIndex],
        itemIndex,
        slotIndex,
      };
    });
  }, [filteredVideos, normalizedCenterIndex]);

  const previewVideoKey = visibleVideos
    .map(({ item, slotIndex }) => `${slotIndex}:${item.id || item.src}`)
    .join("|");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      // Only control <video> elements — Vimeo iframes manage themselves via background=1
      const videos = Array.from(carouselRef.current?.querySelectorAll("video") || []);

      videos.forEach((video) => {
        const card = video.closest(".motion-video-card");
        const shouldPlay = card?.classList.contains("is-center") && !popupVideo;

        video.muted = true;
        video.playsInline = true;

        if (shouldPlay) {
          video.loop = true;
          video.play().catch(() => {});
          return;
        }

        video.pause();
        try { video.currentTime = 0; } catch { /* metadata not ready */ }
      });
    });

    return () => { window.cancelAnimationFrame(frame); };
  }, [previewVideoKey, popupVideo]);

  const handleCategoryChange = (category) => {
    setActiveCategory(category);
    setCenterIndex(1);
  };

  const showPrevious = () => {
    setCenterIndex((index) => (index - 1 + filteredVideos.length) % Math.max(filteredVideos.length, 1));
  };

  const showNext = () => {
    setCenterIndex((index) => (index + 1) % Math.max(filteredVideos.length, 1));
  };

  const handleVideoCardClick = (slotIndex, item, itemIndex) => {
    if (slotIndex !== 1) {
      setCenterIndex(itemIndex);
      return;
    }

    setPopupVideo(item);
  };

  useEffect(() => {
    if (!popupVideo) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setPopupVideo(null);
    };

    document.body.style.overflow = "hidden";
    document.body.classList.add("video-popup-open");
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      document.body.classList.remove("video-popup-open");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [popupVideo]);

  const videoPopup = popupVideo ? (
    <div className="video-popup" role="dialog" aria-modal="true" aria-label={`${popupVideo.title} video`}>
      <button className="video-popup-backdrop" type="button" onClick={() => setPopupVideo(null)} aria-label="Close video" />
      <div className="video-popup-panel">
        <button className="video-popup-close" type="button" onClick={() => setPopupVideo(null)} aria-label="Close video">
          ×
        </button>
        <div className="video-popup-media">
          {isVimeoUrl(popupVideo.src) ? (
            <iframe
              src={vimeoSrc(popupVideo.src)}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title={popupVideo.title}
            />
          ) : (
            <video src={popupVideo.src} poster={popupVideo.poster} controls autoPlay playsInline />
          )}
        </div>
        <div className="video-popup-caption">
          <span>{popupVideo.category}</span>
          <strong>{popupVideo.title}</strong>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <section className="video-projects-section reveal-block" id="motion" aria-labelledby="motion-title">
      <div className="video-reference-inner">
        <div className="video-projects-head">
          <p className="eyebrow">Behind the Motion</p>
          <h2 id="motion-title">Curious what else I&apos;ve filmed?</h2>
          <p>
            Explore short-form videos across brands, commercial scenes, fashion motion, and filmmaking work.
          </p>
          <a className="selected-frames-cta" href="#services">
            Browse services <span aria-hidden="true">-&gt;</span>
          </a>
        </div>

        <div className="video-filter-bar" aria-label="Motion filters">
          {videoFilters.map((filter) => (
            <button
              className={activeCategory === filter ? "is-active" : ""}
              type="button"
              onClick={() => handleCategoryChange(filter)}
              key={filter}
            >
              {filter}
            </button>
          ))}
        </div>

        {visibleVideos.length > 0 ? (
          <>
            <div className="motion-carousel-shell">
              <button className="selected-arrow selected-arrow-prev" type="button" onClick={showPrevious} aria-label="Previous videos">
                <span aria-hidden="true">&larr;</span>
              </button>

              <div className="motion-video-carousel" aria-live="polite" ref={carouselRef}>
                {visibleVideos.map(({ item, itemIndex, slotIndex }) => (
                  <article
                    className={`motion-video-card motion-video-slot-${slotIndex} editorial-reveal is-visible${slotIndex === 1 ? " is-center" : ""}`}
                    style={{ "--reveal-delay": `${slotIndex * 90}ms` }}
                    key={`${activeCategory}-${itemIndex}-${item.id || item.title}`}
                    onClick={() => handleVideoCardClick(slotIndex, item, itemIndex)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleVideoCardClick(slotIndex, item, itemIndex);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="motion-video-media">
                      {isVimeoUrl(item.src) ? (
                        <iframe
                          src={vimeoSrc(item.src, { background: true })}
                          allow="autoplay; fullscreen; picture-in-picture"
                          allowFullScreen
                          title={item.title}
                          loading="lazy"
                        />
                      ) : slotIndex === 1 ? (
                        <video src={item.src} poster={item.poster} muted playsInline loop autoPlay preload="metadata" />
                      ) : item.poster ? (
                        <img src={item.poster} alt="" loading="lazy" />
                      ) : (
                        <video src={item.src} muted playsInline preload="metadata" />
                      )}
                    </div>
                    <div className="motion-video-caption">
                      <span>#{String(itemIndex + 1).padStart(2, "0")}</span>
                      <strong>{item.title}</strong>
                      <p>{item.category}</p>
                    </div>
                  </article>
                ))}
              </div>

              <button className="selected-arrow selected-arrow-next" type="button" onClick={showNext} aria-label="Next videos">
                <span aria-hidden="true">&rarr;</span>
              </button>
            </div>

            <div className="selected-carousel-status" aria-hidden="true">
              <span>{String(normalizedCenterIndex + 1).padStart(2, "0")}</span>
              <i />
              <span>{String(filteredVideos.length).padStart(2, "0")}</span>
            </div>
          </>
        ) : (
          <div className="media-empty-state media-empty-state-video">
            <span>Motion Projects</span>
            <p>Add published videos from the admin dashboard to activate this carousel.</p>
          </div>
        )}
      </div>

      {videoPopup && createPortal(videoPopup, document.body)}
    </section>
  );
}

function PhotoDisplay({ onImageError }) {
  const sectionRef = useRef(null);
  const imageRefs = useRef([]);
  const progressRef = useRef(null);
  const statementRef = useRef(null);
  const [displayImages, setDisplayImages] = useState([]);
  const segmentsRef = useRef(0);

  useEffect(() => {
    fetch("/api/photos?slot=sticky_zoom")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.slice(0, 10).map((p) => ({
            src: p.url,
            alt: p.alt_text,
            label: p.title || p.category || "Photo",
          }));
          setDisplayImages(mapped);
          segmentsRef.current = mapped.length;
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let frame = null;

    const updateGallery = () => {
      if (!sectionRef.current) return;

      const rect = sectionRef.current.getBoundingClientRect();
      const distance = Math.max(rect.height - window.innerHeight, 1);
      const progress = Math.min(Math.max(-rect.top / distance, 0), 1);
      const segments = segmentsRef.current;

      imageRefs.current.forEach((layer, index) => {
        if (!layer) return;

        const start = index / segments;
        const end = (index + 1) / segments;
        const localProgress = mapRange(progress, start, end, 0, 1);
        const isActive = progress >= start && progress <= end;
        const isPrevious = progress > end;
        const opacity = isActive ? mapRange(localProgress, 0, 0.18, 0, 1) : isPrevious ? 0.3 : 0;
        const blur = isPrevious && !isActive ? 2 : 0;
        const scale = 0.82 + localProgress * 0.18;

        layer.style.setProperty("--sticky-opacity", opacity.toFixed(3));
        layer.style.setProperty("--sticky-scale", scale.toFixed(3));
        layer.style.setProperty("--sticky-blur", `${blur}px`);
        layer.style.zIndex = String(index + 1);
      });

      const statementOpacity = mapRange(progress, 0.88, 1, 0, 1).toFixed(3);
      progressRef.current?.style.setProperty("--gallery-progress", progress.toFixed(3));
      sectionRef.current?.style.setProperty("--statement-opacity", statementOpacity);
      statementRef.current?.style.setProperty("--statement-opacity", statementOpacity);
    };

    const requestUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        updateGallery();
      });
    };

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    updateGallery();

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, []);

  return (
    <section className="sticky-zoom-section" id="photo-display" aria-label="Sticky scroll photo display" ref={sectionRef}>
      <div className="sticky-zoom-frame">
        <div className="sticky-zoom-stage">
          {displayImages.map((image, index) => (
            <figure
              className="sticky-zoom-image"
              ref={(element) => { imageRefs.current[index] = element; }}
              key={image.alt || index}
            >
              <img src={image.src} alt={image.alt} onError={onImageError} loading="lazy" />
              <figcaption>{image.label}</figcaption>
            </figure>
          ))}
          <div className="sticky-statement" ref={statementRef}>
            <span></span>
            <p>Light is the subject. Everything else is context.</p>
          </div>
          <div className="sticky-progress" ref={progressRef} aria-hidden="true">
            <span></span>
          </div>
        </div>
      </div>
    </section>
  );
}



function Services({ onImageError }) {
  const [servicePhotos, setServicePhotos] = useState({
    brands: {
      src: "",
      alt: "Brand shoot production setup",
    },
    fashion: {
      src: "",
      alt: "Fashion editorial session",
    },
    events: {
      src: "",
      alt: "Event coverage atmosphere",
    },
  });

  useEffect(() => {
    const slots = [
      ["brands", "services_bg_brands"],
      ["fashion", "services_bg_fashion"],
      ["events", "services_bg_events"],
    ];

    Promise.all(
      slots.map(([, slot]) =>
        fetch(`/api/photos?slot=${slot}`)
          .then((r) => r.json())
          .catch(() => []),
      ),
    ).then((results) => {
      setServicePhotos((current) => {
        const next = { ...current };
        results.forEach((data, index) => {
          const [key] = slots[index];
          if (Array.isArray(data) && data[0]) {
            next[key] = {
              src: data[0].url,
              alt: data[0].alt_text || current[key].alt,
            };
          }
        });
        return next;
      });
    });
  }, []);

  return (
    <section className="services-section reveal-block" id="services" aria-labelledby="services-title">
      <div className="grain-overlay" aria-hidden="true" />
      <div className="services-inner">
        <div className="services-split-header">
          <div className="services-split-left">
            <p className="eyebrow">Services</p>
            <h2 className="services-split-title" id="services-title">
              What I Can Help<br />You With
            </h2>
          </div>

          <div className="services-split-right">
            <p className="services-split-sub">
              From strategy to visuals, tailored services to help your brand grow with clarity and impact.
            </p>
            <p className="services-split-note">Let's Build Something Meaningful Together</p>
            <a
              className="services-split-cta"
              href="https://wa.me/96181064940?text=Hello%20Jaafar%2C%20I%27d%20like%20to%20book%20a%20shoot."
              target="_blank"
              rel="noreferrer"
            >
              Get in touch -&gt;
            </a>
          </div>
        </div>

        <div className="svc-cards-grid">
          <div className="svc-card-v2">
            {servicePhotos.brands.src && <img className="svc-card-bg" src={servicePhotos.brands.src} alt="" onError={onImageError} loading="lazy" />}
            <div className="svc-card-top-line"></div>
            <p className="svc-card-tagline">Your brand, visually defined.</p>
            <h3>Brand Identity Shoots</h3>
            <p>Campaign, product, lookbook - visual identity built to scale across every platform.</p>
            <a href="#contact">Inquire -&gt;</a>
          </div>

          <div className="svc-card-v2">
            {servicePhotos.fashion.src && <img className="svc-card-bg" src={servicePhotos.fashion.src} alt="" onError={onImageError} loading="lazy" />}
            <div className="svc-card-top-line"></div>
            <p className="svc-card-tagline">Clarity behind the visuals.</p>
            <h3>Fashion Editorial</h3>
            <p>Studio and location direction, model direction, magazine-ready output.</p>
            <a href="#contact">Inquire -&gt;</a>
          </div>

          <div className="svc-card-v2">
            {servicePhotos.events.src && <img className="svc-card-bg" src={servicePhotos.events.src} alt="" onError={onImageError} loading="lazy" />}
            <div className="svc-card-top-line"></div>
            <p className="svc-card-tagline">Ongoing expert guidance.</p>
            <h3>Event Coverage</h3>
            <p>Live events, launches, cultural moments - captured precisely and delivered fast.</p>
            <a href="#contact">Inquire -&gt;</a>
          </div>
        </div>
      </div>
    </section>
  );
}


function CreativeDirection() {
  return (
    <section className="statement-section reveal-block" id="direction" aria-label="Creative direction statement">
      <div className="statement-inner">
        <p className="eyebrow">Creative Direction</p>
        <blockquote>
          Every frame should feel simple at first glance, then stay longer in the mind.
        </blockquote>
        <div className="production-tools" aria-label="Camera and scene clapper">
          <span className="production-tool production-tool-camera">
            <CameraIcon />
          </span>
          <span className="production-tool production-tool-clapper">
            <ClapperIcon />
          </span>
        </div>
        <div className="statement-notes" aria-label="Creative principles">
          <span>01 Light led</span>
          <span>02 Emotion first</span>
          <span>03 Clean edits</span>
          <span>04 Timeless delivery</span>
        </div>
      </div>
    </section>
  );
}

function About({ onImageError }) {
  const [aboutSrc, setAboutSrc] = useState("");
  const [aboutAlt, setAboutAlt] = useState("Photographer preparing a camera in studio light");

  useEffect(() => {
    fetch("/api/photos?slot=about_portrait")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data[0]) {
          setAboutSrc(data[0].url);
          if (data[0].alt_text) setAboutAlt(data[0].alt_text);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <section className="section about-section reveal-block" id="about" aria-labelledby="about-title">
      {aboutSrc && (
        <div className="about-image-frame">
          <div className="about-image">
            <img
              src={aboutSrc}
              alt={aboutAlt}
              onError={onImageError}
              loading="lazy"
            />
          </div>
        </div>
      )}
      <div className="about-copy">
        <h2 id="about-title">Light, emotion, and honest moments.</h2>
      </div>
    </section>
  );
}

function MiniFooter() {
  return (
    <footer className="mini-footer" aria-label="Site footer">
      <p>&copy; 2026 Jaafar Sleiman</p>
      <nav aria-label="Footer links">
        <a href="https://www.instagram.com/" target="_blank" rel="noreferrer">Instagram</a>
        <a
          href="https://wa.me/96181064940?text=Hello%20Jaafar%2C%20I%27d%20like%20to%20book%20a%20shoot."
          target="_blank"
          rel="noreferrer"
        >
          WhatsApp
        </a>
      </nav>
      <span>Beirut &middot; Worldwide</span>
    </footer>
  );
}

function Contact() {
  const [fields, setFields] = useState({ name: "", email: "", projectType: "", message: "" });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const validate = () => {
    const next = {};
    if (!fields.name.trim()) next.name = "Name is required.";
    if (!fields.email.trim()) next.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) next.email = "Enter a valid email.";
    if (!fields.projectType) next.projectType = "Please select a project type.";
    if (!fields.message.trim()) next.message = "Message is required.";
    return next;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const next = validate();
    if (Object.keys(next).length > 0) { setErrors(next); return; }
    setSubmitted(true);
  };

  return (
    <section className="contact-section reveal-block" id="contact" aria-labelledby="contact-title">
      <div className="grain-overlay" aria-hidden="true" />
      <div className="contact-inner">
        <div className="contact-heading">
          <p className="eyebrow">Bookings</p>
          <h2 id="contact-title">
            Let&apos;s make something <em>worth remembering.</em>
          </h2>
        </div>
        <div className="booking-grid">
          <address className="contact-info">
            <a href="mailto:hello@jaafarsleiman.com">hello@jaafarsleiman.com</a>
            <span>+961 00 000 000</span>
            <a href="https://www.instagram.com/" target="_blank" rel="noreferrer">@jaafarsleiman</a>
          </address>
          {submitted ? (
            <div className="booking-success" role="status">
              <p className="eyebrow">Message sent</p>
              <p>Thank you â€” I&apos;ll be in touch within 48 hours.</p>
              <button type="button" onClick={() => { setSubmitted(false); setFields({ name: "", email: "", projectType: "", message: "" }); }}>
                Send another
              </button>
            </div>
          ) : (
            <form className="booking-form" onSubmit={handleSubmit} noValidate>
              <label>
                <span>Name</span>
                <input type="text" name="name" autoComplete="name" value={fields.name} onChange={handleChange} aria-invalid={!!errors.name} />
                {errors.name && <span className="field-error">{errors.name}</span>}
              </label>
              <label>
                <span>Email</span>
                <input type="email" name="email" autoComplete="email" value={fields.email} onChange={handleChange} aria-invalid={!!errors.email} />
                {errors.email && <span className="field-error">{errors.email}</span>}
              </label>
              <label>
                <span>Project type</span>
                <select name="projectType" value={fields.projectType} onChange={handleChange} aria-invalid={!!errors.projectType}>
                  <option value="" disabled>Select one</option>
                  <option>Brand Identity Shoot</option>
                  <option>Fashion Editorial</option>
                  <option>Event Coverage</option>
                </select>
                {errors.projectType && <span className="field-error">{errors.projectType}</span>}
              </label>
              <label>
                <span>Message</span>
                <textarea name="message" rows="4" value={fields.message} onChange={handleChange} aria-invalid={!!errors.message} />
                {errors.message && <span className="field-error">{errors.message}</span>}
              </label>
              <button type="submit">Send Inquiry <span aria-hidden="true">â†’</span></button>
            </form>
          )}
        </div>
      </div>
      <footer className="site-footer">
        <p>Â© 2025 Jaafar Sleiman</p>
        <div aria-label="Social links">
          <a href="https://www.instagram.com/" target="_blank" rel="noreferrer" aria-label="Instagram">
            <InstagramIcon />
          </a>
          <a href="https://www.linkedin.com/" target="_blank" rel="noreferrer" aria-label="LinkedIn">
            <LinkedInIcon />
          </a>
        </div>
        <span>Beirut Â· Worldwide</span>
      </footer>
    </section>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M17 7h.01" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.5 10v8" />
      <path d="M6.5 6.5v.01" />
      <path d="M11 18v-8" />
      <path d="M11 13.5c0-2 1.2-3.5 3.2-3.5S18 11.4 18 14v4" />
      <path d="M4 4h16v16H4z" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 19.5V5.75A2.75 2.75 0 0 1 6.75 3H20v16H6.75A2.75 2.75 0 0 0 4 21.75" />
      <path d="M8 7h8" />
      <path d="M8 11h6" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6" />
      <path d="M12 7h.01" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12a3.5 3.5 0 0 1 7 0" />
      <path d="M9 16h6" />
      <path d="M12 3v3" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M18 22h8l3.5-5h9L42 22h4a8 8 0 0 1 8 8v15a8 8 0 0 1-8 8H18a8 8 0 0 1-8-8V30a8 8 0 0 1 8-8Z" />
      <circle cx="32" cy="38" r="10" />
      <circle cx="46" cy="30" r="2" />
    </svg>
  );
}

function ClapperIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M12 25h40v27H12z" />
      <path d="M11 16 50 8l3 12-39 8z" />
      <path d="m20 14 8 10" />
      <path d="m32 12 8 10" />
      <path d="m44 10 8 10" />
      <path d="M20 34h24" />
      <path d="M20 42h15" />
    </svg>
  );
}

export default App;
