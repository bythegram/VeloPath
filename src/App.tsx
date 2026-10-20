import React, { useState, useEffect, useRef } from 'react';
import { APIProvider, Map, useMap, useMapsLibrary, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { PersonalGoal, TripRoute, SmartStop, GearCategory, PosterConfig } from './types';
import { mapStyles, posterThemes, getPosterMapStyles, getPosterTheme } from './lib/mapStyles';
import GoalOnboarding from './components/GoalOnboarding';
import SmartStopsAndGear from './components/SmartStopsAndGear';
import PosterMode from './components/PosterMode';
import AutocompleteInput from './components/AutocompleteInput';
import WaypointList from './components/WaypointList';
import ImportGoogleMapsModal from './components/ImportGoogleMapsModal';
import {
  Compass,
  MapPin,
  Bike,
  Plus,
  Trash2,
  Navigation,
  Sparkles,
  Layers,
  ArrowRight,
  Route as RouteIcon,
  Map as MapIcon,
  FileText,
  TrendingUp,
  Sliders,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Edit2,
  Check,
  X,
  RefreshCw,
  Menu,
  Download,
  Link as LinkIcon
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

// Retrieve API key from environment variables (secured server-side for Gemini, client-side for Maps)
const INITIAL_API_KEY =
  (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (typeof process !== 'undefined' && process.env
    ? process.env.VITE_GOOGLE_MAPS_API_KEY ||
      process.env.GOOGLE_MAPS_PLATFORM_KEY ||
      process.env.GOOGLE_MAPS_API_KEY
    : '') ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';

// Default initial state fallback values
const defaultGoals: PersonalGoal = {
  bikeType: 'Gravel Bike',
  goalDistance: 220,
  goalDays: 4,
  experienceLevel: 'Intermediate',
  additionalContext: 'Aiming for scenic gravel roads, state parks, and reliable water fill-up points.',
};

const defaultPosterConfig: PosterConfig = {
  title: 'Cobourg to Ferris',
  subtitle: 'Bikepacking Expedition • 2026',
  theme: 'natural-tones',
  showStats: true,
  showWaypoints: true,
  customCredits: 'Ridden, Not Written • Self-Supported',
  lineWeight: 5,
  showMarkers: true,
  showElevation: true,
  showCityLabels: true,
};

// Fallback coordinates dictionary for default locations in Canada (Southern Ontario & major Canadian trail hubs)
const fallbackCoordinates: Record<string, { lat: number; lng: number }> = {
  'cobourg, on': { lat: 43.9594, lng: -78.1652 },
  'cobourg': { lat: 43.9594, lng: -78.1652 },
  'ferris provincial park, campbellford, on': { lat: 44.2934, lng: -77.7853 },
  'ferris provincial park': { lat: 44.2934, lng: -77.7853 },
  'ferris': { lat: 44.2934, lng: -77.7853 },
  'campbellford, on': { lat: 44.3078, lng: -77.7983 },
  'campbellford': { lat: 44.3078, lng: -77.7983 },
  'rice lake, on': { lat: 44.1833, lng: -78.1667 },
  'rice lake': { lat: 44.1833, lng: -78.1667 },
  'peterborough, on': { lat: 44.3091, lng: -78.3197 },
  'peterborough': { lat: 44.3091, lng: -78.3197 },
  'port hope, on': { lat: 43.9515, lng: -78.2944 },
  'port hope': { lat: 43.9515, lng: -78.2944 },
  'toronto, on': { lat: 43.6532, lng: -79.3832 },
  'toronto': { lat: 43.6532, lng: -79.3832 },
  'ottawa, on': { lat: 45.4215, lng: -75.6972 },
  'ottawa': { lat: 45.4215, lng: -75.6972 },
  'montreal, qc': { lat: 45.5017, lng: -73.5673 },
  'montreal': { lat: 45.5017, lng: -73.5673 },
  'quebec city, qc': { lat: 46.8139, lng: -71.2080 },
  'quebec city': { lat: 46.8139, lng: -71.2080 },
  'banff, ab': { lat: 51.1784, lng: -115.5708 },
  'banff': { lat: 51.1784, lng: -115.5708 },
  'canmore, ab': { lat: 51.0890, lng: -115.3590 },
  'canmore': { lat: 51.0890, lng: -115.3590 },
  'jasper, ab': { lat: 52.8737, lng: -118.0814 },
  'jasper': { lat: 52.8737, lng: -118.0814 },
  'calgary, ab': { lat: 51.0447, lng: -114.0719 },
  'calgary': { lat: 51.0447, lng: -114.0719 },
  'vancouver, bc': { lat: 49.2827, lng: -123.1207 },
  'vancouver': { lat: 49.2827, lng: -123.1207 },
  'victoria, bc': { lat: 48.4284, lng: -123.3656 },
  'victoria': { lat: 48.4284, lng: -123.3656 },
  'whistler, bc': { lat: 50.1163, lng: -122.9574 },
  'whistler': { lat: 50.1163, lng: -122.9574 },
};

// Deterministic hashing algorithm to generate stable coordinates in Southern Ontario if geocoding fails
function getHashLatLng(str: string): { lat: number; lng: number } {
  const normalized = str.toLowerCase().trim();
  if (fallbackCoordinates[normalized]) {
    return fallbackCoordinates[normalized];
  }
  for (const [key, val] of Object.entries(fallbackCoordinates)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return val;
    }
  }
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash);
  }
  const latOffset = ((Math.abs(hash) % 1000) / 1000) - 0.5;
  const lngOffset = (((Math.abs(hash >> 3) % 1000) / 1000) - 0.5);
  
  return {
    lat: 44.1284 + latOffset * 0.8,
    lng: -77.9760 + lngOffset * 0.8,
  };
}

