/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Music,
  Tv,
  Upload,
  Play,
  Pause,
  Download,
  RefreshCw,
  FileText,
  Check,
  Trash2,
  Settings,
  HelpCircle,
  User,
  Sparkles,
  Save,
  Image,
  Subtitles,
  Sliders,
  ChevronRight,
  Monitor,
  X,
  Volume2
} from "lucide-react";
import { LyricLine, StyleSettings, VideoTemplate } from "./types";
import { globalAudioEngine } from "./audioEngine";
import { drawCanvasFrame } from "./canvasRenderer";
import { MASTER_TEMPLATES } from "./templates";

// Default lyrics to give a rich starting experience
const DEFAULT_LYRICS: LyricLine[] = [
  {
    id: "1",
    text: "Welcome to NDK.VSpecs Creative Studio",
    sub: "Selamat datang di Studio Kreatif NDK.VSpecs",
    start: 0,
    end: 4,
    synced: true,
  },
  {
    id: "2",
    text: "Real-time audio spectrum and lyrics visualizer",
    sub: "Visualisator lirik dan spektrum audio real-time",
    start: 4,
    end: 8,
    synced: true,
  },
  {
    id: "3",
    text: "Click individual elements or press 'K' to sync timings",
    sub: "Klik elemen atau tekan 'K' untuk sinkronisasi waktu",
    start: 8,
    end: 12,
    synced: true,
  },
  {
    id: "4",
    text: "Render and export high-fidelity video templates easily",
    sub: "Ekspor dan hasilkan video berkualitas tinggi dengan mudah",
    start: 12,
    end: 17,
    synced: true,
  },
];

