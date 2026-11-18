import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import ShapeWaves from './vendor/ShapeWaves.jsx';

function CanvasFallback({ paused, shapes }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let frame;
    let width = 0;
    let height = 0;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    function draw(now = 0) {
      const time = paused || reduce.matches ? 0 : now * .0003;
      ctx.clearRect(0, 0, width, height);
      const gap = 10;
      for (let y = 0; y < height; y += gap) for (let x = 0; x < width; x += gap) {
        const wave = (Math.sin(x * .008 + y * .006 - time * 2) + Math.cos(y * .012 - x * .004 + time)) / 2;
        const size = 3.75;
        ctx.fillStyle = `rgba(146,146,146,${.25 + Math.max(0, wave) * .75})`;
        const mode = shapes === 'mixed' ? (x / gap + y / gap) % 3 : { circles: 0, squares: 1, triangles: 2 }[shapes];
        ctx.beginPath();
        if (mode === 0) ctx.arc(x, y, size, 0, Math.PI * 2);
        else if (mode === 1) ctx.rect(x - size, y - size, size * 2, size * 2);
        else { ctx.moveTo(x, y - size); ctx.lineTo(x + size, y + size); ctx.lineTo(x - size, y + size); ctx.closePath(); }
        ctx.fill();
      }
      let fontSize = height * .6;
      ctx.font = `500 ${fontSize}px Geist, "Geist Sans", system-ui, sans-serif`;
      fontSize *= Math.min(1, width * .9 / ctx.measureText('</>').width);
      ctx.font = `500 ${fontSize}px Geist, "Geist Sans", system-ui, sans-serif`;
      const metrics = ctx.measureText('</>');
      ctx.fillStyle = '#000';
      ctx.fillText('</>', (width - metrics.width) / 2, (height + metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2);
      if (!paused && !reduce.matches && !document.hidden) frame = requestAnimationFrame(draw);
    }
    function restart() {
      cancelAnimationFrame(frame);
      const rect = canvas.getBoundingClientRect();
      width = rect.width; height = rect.height;
      const dpr = Math.min(devicePixelRatio, 1.5);
      canvas.width = width * dpr; canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }
    const resize = new ResizeObserver(restart);
    resize.observe(canvas);
    document.addEventListener('visibilitychange', restart);
    reduce.addEventListener('change', restart);
    return () => { cancelAnimationFrame(frame); resize.disconnect(); document.removeEventListener('visibilitychange', restart); reduce.removeEventListener('change', restart); };
  }, [paused, shapes]);
  return <canvas ref={ref} className="fallback-waves" aria-hidden="true" />;
}

function Background() {
  const [fallback, setFallback] = useState(!navigator.gpu);
  const paused = false;
  const shapes = 'mixed';
  useEffect(() => {
    document.querySelector('#wave-field').dataset.renderer = fallback ? 'canvas' : 'webgpu';
  }, [fallback]);
  return fallback ? <CanvasFallback paused={paused} shapes={shapes} /> : <ShapeWaves
    text="</>"
    fontFamily='Geist, "Geist Sans", system-ui, sans-serif'
    fontWeight={500}
    textSize={0.6}
    shapes={shapes}
    cellSize={10}
    dotSize={0.75}
    color="#929292"
    hoverColor="#ffffff"
    backgroundColor="#000000"
    speed={1}
    scale={1}
    contrast={1}
    brightness={0.4}
    flow={0}
    direction={0}
    fade={0.25}
    interactive={true}
    splashRadius={40}
    splashStrength={0.4}
    glow={0.35}
    intro={true}
    introDuration={1.6}
    paused={paused}
    onError={error => { document.querySelector('#wave-field').dataset.gpuError = error.message; setFallback(true); }}
  />;
}
createRoot(document.querySelector('#wave-field')).render(<Background />);
document.querySelectorAll('.headline-line').forEach((line, index) => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  line.animate([{ transform: 'translateY(38px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 1000, delay: index * 130, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
});
