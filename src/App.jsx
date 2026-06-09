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

      const navSections = ["top", "work", "motion", "services", "about"];
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
        <IntroBand />
        <SelectedFrames onImageError={handleImageError} />
        <CompareSection onImageError={handleImageError} />
        <ReelShowcase />
        <VideoProjects />
        <Services onImageError={handleImageError} />
        {/* <CreativeDirection /> */}
        <About onImageError={handleImageError} />
        <MiniFooter />
        {/* <Contact /> */}
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
          <a className="nav-link" href="#work" aria-current={activeSection === "work" ? "page" : undefined}>Work</a>
          <a className="nav-link" href="#motion" aria-current={activeSection === "motion" ? "page" : undefined}>Videos</a>
          <a className="nav-link" href="#services" aria-current={activeSection === "services" ? "page" : undefined}>Services</a>
          <a className="nav-link" href="#about" aria-current={activeSection === "about" ? "page" : undefined}>About</a>
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
          <a href="#work" onClick={closeMenu}>Work</a>
          <a href="#motion" onClick={closeMenu}>Videos</a>
          <a href="#services" onClick={closeMenu}>Services</a>
          <a href="#about" onClick={closeMenu}>About</a>
        </div>
      </nav>
    </header>
  );
}

function Hero({ onImageError }) {
  const heroRef = useRef(null);
  const [heroSrc, setHeroSrc] = useState("");

  useEffect(() => {
    fetch("/api/photos?slot=hero_background")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data) && data[0]?.url) setHeroSrc(data[0].url); })
      .catch(() => {});
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
      <div className={`hero-media${heroSrc ? "" : " hero-media-empty"}`} aria-hidden="true">
        {heroSrc ? (
          <img
            src={heroSrc}
            alt=""
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

function ScrollScrubVideo() {
  const sectionRef = useRef(null);
  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const progressRef = useRef(0);
  const [videoSrc, setVideoSrc] = useState("");

  useEffect(() => {
    fetch("/api/videos?slot=scroll_scrub")
      .then((r) => r.json())
      .then((data) => { if (data?.url) setVideoSrc(data.url); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const section = sectionRef.current;
    if (!video || !section) return undefined;

    video.pause();

    let frame = null;
    let touchY = null;

    const getTopOffset = () => (window.innerWidth <= 700 ? 68 : 72);

    const clampProgress = (value) => Math.max(0, Math.min(1, value));

    const applyVideoSizing = () => {
      const width = video.videoWidth || 1920;
      const height = video.videoHeight || 1080;
      const ratio = width / height;
      const isVertical = ratio < 1;

      section.style.setProperty("--scrub-video-aspect", `${width} / ${height}`);
      section.style.setProperty("--scrub-video-ratio", ratio.toFixed(4));
      section.style.setProperty("--scrub-section-height", isVertical ? "240vh" : "220vh");
      section.style.setProperty("--scrub-section-min", isVertical ? "1320px" : "1180px");
      section.dataset.orientation = isVertical ? "vertical" : "horizontal";
    };

    const setScrubProgress = (nextProgress) => {
      const progress = clampProgress(nextProgress);
      progressRef.current = progress;

      if (video.duration && isFinite(video.duration)) {
        video.currentTime = progress * video.duration;
      }

      if (overlayRef.current) {
        let textOpacity = 0;
        if (progress >= 0.5 && progress < 0.6) {
          textOpacity = (progress - 0.5) / 0.1;
        } else if (progress >= 0.6 && progress < 0.8) {
          textOpacity = 1;
        } else if (progress >= 0.8 && progress <= 0.85) {
          textOpacity = (0.85 - progress) / 0.05;
        }
        overlayRef.current.style.opacity = textOpacity.toFixed(3);
      }
    };

    const getPageProgress = () => {
      const rect = section.getBoundingClientRect();
      const topOffset = getTopOffset();
      const distance = Math.max(section.offsetHeight - window.innerHeight + topOffset, 1);
      return clampProgress((topOffset - rect.top) / distance);
    };

    const isSectionCapturing = () => {
      const rect = section.getBoundingClientRect();
      const topOffset = getTopOffset();
      return rect.top <= topOffset + 1 && rect.bottom >= window.innerHeight - 1;
    };

    const releaseSection = (direction) => {
      const topOffset = getTopOffset();
      const nextScroll =
        direction === "down"
          ? section.offsetTop + section.offsetHeight - window.innerHeight + topOffset + 4
          : Math.max(section.offsetTop - topOffset - 4, 0);

      window.scrollTo({ top: nextScroll, behavior: "auto" });
    };

    const update = () => {
      if (!isSectionCapturing()) {
        setScrubProgress(getPageProgress());
      }
    };

    const requestUpdate = () => {
      if (frame) return;

      frame = window.requestAnimationFrame(() => {
        frame = null;
        update();
      });
    };

    const scrubByDelta = (delta, event) => {
      if (!isSectionCapturing() || Math.abs(delta) < 0.5) return;

      const progress = progressRef.current;
      const scrollingDown = delta > 0;
      const atEnd = progress >= 0.999;
      const atStart = progress <= 0.001;

      if ((scrollingDown && atEnd) || (!scrollingDown && atStart)) {
        return;
      }

      if (event.cancelable) event.preventDefault();

      const sensitivity = window.innerHeight <= 720 ? 1.45 : 1.85;
      const nextProgress = progress + delta / (window.innerHeight * sensitivity);
      setScrubProgress(nextProgress);

      if (scrollingDown && progressRef.current >= 0.999) {
        setScrubProgress(1);
        releaseSection("down");
      }

      if (!scrollingDown && progressRef.current <= 0.001) {
        setScrubProgress(0);
        releaseSection("up");
      }
    };

    const handleWheel = (event) => {
      scrubByDelta(event.deltaY, event);
    };

    const handleTouchStart = (event) => {
      touchY = event.touches[0]?.clientY ?? null;
    };

    const handleTouchMove = (event) => {
      if (touchY == null) return;
      const nextY = event.touches[0]?.clientY ?? touchY;
      const delta = touchY - nextY;
      touchY = nextY;
      scrubByDelta(delta, event);
    };

    const handleTouchEnd = () => {
      touchY = null;
    };

    const handlePlay = () => video.pause();
    const handleMetadata = () => {
      applyVideoSizing();
      setScrubProgress(progressRef.current);
    };
    video.addEventListener("play", handlePlay);
    video.addEventListener("loadedmetadata", handleMetadata);
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    if (video.readyState >= 1) handleMetadata();
    else applyVideoSizing();
    update();

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("loadedmetadata", handleMetadata);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [videoSrc]);

  if (!videoSrc) return null;

  return (
    <section
      className="scrub-video-section"
      id="behind-lens"
      ref={sectionRef}
      aria-label="Behind the lens video sequence"
    >
      <div className="scrub-video-sticky">
        <div className="scrub-video-label" aria-hidden="true">
          <span className="scrub-video-dot" aria-hidden="true" />
          BEHIND THE LENS
        </div>

        <video
          ref={videoRef}
          className="scrub-video-element"
          src={videoSrc}
          muted
          playsInline
          preload="auto"
        />

        <div
          className="scrub-video-overlay"
          ref={overlayRef}
          style={{ opacity: 0 }}
          aria-hidden="true"
        >
          <div className="scrub-video-gradient" />
          <p className="scrub-video-quote">Every frame is a decision.</p>
        </div>
      </div>
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