// Great circle distance calculator (haversine)
const getDistanceBetween = (pt1: { lat: number; lng: number }, pt2: { lat: number; lng: number }): number => {
  const R = 6371e3;
  const phi1 = (pt1.lat * Math.PI) / 180;
  const phi2 = (pt2.lat * Math.PI) / 180;
  const deltaPhi = ((pt2.lat - pt1.lat) * Math.PI) / 180;
  const deltaLambda = ((pt2.lng - pt1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// Deterministic elevation generator based on geographical position and index fraction
const getDeterministicElevation = (lat: number, lng: number, indexFraction: number): number => {
  // We use trig functions of lat and lng to create a consistent, smooth elevation profile
  // multiplier of 150 gives hills that change over ~0.7 degrees (approx 70km), perfect for regional terrain
  const baseTerrain = Math.sin(lat * 150) * 60 + Math.cos(lng * 150) * 45;
  // micro undulations for bike paths/roads
  const details = Math.sin(indexFraction * Math.PI * 4) * 15 + Math.cos(indexFraction * Math.PI * 8) * 8;
  // Average elevation centered around 130m above sea level
  return Math.max(12, Math.round(135 + baseTerrain + details));
};

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function generateGpxXml(
  title: string,
  coords: { lat: number; lng: number; ele?: number }[],
  origin: string,
  destination: string
): string {
  const routeName = title || `${origin.split(',')[0]} to ${destination.split(',')[0]}`;
  const now = new Date().toISOString();

  const trkpts = coords
    .map((pt) => {
      const eleTag = pt.ele !== undefined ? `\n        <ele>${pt.ele.toFixed(1)}</ele>` : '';
      return `      <trkpt lat="${pt.lat.toFixed(6)}" lon="${pt.lng.toFixed(6)}">${eleTag}\n      </trkpt>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="VeloPath - https://velopath.app"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escapeXml(routeName)}</name>
    <desc>${escapeXml(`Bicycle route from ${origin} to ${destination}`)}</desc>
    <time>${now}</time>
  </metadata>
  <trk>
    <name>${escapeXml(routeName)}</name>
    <type>Biking</type>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`;
}

// Simulated Route Display when Google Maps Directions or Geocoding APIs are restricted or not configured
function SimulatedRouteDisplay({
  origin,
  destination,
  waypoints,
  setRouteMetrics,
  isPosterMode,
  posterConfig,
  setElevationData,
  setIsElevationSimulated,
  setRoutePathCoords,
}: {
  origin: string;
  destination: string;
  waypoints: string[];
  setRouteMetrics: (metrics: { distanceText: string; durationText: string; distanceValue: number; durationValue: number }) => void;
  isPosterMode: boolean;
  posterConfig: PosterConfig;
  setElevationData?: React.Dispatch<React.SetStateAction<{ km: number; elevation: number }[]>>;
  setIsElevationSimulated?: (val: boolean) => void;
  setRoutePathCoords?: (coords: { lat: number; lng: number; ele?: number }[]) => void;
}) {
  const map = useMap();
  const customPolylinesRef = useRef<google.maps.Polyline[]>([]);
  const customMarkersRef = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    if (!map || !origin || !destination) return;

    // Clear previous polylines/markers
    customPolylinesRef.current.forEach((p) => p.setMap(null));
    customPolylinesRef.current = [];
    customMarkersRef.current.forEach((m) => m.setMap(null));
    customMarkersRef.current = [];

    const activeTheme = getPosterTheme(posterConfig?.theme);
    const activeWaypoints = waypoints.filter((w) => w.trim() !== '');
    
    // Pure synchronous coordinate retrieval using hash function to bypass any API geocoding calls
    const coordsList = [
      getHashLatLng(origin),
      ...activeWaypoints.map((w) => getHashLatLng(w)),
      getHashLatLng(destination),
    ];

    // Draw smooth, organic winding polyline path connecting the locations
    const pathCoords: { lat: number; lng: number }[] = [];
    
    for (let j = 0; j < coordsList.length - 1; j++) {
      const p1 = coordsList[j];
      const p2 = coordsList[j + 1];
      
      // Interpolate winding points between segments
      const steps = 40;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const latLinear = p1.lat + t * (p2.lat - p1.lat);
        const lngLinear = p1.lng + t * (p2.lng - p1.lng);
        
        const dLat = p2.lat - p1.lat;
        const dLng = p2.lng - p1.lng;
        
        // Generate realistic curvy waves using double-sine noise that naturally fades out at endpoints
        const wave = 0.14 * Math.sin(Math.PI * t) * Math.sin(3 * Math.PI * t) +
                     0.06 * Math.sin(Math.PI * t) * Math.sin(7 * Math.PI * t);
                     
        pathCoords.push({
          lat: latLinear + wave * (-dLng),
          lng: lngLinear + wave * dLat,
        });
      }
    }

    // Render winding polyline on map
    const simulatedPolyline = new google.maps.Polyline({
      path: pathCoords,
      strokeColor: isPosterMode ? activeTheme.lineColor : '#10b981',
      strokeWeight: isPosterMode ? posterConfig.lineWeight : 5,
      strokeOpacity: 0.9,
      map: map,
    });
    customPolylinesRef.current.push(simulatedPolyline);

    // Render labeled markers in planning mode (A, B, etc.), or when enabled in poster mode
    if (!isPosterMode || posterConfig.showMarkers) {
      const startMarker = new google.maps.Marker({
        position: coordsList[0],
        map: map,
        title: 'Start: ' + origin,
        label: 'A',
      });
      customMarkersRef.current.push(startMarker);

      for (let i = 1; i < coordsList.length - 1; i++) {
        const wpMarker = new google.maps.Marker({
          position: coordsList[i],
          map: map,
          title: 'Stop: ' + activeWaypoints[i - 1],
          label: String(i),
        });
        customMarkersRef.current.push(wpMarker);
      }

      const endMarker = new google.maps.Marker({
        position: coordsList[coordsList.length - 1],
        map: map,
        title: 'Destination: ' + destination,
        label: 'B',
      });
      customMarkersRef.current.push(endMarker);
    }

    // Calculate highly realistic distance (curved) and cycling time
    let totalMeters = 0;
    for (let i = 0; i < pathCoords.length - 1; i++) {
      totalMeters += getDistanceBetween(pathCoords[i], pathCoords[i + 1]);
    }

    const distanceKm = (totalMeters / 1000).toFixed(1);
    const calculatedDurationSeconds = totalMeters / 5; // ~18 km/h cycling speed
    const hoursTotal = (calculatedDurationSeconds / 3600).toFixed(1);

    setRouteMetrics({
      distanceText: `${distanceKm} km`,
      durationText: `${hoursTotal} hrs`,
      distanceValue: totalMeters,
      durationValue: calculatedDurationSeconds,
    });

    // Generate beautiful deterministic elevation profile accurate to the simulated route path coords
    if (setElevationData) {
      const points = [];
      const samples = 30;
      const totalKm = totalMeters / 1000;
      
      for (let i = 0; i < samples; i++) {
        const fraction = i / (samples - 1);
        const ptIndex = Math.min(
          pathCoords.length - 1,
          Math.floor(fraction * (pathCoords.length - 1))
        );
        const pt = pathCoords[ptIndex] || pathCoords[0];
        const km = parseFloat((totalKm * fraction).toFixed(1));
        const elevation = getDeterministicElevation(pt.lat, pt.lng, fraction);
        points.push({ km, elevation });
      }
      setElevationData(points);
      if (setIsElevationSimulated) {
        setIsElevationSimulated(true);
      }
    }

    if (setRoutePathCoords) {
      const gpxPoints = pathCoords.map((pt, idx) => {
        const fraction = idx / (pathCoords.length - 1 || 1);
        const elevation = getDeterministicElevation(pt.lat, pt.lng, fraction);
        return { lat: pt.lat, lng: pt.lng, ele: elevation };
      });
      setRoutePathCoords(gpxPoints);
    }

    // Zoom/fit map bounds to cover the entire winding track beautifully
    const bounds = new google.maps.LatLngBounds();
    pathCoords.forEach((pt) => bounds.extend(pt));
    const bottomPadding = (isPosterMode && posterConfig.showElevation) ? 120 : 40;
    map.fitBounds(bounds, {
      top: 40,
      bottom: bottomPadding,
      left: 40,
      right: 40
    });

    return () => {
      customPolylinesRef.current.forEach((p) => p.setMap(null));
      customPolylinesRef.current = [];
      customMarkersRef.current.forEach((m) => m.setMap(null));
      customMarkersRef.current = [];
    };
  }, [map, origin, destination, waypoints, isPosterMode, posterConfig.theme, posterConfig.lineWeight, posterConfig.showMarkers, setRouteMetrics, setElevationData, setIsElevationSimulated, setRoutePathCoords]);

  return null;
}

// Live Route Display using standard DirectionsService & DirectionsRenderer with active APIs
function LiveRouteDisplay({
  origin,
  destination,
  waypoints,
  setRouteMetrics,
  isPosterMode,
  posterConfig,
  setIsApiRestricted,
  setElevationData,
  setIsElevationSimulated,
  setRoutePathCoords,
}: {
  origin: string;
  destination: string;
  waypoints: string[];
  setRouteMetrics: (metrics: { distanceText: string; durationText: string; distanceValue: number; durationValue: number }) => void;
  isPosterMode: boolean;
  posterConfig: PosterConfig;
  setIsApiRestricted: (val: boolean) => void;
  setElevationData?: React.Dispatch<React.SetStateAction<{ km: number; elevation: number }[]>>;
  setIsElevationSimulated?: (val: boolean) => void;
  setRoutePathCoords?: (coords: { lat: number; lng: number; ele?: number }[]) => void;
}) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const rendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const customPolylinesRef = useRef<google.maps.Polyline[]>([]);
  const customMarkersRef = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    if (!map || !origin || !destination) return;

    // Clear previous directions renderer if any
    if (rendererRef.current) {
      rendererRef.current.setMap(null);
    }
    customPolylinesRef.current.forEach((p) => p.setMap(null));
    customPolylinesRef.current = [];
    customMarkersRef.current.forEach((m) => m.setMap(null));
    customMarkersRef.current = [];

    const activeTheme = getPosterTheme(posterConfig?.theme);
    const activeWaypoints = waypoints.filter((w) => w.trim() !== '');

    // Geocode or fetch fallback coords for every address
    const geocoder = new google.maps.Geocoder();
    const geocodeAddress = (address: string): Promise<{ lat: number; lng: number }> => {
      return new Promise((resolve) => {
        let resolved = false;
        const timer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            console.warn(`Geocoding timed out for "${address}", using fallback.`);
            resolve(getHashLatLng(address));
          }
        }, 5000);

        try {
          geocoder.geocode(
            {
              address,
              componentRestrictions: { country: 'CA' },
              region: 'CA',
            },
            (results, status) => {
              if (!resolved) {
                resolved = true;
                clearTimeout(timer);
                if (status === 'OK' && results && results[0]) {
                  const loc = results[0].geometry.location;
                  resolve({ lat: loc.lat(), lng: loc.lng() });
                } else {
                  console.warn(`Geocode status for "${address}": ${status}. Using fallback.`);
                  if (status === 'REQUEST_DENIED' || status === 'OVER_QUERY_LIMIT') {
                    setIsApiRestricted(true);
                  }
                  resolve(getHashLatLng(address));
                }
              }
            }
          );
        } catch (e) {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            console.warn(`Geocode call threw error for "${address}":`, e);
            resolve(getHashLatLng(address));
          }
        }
      });
    };

    const runSimulatedFallback = (coordsList: { lat: number; lng: number }[]) => {
      // Draw smooth, organic winding polyline path connecting the locations
      const pathCoords: { lat: number; lng: number }[] = [];
      
      for (let j = 0; j < coordsList.length - 1; j++) {
        const p1 = coordsList[j];
        const p2 = coordsList[j + 1];
        
        // Interpolate winding points between segments
        const steps = 40;
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const latLinear = p1.lat + t * (p2.lat - p1.lat);
          const lngLinear = p1.lng + t * (p2.lng - p1.lng);
          
          const dLat = p2.lat - p1.lat;
          const dLng = p2.lng - p1.lng;
          
          // Generate realistic curvy waves using double-sine noise that naturally fades out at endpoints
          const wave = 0.14 * Math.sin(Math.PI * t) * Math.sin(3 * Math.PI * t) +
                       0.06 * Math.sin(Math.PI * t) * Math.sin(7 * Math.PI * t);
                       
          pathCoords.push({
            lat: latLinear + wave * (-dLng),
            lng: lngLinear + wave * dLat,
          });
        }
      }

      // Render winding polyline on map
      const simulatedPolyline = new google.maps.Polyline({
        path: pathCoords,
        strokeColor: isPosterMode ? activeTheme.lineColor : '#10b981',
        strokeWeight: isPosterMode ? posterConfig.lineWeight : 5,
        strokeOpacity: 0.9,
        map: map,
      });
      customPolylinesRef.current.push(simulatedPolyline);

      // Render labeled markers in planning mode (A, B, etc.), or when enabled in poster mode
      if (!isPosterMode || posterConfig.showMarkers) {
        const startMarker = new google.maps.Marker({
          position: coordsList[0],
          map: map,
          title: 'Start: ' + origin,
          label: 'A',
        });
        customMarkersRef.current.push(startMarker);

        for (let i = 1; i < coordsList.length - 1; i++) {
          const wpMarker = new google.maps.Marker({
            position: coordsList[i],
            map: map,
            title: 'Stop: ' + activeWaypoints[i - 1],
            label: String(i),
          });
          customMarkersRef.current.push(wpMarker);
        }

        const endMarker = new google.maps.Marker({
          position: coordsList[coordsList.length - 1],
          map: map,
          title: 'Destination: ' + destination,
          label: 'B',
        });
        customMarkersRef.current.push(endMarker);
      }

      // Calculate highly realistic distance (curved) and cycling time
      let totalMeters = 0;
      for (let i = 0; i < pathCoords.length - 1; i++) {
        totalMeters += getDistanceBetween(pathCoords[i], pathCoords[i + 1]);
      }

      const distanceKm = (totalMeters / 1000).toFixed(1);
      const calculatedDurationSeconds = totalMeters / 5; // ~18 km/h cycling speed
      const hoursTotal = (calculatedDurationSeconds / 3600).toFixed(1);

      setRouteMetrics({
        distanceText: `${distanceKm} km`,
        durationText: `${hoursTotal} hrs`,
        distanceValue: totalMeters,
        durationValue: calculatedDurationSeconds,
      });

      // Zoom/fit map bounds to cover the entire winding track beautifully
      const bounds = new google.maps.LatLngBounds();
      pathCoords.forEach((pt) => bounds.extend(pt));
      const bottomPadding = (isPosterMode && posterConfig.showElevation) ? 120 : 40;
      map.fitBounds(bounds, {
        top: 40,
        bottom: bottomPadding,
        left: 40,
        right: 40
      });
    };

    if (!routesLib) return;

    // Create a new DirectionsRenderer with custom styles
    const renderer = new routesLib.DirectionsRenderer({
      map: map,
      suppressMarkers: isPosterMode ? !posterConfig.showMarkers : false,
      preserveViewport: true,
      polylineOptions: {
        strokeColor: isPosterMode ? activeTheme.lineColor : '#10b981', // Highlight color
        strokeWeight: isPosterMode ? posterConfig.lineWeight : 5,
        strokeOpacity: 0.9,
      },
    });
    rendererRef.current = renderer;

    const directionsService = new routesLib.DirectionsService();

    // Geocode origin, waypoints, and destination first to get clean coordinates
    Promise.all([
      geocodeAddress(origin),
      ...activeWaypoints.map((w) => geocodeAddress(w)),
      geocodeAddress(destination)
    ]).then((coordsList) => {
      const originCoord = coordsList[0];
      const destCoord = coordsList[coordsList.length - 1];
      const wpCoords = coordsList.slice(1, coordsList.length - 1);

      const requestRoute = (mode: google.maps.TravelMode) => {
        try {
          directionsService.route(
            {
              origin: originCoord,
              destination: destCoord,
              waypoints: wpCoords.map((c) => ({ location: c, stopover: true })),
              travelMode: mode,
            },
            (result, status) => {
              if (status === 'OK' && result) {
                renderer.setDirections(result);

                const route = result.routes[0];
                if (route && route.bounds) {
                  const bottomPadding = (isPosterMode && posterConfig.showElevation) ? 120 : 40;
                  map.fitBounds(route.bounds, {
                    top: 40,
                    bottom: bottomPadding,
                    left: 40,
                    right: 40
                  });
                }

                // Compute total distance and duration from legs
                let totalMeters = 0;
                let totalSeconds = 0;
                if (route && route.legs) {
                  route.legs.forEach((leg) => {
                    totalMeters += leg.distance?.value ?? 0;
                    totalSeconds += leg.duration?.value ?? 0;
                  });
                }

                const distanceKm = (totalMeters / 1000).toFixed(1);
                const calculatedDurationSeconds = mode === google.maps.TravelMode.BICYCLING ? totalSeconds : totalMeters / 5;
                const hoursTotal = (calculatedDurationSeconds / 3600).toFixed(1);

                setRouteMetrics({
                  distanceText: `${distanceKm} km`,
                  durationText: `${hoursTotal} hrs`,
                  distanceValue: totalMeters,
                  durationValue: calculatedDurationSeconds,
                });

                // Fallback local deterministic elevation generator for live route overview_path
                const generateDeterministicLiveElevation = () => {
                  if (!route || !route.overview_path) return;
                  const points = [];
                  const samples = 30;
                  const totalKm = totalMeters / 1000;
                  const pathLength = route.overview_path.length;
                  
                  for (let i = 0; i < samples; i++) {
                    const fraction = i / (samples - 1);
                    const ptIndex = Math.min(
                      pathLength - 1,
                      Math.floor(fraction * (pathLength - 1))
                    );
                    const pt = route.overview_path[ptIndex] || route.overview_path[0];
                    const km = parseFloat((totalKm * fraction).toFixed(1));
                    const elevation = getDeterministicElevation(pt.lat(), pt.lng(), fraction);
                    points.push({ km, elevation });
                  }
                  if (setElevationData) setElevationData(points);
                  if (setIsElevationSimulated) setIsElevationSimulated(true);

                  if (setRoutePathCoords && route.overview_path) {
                    const pathPts = route.overview_path.map((pt, idx) => ({
                      lat: pt.lat(),
                      lng: pt.lng(),
                      ele: getDeterministicElevation(pt.lat(), pt.lng(), idx / (route.overview_path.length - 1 || 1))
                    }));
                    setRoutePathCoords(pathPts);
                  }
                };

                // Query Google Elevation service for active route coordinates
                if (route && route.overview_path && route.overview_path.length > 0) {
                  try {
                    const elevator = new google.maps.ElevationService();
                    elevator.getElevationAlongPath(
                      {
                        path: route.overview_path,
                        samples: 30,
                      },
                      (elevationResults, elevationStatus) => {
                        if (elevationStatus === 'OK' && elevationResults) {
                          const points = elevationResults.map((res, idx) => {
                            const km = parseFloat(((totalMeters / 1000) * (idx / (elevationResults.length - 1))).toFixed(1));
                            return {
                              km,
                              elevation: Math.round(res.elevation),
                            };
                          });
                          if (setElevationData) setElevationData(points);
                          if (setIsElevationSimulated) setIsElevationSimulated(false);

                          if (setRoutePathCoords) {
                            const fullCoords = elevationResults.map((res) => ({
                              lat: res.location.lat(),
                              lng: res.location.lng(),
                              ele: Math.round(res.elevation * 10) / 10
                            }));
                            setRoutePathCoords(fullCoords);
                          }
                        } else {
                          console.warn('ElevationService failed:', elevationStatus, 'Falling back to deterministic simulation.');
                          generateDeterministicLiveElevation();
                        }
                      }
                    );
                  } catch (elevationErr) {
                    console.warn('ElevationService error:', elevationErr, 'Falling back to deterministic simulation.');
                    generateDeterministicLiveElevation();
                  }
                }

              } else if (
                mode === google.maps.TravelMode.BICYCLING &&
                status !== 'NOT_FOUND' &&
                status !== 'ZERO_RESULTS' &&
                status !== 'INVALID_REQUEST'
              ) {
                // Gracefully fall back to DRIVING if BICYCLING is not supported or fails (and not due to missing location)
                console.warn('BICYCLING travel mode failed, falling back to DRIVING...');
                requestRoute(google.maps.TravelMode.DRIVING);
              } else {
                console.warn(`Directions request status: ${status}. Triggering winding fallback simulation...`);
                if (status === 'REQUEST_DENIED' || status === 'OVER_QUERY_LIMIT') {
                  setIsApiRestricted(true);
                }
                runSimulatedFallback(coordsList);
              }
            }
          );
        } catch (e) {
          console.warn('Directions service call threw error:', e);
          setIsApiRestricted(true);
          runSimulatedFallback(coordsList);
        }
      };

      // Request with BICYCLING first
      requestRoute(google.maps.TravelMode.BICYCLING);
    }).catch((err) => {
      console.warn('Geocoding promise failed:', err);
      const fallbackCoords = [getHashLatLng(origin), ...activeWaypoints.map(getHashLatLng), getHashLatLng(destination)];
      setIsApiRestricted(true);
      runSimulatedFallback(fallbackCoords);
    });

    return () => {
      if (rendererRef.current) {
        rendererRef.current.setMap(null);
      }
      customPolylinesRef.current.forEach((p) => p.setMap(null));
      customPolylinesRef.current = [];
      customMarkersRef.current.forEach((m) => m.setMap(null));
      customMarkersRef.current = [];
    };
  }, [routesLib, map, origin, destination, waypoints, isPosterMode, posterConfig.theme, posterConfig.lineWeight, posterConfig.showMarkers, setRouteMetrics, setIsApiRestricted, setElevationData, setIsElevationSimulated, setRoutePathCoords]);

  return null;
}

