import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Route as RouteIcon,
  X,
  ExternalLink,
  Clipboard,
  Check,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  HelpCircle,
  RotateCcw
} from 'lucide-react';
import { parseGoogleMapsUrl, ParsedGoogleMapsRoute } from '../lib/googleMapsParser';

interface ImportGoogleMapsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportRoute: (route: { origin: string; destination: string; waypoints: string[] }) => void;
}

export default function ImportGoogleMapsModal({
  isOpen,
  onClose,
  onImportRoute,
}: ImportGoogleMapsModalProps) {
  const [urlInput, setUrlInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [parsedPreview, setParsedPreview] = useState<ParsedGoogleMapsRoute | null>(null);
  const [copiedClipboard, setCopiedClipboard] = useState(false);

  // Reset state when opening/closing
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setParsedPreview(null);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setUrlInput(text.trim());
          setCopiedClipboard(true);
          setTimeout(() => setCopiedClipboard(false), 2000);
          // Automatically trigger parse on paste for smooth UX
          handleParseUrl(text.trim());
        }
      }
    } catch (err) {
      console.warn('Clipboard read permission denied or unavailable:', err);
    }
  };

  const handleParseUrl = async (overrideUrl?: string) => {
    const target = overrideUrl ?? urlInput;
    if (!target || target.trim() === '') {
      setErrorMessage('Please paste or enter a Google Maps link first.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setParsedPreview(null);

    try {
      const result = await parseGoogleMapsUrl(target);
      setParsedPreview(result);
    } catch (err: any) {
      console.error('Failed to parse Google Maps URL:', err);
      setErrorMessage(err.message || 'Failed to parse Google Maps route. Please check the URL.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyRoute = () => {
    if (!parsedPreview) return;
    onImportRoute({
      origin: parsedPreview.origin,
      destination: parsedPreview.destination,
      waypoints: parsedPreview.waypoints,
    });
    onClose();
  };

  const handleUseSampleUrl = (sample: string) => {
    setUrlInput(sample);
    handleParseUrl(sample);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        id="import-modal-backdrop"
      />

      {/* Modal Dialog Card */}
      <div
        className="relative z-10 w-full max-w-xl bg-white border border-[#E5E0D8] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        id="import-google-maps-modal-dialog"
      >
        {/* Header */}
        <div className="bg-[#FAF9F6] border-b border-[#E5E0D8] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#5A6348]/10 border border-[#5A6348]/20 rounded-xl flex items-center justify-center text-[#5A6348]">
              <RouteIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#2D3025] tracking-tight">Import Google Maps Route</h3>
              <p className="text-xs text-[#8A847C] font-medium">Extract origin, destination & waypoints into VeloPath</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#8A847C] hover:text-[#3D3B38] hover:bg-[#E5E0D8]/40 rounded-xl transition cursor-pointer"
            id="close-import-modal-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Instructions Box */}
          <div className="bg-[#5A6348]/5 border border-[#5A6348]/20 rounded-xl p-3.5 text-xs text-[#2D3025] space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-[#5A6348]">
              <HelpCircle className="w-4 h-4 shrink-0" />
              <span>How to get your Google Maps route link</span>
            </div>
            <p className="text-[11px] text-[#8A847C] leading-relaxed">
              In Google Maps (mobile or desktop), plan your directions, tap <strong className="text-[#3D3B38]">Share</strong>, and copy the link. Both short links (<code className="bg-white/80 px-1 py-0.5 rounded border border-[#E5E0D8] text-[#5A6348]">maps.app.goo.gl</code>) and full browser URLs are supported.
            </p>
          </div>

          {/* URL Input Form */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8A847C]">
                Google Maps URL
              </label>
              <button
                type="button"
                onClick={handlePasteFromClipboard}
                className="text-[11px] text-[#5A6348] hover:text-[#4A523B] font-bold flex items-center gap-1 cursor-pointer"
                id="paste-clipboard-btn"
              >
                {copiedClipboard ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Pasted!</span>
                  </>
                ) : (
                  <>
                    <Clipboard className="w-3.5 h-3.5" />
                    <span>Paste Link</span>
                  </>
                )}
              </button>
            </div>

            <div className="relative">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                  if (parsedPreview) setParsedPreview(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isLoading) {
                    handleParseUrl();
                  }
                }}
                placeholder="https://maps.app.goo.gl/... or https://www.google.com/maps/dir/..."
                className="w-full bg-[#FAF9F6] border border-[#E5E0D8] rounded-xl pl-3.5 pr-20 py-2.5 text-xs text-[#3D3B38] placeholder-[#8A847C] focus:outline-none focus:border-[#5A6348] focus:bg-white transition"
                id="google-maps-url-input"
                autoFocus
              />
              {urlInput && (
                <button
                  type="button"
                  onClick={() => {
                    setUrlInput('');
                    setParsedPreview(null);
                    setErrorMessage(null);
                  }}
                  className="absolute right-2.5 top-2.5 p-1 text-[#8A847C] hover:text-[#3D3B38] rounded-md transition cursor-pointer"
                  title="Clear input"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Sample Links for Testing */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-[#8A847C] font-semibold">Try sample:</span>
              <button
                type="button"
                onClick={() =>
                  handleUseSampleUrl(
                    'https://www.google.com/maps/dir/Cobourg,+ON/Rice+Lake,+ON/Campbellford,+ON'
                  )
                }
                className="text-[10px] bg-[#FAF9F6] hover:bg-[#F1EDE7] text-[#5A6348] border border-[#E5E0D8] px-2 py-0.5 rounded-md font-medium transition cursor-pointer"
              >
                Cobourg → Rice Lake → Campbellford
              </button>
              <button
                type="button"
                onClick={() =>
                  handleUseSampleUrl(
                    'https://www.google.com/maps/dir/Port+Hope,+ON/Peterborough,+ON'
                  )
                }
                className="text-[10px] bg-[#FAF9F6] hover:bg-[#F1EDE7] text-[#5A6348] border border-[#E5E0D8] px-2 py-0.5 rounded-md font-medium transition cursor-pointer"
              >
                Port Hope → Peterborough
              </button>
            </div>
          </div>

          {/* Loading Indicator */}
          {isLoading && (
            <div className="bg-[#FAF9F6] border border-[#E5E0D8] rounded-xl p-5 text-center space-y-2 animate-in fade-in duration-200">
              <Loader2 className="w-6 h-6 text-[#5A6348] animate-spin mx-auto" />
              <p className="text-xs font-bold text-[#2D3025]">Resolving & decoding Google Maps route...</p>
              <p className="text-[11px] text-[#8A847C]">Following redirects and extracting coordinates</p>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs text-red-800 flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Unable to Import Route</p>
                <p className="text-[11px] text-red-700 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Parsed Route Preview Card */}
          {parsedPreview && (
            <div className="bg-[#FAF9F6] border border-[#5A6348]/30 rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between pb-2 border-b border-[#E5E0D8]">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#5A6348]">
                  <Check className="w-4 h-4" />
                  <span>Route Decoded Successfully</span>
                </div>
                <span className="text-[10px] font-bold bg-[#5A6348]/10 text-[#5A6348] px-2 py-0.5 rounded-full">
                  {parsedPreview.totalStops} Total Stops
                </span>
              </div>

              {/* Waypoints Hierarchy */}
              <div className="space-y-2 text-xs">
                {/* Start */}
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    A
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-[#8A847C]">Start Origin</span>
                    <span className="font-bold text-[#2D3025] break-words">{parsedPreview.origin}</span>
                  </div>
                </div>

                {/* Intermediate Waypoints */}
                {parsedPreview.waypoints.map((wp, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 pl-0.5">
                    <div className="w-4 h-4 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="block text-[9px] font-bold uppercase tracking-wider text-[#8A847C]">Waypoint {idx + 1}</span>
                      <span className="font-medium text-[#3D3B38] break-words">{wp}</span>
                    </div>
                  </div>
                ))}

                {/* Destination */}
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 bg-[#A67C52]/20 text-[#A67C52] rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    B
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-[#8A847C]">Finish Destination</span>
                    <span className="font-bold text-[#2D3025] break-words">{parsedPreview.destination}</span>
                  </div>
                </div>
              </div>

              {parsedPreview.warnings && parsedPreview.warnings.length > 0 && (
                <div className="text-[10px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                  {parsedPreview.warnings.join(' ')}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-[#FAF9F6] border-t border-[#E5E0D8] px-5 py-3.5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-[#FAF9F6] border border-[#E5E0D8] text-[#8A847C] hover:text-[#3D3B38] text-xs font-bold rounded-xl transition cursor-pointer"
            id="cancel-import-modal-btn"
          >
            Cancel
          </button>

          {!parsedPreview ? (
            <button
              type="button"
              onClick={() => handleParseUrl()}
              disabled={isLoading || !urlInput.trim()}
              className="px-4 py-2 bg-[#5A6348] hover:bg-[#4A523B] text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              id="parse-url-btn"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <span>Decode Route</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleApplyRoute}
              className="px-5 py-2 bg-[#5A6348] hover:bg-[#4A523B] text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer flex items-center gap-1.5"
              id="apply-imported-route-btn"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Import to VeloPath</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
