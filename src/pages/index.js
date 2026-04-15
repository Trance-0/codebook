import {useEffect, useRef, useState} from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';

import styles from './index.module.css';

// --- Voronoi glass-fracture home-page background -------------------------
//
// ~50 invisible "sites" drift across the hero. Each Voronoi cell clips the
// background image with a random per-cell offset, simulating the refraction
// you see through a broken sheet of glass. Edges are drawn as natural glass
// fracture borders: a wider translucent dark crack + a thin bright
// refraction highlight.
//
// Clicking adds a new invisible site (more fractures).
//
// The diagram is computed with Sutherland-Hodgman half-plane intersection.
// O(n^3) per frame — fine for n ≈ 50–120.

const INITIAL_PARTICLES = 50;
const MAX_PARTICLES = 120;
const MIN_SPEED = 14; // px / second
const MAX_SPEED = 38;
const OFFSET_RANGE = 18; // px of refraction offset per cell

function randomVelocity() {
  const angle = Math.random() * Math.PI * 2;
  const speed = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);
  return {vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed};
}

function createParticle(x, y) {
  return {
    x,
    y,
    ...randomVelocity(),
    // Stable random offset — each "glass shard" refracts the image slightly
    ox: (Math.random() - 0.5) * 2 * OFFSET_RANGE,
    oy: (Math.random() - 0.5) * 2 * OFFSET_RANGE,
    // Random edge-width factor in [0.2, 1.0] — thinnest is 20% of max
    ew: 0.2 + Math.random() * 0.8,
  };
}

// Clip `poly` against the half-plane { p : (p - (px,py)) · (nx,ny) ≤ 0 }.
function clipPolygon(poly, px, py, nx, ny) {
  if (poly.length === 0) return poly;
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const da = (a[0] - px) * nx + (a[1] - py) * ny;
    const db = (b[0] - px) * nx + (b[1] - py) * ny;
    const aIn = da <= 0;
    const bIn = db <= 0;
    if (aIn && bIn) {
      out.push(b);
    } else if (aIn && !bIn) {
      const t = da / (da - db);
      out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
    } else if (!aIn && bIn) {
      const t = da / (da - db);
      out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
      out.push(b);
    }
  }
  return out;
}

function computeVoronoiCell(sites, i, w, h) {
  let poly = [
    [0, 0],
    [w, 0],
    [w, h],
    [0, h],
  ];
  const six = sites[i][0];
  const siy = sites[i][1];
  for (let j = 0; j < sites.length; j++) {
    if (j === i) continue;
    const sjx = sites[j][0];
    const sjy = sites[j][1];
    const mx = (six + sjx) / 2;
    const my = (siy + sjy) / 2;
    poly = clipPolygon(poly, mx, my, sjx - six, sjy - siy);
    if (poly.length === 0) break;
  }
  return poly;
}

// Trace a polygon path (moveTo + lineTo + closePath).
function tracePoly(ctx, poly) {
  ctx.moveTo(poly[0][0], poly[0][1]);
  for (let k = 1; k < poly.length; k++) {
    ctx.lineTo(poly[k][0], poly[k][1]);
  }
  ctx.closePath();
}

// ---------------------------------------------------------------------------