// Controller component to route between live and simulated drawing
function RouteDisplay({
  origin,
  destination,
  waypoints,
  setRouteMetrics,
  isPosterMode,
  posterConfig,
  isApiRestricted,
  setIsApiRestricted,
  setElevationData,
  setIsElevationSimulated,
  setRoutePathCoords,
}: {
  origin: string;
  destination: string;
  waypoints: string[];
  setRouteMetrics: (metrics: { distanceText: string; durationText: string; distanceValue: number; durationValue: number }) => void;
  isPosterMode: boolean;
  posterConfig: PosterConfig;
  isApiRestricted: boolean;
  setIsApiRestricted: (val: boolean) => void;
  setElevationData?: React.Dispatch<React.SetStateAction<{ km: number; elevation: number }[]>>;
  setIsElevationSimulated?: (val: boolean) => void;
  setRoutePathCoords?: (coords: { lat: number; lng: number; ele?: number }[]) => void;
}) {
  if (isApiRestricted) {
    return (
      <SimulatedRouteDisplay
        origin={origin}
        destination={destination}
        waypoints={waypoints}
        setRouteMetrics={setRouteMetrics}
        isPosterMode={isPosterMode}
        posterConfig={posterConfig}
        setElevationData={setElevationData}
        setIsElevationSimulated={setIsElevationSimulated}
        setRoutePathCoords={setRoutePathCoords}
      />
    );
  }

  return (
    <LiveRouteDisplay
      origin={origin}
      destination={destination}
      waypoints={waypoints}
      setRouteMetrics={setRouteMetrics}
      isPosterMode={isPosterMode}
      posterConfig={posterConfig}
      setIsApiRestricted={setIsApiRestricted}
      setElevationData={setElevationData}
      setIsElevationSimulated={setIsElevationSimulated}
      setRoutePathCoords={setRoutePathCoords}
    />
  );
}

