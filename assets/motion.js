(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const header = document.querySelector(".site-header");
  const hero = document.querySelector(".hero");
  const heroVisual = document.querySelector(".hero-visual");
  const panel = document.getElementById("lesson-panel");
  const progressBar = document.getElementById("reading-progress-bar");
  const sectionNumber = document.querySelector(".section-number");
  let scrollFrame = 0;
  let panelTimer = 0;

  function updateScrollEffects() {
    scrollFrame = 0;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollRange = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const progress = Math.min(1, Math.max(0, scrollTop / scrollRange));
    if (progressBar) progressBar.style.transform = `scaleX(${progress})`;
    if (header) header.classList.toggle("is-scrolled", scrollTop > 18);
  }

  function requestScrollUpdate() {
    if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateScrollEffects);
  }

  function setupRevealEffects() {
    const targets = document.querySelectorAll(".hero-heading, .hero-copy, .hero-visual, .course-shell, .site-footer");
    targets.forEach((element, index) => {
      element.classList.add("reveal-target");
      element.style.setProperty("--reveal-delay", `${Math.min(index * 90, 270)}ms`);
    });

    document.body.classList.add("motion-ready");

    if (reduceMotion || !("IntersectionObserver" in window)) {
      targets.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -36px" });

    targets.forEach((element) => observer.observe(element));
  }

  function animateLesson() {
    if (!panel || reduceMotion) return;
    window.clearTimeout(panelTimer);
    panel.classList.remove("lesson-enter");
    void panel.offsetWidth;
    panel.classList.add("lesson-enter");
    panelTimer = window.setTimeout(() => panel.classList.remove("lesson-enter"), 900);
  }

  function setupCounter() {
    if (!sectionNumber || reduceMotion || !("IntersectionObserver" in window)) return;
    const target = Number.parseInt(sectionNumber.textContent, 10) || 5;
    sectionNumber.textContent = "00";

    const observer = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      observer.disconnect();
      const startedAt = performance.now();
      const duration = 700;
      const tick = (now) => {
        const ratio = Math.min(1, (now - startedAt) / duration);
        const eased = 1 - Math.pow(1 - ratio, 3);
        sectionNumber.textContent = String(Math.round(target * eased)).padStart(2, "0");
        if (ratio < 1) window.requestAnimationFrame(tick);
      };
      window.requestAnimationFrame(tick);
    }, { threshold: 0.6 });
    observer.observe(sectionNumber);
  }

  function setupParallax() {
    if (!hero || !heroVisual || reduceMotion || !window.matchMedia("(pointer: fine)").matches) return;
    let pointerFrame = 0;
    let nextX = 0;
    let nextY = 0;

    hero.addEventListener("pointermove", (event) => {
      const bounds = hero.getBoundingClientRect();
      nextX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 18;
      nextY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 14;
      if (pointerFrame) return;
      pointerFrame = window.requestAnimationFrame(() => {
        pointerFrame = 0;
        heroVisual.style.setProperty("--parallax-x", `${nextX.toFixed(2)}px`);
        heroVisual.style.setProperty("--parallax-y", `${nextY.toFixed(2)}px`);
      });
    }, { passive: true });

    hero.addEventListener("pointerleave", () => {
      heroVisual.style.setProperty("--parallax-x", "0px");
      heroVisual.style.setProperty("--parallax-y", "0px");
    });
  }

  function setupNetworkCanvas() {
    const canvas = document.getElementById("network-canvas");
    if (!canvas || !hero || reduceMotion || window.innerWidth < 761) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let width = 0;
    let height = 0;
    let particles = [];
    let animationFrame = 0;
    let visible = true;

    function makeParticles() {
      const count = Math.min(44, Math.max(26, Math.round(width / 34)));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        radius: Math.random() * 1.6 + 0.7
      }));
    }

    function resize() {
      const bounds = hero.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      makeParticles();
    }

    function draw() {
      if (!visible || document.hidden) {
        animationFrame = 0;
        return;
      }
      context.clearRect(0, 0, width, height);

      particles.forEach((particle, index) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        if (particle.x < -10) particle.x = width + 10;
        if (particle.x > width + 10) particle.x = -10;
        if (particle.y < -10) particle.y = height + 10;
        if (particle.y > height + 10) particle.y = -10;

        context.beginPath();
        context.fillStyle = "rgba(102, 230, 220, .62)";
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fill();

        for (let otherIndex = index + 1; otherIndex < particles.length; otherIndex += 1) {
          const other = particles[otherIndex];
          const distance = Math.hypot(particle.x - other.x, particle.y - other.y);
          if (distance > 125) continue;
          context.beginPath();
          context.strokeStyle = `rgba(76, 211, 211, ${0.13 * (1 - distance / 125)})`;
          context.lineWidth = 0.7;
          context.moveTo(particle.x, particle.y);
          context.lineTo(other.x, other.y);
          context.stroke();
        }
      });

      animationFrame = window.requestAnimationFrame(draw);
    }

    function resume() {
      if (visible && !document.hidden && !animationFrame) animationFrame = window.requestAnimationFrame(draw);
    }

    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", resume);
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver((entries) => {
        visible = entries[0].isIntersecting;
        if (visible) resume();
      }, { threshold: 0.02 });
      observer.observe(hero);
    }
    resize();
    resume();
  }

  window.addEventListener("scroll", requestScrollUpdate, { passive: true });
  if (panel) panel.addEventListener("bmth:lesson-rendered", animateLesson);
  updateScrollEffects();
  setupRevealEffects();
  setupCounter();
  setupParallax();
  setupNetworkCanvas();
  animateLesson();
})();
