/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LyricLine, StyleSettings } from "./types";

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  alpha: number;
}

let particles: Particle[] = [];

// Initialize particles once
function initParticles(width: number, height: number) {
  if (particles.length > 0) return;
  for (let i = 0; i < 40; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 3 + 1,
      speedY: -(Math.random() * 0.8 + 0.2),
      speedX: Math.random() * 0.4 - 0.2,
      alpha: Math.random() * 0.7 + 0.3,
    });
  }
}

export function drawCanvasFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  freqData: Uint8Array,
  settings: StyleSettings,
  activeLine: LyricLine | null,
  isRecording: boolean,
  isPlaying: boolean,
  dragYOffset: { lyricY: number; specY: number }
) {
  initParticles(width, height);

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Layered Dark Background Graduate
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, "#020617");
  bgGrad.addColorStop(1, "#070a19");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Draw ambient glowing orbit in center to mimic fuchsia + indigo backdrops
  const blobGrad1 = ctx.createRadialGradient(
    0, 0, 10,
    0, 0, Math.max(width, height) * 0.6
  );
  blobGrad1.addColorStop(0, "rgba(99, 102, 241, 0.15)"); // indigo-500
  blobGrad1.addColorStop(1, "rgba(2, 6, 23, 0)");
  ctx.fillStyle = blobGrad1;
  ctx.fillRect(0, 0, width, height);

  const blobGrad2 = ctx.createRadialGradient(
    width, height, 10,
    width, height, Math.max(width, height) * 0.7
  );
  blobGrad2.addColorStop(0, "rgba(217, 70, 239, 0.1)"); // fuchsia-500
  blobGrad2.addColorStop(1, "rgba(2, 6, 23, 0)");
  ctx.fillStyle = blobGrad2;
  ctx.fillRect(0, 0, width, height);

  // Convert specColor hex to rgba for particle compatibility
  const hex = settings.specColor || "#29b6f6";
  const r = parseInt(hex.slice(1, 3), 16) || 41;
  const g = parseInt(hex.slice(3, 5), 16) || 182;
  const b = parseInt(hex.slice(5, 7), 16) || 246;

  // Draw dynamic floating particles for high-fidelity "dreamy" look
  particles.forEach((p) => {
    p.y += p.speedY;
    p.x += p.speedX;
    if (p.y < 0) p.y = height;
    if (p.x < 0 || p.x > width) p.x = Math.random() * width;

    // React speed to sound intensity
    const beatStrength = freqData.length > 0 ? freqData[4] / 255 : 0;
    const currentSize = p.size + beatStrength * 3;

    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.alpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
    ctx.fill();
  });

  // Calculate Spectrum coordinates
  const specYPosition = dragYOffset.specY * height;
  const barsCount = Math.min(freqData.length, 64);
  const totalBarWidth = barsCount * (settings.specBarW + settings.specGap);
  const startXPosition = (width - totalBarWidth) / 2;

  // Draw Audio Spectrum Visualizer Designs
  ctx.save();
  if (settings.specGlow > 0) {
    ctx.shadowBlur = settings.specGlow;
    ctx.shadowColor = settings.specColor;
  }

  const designIndex = settings.spectrumDesign;

  if (designIndex === 0) {
    // 1. Classic Waves (Garis Gelombang)
    ctx.beginPath();
    ctx.strokeStyle = settings.specColor;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (let i = 0; i < barsCount; i++) {
      const x = startXPosition + i * (settings.specBarW + settings.specGap);
      const val = (freqData[i] || 0) / 255;
      const h = val * settings.specHeight * 1.5;
      const y = specYPosition - h;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    if (settings.specMirror) {
      ctx.beginPath();
      ctx.strokeStyle = `${settings.specColor}44`;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < barsCount; i++) {
        const x = startXPosition + i * (settings.specBarW + settings.specGap);
        const val = (freqData[i] || 0) / 255;
        const h = val * settings.specHeight * 0.6;
        const y = specYPosition + h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  } else if (designIndex === 1) {
    // 2. Classic Equalizer (Blok Equalizer)
    for (let i = 0; i < barsCount; i++) {
      const x = startXPosition + i * (settings.specBarW + settings.specGap);
      const val = (freqData[i] || 0) / 255;
      const h = Math.max(val * settings.specHeight * 1.5, 4);

      // Gradient color for bars
      const barGrad = ctx.createLinearGradient(x, specYPosition, x, specYPosition - h);
      barGrad.addColorStop(0, `${settings.specColor}33`);
      barGrad.addColorStop(1, settings.specColor);

      ctx.fillStyle = barGrad;
      // Draw stacked visual bars
      ctx.fillRect(x, specYPosition - h, settings.specBarW, h);

      if (settings.specMirror) {
        ctx.fillStyle = `${settings.specColor}1a`;
        ctx.fillRect(x, specYPosition + 1, settings.specBarW, h * 0.4);
      }
    }
  } else if (designIndex === 2) {
    // 3. Radial Circular Wave (Batang Melingkar)
    const cx = width / 2;
    const cy = specYPosition;
    const radius = Math.min(width, height) * 0.16;

    // Draw circular frame
    ctx.strokeStyle = `${settings.specColor}33`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < barsCount; i++) {
      const angle = (i / barsCount) * Math.PI * 2 - Math.PI / 2;
      const val = (freqData[i] || 0) / 255;
      const h = val * settings.specHeight * 1.2;

      const xStart = cx + Math.cos(angle) * radius;
      const yStart = cy + Math.sin(angle) * radius;
      const xEnd = cx + Math.cos(angle) * (radius + h);
      const yEnd = cy + Math.sin(angle) * (radius + h);

      ctx.strokeStyle = settings.specColor;
      ctx.lineWidth = settings.specBarW;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(xStart, yStart);
      ctx.lineTo(xEnd, yEnd);
      ctx.stroke();

      if (settings.specMirror) {
        const xStartIn = cx + Math.cos(angle) * radius;
        const yStartIn = cy + Math.sin(angle) * radius;
        const xEndIn = cx + Math.cos(angle) * (radius - h * 0.4);
        const yEndIn = cy + Math.sin(angle) * (radius - h * 0.4);

        ctx.strokeStyle = `${settings.specColor}66`;
        ctx.beginPath();
        ctx.moveTo(xStartIn, yStartIn);
        ctx.lineTo(xEndIn, yEndIn);
        ctx.stroke();
      }
    }
  } else if (designIndex === 3) {
    // 4. Double Sided Waveforms (Simetri Kupu-Kupu)
    for (let i = 0; i < barsCount; i++) {
      const x = startXPosition + i * (settings.specBarW + settings.specGap);
      const val = (freqData[i] || 0) / 255;
      const h = val * settings.specHeight;

      ctx.fillStyle = settings.specColor;
      ctx.fillRect(x, specYPosition - h, settings.specBarW, h * 2);
    }
  } else if (designIndex === 4) {
    // 5. Laser Line Glow
    ctx.strokeStyle = settings.specColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, specYPosition);
    ctx.lineTo(width, specYPosition);
    ctx.stroke();

    for (let i = 0; i < barsCount; i++) {
      const x = startXPosition + i * (settings.specBarW + settings.specGap);
      const val = (freqData[i] || 0) / 255;
      const h = val * settings.specHeight * 2;

      ctx.fillStyle = `${settings.specColor}88`;
      ctx.beginPath();
      ctx.arc(x + settings.specBarW / 2, specYPosition - h, settings.specBarW + 1, 0, Math.PI * 2);
      ctx.fill();

      // Laser lines shooting up
      ctx.fillStyle = `${settings.specColor}11`;
      ctx.fillRect(x, specYPosition - h, settings.specBarW, h);
    }
  } else {
    // Fallback: Elegant Line equalizer
    for (let i = 0; i < barsCount; i++) {
      const x = startXPosition + i * (settings.specBarW + settings.specGap);
      const val = (freqData[i] || 0) / 255;
      const h = val * settings.specHeight * 1.5;

      ctx.fillStyle = settings.specColor;
      ctx.fillRect(x, specYPosition - h, settings.specBarW, h);
    }
  }
  ctx.restore();

  // Draw active lyric text & subtitles
  if (activeLine) {
    const lyricYPosition = dragYOffset.lyricY * height;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Primary Lyric line
    ctx.font = `bold ${settings.fontSize}px ${settings.fontFamily}`;
    ctx.globalAlpha = settings.lyricOpacity;

    if (settings.lyricShadow > 0) {
      ctx.shadowBlur = settings.lyricShadow;
      ctx.shadowColor = settings.lyricActiveColor;
    }

    ctx.fillStyle = settings.lyricActiveColor;
    ctx.fillText(activeLine.text, width / 2, lyricYPosition);
    ctx.restore();

    // Subtitle Lyric line (translates)
    if (activeLine.sub) {
      const subYPosition = settings.subY * height;

      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `medium ${settings.subSize}px ${settings.fontFamily}, sans-serif`;

      const subTextStr = activeLine.sub;
      const textMetrics = ctx.measureText(subTextStr);
      const textWidth = textMetrics.width;
      const fontHeight = settings.subSize;

      // Subtitle container background box
      ctx.globalAlpha = settings.subBgOpacity;
      ctx.fillStyle = settings.subBg;
      const padX = 14;
      const padY = 8;
      ctx.beginPath();
      // Round rect
      const rx = width / 2 - textWidth / 2 - padX;
      const ry = subYPosition - fontHeight / 2 - padY;
      const rw = textWidth + padX * 2;
      const rh = fontHeight + padY * 2;
      const rc = 6; // rounded corner radius
      ctx.roundRect(rx, ry, rw, rh, rc);
      ctx.fill();

      // Render actual subtitle text over box
      ctx.globalAlpha = 1;
      ctx.fillStyle = settings.subColor;
      ctx.fillText(subTextStr, width / 2, subYPosition);
      ctx.restore();
    }
  } else {
    // Empty state branding on canvas
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 24px "Hanken Grotesk", sans-serif`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    ctx.fillText("Waiting for Media...", width / 2, height / 2 - 15);

    ctx.font = `400 13px "JetBrains Mono", monospace`;
    ctx.fillStyle = "rgba(129, 207, 255, 0.2)";
    ctx.fillText("PARSE LYRICS TO BEGIN STUDIO PREVIEW", width / 2, height / 2 + 15);
    ctx.restore();
  }

  // Draw an elegant "Sync Recording" pulse dot indicator in corner if sync is active
  if (isRecording) {
    ctx.save();
    ctx.fillStyle = "#ff5252";
    ctx.beginPath();
    // Blinks every half second
    const alphaPulse = 0.5 + Math.sin(Date.now() / 150) * 0.4;
    ctx.globalAlpha = alphaPulse;
    ctx.arc(30, 30, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = `bold 11px "JetBrains Mono", monospace`;
    ctx.fillStyle = "#ff5252";
    ctx.fillText("SYNC ACTIVE", 46, 33);
    ctx.restore();
  }
}