export default function App() {
  const [apiKey, setApiKey] = useState<string>(INITIAL_API_KEY);

  useEffect(() => {
    // If no static key is present, retrieve from backend /api/maps-config
    if (!apiKey || apiKey === 'YOUR_API_KEY' || apiKey === 'MY_GOOGLE_MAPS_PLATFORM_KEY') {
      fetch('/api/maps-config')
        .then((res) => res.json())
        .then((data) => {
          if (data.apiKey) {
            setApiKey(data.apiKey);
          }
        })
        .catch((err) => {
          console.warn('Could not fetch maps config:', err);
        });
    }
  }, [apiKey]);

  const hasValidKey = Boolean(apiKey) && apiKey !== 'YOUR_API_KEY' && apiKey !== 'MY_GOOGLE_MAPS_PLATFORM_KEY';

  // Track if API restrictions require fallback simulation.
  // By default, use the actual route if a valid key is provided; otherwise, run in simulation mode.
  const [isApiRestricted, setIsApiRestricted] = useState(!hasValidKey);

  useEffect(() => {
    if (hasValidKey) {
      setIsApiRestricted(false);
    }
  }, [hasValidKey]);

  // Universal URL generator to load navigation directly inside the mobile app or web Google Maps with custom travel mode and waypoints
  const getGoogleMapsUrl = () => {
    const baseUrl = 'https://www.google.com/maps/dir/?api=1';
    const params = new URLSearchParams();
    params.append('origin', activeOrigin);
    params.append('destination', activeDestination);
    params.append('travelmode', 'bicycling');
    
    const activeWps = activeWaypoints.filter((w) => w.trim() !== '');
    if (activeWps.length > 0) {
      params.append('waypoints', activeWps.join('|'));
    }
    
    return `${baseUrl}&${params.toString()}`;
  };

  // --- 1. Load Persisted State from LocalStorage ---
  const [goals, setGoals] = useState<PersonalGoal>(() => {
    const saved = localStorage.getItem('velopath_goals');
    return saved ? { ...defaultGoals, ...JSON.parse(saved) } : defaultGoals;
  });

  const [activePage, setActivePage] = useState<'planner' | 'poster' | 'library' | 'profile'>('planner');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [origin, setOrigin] = useState(() => localStorage.getItem('velopath_origin') || 'Cobourg, ON');
  const [destination, setDestination] = useState(() => localStorage.getItem('velopath_destination') || 'Ferris Provincial Park, Campbellford, ON');
  const [waypoints, setWaypoints] = useState<string[]>(() => {
    const saved = localStorage.getItem('velopath_waypoints');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((wp: string) => !wp.toLowerCase().includes('rice lake'));
        }
      } catch (e) {
        // fallback
      }
    }
    return [];
  });

  // Active route parameters currently rendered on the map
  const [activeOrigin, setActiveOrigin] = useState(() => origin);
  const [activeDestination, setActiveDestination] = useState(() => destination);
  const [activeWaypoints, setActiveWaypoints] = useState<string[]>(() => waypoints);

  const handleLoadRoute = () => {
    setActiveOrigin(origin);
    setActiveDestination(destination);
    setActiveWaypoints([...waypoints]);
  };

  const isRouteDirty =
    origin !== activeOrigin ||
    destination !== activeDestination ||
    waypoints.length !== activeWaypoints.length ||
    waypoints.some((wp, idx) => wp !== activeWaypoints[idx]);

  const [routeMetrics, setRouteMetrics] = useState({
    distanceText: '0 km',
    durationText: '0 hrs',
    distanceValue: 0,
    durationValue: 0,
  });

  const [smartStops, setSmartStops] = useState<SmartStop[]>(() => {
    const saved = localStorage.getItem('velopath_smart_stops');
    return saved ? JSON.parse(saved) : [];
  });

  const [gearCategories, setGearCategories] = useState<GearCategory[]>(() => {
    const saved = localStorage.getItem('velopath_gear_categories');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeTab, setActiveTab] = useState<'plan' | 'stops' | 'gear'>('plan');
  const [posterConfig, setPosterConfig] = useState<PosterConfig>(() => {
    const saved = localStorage.getItem('velopath_poster_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const validThemes = Object.keys(posterThemes);
        const theme = (parsed.theme && validThemes.includes(parsed.theme))
          ? parsed.theme
          : defaultPosterConfig.theme;
        return { ...defaultPosterConfig, ...parsed, theme };
      } catch (e) {
        // fallback
      }
    }
    return defaultPosterConfig;
  });

  // Saved trips persistence state
  const [savedTrips, setSavedTrips] = useState<TripRoute[]>(() => {
    const saved = localStorage.getItem('velopath_saved_trips');
    return saved ? JSON.parse(saved) : [];
  });
  const [tripNameInput, setTripNameInput] = useState('');
  const [isSavingTrip, setIsSavingTrip] = useState(false);
  const [justSavedTripId, setJustSavedTripId] = useState<string | null>(null);

  // Import Google Maps Route Modal & Feedback State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importSuccessBanner, setImportSuccessBanner] = useState<{ message: string; stopCount: number } | null>(null);

  useEffect(() => {
    localStorage.setItem('velopath_saved_trips', JSON.stringify(savedTrips));
  }, [savedTrips]);

  const handleSaveCurrentTrip = () => {
    if (!activeOrigin || !activeDestination) return;
    
    const name = tripNameInput.trim() || `${activeOrigin.split(',')[0]} to ${activeDestination.split(',')[0]}`;
    const newTrip: TripRoute = {
      id: Math.random().toString(36).substring(2, 9),
      name,
      origin: activeOrigin,
      destination: activeDestination,
      waypoints: [...activeWaypoints],
      distanceText: routeMetrics.distanceText || '0 km',
      durationText: routeMetrics.durationText || '0 hrs',
      distanceValue: routeMetrics.distanceValue || 0,
      durationValue: routeMetrics.durationValue || 0,
      dateCreated: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    };

    setSavedTrips((prev) => [newTrip, ...prev]);
    setTripNameInput('');
    setIsSavingTrip(false);
    setJustSavedTripId(newTrip.id);
    
    // Clear success banner after 3 seconds
    setTimeout(() => {
      setJustSavedTripId(null);
    }, 3000);
  };

  const handleLoadTrip = (trip: TripRoute) => {
    setOrigin(trip.origin);
    setDestination(trip.destination);
    setWaypoints(trip.waypoints);
    setActiveOrigin(trip.origin);
    setActiveDestination(trip.destination);
    setActiveWaypoints(trip.waypoints);
    setRouteMetrics({
      distanceText: trip.distanceText,
      durationText: trip.durationText,
      distanceValue: trip.distanceValue,
      durationValue: trip.durationValue
    });
    setActivePage('planner');
  };

  const handleDeleteTrip = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent loading the trip when deleting
    setSavedTrips((prev) => prev.filter(t => t.id !== id));
    if (editingTripId === id) {
      setEditingTripId(null);
    }
  };

  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [editingTripName, setEditingTripName] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleStartEditTrip = (trip: TripRoute, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTripId(trip.id);
    setEditingTripName(trip.name);
  };

  const handleSaveEditedTrip = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedTrips((prev) =>
      prev.map((t) => (t.id === id ? { ...t, name: editingTripName.trim() || t.name } : t))
    );
    setEditingTripId(null);
    setSuccessMessage('Trip name updated!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleUpdateTripRouteToCurrent = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeOrigin || !activeDestination) return;
    setSavedTrips((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          return {
            ...t,
            origin: activeOrigin,
            destination: activeDestination,
            waypoints: [...activeWaypoints],
            distanceText: routeMetrics.distanceText || '0 km',
            durationText: routeMetrics.durationText || '0 hrs',
            distanceValue: routeMetrics.distanceValue || 0,
            durationValue: routeMetrics.durationValue || 0,
          };
        }
        return t;
      })
    );
    setSuccessMessage('Route updated to active map route!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Elevation Profile Chart Data (live or deterministic simulation)
  const [elevationData, setElevationData] = useState<{ km: number; elevation: number }[]>([]);
  const [isElevationSimulated, setIsElevationSimulated] = useState(true);
  const [routePathCoords, setRoutePathCoords] = useState<{ lat: number; lng: number; ele?: number }[]>([]);

  const handleDownloadGpx = () => {
    if (!activeOrigin || !activeDestination) return;

    let pointsToExport = routePathCoords;
    if (!pointsToExport || pointsToExport.length === 0) {
      const activeWps = activeWaypoints.filter((w) => w.trim() !== '');
      const fallbackCoords = [
        getHashLatLng(activeOrigin),
        ...activeWps.map(getHashLatLng),
        getHashLatLng(activeDestination),
      ];
      pointsToExport = fallbackCoords.map((c, idx) => ({
        ...c,
        ele: getDeterministicElevation(c.lat, c.lng, idx / (fallbackCoords.length - 1 || 1)),
      }));
    }

    const title = `${activeOrigin.split(',')[0]} to ${activeDestination.split(',')[0]}`;
    const gpxXml = generateGpxXml(title, pointsToExport, activeOrigin, activeDestination);

    const blob = new Blob([gpxXml], { type: 'application/gpx+xml;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = 'route.gpx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 1000);
  };

  // Track waypoint input values
  const [newWaypointInput, setNewWaypointInput] = useState('');

  // Save changes to localStorage
  const handleSaveGoals = (updatedGoals: PersonalGoal) => {
    setGoals(updatedGoals);
    localStorage.setItem('velopath_goals', JSON.stringify(updatedGoals));
  };

  useEffect(() => {
    localStorage.setItem('velopath_origin', origin);
    localStorage.setItem('velopath_destination', destination);
    localStorage.setItem('velopath_waypoints', JSON.stringify(waypoints));
  }, [origin, destination, waypoints]);

  useEffect(() => {
    localStorage.setItem('velopath_poster_config', JSON.stringify(posterConfig));
  }, [posterConfig]);

  // Add a waypoint
  const handleAddWaypoint = () => {
    if (newWaypointInput.trim() && waypoints.length < 5) {
      setWaypoints([...waypoints, newWaypointInput.trim()]);
      setNewWaypointInput('');
    }
  };

  // Add a waypoint from an AI-generated smart stop suggestion
  const handleAddWaypointFromStop = (stopName: string) => {
    const trimmed = stopName.trim();
    if (!trimmed) return;
    if (waypoints.length >= 5) return;
    if (waypoints.some(wp => wp.toLowerCase().trim() === trimmed.toLowerCase())) return;
    setWaypoints([...waypoints, trimmed]);
  };

  // Remove a waypoint
  const handleRemoveWaypoint = (index: number) => {
    setWaypoints(waypoints.filter((_, idx) => idx !== index));
  };

  // Import Google Maps route handler
  const handleImportGoogleMapsRoute = (imported: {
    origin: string;
    destination: string;
    waypoints: string[];
  }) => {
    setOrigin(imported.origin);
    setDestination(imported.destination);
    setWaypoints(imported.waypoints);

    setActiveOrigin(imported.origin);
    setActiveDestination(imported.destination);
    setActiveWaypoints([...imported.waypoints]);

    setIsApiRestricted(false);
    setActivePage('planner');

    const totalStops = 2 + imported.waypoints.length;
    setImportSuccessBanner({
      message: `Successfully imported route with ${imported.waypoints.length} intermediate stop${imported.waypoints.length === 1 ? '' : 's'}!`,
      stopCount: totalStops,
    });

    setTimeout(() => {
      setImportSuccessBanner(null);
    }, 5000);
  };

  return (
    <APIProvider apiKey={apiKey} version="weekly" libraries={['places']} region="CA" language="en">
      <div className="min-h-screen bg-[#F8F5F2] text-[#3D3B38]" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
      
      {/* 1. Header Toolbar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[#E5E0D8] px-4 lg:px-6 py-3.5 flex items-center justify-between gap-3">
        {/* Brand Logo / Home link */}
        <button
          onClick={() => {
            setActivePage('planner');
            setIsMobileMenuOpen(false);
          }}
          className="flex items-center gap-3 text-left cursor-pointer group focus:outline-none"
          id="brand-logo-btn"
        >
          <div className="w-9 h-9 bg-[#5A6348]/10 border border-[#5A6348]/20 rounded-xl flex items-center justify-center group-hover:bg-[#5A6348]/20 transition">
            <Bike className="w-5 h-5 text-[#5A6348]" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[#2D3025] tracking-tight leading-none group-hover:text-[#5A6348] transition">VeloPath</h1>
            <p className="text-[10px] text-[#8A847C] font-semibold tracking-wider uppercase mt-1">Bikepacking Expedition Planner</p>
          </div>
        </button>

        {/* Desktop Header Navigation Items: Planner, Poster Mode, Library, Profile */}
        <nav className="hidden md:flex items-center gap-1.5 lg:gap-2">
          {/* Planner Link */}
          <button
            onClick={() => setActivePage('planner')}
            className={`flex items-center gap-1.5 text-xs font-bold py-2 px-3.5 rounded-xl transition cursor-pointer ${
              activePage === 'planner'
                ? 'bg-[#5A6348] text-white shadow-sm'
                : 'bg-white hover:bg-[#FAF9F6] text-[#3D3B38] border border-[#E5E0D8]'
            }`}
            id="nav-planner-btn"
          >
            <RouteIcon className="w-4 h-4" />
            <span>Planner</span>
          </button>

          {/* Poster Mode Link */}
          <button
            onClick={() => {
              const cleanOrigin = activeOrigin ? activeOrigin.split(',')[0] : 'Origin';
              const cleanDest = activeDestination ? activeDestination.split(',')[0] : 'Destination';
              setPosterConfig(prev => ({
                ...prev,
                title: `${cleanOrigin} to ${cleanDest}`,
                subtitle: `${routeMetrics.distanceText || 'Custom Route'} • ${goals.bikeType}`
              }));
              setActivePage('poster');
            }}
            disabled={!activeOrigin || !activeDestination || routeMetrics.distanceValue === 0}
            className={`flex items-center gap-1.5 text-xs font-bold py-2 px-3.5 rounded-xl transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              activePage === 'poster'
                ? 'bg-[#5A6348] text-white shadow-sm'
                : 'bg-white hover:bg-[#FAF9F6] text-[#3D3B38] border border-[#E5E0D8]'
            }`}
            id="nav-poster-btn"
            title="Create a custom souvenir route poster"
          >
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Poster Mode</span>
          </button>

          {/* Library Link */}
          <button
            onClick={() => setActivePage('library')}
            className={`flex items-center gap-1.5 text-xs font-bold py-2 px-3.5 rounded-xl transition cursor-pointer ${
              activePage === 'library'
                ? 'bg-[#5A6348] text-white shadow-sm'
                : 'bg-white hover:bg-[#FAF9F6] text-[#3D3B38] border border-[#E5E0D8]'
            }`}
            id="nav-library-btn"
          >
            <Bookmark className="w-4 h-4" />
            <span>Library</span>
            {savedTrips.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activePage === 'library' ? 'bg-white/20 text-white' : 'bg-[#5A6348]/10 text-[#5A6348]'
              }`}>
                {savedTrips.length}
              </span>
            )}
          </button>

          {/* Profile Link */}
          <button
            onClick={() => setActivePage('profile')}
            className={`flex items-center gap-1.5 text-xs font-bold py-2 px-3.5 rounded-xl transition cursor-pointer ${
              activePage === 'profile'
                ? 'bg-[#5A6348] text-white shadow-sm'
                : 'bg-white hover:bg-[#FAF9F6] text-[#3D3B38] border border-[#E5E0D8]'
            }`}
            id="nav-profile-btn"
          >
            <Bike className="w-4 h-4" />
            <span>Profile</span>
          </button>

          {/* Quick Import from Google Maps Header Action */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-bold py-2 px-3.5 rounded-xl transition cursor-pointer bg-white hover:bg-[#FAF9F6] text-[#5A6348] border border-[#5A6348]/40 hover:border-[#5A6348] shadow-xs"
            id="header-import-gmaps-btn"
            title="Import route from Google Maps share link or URL"
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Import Google Maps</span>
          </button>
        </nav>

        {/* Mobile Hamburger Toggle Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-[#E5E0D8] text-[#3D3B38] hover:bg-[#FAF9F6] active:bg-[#F1EDE7] transition cursor-pointer shadow-sm"
          id="mobile-menu-toggle-btn"
          aria-label="Toggle navigation menu"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Navigation Drawer / Slide-Over Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-start pt-[65px]">
          {/* Semi-transparent Backdrop */}
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Drawer Menu Panel */}
          <div className="relative z-10 w-full bg-[#F8F5F2] border-b border-[#E5E0D8] p-4 shadow-xl animate-in slide-in-from-top-4 duration-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E0D8]">
              <span className="text-[11px] font-bold text-[#8A847C] uppercase tracking-wider">Navigation Menu</span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 bg-white border border-[#E5E0D8] rounded-xl text-[#8A847C] hover:text-[#3D3B38] transition cursor-pointer"
                id="close-mobile-menu-btn"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {/* Mobile Planner Button */}
              <button
                onClick={() => {
                  setActivePage('planner');
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center justify-between p-3 rounded-xl font-bold text-sm transition cursor-pointer ${
                  activePage === 'planner'
                    ? 'bg-[#5A6348] text-white shadow-sm'
                    : 'bg-white hover:bg-[#FAF9F6] text-[#3D3B38] border border-[#E5E0D8]'
                }`}
                id="mobile-nav-planner-btn"
              >
                <div className="flex items-center gap-3">
                  <RouteIcon className="w-5 h-5" />
                  <span>Route Planner</span>
                </div>
                {activePage === 'planner' && <Check className="w-4 h-4" />}
              </button>

              {/* Mobile Poster Mode Button */}
              <button
                onClick={() => {
                  const cleanOrigin = activeOrigin ? activeOrigin.split(',')[0] : 'Origin';
                  const cleanDest = activeDestination ? activeDestination.split(',')[0] : 'Destination';
                  setPosterConfig(prev => ({
                    ...prev,
                    title: `${cleanOrigin} to ${cleanDest}`,
                    subtitle: `${routeMetrics.distanceText || 'Custom Route'} • ${goals.bikeType}`
                  }));
                  setActivePage('poster');
                  setIsMobileMenuOpen(false);
                }}
                disabled={!activeOrigin || !activeDestination || routeMetrics.distanceValue === 0}
                className={`flex items-center justify-between p-3 rounded-xl font-bold text-sm transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  activePage === 'poster'
                    ? 'bg-[#5A6348] text-white shadow-sm'
                    : 'bg-white hover:bg-[#FAF9F6] text-[#3D3B38] border border-[#E5E0D8]'
                }`}
                id="mobile-nav-poster-btn"
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
                  <span>Souvenir Poster Mode</span>
                </div>
                {activePage === 'poster' && <Check className="w-4 h-4" />}
              </button>

              {/* Mobile Library Button */}
              <button
                onClick={() => {
                  setActivePage('library');
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center justify-between p-3 rounded-xl font-bold text-sm transition cursor-pointer ${
                  activePage === 'library'
                    ? 'bg-[#5A6348] text-white shadow-sm'
                    : 'bg-white hover:bg-[#FAF9F6] text-[#3D3B38] border border-[#E5E0D8]'
                }`}
                id="mobile-nav-library-btn"
              >
                <div className="flex items-center gap-3">
                  <Bookmark className="w-5 h-5" />
                  <span>Saved Trips Library</span>
                </div>
                <div className="flex items-center gap-2">
                  {savedTrips.length > 0 && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      activePage === 'library' ? 'bg-white/20 text-white' : 'bg-[#5A6348]/10 text-[#5A6348]'
                    }`}>
                      {savedTrips.length}
                    </span>
                  )}
                  {activePage === 'library' && <Check className="w-4 h-4" />}
                </div>
              </button>

              {/* Mobile Profile Button */}
              <button
                onClick={() => {
                  setActivePage('profile');
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center justify-between p-3 rounded-xl font-bold text-sm transition cursor-pointer ${
                  activePage === 'profile'
                    ? 'bg-[#5A6348] text-white shadow-sm'
                    : 'bg-white hover:bg-[#FAF9F6] text-[#3D3B38] border border-[#E5E0D8]'
                }`}
                id="mobile-nav-profile-btn"
              >
                <div className="flex items-center gap-3">
                  <Bike className="w-5 h-5" />
                  <span>Rider Profile & Setup</span>
                </div>
                {activePage === 'profile' && <Check className="w-4 h-4" />}
              </button>

              {/* Mobile Import Route Button */}
              <button
                onClick={() => {
                  setIsImportModalOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center justify-between p-3 rounded-xl font-bold text-sm bg-[#5A6348]/10 hover:bg-[#5A6348]/20 text-[#5A6348] border border-[#5A6348]/30 transition cursor-pointer"
                id="mobile-nav-import-btn"
              >
                <div className="flex items-center gap-3">
                  <LinkIcon className="w-5 h-5" />
                  <span>Import from Google Maps</span>
                </div>
                <Sparkles className="w-4 h-4 text-amber-500" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Page Navigation Engine */}
      {activePage === 'poster' && (
        <PosterMode
          route={{
            id: 'poster-route',
            name: `${activeOrigin.split(',')[0]} to ${activeDestination.split(',')[0]}`,
            origin: activeOrigin,
            destination: activeDestination,
            waypoints: activeWaypoints,
            distanceText: routeMetrics.distanceText,
            durationText: routeMetrics.durationText,
            distanceValue: routeMetrics.distanceValue,
            durationValue: routeMetrics.durationValue,
            dateCreated: new Date().toLocaleDateString(),
          }}
          posterConfig={posterConfig}
          setPosterConfig={setPosterConfig}
          onBack={() => setActivePage('planner')}
          elevationData={elevationData}
        >
          {/* Poster Custom-Styled Non-Interactive Map */}
          <div className="w-full h-full">
            <Map
              defaultCenter={{ lat: 43.96, lng: -78.16 }}
              defaultZoom={9}
              styles={getPosterMapStyles(posterConfig.theme, posterConfig.showCityLabels)}
              disableDefaultUI={true}
              gestureHandling="none"
              className="w-full h-full"
              id="poster-map-view"
            >
              <RouteDisplay
                origin={activeOrigin}
                destination={activeDestination}
                waypoints={activeWaypoints}
                setRouteMetrics={setRouteMetrics}
                isPosterMode={true}
                posterConfig={posterConfig}
                isApiRestricted={isApiRestricted}
                setIsApiRestricted={setIsApiRestricted}
                setElevationData={setElevationData}
                setIsElevationSimulated={setIsElevationSimulated}
              />
            </Map>
          </div>
        </PosterMode>
      )}

      {activePage === 'profile' && (
        <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6 min-h-[calc(100vh-73px)] animate-in fade-in duration-200">
          <div className="bg-white border border-[#E5E0D8] rounded-2xl p-5 sm:p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-[#5A6348]/10 border border-[#5A6348]/20 rounded-2xl flex items-center justify-center shrink-0">
                <Bike className="w-6 h-6 text-[#5A6348]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#2D3025]">Rider Profile & Goals</h2>
                <p className="text-xs text-[#8A847C] font-medium">Customize your bike setup, experience level, and target expedition goals</p>
              </div>
            </div>
            <button
              onClick={() => setActivePage('planner')}
              className="flex items-center gap-1.5 bg-[#FAF9F6] hover:bg-[#F1EDE7] text-[#3D3B38] border border-[#E5E0D8] text-xs font-bold py-2 px-3.5 rounded-xl transition cursor-pointer"
            >
              <RouteIcon className="w-4 h-4 text-[#5A6348]" />
              Return to Route Planner
            </button>
          </div>

          <GoalOnboarding goals={goals} onSaveGoals={handleSaveGoals} />
        </div>
      )}

      {activePage === 'library' && (
        <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6 min-h-[calc(100vh-73px)] animate-in fade-in duration-200">
          <div className="bg-white border border-[#E5E0D8] rounded-2xl p-5 sm:p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-[#5A6348]/10 border border-[#5A6348]/20 rounded-2xl flex items-center justify-center shrink-0">
                <Bookmark className="w-6 h-6 text-[#5A6348]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-[#2D3025]">Saved Trips Library</h2>
                  <span className="text-xs bg-[#5A6348]/10 text-[#5A6348] font-bold px-2.5 py-0.5 rounded-full">
                    {savedTrips.length} Saved
                  </span>
                </div>
                <p className="text-xs text-[#8A847C] font-medium mt-0.5">Manage, review, and load your custom bikepacking routes</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-1.5 bg-[#FAF9F6] hover:bg-[#F1EDE7] text-[#5A6348] border border-[#5A6348]/30 hover:border-[#5A6348] text-xs font-bold py-2.5 px-3.5 rounded-xl transition cursor-pointer"
                id="library-import-gmaps-btn"
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Import Google Maps</span>
              </button>
              <button
                onClick={() => setActivePage('planner')}
                className="flex items-center gap-1.5 bg-[#5A6348] hover:bg-[#4A523B] text-white text-xs font-bold py-2.5 px-4 rounded-xl transition shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Plan New Route
              </button>
            </div>
          </div>

          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs rounded-xl p-3 flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
              <BookmarkCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{successMessage}</span>
            </div>
          )}

          {savedTrips.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-[#E5E0D8] rounded-2xl p-12 text-center space-y-3 max-w-md mx-auto my-8">
              <Bookmark className="w-12 h-12 text-[#8A847C]/40 mx-auto" />
              <h3 className="text-sm font-bold text-[#3D3B38]">No Saved Trips Yet</h3>
              <p className="text-xs text-[#8A847C] leading-relaxed">
                Build your bicycling track in the Route Planner or import an existing route from Google Maps.
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="bg-[#FAF9F6] hover:bg-[#F1EDE7] text-[#5A6348] border border-[#5A6348]/30 text-xs font-bold py-2.5 px-4 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  Import from Google Maps
                </button>
                <button
                  onClick={() => setActivePage('planner')}
                  className="bg-[#5A6348] hover:bg-[#4A523B] text-white text-xs font-bold py-2.5 px-4 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Plan New Route
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedTrips.map((trip) => {
                const isCurrentActive = origin === trip.origin && destination === trip.destination;
                const isEditing = editingTripId === trip.id;

                return (
                  <div
                    key={trip.id}
                    className={`border rounded-2xl p-4 flex flex-col justify-between transition ${
                      isEditing
                        ? 'bg-white border-[#5A6348] shadow-md ring-1 ring-[#5A6348]'
                        : isCurrentActive
                        ? 'bg-[#5A6348]/5 border-[#5A6348] shadow-sm'
                        : 'bg-white border-[#E5E0D8] hover:border-[#8A847C] shadow-sm hover:shadow'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        {isEditing ? (
                          <div className="space-y-2 flex-1 text-left">
                            <label className="block text-[9px] font-bold uppercase tracking-wider text-[#8A847C]">Edit Trip Name</label>
                            <input
                              type="text"
                              value={editingTripName}
                              onChange={(e) => setEditingTripName(e.target.value)}
                              className="w-full bg-white border border-[#E5E0D8] rounded-lg px-2.5 py-1.5 text-xs text-[#3D3B38] focus:outline-none focus:border-[#5A6348] transition"
                              id={`edit-trip-name-${trip.id}`}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => handleSaveEditedTrip(trip.id, e)}
                                className="flex-1 bg-[#5A6348] hover:bg-[#4A523B] text-white text-[10px] font-bold py-1.5 px-2.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" /> Save
                              </button>
                              <button
                                onClick={() => setEditingTripId(null)}
                                className="bg-white border border-[#E5E0D8] text-[#8A847C] hover:text-[#3D3B38] text-[10px] font-bold py-1.5 px-2.5 rounded-lg transition cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1 flex-1">
                            <h4 className="text-sm font-bold text-[#3D3B38] leading-tight">
                              {trip.name}
                            </h4>
                            <p className="text-[11px] text-[#8A847C] font-mono flex items-center gap-1 font-semibold">
                              {trip.distanceText} • {trip.durationText}
                            </p>
                          </div>
                        )}

                        {!isEditing && (
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={(e) => handleStartEditTrip(trip, e)}
                              className="p-1.5 bg-[#FAF9F6] hover:bg-[#F1EDE7] border border-[#E5E0D8] text-[#8A847C] hover:text-[#5A6348] rounded-lg transition cursor-pointer"
                              title="Rename trip"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteTrip(trip.id, e)}
                              className="p-1.5 bg-[#FAF9F6] hover:bg-red-50 border border-[#E5E0D8] hover:border-red-200 text-[#8A847C] hover:text-red-600 rounded-lg transition cursor-pointer"
                              title="Delete trip"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Route Details */}
                      <div className="text-xs text-[#8A847C] space-y-1.5 bg-[#FAF9F6] border border-[#E5E0D8]/60 rounded-xl p-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-[#5A6348] w-10 shrink-0">From:</span>
                          <span className="truncate font-medium text-[#3D3B38]">{trip.origin}</span>
                        </div>
                        {trip.waypoints && trip.waypoints.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-[#A67C52] w-10 shrink-0">Via:</span>
                            <span className="truncate font-medium text-[#3D3B38]">{trip.waypoints.join(', ')}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-[#A67C52] w-10 shrink-0">To:</span>
                          <span className="truncate font-medium text-[#3D3B38]">{trip.destination}</span>
                        </div>
                      </div>

                      {isEditing && activeOrigin && activeDestination && (
                        <button
                          onClick={(e) => handleUpdateTripRouteToCurrent(trip.id, e)}
                          className="w-full flex items-center justify-center gap-1.5 bg-[#FAF9F6] hover:bg-[#FAF9F6]/80 border border-[#E5E0D8] text-[#5A6348] text-xs font-bold py-2 px-3 rounded-lg transition cursor-pointer mt-2"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Overwrite with Current Active Route
                        </button>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="mt-4 pt-3 border-t border-[#E5E0D8] flex items-center justify-between gap-2">
                        <span className="text-[10px] text-[#8A847C] font-semibold">Saved {trip.dateCreated}</span>
                        <button
                          onClick={() => handleLoadTrip(trip)}
                          className="bg-[#5A6348] hover:bg-[#4A523B] text-white text-xs font-bold py-1.5 px-3 rounded-xl transition cursor-pointer flex items-center gap-1 shadow-sm"
                        >
                          Load Route <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activePage === 'planner' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[calc(100vh-73px)]">
          
          {/* --- LEFT HAND EDIT PANEL (5 cols) --- */}
          <div className="lg:col-span-5 border-r border-[#E5E0D8] bg-[#F8F5F2] flex flex-col justify-between max-h-[calc(100vh-73px)] overflow-y-auto p-4 lg:p-6 space-y-6">
            
            <div className="space-y-6">
              {/* Navigation Tabs */}
              <div className="flex bg-[#FAF9F6] p-1 rounded-xl border border-[#E5E0D8] gap-1">
                <button
                  onClick={() => setActiveTab('plan')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg transition ${
                    activeTab === 'plan' ? 'bg-white text-[#5A6348] border border-[#E5E0D8] shadow-sm' : 'text-[#8A847C] hover:text-[#3D3B38]'
                  }`}
                >
                  <RouteIcon className="w-3.5 h-3.5" />
                  Route Builder
                </button>
                <button
                  onClick={() => setActiveTab('stops')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg transition ${
                    activeTab === 'stops' ? 'bg-white text-[#5A6348] border border-[#E5E0D8] shadow-sm' : 'text-[#8A847C] hover:text-[#3D3B38]'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  AI Stops
                </button>
                <button
                  onClick={() => setActiveTab('gear')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg transition ${
                    activeTab === 'gear' ? 'bg-white text-[#5A6348] border border-[#E5E0D8] shadow-sm' : 'text-[#8A847C] hover:text-[#3D3B38]'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  AI Gear
                </button>
              </div>

              {/* Interactive Tabs Panels */}
              {activeTab === 'plan' && (
                <div id="route-builder-panel" className="bg-white border border-[#E5E0D8] rounded-xl p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Navigation className="w-5 h-5 text-[#5A6348]" />
                      <h3 className="text-sm font-bold text-[#2D3025]">Trace Bicycling Track</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsImportModalOpen(true)}
                      className="flex items-center gap-1.5 text-[11px] font-bold text-[#5A6348] hover:text-[#4A523B] bg-[#5A6348]/10 hover:bg-[#5A6348]/20 px-2.5 py-1.5 rounded-lg transition cursor-pointer border border-[#5A6348]/20"
                      id="builder-import-gmaps-btn"
                      title="Import route from Google Maps share link or URL"
                    >
                      <LinkIcon className="w-3 h-3" />
                      <span>Import from Google Maps</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {/* Origin Input */}
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#8A847C] mb-1">Start Point</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-[#5A6348]" />
                        <AutocompleteInput
                          type="text"
                          value={origin}
                          onChange={setOrigin}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleLoadRoute();
                            }
                          }}
                          placeholder="e.g. Cobourg, ON"
                          className="w-full bg-[#FAF9F6] border border-[#E5E0D8] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#3D3B38] focus:outline-none focus:border-[#5A6348] transition"
                          id="origin-input"
                        />
                      </div>
                    </div>

                    {/* Waypoints List with Drag & Drop Reordering */}
                    {waypoints.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#8A847C]">
                            Waypoints (Max 5)
                          </label>
                          <span className="text-[10px] text-[#8A847C] font-medium">
                            Drag handle or use arrows to reorder
                          </span>
                        </div>
                        <WaypointList
                          waypoints={waypoints}
                          onChange={setWaypoints}
                          onRemove={handleRemoveWaypoint}
                        />
                      </div>
                    )}

                    {/* Add Waypoint Row */}
                    {waypoints.length < 5 && (
                      <div className="flex gap-2 pt-1">
                        <AutocompleteInput
                          type="text"
                          placeholder="Add waypoint (e.g. Rice Lake, ON)..."
                          value={newWaypointInput}
                          onChange={setNewWaypointInput}
                          onSelect={(address) => {
                            if (address.trim() && waypoints.length < 5) {
                              setWaypoints((prev) => [...prev, address.trim()]);
                              setNewWaypointInput('');
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleAddWaypoint();
                            }
                          }}
                          className="flex-1 bg-[#FAF9F6] border border-[#E5E0D8] rounded-lg px-3 py-1.5 text-xs text-[#3D3B38] placeholder-[#8A847C] focus:outline-none focus:border-[#5A6348] transition"
                          id="add-waypoint-input"
                        />
                        <button
                          onClick={handleAddWaypoint}
                          className="bg-white hover:bg-[#FAF9F6] border border-[#E5E0D8] text-[#3D3B38] text-xs px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add
                        </button>
                      </div>
                    )}

                    {/* Destination Input */}
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#8A847C] mb-1 font-sans">Destination</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-[#A67C52]" />
                        <AutocompleteInput
                          type="text"
                          value={destination}
                          onChange={setDestination}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleLoadRoute();
                            }
                          }}
                          placeholder="e.g. Ferris Provincial Park"
                          className="w-full bg-[#FAF9F6] border border-[#E5E0D8] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#3D3B38] focus:outline-none focus:border-[#5A6348] transition"
                          id="destination-input"
                        />
                      </div>
                    </div>

                    {/* Manual Load Route Button */}
                    <div className="pt-2 border-t border-[#E5E0D8]/80 space-y-1.5">
                      <button
                        type="button"
                        onClick={handleLoadRoute}
                        className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer ${
                          isRouteDirty
                            ? 'bg-[#5A6348] hover:bg-[#4A523B] text-white ring-2 ring-[#5A6348]/30 shadow-md'
                            : 'bg-[#5A6348] hover:bg-[#4A523B] text-white'
                        }`}
                        id="load-route-btn"
                      >
                        <Navigation className="w-4 h-4" />
                        {isRouteDirty ? 'Load New Route' : 'Load Route'}
                      </button>
                      <p className="text-[10px] text-center font-medium min-h-[16px] flex items-center justify-center">
                        {isRouteDirty ? (
                          <span className="text-[#A67C52] transition-colors">Route inputs changed. Click "Load New Route" to update map.</span>
                        ) : (
                          <span className="text-[#8A847C] transition-colors">Map route is loaded and up to date.</span>
                        )}
                      </p>
                    </div>

                    {/* Export to Google Maps App Integration */}
                    {activeOrigin && activeDestination && (
                      <div className="pt-4 border-t border-[#E5E0D8] mt-2 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#8A847C]">Navigation & Library</span>
                        
                        <div className="flex flex-col gap-2">
                          <div className="grid grid-cols-2 gap-2">
                            <a
                              href={getGoogleMapsUrl()}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-1.5 bg-[#5A6348] hover:bg-[#4A523B] text-white text-xs font-bold py-2.5 px-2.5 rounded-xl transition shadow-sm hover:shadow cursor-pointer text-center"
                              id="left-panel-export-maps-btn"
                            >
                              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">Google Maps</span>
                            </a>

                            <button
                              type="button"
                              onClick={handleDownloadGpx}
                              className="flex items-center justify-center gap-1.5 bg-white hover:bg-[#FAF9F6] border border-[#E5E0D8] text-[#3D3B38] hover:text-[#5A6348] text-xs font-bold py-2.5 px-2.5 rounded-xl transition shadow-sm hover:shadow cursor-pointer text-center"
                              id="left-panel-download-gpx-btn"
                            >
                              <Download className="w-3.5 h-3.5 text-[#5A6348] shrink-0" />
                              <span className="truncate">Download GPX</span>
                            </button>
                          </div>

                          {!isSavingTrip ? (
                            <button
                              onClick={() => {
                                setIsSavingTrip(true);
                                setTripNameInput(`${origin.split(',')[0]} to ${destination.split(',')[0]}`);
                              }}
                              className="w-full flex items-center justify-center gap-2 bg-white hover:bg-[#FAF9F6] border border-[#E5E0D8] text-[#3D3B38] text-xs font-bold py-2 px-4 rounded-xl transition shadow-sm hover:shadow cursor-pointer"
                              id="left-panel-toggle-save-btn"
                            >
                              <Bookmark className="w-4 h-4 text-[#5A6348]" />
                              Save Trip to Library
                            </button>
                          ) : (
                            <div className="bg-[#FAF9F6] border border-[#E5E0D8] rounded-xl p-3 space-y-3 animate-in fade-in duration-200 text-left">
                              <label className="block text-[9px] font-bold uppercase tracking-wider text-[#8A847C]">Trip Name</label>
                              <input
                                type="text"
                                value={tripNameInput}
                                onChange={(e) => setTripNameInput(e.target.value)}
                                placeholder="e.g. Summer Bikepacking Weekend"
                                className="w-full bg-white border border-[#E5E0D8] rounded-lg px-2.5 py-1.5 text-xs text-[#3D3B38] focus:outline-none focus:border-[#5A6348] transition"
                                id="save-trip-name-input"
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={handleSaveCurrentTrip}
                                  className="flex-1 bg-[#5A6348] hover:bg-[#4A523B] text-white text-[11px] font-bold py-1.5 px-3 rounded-lg transition cursor-pointer"
                                  id="confirm-save-trip-btn"
                                >
                                  Save Route
                                </button>
                                <button
                                  onClick={() => setIsSavingTrip(false)}
                                  className="bg-white hover:bg-[#FAF9F6] border border-[#E5E0D8] text-[#8A847C] hover:text-[#3D3B38] text-[11px] font-bold py-1.5 px-3 rounded-lg transition cursor-pointer"
                                  id="cancel-save-trip-btn"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

                          {justSavedTripId && (
                            <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-[11px] rounded-xl p-2.5 flex items-center justify-between gap-2 animate-in fade-in zoom-in-95 duration-300">
                              <div className="flex items-center gap-2">
                                <BookmarkCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>Trip saved to library!</span>
                              </div>
                              <button
                                onClick={() => setActivePage('library')}
                                className="text-[11px] font-bold text-[#5A6348] underline hover:text-[#4A523B] cursor-pointer"
                              >
                                View Library
                              </button>
                            </div>
                          )}
                        </div>

                        <p className="text-[10px] text-[#8A847C] leading-normal text-center opacity-90">
                          Export this complete route to Google Maps or save it to your local trip library for offline trip tracking.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(activeTab === 'stops' || activeTab === 'gear') && (
                <div className="bg-white border border-[#E5E0D8] rounded-xl p-8 shadow-sm text-center space-y-4 animate-in fade-in duration-300">
                  <div className="mx-auto w-12 h-12 bg-[#5A6348]/10 text-[#5A6348] rounded-2xl flex items-center justify-center border border-[#5A6348]/20">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-[#2D3025]">AI features coming soon</h3>
                    <p className="text-xs text-[#8A847C] leading-relaxed max-w-xs mx-auto">
                      AI-generated stop recommendations and personalized gear lists are temporarily disabled and will be available soon.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Accurate Elevation Profile Panel */}
            {routeMetrics.distanceValue > 0 && elevationData.length > 0 && (
              <div className="bg-white border border-[#E5E0D8] rounded-xl p-4 shadow-sm pt-4 mt-4">
                <div className="flex items-center justify-between mb-2 pb-1 border-b border-[#E5E0D8]/40">
                  <div className="flex items-center gap-1.5 text-[#2D3025]">
                    <TrendingUp className="w-4 h-4 text-[#5A6348]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider">Elevation Profile</h3>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    {isElevationSimulated ? (
                      <span className="flex items-center gap-1 text-amber-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Simulated Path
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Real Path
                      </span>
                    )}
                  </span>
                </div>
                
                <div className="h-28 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={elevationData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorElev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#5A6348" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#5A6348" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="km" stroke="#8A847C" fontSize={9} />
                      <YAxis stroke="#8A847C" fontSize={9} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#FAF9F6', borderColor: '#E5E0D8', borderRadius: '8px' }}
                        labelStyle={{ color: '#8A847C', fontSize: '10px' }}
                        itemStyle={{ color: '#5A6348', fontSize: '11px' }}
                      />
                      <Area type="monotone" dataKey="elevation" stroke="#5A6348" fillOpacity={1} fill="url(#colorElev)" strokeWidth={1.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* --- RIGHT HAND INTERACTIVE GOOGLE MAP (7 cols) --- */}
          <div className="lg:col-span-7 relative h-[calc(100vh-73px)]">
            <Map
              defaultCenter={{ lat: 43.96, lng: -78.16 }}
              defaultZoom={9}
              styles={mapStyles['natural-tones']}
              disableDefaultUI={false}
              className="w-full h-full"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            >
              {/* Dynamically computes route details & trace polyline */}
              <RouteDisplay
                origin={activeOrigin}
                destination={activeDestination}
                waypoints={activeWaypoints}
                setRouteMetrics={setRouteMetrics}
                isPosterMode={false}
                posterConfig={posterConfig}
                isApiRestricted={isApiRestricted}
                setIsApiRestricted={setIsApiRestricted}
                setElevationData={setElevationData}
                setIsElevationSimulated={setIsElevationSimulated}
                setRoutePathCoords={setRoutePathCoords}
              />
            </Map>

            {/* Map Overlays Stack (forces clean vertical layout flow with no visual overlaps) */}
            <div className="absolute top-4 left-4 right-4 sm:right-auto z-10 flex flex-col gap-3 max-w-sm pointer-events-none">
              
              {/* Float Route Metrics HUD */}
              {routeMetrics.distanceValue > 0 && (
                <div className="bg-white/95 backdrop-blur-sm border border-[#E5E0D8] rounded-xl p-4 shadow-md flex flex-col gap-3 pointer-events-auto">
                  <div className="flex gap-6 items-center">
                    <div>
                      <span className="block text-[9px] font-bold uppercase tracking-widest text-[#8A847C] mb-0.5">Distance</span>
                      <span className="text-lg font-extrabold text-[#A67C52] font-sans">{routeMetrics.distanceText}</span>
                    </div>
                    <div className="w-px bg-[#E5E0D8] self-stretch" />
                    <div>
                      <span className="block text-[9px] font-bold uppercase tracking-widest text-[#8A847C] mb-0.5">Est. Cycling Time</span>
                      <span className="text-lg font-extrabold text-[#5A6348] font-sans">{routeMetrics.durationText}</span>
                    </div>
                    <div className="w-px bg-[#E5E0D8] self-stretch" />
                    <div>
                      <span className="block text-[9px] font-bold uppercase tracking-widest text-[#8A847C] mb-0.5">Rig Type</span>
                      <span className="text-xs font-bold text-[#3D3B38] block mt-1 uppercase tracking-wider">{goals.bikeType.split(' ')[0]}</span>
                    </div>
                  </div>

                  <div className="border-t border-[#E5E0D8]/60 pt-2.5 flex items-center justify-between gap-2">
                    <span className="text-[9px] text-[#8A847C] leading-tight max-w-[110px]">Export route to your device</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={getGoogleMapsUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 bg-[#5A6348] hover:bg-[#4A523B] text-white text-[10px] font-bold py-1.5 px-2.5 rounded-lg transition shrink-0"
                        id="hud-export-maps-btn"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Google Maps</span>
                      </a>
                      <button
                        type="button"
                        onClick={handleDownloadGpx}
                        className="flex items-center gap-1 bg-white hover:bg-[#FAF9F6] border border-[#E5E0D8] text-[#3D3B38] hover:text-[#5A6348] text-[10px] font-bold py-1.5 px-2.5 rounded-lg transition shrink-0 cursor-pointer shadow-sm hover:border-[#5A6348]/40"
                        id="hud-download-gpx-btn"
                      >
                        <Download className="w-3 h-3 text-[#5A6348]" />
                        <span>Download GPX</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Simulation Mode Overlay - Only shown if no Google Maps API Key is provided */}
              {!hasValidKey && (
                <div className="bg-[#FAF9F6]/95 backdrop-blur-sm border border-[#A67C52]/30 rounded-xl p-3.5 shadow-md flex items-start gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300 pointer-events-auto">
                  <Sliders className="w-5 h-5 text-[#A67C52] shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="block text-xs font-bold text-[#A67C52]">Offline Simulation Mode</span>
                    <p className="text-[10px] text-[#8A847C] leading-normal mt-1">
                      No Google Maps API key provided. VeloPath has automatically activated our offline route simulator to draw your scenic bicycling route!
                    </p>
                    <div className="mt-2.5 text-[9px] text-[#8A847C] bg-white/60 border border-[#E5E0D8]/60 rounded-lg p-2 space-y-1">
                      <p className="font-semibold text-[#5A6348]">To enable live routing:</p>
                      <ol className="list-decimal list-inside space-y-0.5 text-left">
                        <li>Get a free key from <a href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" target="_blank" rel="noopener noreferrer" className="underline font-medium text-[#A67C52] hover:text-[#5A6348] transition">Google Cloud</a></li>
                        <li>Open Settings (⚙️) → Secrets</li>
                        <li>Add secret <code>GOOGLE_MAPS_PLATFORM_KEY</code></li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
        </div>
      )}
      {/* Google Maps Route Import Success Banner */}
      {importSuccessBanner && (
        <div className="fixed top-18 right-4 z-50 max-w-md bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl p-3.5 shadow-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#5A6348] text-white rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#2D3025]">{importSuccessBanner.message}</p>
              <p className="text-[10px] text-[#5A6348] font-semibold">Active route, markers, and elevation profile updated</p>
            </div>
          </div>
          <button
            onClick={() => setImportSuccessBanner(null)}
            className="text-[#8A847C] hover:text-[#3D3B38] p-1 rounded-md transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Import Google Maps Route Modal */}
      <ImportGoogleMapsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportRoute={handleImportGoogleMapsRoute}
      />
    </div>
    </APIProvider>
  );
}
