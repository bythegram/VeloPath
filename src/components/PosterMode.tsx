import React, { useState, useRef, useEffect } from 'react';
import { TripRoute, PosterConfig } from '../types';
import { posterThemes, getPosterTheme } from '../lib/mapStyles';
import { Download, Sliders, Palette, Type, CheckCircle, ArrowLeft, Layers, ShieldAlert } from 'lucide-react';
import html2canvas from 'html2canvas';

// Helper to convert OKLCH to RGB
function oklchToRgb(l: number, c: number, h: number): { r: number; g: number; b: number } {
  const hVal = isNaN(h) ? 0 : h;
  const hRad = (hVal * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const bLab = c * Math.sin(hRad);

  // OKLAB to LMS
  const l_ = l + 0.3963377774 * a + 0.2158037573 * bLab;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * bLab;
  const s_ = l - 0.0894841775 * a - 1.2914855480 * bLab;

  // LMS to LMS'
  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  // LMS' to linear RGB
  const rL = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const gL = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const bL = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

  // Linear RGB to sRGB
  const toSRGB = (channelVal: number) => {
    return channelVal <= 0.0031308 ? 12.92 * channelVal : 1.055 * Math.pow(channelVal, 1 / 2.4) - 0.055;
  };

  const r = Math.max(0, Math.min(255, Math.round(toSRGB(rL) * 255)));
  const g = Math.max(0, Math.min(255, Math.round(toSRGB(gL) * 255)));
  const b = Math.max(0, Math.min(255, Math.round(toSRGB(bL) * 255)));

  return { r, g, b };
}

// Replaces oklch(...) matches in a CSS/style string with rgb(...) or rgba(...)
function replaceOklchWithRgb(cssText: string): string {
  return cssText.replace(/oklch\(([^)]+)\)/g, (match, inner) => {
    try {
      const normalizedInner = inner.replace(/\s*\/\s*/g, ' / ').trim();
      const parts = normalizedInner.split(/\s+/);
      if (parts.length < 3) return match;

      // Parse L
      const lStr = parts[0];
      let l = parseFloat(lStr);
      if (lStr.endsWith('%')) {
        l = l / 100;
      }

      // Parse C
      const cStr = parts[1];
      let c = parseFloat(cStr);
      if (cStr.endsWith('%')) {
        c = c / 100;
      }

      // Parse H
      const hStr = parts[2];
      const h = parseFloat(hStr);

      // Check for alpha
      let alpha = 1;
      if (parts[3] === '/' && parts[4] !== undefined) {
        alpha = parseFloat(parts[4]);
        if (parts[4].endsWith('%')) {
          alpha = alpha / 100;
        }
      }

      const { r, g, b } = oklchToRgb(l, c, h);

      if (alpha === 1) {
        return `rgb(${r}, ${g}, ${b})`;
      } else {
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
    } catch (e) {
      console.error('Failed to parse oklch:', inner, e);
      return match;
    }
  });
}

interface PosterModeProps {
  route: TripRoute;
  children: React.ReactNode; // Pass the active styled Google Map component as a child
  onBack: () => void;
  posterConfig: PosterConfig;
  setPosterConfig: React.Dispatch<React.SetStateAction<PosterConfig>>;
  elevationData?: { km: number; elevation: number }[];
}

export default function PosterMode({
  route,
  children,
  onBack,
  posterConfig,
  setPosterConfig,
  elevationData = [],
}: PosterModeProps) {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Auto-fit poster preview to available viewport dimensions
  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const paddingX = 32;
      const paddingY = 32;
      const availWidth = rect.width - paddingX;
      const availHeight = rect.height - paddingY;

      if (availWidth > 0 && availHeight > 0) {
        const scaleX = availWidth / 480;
        const scaleY = availHeight / 640;
        const computedScale = Math.min(1, scaleX, scaleY);
        setScale(Math.max(0.35, computedScale));
      }
    };

    updateScale();

    const observer = new ResizeObserver(updateScale);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    window.addEventListener('resize', updateScale);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, []);

  const themeConfig = getPosterTheme(posterConfig?.theme);

  // Triggers html2canvas export
  const downloadPoster = async () => {
    if (!posterRef.current) return;
    setExporting(true);
    setExportError(null);
    setSuccessMsg(false);

    const tempStyleTags: HTMLStyleElement[] = [];
    const disabledSheets: CSSStyleSheet[] = [];

    try {
      // 1. Preprocess and convert any oklch() color definitions in external/internal stylesheets
      for (let i = 0; i < document.styleSheets.length; i++) {
        const sheet = document.styleSheets[i];
        try {
          if (!sheet.cssRules) continue;
          
          let cssText = '';
          for (let j = 0; j < sheet.cssRules.length; j++) {
            cssText += sheet.cssRules[j].cssText + '\n';
          }
          
          if (cssText.includes('oklch')) {
            const cleanCss = replaceOklchWithRgb(cssText);
            const styleTag = document.createElement('style');
            styleTag.className = 'html2canvas-temp-css';
            styleTag.textContent = cleanCss;
            document.head.appendChild(styleTag);
            
            tempStyleTags.push(styleTag);
            sheet.disabled = true;
            disabledSheets.push(sheet);
          }
        } catch (e) {
          // If security policies block rule reading (CORS), fall back to fetch
          if (sheet.href) {
            try {
              const res = await fetch(sheet.href);
              let cssText = await res.text();
              if (cssText.includes('oklch')) {
                const cleanCss = replaceOklchWithRgb(cssText);
                const styleTag = document.createElement('style');
                styleTag.className = 'html2canvas-temp-css';
                styleTag.textContent = cleanCss;
                document.head.appendChild(styleTag);
                
                tempStyleTags.push(styleTag);
                sheet.disabled = true;
                disabledSheets.push(sheet);
              }
            } catch (fetchErr) {
              console.error("Failed to fetch stylesheet fallback:", fetchErr);
            }
          }
        }
      }

      // Ensure Google Maps images are loaded fully
      // Wait slightly for tiles to finish loading under the new styling
      await new Promise((resolve) => setTimeout(resolve, 1200));

      const canvas = await html2canvas(posterRef.current, {
        useCORS: true,
        allowTaint: false,
        scale: 2, // High resolution scale
        logging: false,
        backgroundColor: themeConfig.bgHex || '#F8F5F2',
        onclone: (clonedDoc) => {
          const clonedPoster = clonedDoc.getElementById('poster-canvas-area');
          if (clonedPoster) {
            clonedPoster.style.transform = 'none';
          }

          // 2. Preprocess inline style attributes inside the cloned document
          const allElements = clonedDoc.getElementsByTagName('*');
          for (let i = 0; i < allElements.length; i++) {
            const el = allElements[i] as HTMLElement;
            if (el.style) {
              for (let j = 0; j < el.style.length; j++) {
                const prop = el.style[j];
                const val = el.style.getPropertyValue(prop);
                if (val && val.includes('oklch')) {
                  el.style.setProperty(prop, replaceOklchWithRgb(val));
                }
              }
            }
          }
        }
      });

      const fileName = `${(posterConfig.title || 'poster').toLowerCase().replace(/[^a-z0-9]/g, '_')}_souvenir_poster.png`;

      // Convert canvas to binary Blob
      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error("Canvas toBlob failed"));
        }, 'image/png');
      });

      const file = new File([blob], fileName, { type: 'image/png' });

      let sharedSuccessfully = false;

      // 1. iOS / Mobile Web Share API support
      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.share) {
        try {
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: posterConfig.title || 'Keepsake Poster',
            });
            sharedSuccessfully = true;
          }
        } catch (shareErr: any) {
          if (shareErr.name === 'AbortError') {
            // User closed the share sheet
            sharedSuccessfully = true;
          } else {
            console.warn("Web Share API failed, falling back to Blob URL download:", shareErr);
          }
        }
      }

      // 2. Blob URL Fallback
      if (!sharedSuccessfully) {
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => {
          URL.revokeObjectURL(objectUrl);
        }, 1000);
      }
      
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 4000);
    } catch (err: any) {
      console.error("html2canvas export error:", err);
      setExportError("Google Maps CORS limits can occasionally block client-side canvas captures. If the download is blank or fails, try clicking again or open the preview in a new tab.");
    } finally {
      // 3. Restore original stylesheets
      tempStyleTags.forEach(tag => tag.remove());
      disabledSheets.forEach(sheet => {
        sheet.disabled = false;
      });
      setExporting(false);
    }
  };

  // Render deterministic custom SVG elevation path for crisp export
  const renderElevationSvg = () => {
    if (!elevationData || elevationData.length === 0) return null;
    
    const maxVal = Math.max(...elevationData.map(d => d.elevation));
    const minVal = Math.min(...elevationData.map(d => d.elevation));
    const range = maxVal - minVal || 1;
    
    // Add 10% padding to top/bottom of chart
    const pad = range * 0.1;
    const yMin = Math.max(0, minVal - pad);
    const yMax = maxVal + pad;
    const yRange = yMax - yMin;

    const width = 360;
    const height = 30;
    
    const pts = elevationData.map((d, idx) => {
      const x = (idx / (elevationData.length - 1)) * width;
      const y = height - ((d.elevation - yMin) / yRange) * height;
      return { x, y };
    });

    if (pts.length === 0) return null;

    const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const fillPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" preserveAspectRatio="none" className="overflow-visible">
        <defs>
          <linearGradient id="posterElevGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={themeConfig.lineColor} stopOpacity={0.4} />
            <stop offset="100%" stopColor={themeConfig.lineColor} stopOpacity={0.0} />
          </linearGradient>
        </defs>
        {/* Fill */}
        <path d={fillPath} fill="url(#posterElevGradient)" />
        {/* Stroke Line */}
        <path d={linePath} fill="none" stroke={themeConfig.lineColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  return (
    <div id="poster-mode-container" className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-73px)] lg:h-[calc(100vh-73px)] lg:overflow-hidden p-4 lg:p-6 bg-[#F8F5F2] text-[#3D3B38]">
      
      {/* 1. Left Control Panel */}
      <div className="lg:col-span-4 space-y-6 flex flex-col justify-between lg:overflow-y-auto lg:max-h-[calc(100vh-100px)] pr-1">
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="p-2 hover:bg-[#FAF9F6] rounded-lg border border-[#E5E0D8] bg-white text-[#3D3B38] transition"
              id="back-to-editor-btn"
            >
              <ArrowLeft className="w-4 h-4 text-[#5A6348]" />
            </button>
            <div>
              <span className="text-[10px] text-[#A67C52] font-bold uppercase tracking-widest">Commemorate</span>
              <h2 className="text-xl font-bold text-[#2D3025] leading-none">Poster Customizer</h2>
            </div>
          </div>

          {/* Theme Settings */}
          <div className="bg-white border border-[#E5E0D8] rounded-xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-[#2D3025] pb-2 border-b border-[#E5E0D8]">
              <Palette className="w-4 h-4 text-[#5A6348]" />
              <h3 className="text-sm font-bold">Aesthetic Themes</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPosterConfig({ ...posterConfig, theme: 'natural-tones' })}
                className={`p-2.5 rounded-lg border text-left transition ${
                  posterConfig.theme === 'natural-tones'
                    ? 'border-[#5A6348] bg-[#5A6348]/5 text-[#5A6348]'
                    : 'border-[#E5E0D8] hover:border-[#8A847C] bg-[#FAF9F6] text-[#8A847C]'
                }`}
              >
                <div className="w-full h-3 bg-[#F8F5F2] rounded mb-1.5 border border-[#E5E0D8]" />
                <span className="text-[11px] font-bold block">Natural Tones</span>
              </button>

              <button
                onClick={() => setPosterConfig({ ...posterConfig, theme: 'minimalist-dark' })}
                className={`p-2.5 rounded-lg border text-left transition ${
                  posterConfig.theme === 'minimalist-dark'
                    ? 'border-[#5A6348] bg-[#5A6348]/5 text-[#5A6348]'
                    : 'border-[#E5E0D8] hover:border-[#8A847C] bg-[#FAF9F6] text-[#8A847C]'
                }`}
              >
                <div className="w-full h-3 bg-zinc-950 rounded mb-1.5 border border-zinc-800" />
                <span className="text-[11px] font-bold block">Minimalist Dark</span>
              </button>
              
              <button
                onClick={() => setPosterConfig({ ...posterConfig, theme: 'vintage-forest' })}
                className={`p-2.5 rounded-lg border text-left transition ${
                  posterConfig.theme === 'vintage-forest'
                    ? 'border-[#5A6348] bg-[#5A6348]/5 text-[#5A6348]'
                    : 'border-[#E5E0D8] hover:border-[#8A847C] bg-[#FAF9F6] text-[#8A847C]'
                }`}
              >
                <div className="w-full h-3 bg-[#ecf0e5] rounded mb-1.5 border border-[#dfdcd3]" />
                <span className="text-[11px] font-bold block">Vintage Forest</span>
              </button>

              <button
                onClick={() => setPosterConfig({ ...posterConfig, theme: 'topo-orange' })}
                className={`p-2.5 rounded-lg border text-left transition ${
                  posterConfig.theme === 'topo-orange'
                    ? 'border-[#5A6348] bg-[#5A6348]/5 text-[#5A6348]'
                    : 'border-[#E5E0D8] hover:border-[#8A847C] bg-[#FAF9F6] text-[#8A847C]'
                }`}
              >
                <div className="w-full h-3 bg-stone-100 rounded mb-1.5 border border-orange-200" />
                <span className="text-[11px] font-bold block">Topo Orange</span>
              </button>

              <button
                onClick={() => setPosterConfig({ ...posterConfig, theme: 'classic-sand' })}
                className={`p-2.5 rounded-lg border text-left transition ${
                  posterConfig.theme === 'classic-sand'
                    ? 'border-[#5A6348] bg-[#5A6348]/5 text-[#5A6348]'
                    : 'border-[#E5E0D8] hover:border-[#8A847C] bg-[#FAF9F6] text-[#8A847C]'
                }`}
              >
                <div className="w-full h-3 bg-amber-50 rounded mb-1.5 border border-amber-200" />
                <span className="text-[11px] font-bold block">Classic Sand</span>
              </button>
            </div>
          </div>

          {/* Typography Settings */}
          <div className="bg-white border border-[#E5E0D8] rounded-xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-[#2D3025] pb-2 border-b border-[#E5E0D8]">
              <Type className="w-4 h-4 text-[#5A6348]" />
              <h3 className="text-sm font-bold">Poster Details</h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-[#8A847C] mb-1">Poster Title</label>
                <input
                  type="text"
                  value={posterConfig.title || ''}
                  onChange={(e) => setPosterConfig({ ...posterConfig, title: e.target.value })}
                  className="w-full bg-[#FAF9F6] border border-[#E5E0D8] rounded-lg px-3 py-1.5 text-xs text-[#3D3B38] focus:outline-none focus:border-[#5A6348] transition"
                  id="poster-title-input"
                />
              </div>

              <div>
                <label className="block text-xs text-[#8A847C] mb-1">Poster Subtitle / Date</label>
                <input
                  type="text"
                  value={posterConfig.subtitle || ''}
                  onChange={(e) => setPosterConfig({ ...posterConfig, subtitle: e.target.value })}
                  className="w-full bg-[#FAF9F6] border border-[#E5E0D8] rounded-lg px-3 py-1.5 text-xs text-[#3D3B38] focus:outline-none focus:border-[#5A6348] transition"
                />
              </div>

              <div>
                <label className="block text-xs text-[#8A847C] mb-1">Custom Notes / Quote</label>
                <input
                  type="text"
                  value={posterConfig.customCredits || ''}
                  onChange={(e) => setPosterConfig({ ...posterConfig, customCredits: e.target.value })}
                  placeholder="e.g. Self-Supported Gravel Expedition"
                  className="w-full bg-[#FAF9F6] border border-[#E5E0D8] rounded-lg px-3 py-1.5 text-xs text-[#3D3B38] placeholder-[#8A847C] focus:outline-none focus:border-[#5A6348] transition"
                />
              </div>
            </div>
          </div>

          {/* Fine Tuning */}
          <div className="bg-white border border-[#E5E0D8] rounded-xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-[#2D3025] pb-2 border-b border-[#E5E0D8]">
              <Sliders className="w-4 h-4 text-[#5A6348]" />
              <h3 className="text-sm font-bold">Overlays & Styling</h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#3D3B38]">Show Map Markers</span>
                <input
                  type="checkbox"
                  checked={posterConfig.showMarkers}
                  onChange={(e) => setPosterConfig({ ...posterConfig, showMarkers: e.target.checked })}
                  className="w-4 h-4 rounded text-[#5A6348] bg-[#FAF9F6] border-[#E5E0D8] focus:ring-[#5A6348]"
                  id="poster-toggle-markers"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-[#3D3B38]">Show City Labels</span>
                <input
                  type="checkbox"
                  checked={posterConfig.showCityLabels}
                  onChange={(e) => setPosterConfig({ ...posterConfig, showCityLabels: e.target.checked })}
                  className="w-4 h-4 rounded text-[#5A6348] bg-[#FAF9F6] border-[#E5E0D8] focus:ring-[#5A6348]"
                  id="poster-toggle-city-labels"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-[#3D3B38]">Show Metrics Badge</span>
                <input
                  type="checkbox"
                  checked={posterConfig.showStats}
                  onChange={(e) => setPosterConfig({ ...posterConfig, showStats: e.target.checked })}
                  className="w-4 h-4 rounded text-[#5A6348] bg-[#FAF9F6] border-[#E5E0D8] focus:ring-[#5A6348]"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-[#3D3B38]">Show Waypoints Sidebar</span>
                <input
                  type="checkbox"
                  checked={posterConfig.showWaypoints}
                  onChange={(e) => setPosterConfig({ ...posterConfig, showWaypoints: e.target.checked })}
                  className="w-4 h-4 rounded text-[#5A6348] bg-[#FAF9F6] border-[#E5E0D8] focus:ring-[#5A6348]"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-[#3D3B38]">Show Elevation Profile</span>
                <input
                  type="checkbox"
                  checked={posterConfig.showElevation}
                  onChange={(e) => setPosterConfig({ ...posterConfig, showElevation: e.target.checked })}
                  className="w-4 h-4 rounded text-[#5A6348] bg-[#FAF9F6] border-[#E5E0D8] focus:ring-[#5A6348]"
                  id="poster-toggle-elevation"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-[#8A847C] mb-1">
                  <span>Track Line Weight</span>
                  <span>{posterConfig.lineWeight}px</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="10"
                  value={posterConfig.lineWeight}
                  onChange={(e) => setPosterConfig({ ...posterConfig, lineWeight: Number(e.target.value) })}
                  className="w-full accent-[#5A6348] bg-[#FAF9F6] rounded-lg appearance-none h-1.5"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Button & Warnings */}
        <div className="space-y-3 pt-4 border-t border-[#E5E0D8]">
          {exportError && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800 flex gap-2">
              <ShieldAlert className="w-4.5 h-4.5 text-yellow-600 shrink-0 mt-0.5" />
              <span>{exportError}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex gap-1.5 items-center">
              <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
              <span>Poster exported! Check your downloads folder.</span>
            </div>
          )}

          <button
            onClick={downloadPoster}
            disabled={exporting}
            className="w-full bg-[#5A6348] hover:bg-[#4A523B] disabled:bg-[#FAF9F6] disabled:text-[#8A847C] text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition duration-200 shadow-sm cursor-pointer disabled:cursor-not-allowed"
            id="download-poster-btn"
          >
            {exporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Generating high-res PNG...</span>
              </>
            ) : (
              <>
                <Download className="w-4.5 h-4.5" />
                <span>Download Keepsake Poster</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Right Canvas Area */}
      <div 
        ref={containerRef}
        className="lg:col-span-8 flex items-center justify-center p-2 lg:p-4 min-h-[380px] h-[520px] sm:h-[600px] lg:h-[calc(100vh-100px)] overflow-hidden relative border border-[#E5E0D8] rounded-2xl bg-[#FAF9F6]/50 shadow-inner"
      >
        {/* SCALED POSTER CONTAINER WRAPPER */}
        <div
          style={{
            width: `${480 * scale}px`,
            height: `${640 * scale}px`,
            position: 'relative',
            flexShrink: 0,
          }}
          className="transition-all duration-150 ease-out flex items-center justify-center"
        >
          {/* PHYSICAL POSTER REPRESENTATION */}
          <div
            ref={posterRef}
            id="poster-canvas-area"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
            className={`absolute top-0 left-0 flex flex-col justify-between w-[480px] h-[640px] p-8 shadow-2xl rounded-md transition-colors duration-300 ${themeConfig.bg} ${themeConfig.text}`}
          >
          
          {/* Elegant Matte Border Accent */}
          <div className={`absolute inset-3 border-2 pointer-events-none ${themeConfig.border}`} />

          {/* Central Map Canvas Layer */}
          <div className={`relative flex-1 my-4 border overflow-hidden rounded shadow-inner ${themeConfig.cardBg}`} style={{ borderColor: themeConfig.border }}>
            {children}
            
            {/* Optional Sidebar overlay inside map for list of waypoints */}
            {posterConfig.showWaypoints && route.waypoints && route.waypoints.length > 0 && (
              <div 
                className={`absolute right-3 top-3 w-40 p-3 rounded shadow border text-[9px] leading-tight space-y-1.5 overflow-y-auto ${themeConfig.cardBg} ${themeConfig.border} ${themeConfig.text}`}
                style={{
                  bottom: posterConfig.showElevation && elevationData && elevationData.length > 0 ? '74px' : '12px'
                }}
              >
                <span className="block font-bold uppercase tracking-wider mb-1">Waypoints</span>
                <div className="space-y-1">
                  <div className="flex items-start gap-1">
                    <span className="text-[#A67C52]">🏁</span>
                    <span className="font-semibold">{route.origin.split(',')[0]}</span>
                  </div>
                  {route.waypoints.map((wp, idx) => (
                    <div key={idx} className="flex items-start gap-1 pl-1">
                      <span className="text-[#8A847C]">•</span>
                      <span className="opacity-80">{wp.split(',')[0]}</span>
                    </div>
                  ))}
                  <div className="flex items-start gap-1">
                    <span className="text-red-600">🏁</span>
                    <span className="font-semibold">{route.destination.split(',')[0]}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Optional Elevation Profile overlay inside map */}
            {posterConfig.showElevation && elevationData && elevationData.length > 0 && (
              <div 
                className={`absolute left-0 right-0 bottom-0 p-2.5 px-4 border-t text-[8px] leading-tight flex flex-col justify-between ${themeConfig.cardBg} ${themeConfig.border} ${themeConfig.text}`}
                style={{ 
                  height: '62px'
                }}
                id="poster-elevation-overlay"
              >
                <div className="flex items-center justify-between opacity-80 font-bold tracking-wider uppercase mb-0.5">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: themeConfig.lineColor }} />
                    ELEVATION PROFILE
                  </span>
                  <span className={`${themeConfig.accentText}`}>
                    MIN {Math.min(...elevationData.map(d => d.elevation))}m  •  MAX {Math.max(...elevationData.map(d => d.elevation))}m
                  </span>
                </div>
                <div className="flex-1 w-full h-7 mt-0.5">
                  {renderElevationSvg()}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Poster Info Frame */}
          <div className="space-y-3.5 pt-1">
            <div className="flex justify-between items-end">
              <div>
                <h1 className="text-2xl font-serif tracking-tight leading-none" id="poster-title-rendered">
                  {posterConfig.title || 'Untitled Ride'}
                </h1>
                <p className="text-[10px] uppercase tracking-widest mt-1 opacity-70">
                  {posterConfig.subtitle || 'Bikepacking Expedition'}
                </p>
              </div>

              {/* Stats Badge */}
              {posterConfig.showStats && (
                <div className="flex gap-4 text-right">
                  <div className="text-right">
                    <span className="block text-[8px] uppercase tracking-wider opacity-60">Distance</span>
                    <span className={`text-base font-serif font-bold ${themeConfig.accentText}`}>{route.distanceText}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[8px] uppercase tracking-wider opacity-60">Est. Time</span>
                    <span className={`text-base font-serif font-bold ${themeConfig.accentText}`}>{route.durationText}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Credits & Ornaments */}
            {posterConfig.customCredits && (
              <div className={`text-[8px] uppercase tracking-widest pt-2.5 border-t opacity-50 ${themeConfig.divider}`}>
                <span>{posterConfig.customCredits}</span>
              </div>
            )}
          </div>
          
        </div>
        </div>
      </div>
      
    </div>
  );
}