function HeroCanvas({bgImg, className}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bgImg) return;
    const ctx = canvas.getContext('2d');

    let particles = [];
    let width = 0;
    let height = 0;
    let rafId = 0;
    let lastTime = performance.now();
    let running = true;

    // Track the active colour-scheme so the overlay gradient adapts.
    let isDark =
      document.documentElement.getAttribute('data-theme') === 'dark';
    const themeObs = new MutationObserver(() => {
      isDark =
        document.documentElement.getAttribute('data-theme') === 'dark';
    });
    themeObs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      const dpr = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function seedParticles() {
      particles = [];
      for (let i = 0; i < INITIAL_PARTICLES; i++) {
        particles.push(
          createParticle(Math.random() * width, Math.random() * height),
        );
      }
    }

    function step(dt) {
      for (const p of particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.x < 0) {
          p.x = 0;
          p.vx = -p.vx;
        } else if (p.x > width) {
          p.x = width;
          p.vx = -p.vx;
        }
        if (p.y < 0) {
          p.y = 0;
          p.vy = -p.vy;
        } else if (p.y > height) {
          p.y = height;
          p.vy = -p.vy;
        }
      }
    }

    // Cover-fit the background image to the canvas.
    function bgCover() {
      const imgW = bgImg.naturalWidth;
      const imgH = bgImg.naturalHeight;
      const scale = Math.max(width / imgW, height / imgH);
      const dw = imgW * scale;
      const dh = imgH * scale;
      return {dx: (width - dw) / 2, dy: (height - dh) / 2, dw, dh};
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      if (particles.length === 0) return;

      const sites = particles.map((p) => [p.x, p.y]);
      const imgReady = bgImg.complete && bgImg.naturalWidth > 0;

      // Compute all Voronoi cells once per frame.
      const cells = [];
      for (let i = 0; i < sites.length; i++) {
        cells.push(computeVoronoiCell(sites, i, width, height));
      }

      const bg = imgReady ? bgCover() : null;

      // --- Pass 1: fractured glass cells ---
      // Clip each cell and draw the background image shifted by the
      // particle's random offset → refraction effect.
      if (bg) {
        for (let i = 0; i < cells.length; i++) {
          const poly = cells[i];
          if (poly.length < 3) continue;
          const p = particles[i];

          ctx.save();
          ctx.beginPath();
          tracePoly(ctx, poly);
          ctx.clip();

          // Refracted background — scale offset down on narrow viewports
          // so mobile doesn't show jarring shifts between shards.
          const oScale = width < 768 ? width / 768 : 1;
          ctx.drawImage(
            bgImg,
            bg.dx + p.ox * oScale,
            bg.dy + p.oy * oScale,
            bg.dw,
            bg.dh,
          );

          // Glass sheen: subtle vertical gradient (overhead light)
          let minY = Infinity;
          let maxY = -Infinity;
          for (const pt of poly) {
            if (pt[1] < minY) minY = pt[1];
            if (pt[1] > maxY) maxY = pt[1];
          }
          const grad = ctx.createLinearGradient(0, minY, 0, maxY);
          grad.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
          grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.04)');
          grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.01)');
          grad.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
          ctx.fillStyle = grad;
          ctx.fill();

          ctx.restore();
        }
      }

      // --- Pass 2: theme-dependent darkening overlay ---
      // Drawn on-canvas only when the canvas owns the background.
      if (bg) {
        const rgb = isDark ? '0, 0, 0' : '255, 255, 255';
        const overlayGrad = ctx.createLinearGradient(0, 0, 0, height);
        overlayGrad.addColorStop(0, `rgba(${rgb}, 0.05)`);
        overlayGrad.addColorStop(0.35, `rgba(${rgb}, 0.15)`);
        overlayGrad.addColorStop(0.85, `rgba(${rgb}, 0.55)`);
        overlayGrad.addColorStop(1, `rgba(${rgb}, 0.7)`);
        ctx.fillStyle = overlayGrad;
        ctx.fillRect(0, 0, width, height);
      }

      // --- Pass 3: glass fracture edges (per-cell random width) ---
      // Each particle carries a stable factor `ew` in [0.2, 1.0].
      // Base widths: dark crack 4px, bright highlight 1.5px.
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      for (let i = 0; i < cells.length; i++) {
        const poly = cells[i];
        if (poly.length < 2) continue;
        const ew = particles[i].ew;

        // Dark crack shadow
        ctx.strokeStyle = 'rgba(20, 15, 10, 0.4)';
        ctx.lineWidth = 2 * ew;
        ctx.beginPath();
        tracePoly(ctx, poly);
        ctx.stroke();

        // Bright refraction highlight
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.lineWidth = 1.8 * ew;
        ctx.beginPath();
        tracePoly(ctx, poly);
        ctx.stroke();
      }
    }

    function loop(now) {
      if (!running) return;
      const dt = Math.min((now - lastTime) / 1000, 1 / 20);
      lastTime = now;
      step(dt);
      draw();
      rafId = requestAnimationFrame(loop);
    }

    function handleClick(e) {
      if (particles.length >= MAX_PARTICLES) return;
      const rect = canvas.getBoundingClientRect();
      particles.push(
        createParticle(e.clientX - rect.left, e.clientY - rect.top),
      );
    }

    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas);

    resize();
    seedParticles();
    lastTime = performance.now();
    rafId = requestAnimationFrame(loop);
    canvas.addEventListener('click', handleClick);

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      ro.disconnect();
      canvas.removeEventListener('click', handleClick);
      themeObs.disconnect();
    };
  }, [bgImg]);

  return (
    <canvas
      ref={canvasRef}
      className={`${styles.canvas}${className ? ` ${className}` : ''}`}
      aria-hidden="true"
    />
  );
}

// ---------------------------------------------------------------------------

function Hero() {
  const {siteConfig} = useDocusaurusContext();
  const bgUrl = useBaseUrl('/img/111989155_p0.jpg');
  const [bgImg, setBgImg] = useState(null);

  // Preload the background image so the static layer and the canvas
  // become ready at the same moment, then fade them in together.
  useEffect(() => {
    const img = new Image();
    img.onload = () => setBgImg(img);
    img.src = bgUrl;
  }, [bgUrl]);

  const loaded = bgImg !== null;
  const loadedClass = loaded ? ` ${styles.loaded}` : '';

  return (
    <section className={styles.hero}>
      <div
        className={styles.bg + loadedClass}
        style={{backgroundImage: `url(${bgUrl})`}}
        aria-hidden="true"
      />
      <div className={styles.bgOverlay + loadedClass} aria-hidden="true" />

      <BrowserOnly>
        {() => <HeroCanvas bgImg={bgImg} className={loaded ? styles.loaded : ''} />}
      </BrowserOnly>

      <div className={styles.titleBlock}>
        <h1 className={styles.title}>{siteConfig.title}</h1>
        <p className={styles.subtitle}>{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link className={styles.ctaButton} to="/docs/intro">
            Start reading
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();

  // Toggle a class on <html> so global CSS can target the navbar/footer
  // only on the home page.
  useEffect(() => {
    document.documentElement.classList.add('homepage');
    return () => document.documentElement.classList.remove('homepage');
  }, []);

  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <Hero />
    </Layout>
  );
}
