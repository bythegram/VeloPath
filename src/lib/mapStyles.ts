// Custom Google Maps style arrays for different Poster Mode themes

export const mapStyles = {
  // 0. Natural Tones (Standard & Custom Theme)
  "natural-tones": [
    { "elementType": "geometry", "stylers": [{ "color": "#F8F5F2" }] },
    { "elementType": "labels.text.fill", "stylers": [{ "color": "#3D3B38" }] },
    { "elementType": "labels.text.stroke", "stylers": [{ "color": "#F8F5F2" }] },
    { "featureType": "administrative", "stylers": [{ "visibility": "simplified" }] },
    { "featureType": "landscape", "elementType": "geometry", "stylers": [{ "color": "#FAF9F6" }] },
    { "featureType": "poi", "stylers": [{ "visibility": "off" }] },
    { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#E5E0D8" }] },
    { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#DED9D1" }] },
    { "featureType": "transit", "stylers": [{ "visibility": "off" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#cbdde9" }] }
  ],

  // 1. Minimalist Dark Theme
  "minimalist-dark": [
    { "elementType": "geometry", "stylers": [{ "color": "#18181b" }] },
    { "elementType": "labels", "stylers": [{ "visibility": "off" }] },
    { "featureType": "administrative", "stylers": [{ "visibility": "off" }] },
    { "featureType": "landscape", "elementType": "geometry", "stylers": [{ "color": "#09090b" }] },
    { "featureType": "poi", "stylers": [{ "visibility": "off" }] },
    { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#27272a" }] },
    { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#3f3f46" }] },
    { "featureType": "transit", "stylers": [{ "visibility": "off" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#020617" }] }
  ],

  // 2. Vintage Forest (Earth tones)
  "vintage-forest": [
    { "elementType": "geometry", "stylers": [{ "color": "#fbfbf8" }] },
    { "elementType": "labels", "stylers": [{ "visibility": "off" }] },
    { "featureType": "administrative", "stylers": [{ "visibility": "off" }] },
    { "featureType": "landscape", "elementType": "geometry", "stylers": [{ "color": "#ecf0e5" }] }, // Sage green tint
    { "featureType": "poi", "stylers": [{ "visibility": "off" }] },
    { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#d6dbcd" }] },
    { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#c1c8b3" }] },
    { "featureType": "transit", "stylers": [{ "visibility": "off" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#cbdde9" }] } // Earthy blue
  ],

  // 3. Topo Orange (Warm sandy cream & safety orange accents)
  "topo-orange": [
    { "elementType": "geometry", "stylers": [{ "color": "#fafaf9" }] },
    { "elementType": "labels", "stylers": [{ "visibility": "off" }] },
    { "featureType": "administrative", "stylers": [{ "visibility": "off" }] },
    { "featureType": "landscape", "elementType": "geometry", "stylers": [{ "color": "#f5f5f4" }] }, // Sand tone
    { "featureType": "poi", "stylers": [{ "visibility": "off" }] },
    { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#e7e5e4" }] },
    { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#d6d3d1" }] },
    { "featureType": "transit", "stylers": [{ "visibility": "off" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#fed7aa" }] } // Soft warm water
  ],

  // 4. Classic Sand (Warm tan & slate)
  "classic-sand": [
    { "elementType": "geometry", "stylers": [{ "color": "#fef3c7" }] }, // Warm sand
    { "elementType": "labels", "stylers": [{ "visibility": "off" }] },
    { "featureType": "administrative", "stylers": [{ "visibility": "off" }] },
    { "featureType": "landscape", "elementType": "geometry", "stylers": [{ "color": "#fde68a" }] },
    { "featureType": "poi", "stylers": [{ "visibility": "off" }] },
    { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#e2e8f0" }] },
    { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#cbd5e1" }] },
    { "featureType": "transit", "stylers": [{ "visibility": "off" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#bae6fd" }] }
  ],

  // Standard interactive map theme
  "standard-dark": [
    { "elementType": "geometry", "stylers": [{ "color": "#1f2937" }] },
    { "elementType": "labels.text.stroke", "stylers": [{ "color": "#1f2937" }] },
    { "elementType": "labels.text.fill", "stylers": [{ "color": "#9ca3af" }] },
    { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#4b5563" }] },
    { "featureType": "administrative.country", "elementType": "geometry.stroke", "stylers": [{ "color": "#4b5563" }] },
    { "featureType": "administrative.province", "elementType": "geometry.stroke", "stylers": [{ "color": "#4b5563" }] },
    { "featureType": "landscape", "elementType": "geometry", "stylers": [{ "color": "#111827" }] },
    { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#1f2937" }] },
    { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#374151" }] },
    { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#111827" }] },
    { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#4b5563" }] },
    { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#111827" }] },
    { "featureType": "transit", "elementType": "geometry", "stylers": [{ "color": "#1f2937" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#030712" }] }
  ]
};

// Theme configurations for Poster layout
export const posterThemes = {
  "natural-tones": {
    bg: "bg-[#F8F5F2]",
    text: "text-[#3D3B38]",
    accentText: "text-[#A67C52]", // Ochre highlight
    border: "border-[#E5E0D8]",
    label: "text-[#8A847C]",
    cardBg: "bg-[#FAF9F6]",
    lineColor: "#5A6348", // Forest sage green
    divider: "border-[#E5E0D8]",
    bgHex: "#F8F5F2"
  },
  "minimalist-dark": {
    bg: "bg-black",
    text: "text-zinc-100",
    accentText: "text-white",
    border: "border-zinc-800",
    label: "text-zinc-400",
    cardBg: "bg-zinc-950",
    lineColor: "#f4f4f5", // Zinc-100
    divider: "border-zinc-800",
    bgHex: "#000000"
  },
  "vintage-forest": {
    bg: "bg-[#1e251c]", // Dark forest bg
    text: "text-[#f3f6f0]",
    accentText: "text-[#a7bc9b]", // Muted forest accent
    border: "border-[#2f3b2a]",
    label: "text-[#8d9c85]",
    cardBg: "bg-[#181e16]",
    lineColor: "#608051", // Soft forest green line
    divider: "border-[#2f3b2a]",
    bgHex: "#1e251c"
  },
  "topo-orange": {
    bg: "bg-[#1c1917]", // Dark stone bg
    text: "text-[#fafaf9]",
    accentText: "text-[#f97316]", // Safety orange
    border: "border-[#2e2a24]",
    label: "text-[#a8a29e]",
    cardBg: "bg-[#141210]",
    lineColor: "#ea580c", // Safety orange line
    divider: "border-[#2e2a24]",
    bgHex: "#1c1917"
  },
  "classic-sand": {
    bg: "bg-[#1c1d24]", // Deep warm navy-gray
    text: "text-[#f8fafc]",
    accentText: "text-[#f59e0b]", // Amber
    border: "border-[#2a2d3a]",
    label: "text-[#94a3b8]",
    cardBg: "bg-[#13141a]",
    lineColor: "#b45309", // Warm dark gold line
    divider: "border-[#2a2d3a]",
    bgHex: "#1c1d24"
  },
  // Legacy & Alias fallbacks
  "transparent-minimal": {
    bg: "bg-[#F8F5F2]",
    text: "text-[#3D3B38]",
    accentText: "text-[#A67C52]",
    border: "border-[#E5E0D8]",
    label: "text-[#8A847C]",
    cardBg: "bg-[#FAF9F6]",
    lineColor: "#5A6348",
    divider: "border-[#E5E0D8]",
    bgHex: "#F8F5F2"
  },
  "transparent-dark": {
    bg: "bg-black",
    text: "text-zinc-100",
    accentText: "text-white",
    border: "border-zinc-800",
    label: "text-zinc-400",
    cardBg: "bg-zinc-950",
    lineColor: "#f4f4f5",
    divider: "border-zinc-800",
    bgHex: "#000000"
  }
};

export type PosterThemeKey = keyof typeof posterThemes;

export function getPosterTheme(themeName?: string) {
  if (themeName && themeName in posterThemes) {
    return posterThemes[themeName as PosterThemeKey];
  }
  return posterThemes["natural-tones"];
}

export function getPosterMapStyles(theme: string, showCityLabels: boolean) {
  const baseStyles = mapStyles[theme as keyof typeof mapStyles] || mapStyles["natural-tones"];
  
  if (!showCityLabels) {
    return [
      ...baseStyles,
      { "featureType": "administrative", "stylers": [{ "visibility": "off" }] },
      { "featureType": "administrative.locality", "stylers": [{ "visibility": "off" }] }
    ];
  } else {
    if (theme === "natural-tones") {
      return [
        ...baseStyles,
        { "featureType": "administrative.locality", "elementType": "labels", "stylers": [{ "visibility": "on" }] }
      ];
    }
    
    let textFillColor = "#3D3B38";
    let textStrokeColor = "#FAF9F6";
    
    if (theme === "minimalist-dark") {
      textFillColor = "#f4f4f5";
      textStrokeColor = "#09090b";
    } else if (theme === "vintage-forest") {
      textFillColor = "#1e251c";
      textStrokeColor = "#ecf0e5";
    } else if (theme === "topo-orange") {
      textFillColor = "#1c1917";
      textStrokeColor = "#fafaf9";
    } else if (theme === "classic-sand") {
      textFillColor = "#1c1d24";
      textStrokeColor = "#fef3c7";
    }
    
    return [
      ...baseStyles,
      { "featureType": "administrative.locality", "elementType": "labels", "stylers": [{ "visibility": "on" }] },
      { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": textFillColor }] },
      { "featureType": "administrative.locality", "elementType": "labels.text.stroke", "stylers": [{ "color": textStrokeColor }, { "weight": 2.5 }] }
    ];
  }
}