export default function App() {
  // Main app tabs
  const [activeTab, setActiveTab] = useState<"input" | "typo" | "sub" | "spectrum" | "export">("input");
  
  // Style settings
  const [style, setStyle] = useState<StyleSettings>({
    fontFamily: "Hanken Grotesk",
    fontSize: 38,
    lyricColor: "#ffffff",
    lyricActiveColor: "#81cfff",
    lyricY: 0.55,
    lyricOpacity: 1,
    lyricShadow: 12,
    
    subSize: 18,
    subColor: "#aaccee",
    subY: 0.72,
    subBg: "#030e20",
    subBgOpacity: 0.65,
    
    specHeight: 90,
    specBarW: 4,
    specGap: 2,
    specY: 0.82,
    specMirror: true,
    specGlow: 8,
    specColor: "#29b6f6",
    
    spectrumDesign: 1, // 0: wave, 1: blocks, 2: circles, 3: double wave, 4: laser
  });

  // Aspect ratio: true for 16:9 YT, false for 9:16 Portrait IG
  const [isWidescreen, setIsWidescreen] = useState<boolean>(true);

  // Audio & active play states
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(30); // Default simulated track length in seconds
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioFileName, setAudioFileName] = useState<string>("");

  // Lyrics timeline states
  const [lyrics, setLyrics] = useState<LyricLine[]>(DEFAULT_LYRICS);
  const [activeLineIndex, setActiveLineIndex] = useState<number>(0);
  const [isSyncActive, setIsSyncActive] = useState<boolean>(false);

  // Manual timing modifiers
  const [manualStart, setManualStart] = useState<string>("0");
  const [manualEnd, setManualEnd] = useState<string>("4");

  // AI Dialog States
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [aiSongTitle, setAiSongTitle] = useState<string>("");
  const [aiArtistName, setAiArtistName] = useState<string>("");
  const [aiPrompt, setAiPrompt] = useState<string>("");
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string>("");

  // AI Translation state
  const [translating, setTranslating] = useState<boolean>(false);

  // Rendering overlay states
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [renderProgress, setRenderProgress] = useState<number>(0);

  // Canvas ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Custom drag offsets for repositioning on canvas directly
  const [dragOffsetY, setDragOffsetY] = useState({ lyricY: 0.55, specY: 0.82 });
  const [isDraggingLyric, setIsDraggingLyric] = useState(false);
  const [isDraggingSpec, setIsDraggingSpec] = useState(false);

  // Notify messages
  const [toastMessage, setToastMessage] = useState<string>("");

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage("");
    }, 4000);
  };

  // Setup canvas animation frame
  useEffect(() => {
    let animFrame: number;
    
    const tick = () => {
      // Fetch current play state and scrub calculations
      if (isPlaying) {
        if (audioFile) {
          const current = globalAudioEngine.getUploadedPlayProgress();
          setCurrentTime(current);
          if (current >= duration) {
            setIsPlaying(false);
            globalAudioEngine.stop();
          }
        } else {
          // Simulated time multiplier
          setCurrentTime((prev) => {
            const next = prev + 0.05; // ~20fps increments
            if (next >= duration) {
              setIsPlaying(false);
              globalAudioEngine.stop();
              return 0;
            }
            return next;
          });
        }
      }

      // Drawing canvas
      if (canvasRef.current) {
        const can = canvasRef.current;
        const ctx = can.getContext("2d");
        if (ctx) {
          const freq = globalAudioEngine.getAnalyserData();
          
          // Match active index based on audio timing
          let matchedIndex = -1;
          for (let i = 0; i < lyrics.length; i++) {
            const line = lyrics[i];
            if (line.synced && currentTime >= line.start && currentTime <= line.end) {
              matchedIndex = i;
              break;
            }
          }
          if (matchedIndex !== -1 && matchedIndex !== activeLineIndex) {
            setActiveLineIndex(matchedIndex);
          }

          const activeLineObj = matchedIndex !== -1 ? lyrics[matchedIndex] : null;

          // Drag coordinates updated synchronized with styled settings
          drawCanvasFrame(
            ctx,
            can.width,
            can.height,
            freq,
            { ...style, lyricY: dragOffsetY.lyricY, specY: dragOffsetY.specY },
            activeLineObj,
            isSyncActive,
            isPlaying,
            dragOffsetY
          );
        }
      }
      animFrame = requestAnimationFrame(tick);
    };

    animFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrame);
  }, [isPlaying, audioFile, duration, lyrics, activeLineIndex, style, isSyncActive, dragOffsetY, currentTime]);

  // Synchronize manual form settings whenever active index changes or list changes
  useEffect(() => {
    if (activeLineIndex >= 0 && activeLineIndex < lyrics.length) {
      const activeLineObj = lyrics[activeLineIndex];
      setManualStart(activeLineObj.start.toFixed(2));
      setManualEnd(activeLineObj.end.toFixed(2));
    }
  }, [activeLineIndex, lyrics]);

  // Manage spacebar / K shortcuts globally
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Exclude input boxes or text areas
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        recordSyncMark();
      } else if (e.key === "j" || e.key === "J") {
        // Rewind 0.5s
        e.preventDefault();
        offsetTimelinePlayback(-0.5);
      } else if (e.key === "l" || e.key === "L") {
        // Fast forward 0.5s
        e.preventDefault();
        offsetTimelinePlayback(0.5);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, lyrics, currentTime, duration, isSyncActive]);

  // Player controls
  const togglePlayPause = () => {
    globalAudioEngine.init();
    if (isPlaying) {
      if (audioFile) {
        globalAudioEngine.pauseUploaded();
      } else {
        globalAudioEngine.stopSynth();
      }
      setIsPlaying(false);
      triggerToast("⏸ Playback paused");
    } else {
      if (audioFile) {
        globalAudioEngine.playUploaded(currentTime, () => {
          setIsPlaying(false);
        });
      } else {
        globalAudioEngine.startSynth();
      }
      setIsPlaying(true);
      globalAudioEngine.resumeContextIfNeeded();
      triggerToast("▶ Studio synthesizer running");
    }
  };

  const offsetTimelinePlayback = (amount: number) => {
    let nextVal = currentTime + amount;
    if (nextVal < 0) nextVal = 0;
    if (nextVal > duration) nextVal = duration;
    
    setCurrentTime(nextVal);
    if (audioFile && isPlaying) {
      globalAudioEngine.playUploaded(nextVal, () => {
        setIsPlaying(false);
      });
    }
  };

  const handleTimelineScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const targetSecond = pct * duration;
    setCurrentTime(targetSecond);
    
    if (audioFile && isPlaying) {
      globalAudioEngine.playUploaded(targetSecond, () => {
        setIsPlaying(false);
      });
    }
    triggerToast(`Scrubbed to ${targetSecond.toFixed(1)}s`);
  };

  // Parsing pasted raw lyric text areas
  const handleParseRawText = (originalText: string, subtitleText: string) => {
    const originArr = originalText.trim().split("\n").filter(l => l.trim());
    const subArr = subtitleText.trim().split("\n").filter(l => l.trim());
    
    const parsed: LyricLine[] = originArr.map((text, idx) => ({
      id: Math.random().toString(36).substring(3, 8),
      text: text.trim(),
      sub: subArr[idx] ? subArr[idx].trim() : "",
      start: -1,
      end: -1,
      synced: false,
    }));

    if (parsed.length === 0) {
      triggerToast("❌ Please write or paste some lyrics first");
      return;
    }

    setLyrics(parsed);
    setActiveLineIndex(0);
    setIsSyncActive(true);
    triggerToast(`📋 Successfully parsed ${parsed.length} lyric rows! Record timing is armed.`);
  };

  // Recording timestamps as track plays
  const recordSyncMark = () => {
    if (lyrics.length === 0) return;
    
    // Find first unsynced line index
    const indexToSync = lyrics.findIndex(l => !l.synced);
    
    if (indexToSync === -1) {
      triggerToast("🎉 All lyric lines have already been synched!");
      setIsSyncActive(false);
      return;
    }

    const t = currentTime;
    setLyrics((prev) => {
      const copy = [...prev];
      
      // If there is a previous line, seal its duration bound to current start
      if (indexToSync > 0 && copy[indexToSync - 1].synced) {
        copy[indexToSync - 1].end = t;
      }
      
      copy[indexToSync] = {
        ...copy[indexToSync],
        start: t,
        end: t + 4.0, // Default duration cushion before next line triggers
        synced: true,
      };
      return copy;
    });

    setActiveLineIndex(indexToSync);
    triggerToast(`⏱ Row ${indexToSync + 1} synchronized at ${t.toFixed(2)}s`);
  };

  const resetSyncPath = () => {
    setLyrics(prev => prev.map(l => ({ ...l, start: -1, end: -1, synced: false })));
    setActiveLineIndex(0);
    setIsSyncActive(true);
    triggerToast("🗑 Timestamps cleared! Studio timeline reset.");
  };

  // Auto spacing timestamp distribution
  const triggerAutoSyncSplit = () => {
    if (lyrics.length === 0) {
      triggerToast("❌ Lyric lines are empty. Paste lyrics first.");
      return;
    }
    const division = duration / lyrics.length;
    setLyrics((prev) => {
      return prev.map((line, idx) => ({
        ...line,
        start: idx * division,
        end: (idx + 1) * division,
        synced: true,
      }));
    });
    setActiveLineIndex(0);
    setIsSyncActive(false);
    triggerToast("⚡ Auto-Sync successfully distributed timeline rows!");
  };

  const handleManualTimeUpdate = () => {
    const s = parseFloat(manualStart);
    const e = parseFloat(manualEnd);
    if (isNaN(s) || isNaN(e) || s < 0 || e < s) {
      triggerToast("❌ Range error. Ensure timing inputs are valid.");
      return;
    }
    
    setLyrics((prev) => {
      const copy = [...prev];
      if (activeLineIndex >= 0 && activeLineIndex < copy.length) {
        copy[activeLineIndex] = {
          ...copy[activeLineIndex],
          start: s,
          end: e,
          synced: true,
        };
      }
      return copy;
    });
    triggerToast("⏱ Saved custom timestamps for active row");
  };

  // Uploading Audio files
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    setAudioFileName(file.name);
    setAudioFile(file);
    setIsPlaying(false);
    globalAudioEngine.stop();
    
    triggerToast("⏳ Decoding audio format...");
    try {
      const buf = await globalAudioEngine.loadUploadedFile(file);
      setDuration(buf.duration);
      setCurrentTime(0);
      triggerToast(`🎵 Decoded: ${file.name} (${buf.duration.toFixed(1)}s)`);
    } catch (err: any) {
      triggerToast(`❌ Decode error: ${err.message || err}`);
    }
  };

  // AI-powered Lyrics Generator Modal Call
  const generateAILyricsSheet = async () => {
    if (!aiSongTitle && !aiPrompt) {
      setAiError("Please type a Song Title, Artist or theme prompt instructions.");
      return;
    }
    setAiLoading(true);
    setAiError("");
    
    try {
      const response = await fetch("/api/gemini/lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          songTitle: aiSongTitle,
          artistName: aiArtistName,
          prompt: aiPrompt,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Server route error status.");
      }

      if (data.lyrics && Array.isArray(data.lyrics)) {
        const loaded: LyricLine[] = data.lyrics.map((line: any) => ({
          id: Math.random().toString(36).substring(3, 8),
          text: line.text || "Original verse line",
          sub: line.sub || "Terjemahan baris lirik",
          start: -1,
          end: -1,
          synced: false,
        }));
        setLyrics(loaded);
        setActiveLineIndex(0);
        setIsSyncActive(true);
        setIsAiModalOpen(false);
        triggerToast(`✨ Gemini generated ${loaded.length} interactive lines! Keyboard sync is ready.`);
      } else {
        throw new Error("Invalid output layout format returned from server.");
      }
    } catch (err: any) {
      setAiError(err.message || "Failed to query Gemini AI.");
    } finally {
      setAiLoading(false);
    }
  };

  // AI Translation helper
  const translateSubtitlesAutomatically = async () => {
    if (lyrics.length === 0) {
      triggerToast("❌ Lyrics list is empty. Add lyrics first.");
      return;
    }
    setTranslating(true);
    triggerToast("✨ Querying Gemini translation engine...");

    try {
      const response = await fetch("/api/gemini/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: lyrics.map(l => l.text)
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Server returned failure status.");
      }

      if (data.translations && Array.isArray(data.translations)) {
        setLyrics((prev) => {
          return prev.map((line, idx) => ({
            ...line,
            sub: data.translations[idx] || line.sub || ""
          }));
        });
        triggerToast("🎉 Seamlessly translated raw verses to Indonesian subtitles!");
      }
    } catch (err: any) {
      triggerToast(`Failed to translate: ${err.message || err}`);
    } finally {
      setTranslating(false);
    }
  };

  // Drag and Drop Canvas handles
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const can = canvasRef.current;
    const rect = can.getBoundingClientRect();
    
    // Scale coordinates back to canvas dimensions
    const scaleX = can.width / rect.width;
    const scaleY = can.height / rect.height;
    
    const clickY = (e.clientY - rect.top) * scaleY;
    const clickYPercentage = clickY / can.height;

    // Detect click zones
    const lyricZoneMin = dragOffsetY.lyricY - 0.1;
    const lyricZoneMax = dragOffsetY.lyricY + 0.1;
    const specZoneMin = dragOffsetY.specY - 0.1;
    const specZoneMax = dragOffsetY.specY + 0.1;

    if (clickYPercentage >= lyricZoneMin && clickYPercentage <= lyricZoneMax) {
      setIsDraggingLyric(true);
    } else if (clickYPercentage >= specZoneMin && clickYPercentage <= specZoneMax) {
      setIsDraggingSpec(true);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const can = canvasRef.current;
    
    if (isDraggingLyric || isDraggingSpec) {
      const rect = can.getBoundingClientRect();
      const scaleY = can.height / rect.height;
      const currentY = (e.clientY - rect.top) * scaleY;
      const percentage = Math.max(0.1, Math.min(0.9, currentY / can.height));

      if (isDraggingLyric) {
        setDragOffsetY(p => ({ ...p, lyricY: percentage }));
      } else if (isDraggingSpec) {
        setDragOffsetY(p => ({ ...p, specY: percentage }));
      }
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDraggingLyric(false);
    setIsDraggingSpec(false);
  };

  // Visual template updater
  const applyTemplatePresetIdx = (template: VideoTemplate) => {
    setStyle((prev) => ({
      ...prev,
      fontFamily: template.fontFamily,
      specColor: template.specColor,
      lyricActiveColor: template.lyricActiveColor,
    }));
    triggerToast(`Applied visual template: ${template.name}`);
  };

  // Exporters
  const exportPNGMockFrame = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "ndk-vspecs-captured-frame.png";
    link.click();
    triggerToast("🖼 Downloaded PNG screenshot of canvas!");
  };

  const exportSRTSubtitleFile = () => {
    const synchedOnly = lyrics.filter(l => l.synced && l.start >= 0);
    if (synchedOnly.length === 0) {
      triggerToast("❌ Please synchronize timestamps before generating SRT");
      return;
    }

    const padZero = (n: number, count: number) => String(n).padStart(count, "0");
    const formatTime = (secs: number) => {
      const hrs = Math.floor(secs / 3600);
      const mins = Math.floor((secs % 3600) / 60);
      const remainingSecs = Math.floor(secs % 60);
      const ms = Math.floor((secs % 1) * 1000);
      return `${padZero(hrs, 2)}:${padZero(mins, 2)}:${padZero(remainingSecs, 2)},${padZero(ms, 3)}`;
    };

    let body = "";
    synchedOnly.forEach((line, index) => {
      body += `${index + 1}\n`;
      body += `${formatTime(line.start)} --> ${formatTime(line.end)}\n`;
      body += `${line.text}\n`;
      if (line.sub) {
        body += `${line.sub}\n`;
      }
      body += "\n";
    });

    const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${audioFileName ? audioFileName.replace(/\.[^/.]+$/, "") : "subtitles"}.srt`;
    link.click();
    triggerToast("📄 Downloaded SRT timings file!");
  };

  const exportProjectToJSON = () => {
    const payload = {
      project: "NDK.VSpecs",
      lyrics: lyrics,
      style: style,
      uploadedFileName: audioFileName,
      aspectRatio: isWidescreen ? "16:9" : "9:16",
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ndk-project-save.json`;
    link.click();
    triggerToast("💾 Downloaded JSON project file!");
  };

  // Clean Slate Row Clear
  const handleClearWorkspaceData = () => {
    if (window.confirm("Apakah Anda yakin ingin menghapus semua baris lirik di editor?")) {
      setLyrics([]);
      setActiveLineIndex(0);
      triggerToast("🗑 Cleared workspace");
    }
  };

  // Multi-pass Simulated Render
  const triggerSimulatedMP4Render = () => {
    if (lyrics.length === 0) {
      triggerToast("❌ Please load and synchronize lyric rows first!");
      return;
    }
    setIsRendering(true);
    setRenderProgress(0);

    const interval = setInterval(() => {
      setRenderProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsRendering(false);
            triggerToast("🎉 Video successfully rendered! Saved to local disk.");
            
            // Auto Trigger file download simulation
            const link = document.createElement("a");
            link.href = "#";
            link.download = "ndk-render-clip-1080p.mp4";
            triggerToast("🎬 Simulated MP4 video download complete.");
          }, 800);
          return 100;
        }
        return prev + 5; // increment
      });
    }, 150);
  };

  // Convert seconds to readable layout minute:second.decisecond
  const fmtSeconds = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    const dec = Math.floor((s % 1) * 100);
    return `${padZero(mins, 2)}:${padZero(secs, 2)}.${padZero(dec, 2)}`;
  };

  const padZero = (n: number, limit: number) => String(n).padStart(limit, "0");

  return (
    <div className="bg-[#020617] text-slate-100 h-screen w-full flex flex-col font-sans select-none overflow-hidden relative" id="layout-root">
      
      {/* Frosted glass ambient background blobs */}
      <div className="absolute top-[-150px] left-[-150px] w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-150px] right-[-100px] w-[600px] h-[600px] bg-fuchsia-600/10 rounded-full blur-[140px] pointer-events-none z-0"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none z-0"></div>

      {/* Toast alert system */}
      {toastMessage && (
        <div className="fixed top-16 right-6 bg-indigo-950/80 backdrop-blur-md text-white px-4 py-3 rounded-xl shadow-2xl border border-indigo-500/30 flex items-center gap-2 z-50 animate-bounce duration-300">
          <Check className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Navbar */}
      <header className="bg-white/5 backdrop-blur-md text-indigo-300 border-b border-white/10 flex justify-between items-center px-6 py-2 shrink-0 h-14 z-20 relative" id="top-navbar-header">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center font-bold text-white text-xs shadow-md shadow-indigo-500/20">
              ndk
            </div>
            <div>
              <h1 className="font-sans text-lg font-bold tracking-tight text-white leading-none flex items-center gap-1">
                NDK.VSpecs <span className="text-[10px] bg-indigo-600/30 text-indigo-200 px-1.5 py-0.5 rounded-full font-mono">PRO</span>
              </h1>
              <span className="text-[10px] text-slate-400 leading-none block mt-0.5">Lyric Video Generator Pro</span>
            </div>
          </div>
          
          <nav className="ml-8 hidden md:flex items-center gap-6 h-14">
            <button className="text-slate-400 hover:text-white transition text-xs font-semibold cursor-not-allowed">Projects</button>
            <button className="text-slate-400 hover:text-white transition text-xs font-semibold cursor-not-allowed">Library</button>
            <button className="text-slate-400 hover:text-white transition text-xs font-semibold cursor-not-allowed">Templates</button>
            <button className="text-indigo-400 border-b-2 border-indigo-500 h-14 pb-1 pt-0.5 flex items-center text-xs font-bold">Export</button>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <button className="text-slate-400 hover:text-indigo-300 transition" title="Settings">
              <Settings className="w-4 h-4" />
            </button>
            <button className="text-slate-400 hover:text-indigo-300 transition" title="Help Guide">
              <HelpCircle className="w-4 h-4" />
            </button>
            <button className="text-slate-400 hover:text-indigo-300 transition" title="Profile Details">
              <User className="w-4 h-4" />
            </button>
          </div>
          
          <button
            onClick={triggerSimulatedMP4Render}
            className="h-8 px-5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs active:scale-95 transition-all shadow-lg shadow-indigo-600/20 focus:outline-none"
            id="render-cta-nav"
          >
            Render
          </button>
        </div>
      </header>

      {/* Main Studio Body container */}
      <main className="flex-1 flex overflow-hidden w-full relative z-10" id="studio-grid-layout">
        
        {/* LEFT SIDEBAR CONTROLS (390px) */}
        <aside className="w-left-sidebar-width bg-[#ffffff]/[0.02] backdrop-blur-2xl border-r border-[#ffffff]/10 flex flex-col h-full shrink-0 z-10 relative" id="left-controls-bar">
          
          {/* Main context Tab buttons */}
          <div className="flex bg-[#ffffff]/[0.01] p-1.5 border-b border-[#ffffff]/10 gap-1.5 shrink-0">
            <button
              onClick={() => setActiveTab("input")}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs gap-1.5 flex items-center justify-center font-bold transition-all ${
                activeTab === "input"
                  ? "bg-white/10 border border-white/10 text-white shadow-xl"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              Input
            </button>
            <button
              onClick={() => setActiveTab("typo")}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs gap-1.5 flex items-center justify-center font-bold transition-all ${
                activeTab === "typo"
                  ? "bg-white/10 border border-white/10 text-white shadow-xl"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Typo
            </button>
            <button
              onClick={() => setActiveTab("spectrum")}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs gap-1.5 flex items-center justify-center font-bold transition-all ${
                activeTab === "spectrum"
                  ? "bg-white/10 border border-white/10 text-white shadow-xl"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Spectrum
            </button>
          </div>

          {/* Tab Subcomponents */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
            
            {/* INPUT PANEL TAB */}
            {activeTab === "input" && (
              <div className="space-y-5 animate-fade-in" id="panel-tab-input-viewport">
                
                {/* Export triggers mockup panel */}
                <div>
                  <h3 className="text-[10px] font-bold tracking-widest text-indigo-400 uppercase mb-2 flex items-center gap-1.5">
                    <Download className="w-3 h-3" /> Export Options
                  </h3>
                  <div className="grid grid-cols-2 gap-2" id="trigger-export-buttons-grid">
                    <div
                      onClick={triggerSimulatedMP4Render}
                      className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/50 hover:bg-white/10 cursor-pointer transition-all flex items-center gap-2.5"
                    >
                      <Tv className="w-5 h-5 text-indigo-400" />
                      <div>
                        <div className="text-xs font-bold text-white">MP4 Video</div>
                        <div className="text-[9px] text-slate-400">1080p High Quality</div>
                      </div>
                    </div>
                    
                    <div
                      onClick={exportSRTSubtitleFile}
                      className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/50 hover:bg-white/10 cursor-pointer transition-all flex items-center gap-2.5"
                    >
                      <Subtitles className="w-5 h-5 text-indigo-400" />
                      <div>
                        <div className="text-xs font-bold text-white">SRT Subtitles</div>
                        <div className="text-[9px] text-slate-400">Standard timings</div>
                      </div>
                    </div>

                    <div
                      onClick={exportPNGMockFrame}
                      className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/50 hover:bg-white/10 cursor-pointer transition-all flex items-center gap-2.5"
                    >
                      <Image className="w-5 h-5 text-indigo-400" />
                      <div>
                        <div className="text-xs font-bold text-white">PNG Snap</div>
                        <div className="text-[9px] text-slate-400">46K Canvas frame</div>
                      </div>
                    </div>

                    <div
                      onClick={exportProjectToJSON}
                      className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/50 hover:bg-white/10 cursor-pointer transition-all flex items-center gap-2.5"
                    >
                      <Save className="w-5 h-5 text-indigo-400" />
                      <div>
                        <div className="text-xs font-bold text-white">JSON Save</div>
                        <div className="text-[9px] text-slate-400">Save visual project</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Import audio/video upload area */}
                <div className="border border-white/10 rounded-2xl bg-white/5 p-3">
                  <h4 className="text-[10px] font-bold text-indigo-400 tracking-widest uppercase mb-2 flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5" /> Upload Audio / Video
                  </h4>
                  
                  <label className="border-2 border-dashed border-white/10 rounded-xl p-4 text-center cursor-pointer hover:border-indigo-500/50 hover:bg-white/5 transition block relative">
                    <input
                      type="file"
                      accept="audio/*,video/*"
                      onChange={handleAudioUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                    <div className="text-xs font-bold text-white">Cari File Video/Audio</div>
                    <div className="text-[9px] text-slate-400 mt-1">Drag & drop or click to select media</div>
                  </label>

                  {audioFileName && (
                    <div className="mt-2 text-[10px] text-indigo-300 font-semibold bg-indigo-500/10 p-1.5 px-3 rounded-xl truncate border border-indigo-500/20">
                      🎵 Active: {audioFileName}
                    </div>
                  )}
                </div>

                {/* Main Lyrics pasted editing workspace */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <h3 className="text-[10px] font-bold tracking-widest text-indigo-400 uppercase flex items-center gap-1.5">
                      <Music className="w-3 h-3" /> Paste Lyric Lines
                    </h3>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setIsAiModalOpen(true)}
                        className="text-[9px] font-bold bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500 hover:text-white border border-indigo-500/30 transition-all px-2.5 py-1 rounded-lg flex items-center gap-1"
                      >
                        <Sparkles className="w-2.5 h-2.5" /> Gemini AI
                      </button>
                      <button
                        onClick={translateSubtitlesAutomatically}
                        disabled={translating}
                        className="text-[9px] font-bold bg-fuchsia-500/15 text-fuchsia-300 hover:bg-fuchsia-500 hover:text-white border border-fuchsia-500/30 transition-all px-2.5 py-1 rounded-lg disabled:opacity-40"
                      >
                        {translating ? "Translating..." : "AI Translate Sub"}
                      </button>
                    </div>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const lyricsRawText = (e.currentTarget.elements.namedItem("rawLyrics") as HTMLTextAreaElement).value;
                      const subsRawText = (e.currentTarget.elements.namedItem("rawSubs") as HTMLTextAreaElement).value;
                      handleParseRawText(lyricsRawText, subsRawText);
                    }}
                    className="space-y-2"
                  >
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-[9px] font-semibold text-slate-400 mb-1">Lirik Lagu (Default)</div>
                        <textarea
                          name="rawLyrics"
                          className="w-full h-32 p-3 rounded-2xl bg-white/5 border border-white/10 text-[11px] font-sans focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 resize-none placeholder-slate-500 line-relaxed text-slate-100 transition-all"
                          defaultValue={lyrics.map(l => l.text).join("\n")}
                          placeholder="Welcome to NDK.VSpecs
Line 2 of lyrics
Line 3 of lyrics"
                        />
                      </div>
                      <div>
                        <div className="text-[9px] font-semibold text-slate-400 mb-1">Subtitle / Terjemahan</div>
                        <textarea
                          name="rawSubs"
                          className="w-full h-32 p-3 rounded-2xl bg-white/5 border border-white/10 text-[11px] font-sans focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 resize-none placeholder-slate-500 line-relaxed text-slate-100 transition-all"
                          defaultValue={lyrics.map(l => l.sub || "").join("\n")}
                          placeholder="Selamat datang di NDK.VSpecs
Terjemahan lirik baris 2
Terjemahan lirik baris 3"
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-500 active:scale-95 transition-all shadow-lg shadow-indigo-600/20"
                      >
                        📋 Parse & Load Lirik
                      </button>
                      
                      <button
                        type="button"
                        onClick={handleClearWorkspaceData}
                        className="p-2 px-3 rounded-xl bg-red-600/20 text-red-300 border border-red-500/30 hover:bg-red-500 hover:text-white transition-all shadow"
                        title="Clear all lines"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </form>
                </div>

                {/* Manual Row timing adjustments */}
                <div className="p-4 border border-white/10 bg-white/5 hover:bg-white/[0.08] rounded-2xl transition-all">
                  <h4 className="text-[10px] font-bold text-slate-200 uppercase mb-2 flex items-center gap-1.5">
                    ✏ Manual Timestamp Adjuster
                  </h4>
                  <div className="text-[9px] text-slate-400 mb-3 leading-relaxed">
                    Adjust start/end bounds (seconds) for the currently selected line index (Row #{activeLineIndex + 1}):
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <span className="text-[9px] text-slate-400">Mulai (Start s)</span>
                      <input
                        type="number"
                        step="0.05"
                        value={manualStart}
                        onChange={(e) => setManualStart(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400">Selesai (End s)</span>
                      <input
                        type="number"
                        step="0.05"
                        value={manualEnd}
                        onChange={(e) => setManualEnd(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleManualTimeUpdate}
                    className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold text-xs transition-all shadow"
                  >
                    ✔ Simpan Waktu Baris
                  </button>
                </div>
              </div>
            )}

            {/* TYPOGRAPHY PANEL TAB */}
            {activeTab === "typo" && (
              <div className="space-y-4 animate-fade-in" id="panel-tab-typo">
                <div>
                  <h3 className="text-xs font-bold tracking-widest text-indigo-400 uppercase mb-3 flex items-center gap-1.5">
                    Gaya Teks lirik
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Template Font Family */}
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400 block font-medium">Font Keluarga</label>
                      <select
                        value={style.fontFamily}
                        onChange={(e) => setStyle(prev => ({ ...prev, fontFamily: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500/50 transition-all cursor-pointer"
                      >
                        <option value="Hanken Grotesk" className="bg-slate-950">Hanken Grotesk (Modern Sans)</option>
                        <option value="Impact" className="bg-slate-950">Impact (Bold Heavy)</option>
                        <option value="Arial" className="bg-slate-950">Arial (Standard Clean)</option>
                        <option value="Georgia" className="bg-slate-950">Georgia (Serif Elegance)</option>
                        <option value="Courier New" className="bg-slate-950">Courier New (Heavy Monospace)</option>
                        <option value="JetBrains Mono" className="bg-slate-950">JetBrains Mono (Tech Mono)</option>
                      </select>
                    </div>

                    {/* Font size */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Ukuran Teks lirik</span>
                        <span className="text-indigo-400 font-bold">{style.fontSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="80"
                        value={style.fontSize}
                        onChange={(e) => setStyle(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                        className="w-full h-1.5 bg-white/10 accent-indigo-500 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    {/* Lyric primary colors */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400 block">Warna Teks</label>
                        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
                          <input
                            type="color"
                            value={style.lyricColor}
                            onChange={(e) => setStyle(prev => ({ ...prev, lyricColor: e.target.value }))}
                            className="w-8 h-6 bg-transparent rounded-lg cursor-pointer border-0"
                          />
                          <span className="text-[10px] text-slate-300 uppercase font-mono">{style.lyricColor}</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400 block">Warna Aktif</label>
                        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
                          <input
                            type="color"
                            value={style.lyricActiveColor}
                            onChange={(e) => setStyle(prev => ({ ...prev, lyricActiveColor: e.target.value }))}
                            className="w-8 h-6 bg-transparent rounded-lg cursor-pointer border-0"
                          />
                          <span className="text-[10px] text-indigo-400 uppercase font-mono">{style.lyricActiveColor}</span>
                        </div>
                      </div>
                    </div>

                    {/* Position lyrics offset Y */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Posisi Y Vertikal</span>
                        <span className="text-indigo-400 font-bold">{Math.round(dragOffsetY.lyricY * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="90"
                        step="1"
                        value={Math.round(dragOffsetY.lyricY * 100)}
                        onChange={(e) => setDragOffsetY(prev => ({ ...prev, lyricY: parseInt(e.target.value) / 100 }))}
                        className="w-full h-1.5 bg-white/10 accent-indigo-500 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    {/* Opacity of inactive text */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Opacity Teks</span>
                        <span className="text-indigo-400 font-bold">{Math.round(style.lyricOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={Math.round(style.lyricOpacity * 100)}
                        onChange={(e) => setStyle(prev => ({ ...prev, lyricOpacity: parseInt(e.target.value) / 100 }))}
                        className="w-full h-1.5 bg-white/10 accent-indigo-500 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    {/* Text shadow thickness outline */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Neon Glow Shadow</span>
                        <span className="text-indigo-400 font-bold">{style.lyricShadow}px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="30"
                        value={style.lyricShadow}
                        onChange={(e) => setStyle(prev => ({ ...prev, lyricShadow: parseInt(e.target.value) }))}
                        className="w-full h-1.5 bg-white/10 accent-indigo-500 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* SUBTITLE DESIGN SUBSECTION */}
                <div className="border-t border-white/10 pt-4">
                  <h3 className="text-xs font-bold tracking-widest text-indigo-400 uppercase mb-3">
                    Gaya Subtitle / Terjemahan
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Sub size */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Ukuran Subtitle</span>
                        <span className="text-indigo-400 font-bold">{style.subSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="30"
                        value={style.subSize}
                        onChange={(e) => setStyle(prev => ({ ...prev, subSize: parseInt(e.target.value) }))}
                        className="w-full h-1.5 bg-white/10 accent-indigo-500 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    {/* Sub color */}
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400 block font-semibold">Warna Subtitle</label>
                      <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
                        <input
                          type="color"
                          value={style.subColor}
                          onChange={(e) => setStyle(prev => ({ ...prev, subColor: e.target.value }))}
                          className="w-8 h-6 bg-transparent rounded-lg cursor-pointer border-0"
                        />
                        <span className="text-[10px] text-slate-300 uppercase font-mono">{style.subColor}</span>
                      </div>
                    </div>

                    {/* Sub Y */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Posisi Y Subtitle</span>
                        <span className="text-indigo-400 font-bold">{Math.round(style.subY * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="40"
                        max="95"
                        value={Math.round(style.subY * 100)}
                        onChange={(e) => setStyle(prev => ({ ...prev, subY: parseInt(e.target.value) / 100 }))}
                        className="w-full h-1.5 bg-white/10 accent-indigo-500 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    {/* Sub Capsule background box */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400 block font-medium">BG Capsule</label>
                        <input
                          type="color"
                          value={style.subBg}
                          onChange={(e) => setStyle(prev => ({ ...prev, subBg: e.target.value }))}
                          className="w-full h-8 bg-transparent rounded-xl border border-white/10 cursor-pointer"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-300">BG Opacity</span>
                          <span className="text-indigo-300 font-bold">{Math.round(style.subBgOpacity * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={Math.round(style.subBgOpacity * 100)}
                          onChange={(e) => setStyle(prev => ({ ...prev, subBgOpacity: parseInt(e.target.value) / 100 }))}
                          className="w-full h-8 bg-white/5 border border-white/10 accent-indigo-500 rounded p-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SPECTRUM PANEL TAB */}
            {activeTab === "spectrum" && (
              <div className="space-y-4 animate-fade-in" id="panel-tab-spectrum">
                {/* Visualizer height */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Tinggi Maksimum Bar</span>
                    <span className="text-indigo-400 font-bold">{style.specHeight}px</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="220"
                    value={style.specHeight}
                    onChange={(e) => setStyle(prev => ({ ...prev, specHeight: parseInt(e.target.value) }))}
                    className="w-full h-1.5 bg-white/10 accent-indigo-500 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Bar width and visual gaps */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Lebar Bar</span>
                      <span className="text-indigo-400 font-bold">{style.specBarW}px</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="16"
                      value={style.specBarW}
                      onChange={(e) => setStyle(prev => ({ ...prev, specBarW: parseInt(e.target.value) }))}
                      className="w-full h-1.5 bg-white/10 accent-indigo-500 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Jarak Bar</span>
                      <span className="text-indigo-400 font-bold">{style.specGap}px</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={style.specGap}
                      onChange={(e) => setStyle(prev => ({ ...prev, specGap: parseInt(e.target.value) }))}
                      className="w-full h-1.5 bg-white/10 accent-indigo-500 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* Y coordinates of visualizer */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Posisi Y Spectrum</span>
                    <span className="text-indigo-400 font-bold">{Math.round(dragOffsetY.specY * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="95"
                    step="1"
                    value={Math.round(dragOffsetY.specY * 100)}
                    onChange={(e) => setDragOffsetY(prev => ({ ...prev, specY: parseInt(e.target.value) / 100 }))}
                    className="w-full h-1.5 bg-white/10 accent-indigo-500 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Glow & Mirror modifiers */}
                <div className="grid grid-cols-2 gap-3 items-center">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 block">Mirror (Cermin)</label>
                    <button
                      onClick={() => setStyle(prev => ({ ...prev, specMirror: !prev.specMirror }))}
                      className={`w-full py-1.5 focus:outline-none rounded-xl text-xs font-bold transition-all border ${
                        style.specMirror 
                          ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/25" 
                          : "bg-white/5 border-white/10 text-slate-400"
                      }`}
                    >
                      {style.specMirror ? "True (Mirror)" : "False"}
                    </button>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Glow Blur</span>
                      <span className="text-indigo-400 font-bold">{style.specGlow}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="24"
                      value={style.specGlow}
                      onChange={(e) => setStyle(prev => ({ ...prev, specGlow: parseInt(e.target.value) }))}
                      className="w-full h-1.5 bg-white/10 accent-indigo-500 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* Active spectrum design index selection */}
                <div className="space-y-2 border-t border-white/10 pt-3">
                  <span className="text-[10px] text-indigo-400 tracking-widest uppercase font-bold block">
                    Equalizer Design Pattern
                  </span>
                  <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto pr-1">
                    {[
                      "Garis Gelombang (Wave)",
                      "Blok Klasik (Blocks)",
                      "Detak Lingkaran (Circular)",
                      "Simetri Kupu-kupu (Double)",
                      "Radar Laser (Laser Glow)",
                    ].map((name, idx) => (
                      <button
                        key={idx}
                        onClick={() => setStyle(prev => ({ ...prev, spectrumDesign: idx }))}
                        className={`py-1.5 px-3 rounded-xl text-left text-[11px] font-semibold truncate transition-all border ${
                          style.spectrumDesign === idx
                            ? "bg-white/10 border-white/20 text-white shadow-xl font-bold"
                            : "bg-transparent border-transparent text-slate-400 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        {idx + 1}. {name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-white/10 bg-[#ffffff]/[0.01] text-center flex items-center justify-between text-[10px] text-slate-400">
            <span>Studio: Active</span>
            <span className="font-mono text-indigo-400">FPS: 60 (Canvas Render)</span>
          </div>
        </aside>

        {/* CENTER FLUID VIEWPORT (Canvas preview) */}
        <section className="flex-1 bg-none flex flex-col relative z-0 min-w-0" id="middle-canvas-panel">
          
          {/* Canvas contextual toolbar header bar */}
          <div className="h-12 border-b border-white/10 flex items-center justify-between px-4 bg-white/[0.02] backdrop-blur-sm z-10">
            <div className="flex gap-2">
              <button
                onClick={() => setIsWidescreen(true)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-wider uppercase transition-all ${
                  isWidescreen
                    ? "bg-white/10 text-white border border-white/15 shadow-xl"
                    : "border border-transparent text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                16:9 YT
              </button>
              <button
                onClick={() => setIsWidescreen(false)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-wider uppercase transition-all ${
                  !isWidescreen
                    ? "bg-white/10 text-white border border-white/15 shadow-xl"
                    : "border border-transparent text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                9:16 IG
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={triggerAutoSyncSplit}
                className="h-8 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white font-semibold text-xs flex items-center gap-1.5 hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-indigo-600/20"
              >
                <Sparkles className="w-3.5 h-3.5" /> Auto-Sync
              </button>
            </div>
          </div>

          {/* Central canvas container */}
          <div className="flex-1 flex items-center justify-center p-6 relative z-0">
            
            {/* Ambient Background subtle aura glow */}
            <div className="absolute inset-0 bg-radial-gradient from-indigo-500/5 via-transparent to-transparent pointer-events-none z-0" />

            {/* Editable resizing canvas wrapper */}
            <div
              className={`relative shadow-[0_0_80px_rgba(99,102,241,0.15)] rounded-2xl transition-all border border-white/10 overflow-hidden flex items-center justify-center bg-black group`}
              style={{
                width: "100%",
                maxWidth: isWidescreen ? "780px" : "390px",
                aspectRatio: isWidescreen ? "16/9" : "9/16",
              }}
              id="viewport-canvas-wrapper"
            >
              {/* Drag elements reminder tag overlay */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 text-indigo-300 font-mono text-[9px] px-4 py-2 rounded-full border border-white/10 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-xl">
                Drag lyrics or spectrum vertically to reposition directly!
              </div>

              {/* Renders real physical HTML5 canvas */}
              <canvas
                ref={canvasRef}
                width={1280}
                height={720}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                className="w-full h-full block cursor-grab active:cursor-grabbing"
              />

              {/* HIGH FIDELITY RENDERING CONFLICT MODAL OVERLAY */}
              {isRendering && (
                <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-10 animate-fade-in">
                  <div className="w-full max-w-sm space-y-4">
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <h3 className="text-lg font-bold text-white tracking-wide">Rendering Video...</h3>
                        <p className="text-[11px] text-text-secondary font-mono leading-relaxed">
                          Encoding master audio triggers and video frames
                        </p>
                      </div>
                      <span className="text-primary font-bold text-xl">{renderProgress}%</span>
                    </div>
                    
                    <div className="w-full h-2.5 bg-surface-container-highest rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-400 to-sky-500 transition-all duration-300"
                        style={{ width: `${renderProgress}%` }}
                      />
                    </div>
                    
                    <div className="flex justify-center mt-6">
                      <button
                        onClick={() => {
                          setIsRendering(false);
                          triggerToast("❌ Rendering cancelled");
                        }}
                        className="px-6 py-2 rounded-full border border-red-500 text-red-500 font-bold text-xs hover:bg-red-500/10 active:scale-95 transition"
                      >
                        Cancel Export
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Preset Visual styles template strip selectors (craftsmanship touch) */}
          <div className="px-6 py-2.5 bg-[#ffffff]/[0.01] border-t border-white/10 flex items-center justify-between gap-4 overflow-x-auto shrink-0 scrollbar-none">
            <span className="text-[10px] text-indigo-400 font-mono tracking-wider uppercase shrink-0">
              One-Click Presets:
            </span>
            <div className="flex items-center gap-2 overflow-x-auto pr-3">
              {MASTER_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.name}
                  onClick={() => applyTemplatePresetIdx(tmpl)}
                  className="px-3.5 py-1 bg-white/5 border border-white/10 hover:border-indigo-500/50 rounded-full text-[10px] font-semibold text-white transition-all shrink-0 select-none active:scale-95"
                >
                  ✨ {tmpl.name}
                </button>
              ))}
            </div>
          </div>

          {/* Bottom Audio Scrubber and transports player controller */}
          <div className="h-20 border-t border-white/10 bg-[#ffffff]/[0.02] backdrop-blur-xl flex items-center px-6 gap-5 shrink-0 z-10">
            {/* Large play/pause button state */}
            <button
              onClick={togglePlayPause}
              style={{
                background: "linear-gradient(135deg, #4f46e5, #4338ca)"
              }}
              className="w-12 h-12 rounded-full text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-indigo-500/20 shrink-0 outline-none cursor-pointer"
              title={isPlaying ? "Pause track" : "Play track"}
              id="transport-play-toggle"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-white fill-current" />
              ) : (
                <Play className="w-5 h-5 text-white fill-current ml-0.5" />
              )}
            </button>

            {/* Custom scrubber progress indicator line */}
            <div className="flex-1 flex flex-col gap-1.5">
              <div
                onClick={handleTimelineScrub}
                className="h-7 w-full bg-white/5 rounded-xl border border-white/10 relative overflow-hidden cursor-pointer flex items-center"
              >
                {/* Visual mock synthesizer wave line trail */}
                <div
                  className="absolute left-0 top-0 h-full bg-indigo-500/20 border-r border-indigo-400/80 transition-all"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                />
                
                {/* Complex realistic audio waves inside progress box */}
                <div className="w-full flex items-end px-3 gap-[2px] opacity-15 pointer-events-none h-6">
                  {[20, 50, 45, 10, 80, 75, 40, 20, 90, 30, 20, 65, 80, 15, 60, 45, 10, 25, 95, 40, 60, 10, 35, 75, 55, 90, 20, 70, 80, 15, 60, 45, 10, 25, 95].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-white rounded-t-sm"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>

              {/* Scrubber timings indicators and playing verse notes */}
              <div className="flex justify-between font-mono text-[10px] text-slate-400">
                <span className="font-bold text-indigo-400">{fmtSeconds(currentTime)}</span>
                <span className="text-indigo-300 truncate max-w-sm font-sans italic">
                  {lyrics[activeLineIndex]?.synced
                    ? `Active Line: "${lyrics[activeLineIndex].text}"`
                    : "— No energetic lirik active —"}
                </span>
                <span>{fmtSeconds(duration)}</span>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT SIDEBAR (Timing interactive synchronizer) */}
        <aside className="w-right-sidebar-width bg-[#ffffff]/[0.02] backdrop-blur-2xl border-l border-white/10 flex flex-col h-full shrink-0 z-10 relative" id="right-timing-bar">
          <div className="p-4 border-b border-white/10 shrink-0">
            <div className="flex justify-between items-center mb-1">
              <h2 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
                Timing Queue
              </h2>
              <span className="bg-indigo-500/15 border border-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold">
                {lyrics.filter((l) => l.synced).length} / {lyrics.length} Synced
              </span>
            </div>
            
            <p className="text-[10px] text-slate-400 leading-normal">
              Click &apos;Sync&apos; or press &apos;K&apos; while playing to set the lyric timing boundaries dynamically.
            </p>
          </div>

          {/* Scollable lines timings active sequence stack list */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
            {lyrics.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-30">
                <Music className="w-8 h-8 mb-2 text-slate-400 animate-pulse" />
                <p className="text-xs font-semibold text-slate-400 leading-relaxed">
                  Parse lirik atau import file di sebelah kiri untuk mengisi antrean sinkronisasi.
                </p>
              </div>
            ) : (
              lyrics.map((line, idx) => {
                const isActive = idx === activeLineIndex;
                return (
                  <div
                    key={line.id}
                    className={`border p-3 transition-all flex gap-3 cursor-pointer ${
                      isActive
                        ? "bg-indigo-950/40 border-indigo-500/60 shadow-lg shadow-indigo-500/10 rounded-2xl"
                        : line.synced
                        ? "bg-white/[0.04] border-white/10 hover:border-white/20 rounded-xl"
                        : "bg-white/[0.01] border-white/5 hover:border-white/10 rounded-xl"
                    }`}
                    onClick={() => {
                      setActiveLineIndex(idx);
                      if (line.synced && line.start >= 0) {
                        setCurrentTime(line.start);
                        if (audioFile && isPlaying) {
                          globalAudioEngine.playUploaded(line.start, () => setIsPlaying(false));
                        }
                      }
                    }}
                  >
                    <div className="font-mono text-xs font-bold text-indigo-400 shrink-0 pt-0.5 w-5">
                      {padZero(idx + 1, 2)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-bold text-white truncate">{line.text}</div>
                      {line.sub && (
                        <div className="text-[10px] text-slate-400 truncate italic mt-0.5">{line.sub}</div>
                      )}
                      
                      {line.synced ? (
                        <div className="text-[9px] text-indigo-300 font-semibold mt-1.5 font-mono bg-indigo-500/15 border border-indigo-500/20 px-1.5 py-0.5 rounded-lg inline-block">
                          ⏱ {line.start.toFixed(2)}s → {line.end.toFixed(2)}s
                        </div>
                      ) : (
                        <div className="text-[9px] text-slate-500 font-semibold mt-1 font-mono">
                          ⏱ Unsynchronized
                        </div>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Manual Sync index trigger bound
                        const t = currentTime;
                        setLyrics((prev) => {
                          const copy = [...prev];
                          if (idx > 0 && copy[idx - 1].synced) {
                            copy[idx - 1].end = t;
                          }
                          copy[idx] = {
                            ...copy[idx],
                            start: t,
                            end: t + 4.0,
                            synced: true,
                          };
                          return copy;
                        });
                        setActiveLineIndex(idx);
                        triggerToast(`Synced row ${idx + 1} at ${t.toFixed(1)}s`);
                      }}
                      className="self-center h-7 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow shadow-indigo-600/20 text-[10px] transition-all cursor-pointer"
                    >
                      Sync
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick tips instruction board Footer footer */}
          <div className="p-3 border-t border-white/10 bg-white/[0.01] shrink-0 grid grid-cols-2 gap-2">
            <div className="bg-white/5 border border-white/10 rounded-xl p-2 text-center shadow">
              <div className="font-mono text-[9px] text-indigo-400 font-bold">SPACE</div>
              <div className="font-sans text-[9px] text-slate-400 font-semibold">Play / Pause</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-2 text-center shadow">
              <div className="font-mono text-[9px] text-indigo-400 font-bold">K</div>
              <div className="font-sans text-[9px] text-slate-400 font-semibold">Sync Next Row</div>
            </div>
          </div>
        </aside>

      </main>

      {/* COMPACT GEMINI AI LYRICS MODAL DIALOG POPUP */}
      {isAiModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in" id="gemini-ai-lyrics-dialog">
          <div className="bg-[#020617]/90 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl backdrop-blur-xl">
            
            <div className="px-5 py-4 border-b border-white/10 bg-white/[0.02] flex justify-between items-center">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" /> Gemini AI Lyric Assistant
              </div>
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-[11px] text-slate-400 leading-normal">
                Let Gemini design high-fidelity music lyrics with matching Indonesian subtitle translations instantly! Enter details or directions below:
              </p>

              {aiError && (
                <div className="text-[11px] text-red-300 bg-red-950/30 p-2.5 rounded-lg border border-red-500/20 leading-relaxed font-mono">
                  ⚠️ Error: {aiError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 block font-medium">Judul Lagu (Song Title)</label>
                <input
                  type="text"
                  placeholder="e.g. My Heart Will Go On, or original idea..."
                  value={aiSongTitle}
                  onChange={(e) => setAiSongTitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 block font-medium">Nama Artis (Singer / Artist)</label>
                <input
                  type="text"
                  placeholder="e.g. Celine Dion, or futuristic topic..."
                  value={aiArtistName}
                  onChange={(e) => setAiArtistName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 block font-medium">Tema Tambahan (Theme / prompt instructions)</label>
                <textarea
                  placeholder="e.g. A lo-fi chill wave song about drinking coffee on a rainy Sunday morning in Bandung..."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all resize-none"
                />
              </div>
            </div>

            <div className="px-5 py-4 bg-white/[0.02] border-t border-white/10 flex justify-end gap-3.5 font-sans">
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="px-4 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white transition font-bold"
              >
                Close
              </button>
              
              <button
                onClick={generateAILyricsSheet}
                disabled={aiLoading}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-40 shadow-lg shadow-indigo-600/20"
              >
                {aiLoading ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin text-white" /> Generating verses...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" /> Generate AI Lyrics
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
