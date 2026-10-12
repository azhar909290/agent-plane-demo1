import React, { useEffect, useRef } from 'react';

// GitHub-homepage-style rotating dotted globe with animated "request" arcs.
// Pure canvas, no dependencies. `pulses` = array of labels to fire arcs for.
export default function Globe({ size = 520, arcRate = 900, color = '#7c5cff', arcColor = '#2ee6a6' }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current; const ctx = cv.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    cv.width = size * dpr; cv.height = size * dpr; ctx.scale(dpr, dpr);
    const R = size * 0.42, cx = size / 2, cy = size / 2;
    const N = 1400, pts = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = golden * i;
      // carve pseudo-continents using low-frequency noise so it looks like land
      const lat = Math.asin(y), lon = th % (2 * Math.PI);
      const n = Math.sin(lon * 2.1 + 1.3) * Math.cos(lat * 3.2) + Math.sin(lon * 4.7) * 0.45 + Math.cos(lat * 6 + lon) * 0.3;
      if (n > 0.15) pts.push([Math.cos(th) * r, y, Math.sin(th) * r]);
    }
    const arcs = [];
    let rot = 0, raf, last = 0;
    const tilt = 0.35;
    const project = ([x, y, z]) => {
      const cr = Math.cos(rot), sr = Math.sin(rot);
      let X = x * cr - z * sr, Z = x * sr + z * cr;
      const ct = Math.cos(tilt), st = Math.sin(tilt);
      const Y = y * ct - Z * st; Z = y * st + Z * ct;
      return [cx + X * R, cy - Y * R, Z];
    };
    const slerp = (a, b, t, lift) => {
      const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
      const om = Math.acos(Math.min(1, Math.max(-1, dot))) || 1e-6;
      const s1 = Math.sin((1 - t) * om) / Math.sin(om), s2 = Math.sin(t * om) / Math.sin(om);
      const h = 1 + Math.sin(Math.PI * t) * lift;
      return [(a[0] * s1 + b[0] * s2) * h, (a[1] * s1 + b[1] * s2) * h, (a[2] * s1 + b[2] * s2) * h];
    };
    const frame = t => {
      ctx.clearRect(0, 0, size, size);
      // halo
      const g = ctx.createRadialGradient(cx, cy, R * 0.7, cx, cy, R * 1.25);
      g.addColorStop(0, color + '30'); g.addColorStop(1, 'transparent');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.25, 0, Math.PI * 2); ctx.fill();
      // sphere body
      const b = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.4, R * 0.1, cx, cy, R);
      b.addColorStop(0, color + '38'); b.addColorStop(1, color + '08');
      ctx.fillStyle = b; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
      for (const p of pts) {
        const [x, y, z] = project(p);
        if (z < -0.05) continue;
        ctx.globalAlpha = 0.25 + z * 0.75; ctx.fillStyle = color;
        ctx.fillRect(x - 1, y - 1, 1.9, 1.9);
      }
      ctx.globalAlpha = 1;
      if (t - last > arcRate && arcs.length < 14) {
        last = t;
        const a = pts[Math.floor(Math.random() * pts.length)], c = pts[Math.floor(Math.random() * pts.length)];
        arcs.push({ a, b: c, born: t, life: 2600 + Math.random() * 1200, lift: 0.18 + Math.random() * 0.25 });
      }
      for (let i = arcs.length - 1; i >= 0; i--) {
        const A = arcs[i]; const p = (t - A.born) / A.life;
        if (p > 1.4) { arcs.splice(i, 1); continue; }
        const head = Math.min(1, p), tail = Math.max(0, p - 0.45);
        ctx.beginPath(); let started = false;
        for (let s = tail; s <= head; s += 0.02) {
          const [x, y, z] = project(slerp(A.a, A.b, s, A.lift));
          if (z < -0.1) { started = false; continue; }
          started ? ctx.lineTo(x, y) : ctx.moveTo(x, y); started = true;
        }
        ctx.strokeStyle = arcColor; ctx.lineWidth = 1.8; ctx.shadowColor = arcColor; ctx.shadowBlur = 10;
        ctx.globalAlpha = p > 1 ? Math.max(0, 1 - (p - 1) / 0.4) : 1; ctx.stroke();
        if (p <= 1) {
          const [hx, hy, hz] = project(slerp(A.a, A.b, head, A.lift));
          if (hz > -0.1) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(hx, hy, 2.4, 0, Math.PI * 2); ctx.fill(); }
        } else {
          const [ex, ey, ez] = project(A.b);
          if (ez > 0) { ctx.strokeStyle = arcColor; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(ex, ey, (p - 1) * 40, 0, Math.PI * 2); ctx.stroke(); }
        }
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      }
      rot += 0.0022;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [size, color, arcColor, arcRate]);
  return <canvas ref={ref} style={{ width: size, height: size, maxWidth: '100%' }} />;
}
