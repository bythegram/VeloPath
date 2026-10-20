/**
 * Google Maps URL Parser & Decoder for VeloPath
 * Handles full directions URLs, shortened mobile links (maps.app.goo.gl),
 * query-param formatted URLs, legacy saddr/daddr formats, and protobuf coordinate streams.
 */

export interface ParsedGoogleMapsRoute {
  origin: string;
  destination: string;
  waypoints: string[];
  totalStops: number;
  sourceUrl: string;
  resolvedUrl?: string;
  isShortUrl?: boolean;
  warnings?: string[];
}

/**
 * Checks if a string is a shortened Google Maps URL that requires server-side redirect resolution
 */
export function isShortenedMapsUrl(url: string): boolean {
  const clean = url.trim().toLowerCase();
  return (
    clean.includes('maps.app.goo.gl') ||
    clean.includes('goo.gl/maps') ||
    clean.includes('g.co/maps') ||
    clean.includes('bit.ly/') ||
    clean.includes('tinyurl.com/')
  );
}

/**
 * Resolves a shortened URL via the backend proxy to follow HTTP redirects
 */
export async function resolveShortUrl(shortUrl: string): Promise<string> {
  const cleanUrl = shortUrl.trim();
  const response = await fetch('/api/resolve-maps-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: cleanUrl }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server failed to resolve shortlink (${response.status})`);
  }

  const data = await response.json();
  if (!data.success || !data.resolvedUrl) {
    throw new Error(data.error || 'Could not resolve shortened Google Maps link');
  }

  return data.resolvedUrl;
}

/**
 * Clean and format raw string into a legible address/coordinate label
 */
function cleanSegment(seg: string): string {
  try {
    let decoded = decodeURIComponent(seg.replace(/\+/g, ' ')).trim();
    // Remove extra trailing commas or slashes
    decoded = decoded.replace(/^[,\s/]+|[,\s/]+$/g, '');
    return decoded;
  } catch {
    return seg.replace(/\+/g, ' ').trim();
  }
}

/**
 * Extracts coordinate pairs from protobuf data (!1d lng !2d lat or !3d lat !4d lng)
 */
function extractProtobufCoordinates(urlStr: string): { lat: number; lng: number }[] {
  const coords: { lat: number; lng: number }[] = [];

  // Match !2m2!1d{lng}!2d{lat} or !1d{lng}!2d{lat} (1d is Longitude, 2d is Latitude in Google Maps protobuf)
  const pattern1 = /!1d(-?\d+\.\d+)!2d(-?\d+\.\d+)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern1.exec(urlStr)) !== null) {
    const lng = parseFloat(match[1]);
    const lat = parseFloat(match[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      coords.push({ lat, lng });
    }
  }

  // Also check alternative order: !2d{lat}!1d{lng}
  if (coords.length === 0) {
    const pattern2 = /!2d(-?\d+\.\d+)!1d(-?\d+\.\d+)/g;
    while ((match = pattern2.exec(urlStr)) !== null) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        coords.push({ lat, lng });
      }
    }
  }

  // Also match !3d{lat}!4d{lng} (used in single place / pin entries)
  if (coords.length === 0) {
    const pattern3 = /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/g;
    while ((match = pattern3.exec(urlStr)) !== null) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        coords.push({ lat, lng });
      }
    }
  }

  return coords;
}

/**
 * Synchronous parser that inspects a full expanded Google Maps URL
 */
export function parseExpandedGoogleMapsUrl(urlStr: string): ParsedGoogleMapsRoute {
  let trimmed = urlStr.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    trimmed = 'https://' + trimmed;
  }

  let urlObj: URL;
  try {
    urlObj = new URL(trimmed);
  } catch (e) {
    throw new Error('Invalid URL format. Please paste a valid web address.');
  }

  const warnings: string[] = [];
  const pathname = urlObj.pathname;
  const searchParams = urlObj.searchParams;

  // --- Strategy 1: URL Query Parameters (?origin=...&destination=...&waypoints=...) ---
  if (searchParams.has('origin') && searchParams.has('destination')) {
    const origin = cleanSegment(searchParams.get('origin') || '');
    const destination = cleanSegment(searchParams.get('destination') || '');
    const rawWaypoints = searchParams.get('waypoints') || '';
    
    const waypoints = rawWaypoints
      ? rawWaypoints
          .split(/\||%7C/i)
          .map(cleanSegment)
          .filter((w) => w.length > 0)
      : [];

    if (origin && destination) {
      return {
        origin,
        destination,
        waypoints,
        totalStops: 2 + waypoints.length,
        sourceUrl: urlStr,
        warnings,
      };
    }
  }

  // --- Strategy 2: Legacy Query Parameters (?saddr=...&daddr=...) ---
  if (searchParams.has('saddr') || searchParams.has('daddr')) {
    const saddr = cleanSegment(searchParams.get('saddr') || '');
    const rawDaddr = searchParams.get('daddr') || '';

    if (rawDaddr) {
      // In legacy maps, daddr can contain '+to:' or ' to:' for intermediate waypoints
      const daddrParts = rawDaddr
        .split(/\+to:| to:/i)
        .map(cleanSegment)
        .filter((p) => p.length > 0);

      if (daddrParts.length > 1) {
        const origin = saddr || daddrParts[0];
        const destination = daddrParts[daddrParts.length - 1];
        const waypoints = saddr ? daddrParts.slice(0, -1) : daddrParts.slice(1, -1);

        return {
          origin,
          destination,
          waypoints,
          totalStops: 2 + waypoints.length,
          sourceUrl: urlStr,
          warnings,
        };
      } else if (saddr && daddrParts.length === 1) {
        return {
          origin: saddr,
          destination: daddrParts[0],
          waypoints: [],
          totalStops: 2,
          sourceUrl: urlStr,
          warnings,
        };
      }
    }
  }

  // --- Strategy 3: Path-based Directions (/maps/dir/PointA/PointB/PointC/...) ---
  if (pathname.includes('/dir/')) {
    const afterDir = pathname.substring(pathname.indexOf('/dir/') + 5);
    const rawSegments = afterDir.split('/');

    const validSegments: string[] = [];
    for (const rawSeg of rawSegments) {
      if (!rawSeg || rawSeg.trim() === '') continue;

      // Skip viewport specifiers like @44.12,-78.0,10z
      if (rawSeg.startsWith('@')) continue;

      // Skip metadata or config keywords
      if (
        rawSeg.startsWith('data=') ||
        rawSeg.startsWith('am=') ||
        rawSeg.startsWith('entry=') ||
        rawSeg === 'embed' ||
        rawSeg === 'help'
      ) {
        continue;
      }

      const cleaned = cleanSegment(rawSeg);
      if (cleaned.length > 0) {
        validSegments.push(cleaned);
      }
    }

    if (validSegments.length >= 2) {
      const origin = validSegments[0];
      const destination = validSegments[validSegments.length - 1];
      const waypoints = validSegments.slice(1, validSegments.length - 1);

      return {
        origin,
        destination,
        waypoints,
        totalStops: 2 + waypoints.length,
        sourceUrl: urlStr,
        warnings,
      };
    }
  }

  // --- Strategy 4: Protobuf Coordinate Stream Extraction (!1d lng !2d lat) ---
  const protoCoords = extractProtobufCoordinates(urlStr);
  if (protoCoords.length >= 2) {
    const origin = `${protoCoords[0].lat.toFixed(6)}, ${protoCoords[0].lng.toFixed(6)}`;
    const destination = `${protoCoords[protoCoords.length - 1].lat.toFixed(6)}, ${protoCoords[protoCoords.length - 1].lng.toFixed(6)}`;
    const waypoints = protoCoords
      .slice(1, protoCoords.length - 1)
      .map((c) => `${c.lat.toFixed(6)}, ${c.lng.toFixed(6)}`);

    return {
      origin,
      destination,
      waypoints,
      totalStops: 2 + waypoints.length,
      sourceUrl: urlStr,
      warnings: ['Extracted route keypoints from Google Maps coordinate data.'],
    };
  }

  // --- Strategy 5: Single Place / Search Destination Fallback ---
  if (pathname.includes('/place/')) {
    const afterPlace = pathname.substring(pathname.indexOf('/place/') + 7);
    const placePart = afterPlace.split('/')[0];
    const placeName = cleanSegment(placePart);

    if (placeName) {
      throw new Error(
        `The link points to a single destination place ("${placeName}") rather than a full Directions route. Please create a Directions route in Google Maps (with start and finish) and share that link.`
      );
    }
  }

  // If nothing could be extracted
  throw new Error(
    'Could not detect any route waypoints from the provided Google Maps URL. Please ensure you copied a Directions link (e.g. from the Google Maps Share menu or address bar).'
  );
}

/**
 * Master async function: Resolves short links if needed and decodes the route into VeloPath waypoints
 */
export async function parseGoogleMapsUrl(rawUrl: string): Promise<ParsedGoogleMapsRoute> {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new Error('Please enter or paste a Google Maps URL.');
  }

  const isShort = isShortenedMapsUrl(trimmed);
  let urlToParse = trimmed;
  let resolvedUrl: string | undefined = undefined;

  if (isShort) {
    try {
      resolvedUrl = await resolveShortUrl(trimmed);
      urlToParse = resolvedUrl;
    } catch (err: any) {
      console.warn('Failed to resolve short URL via server proxy:', err);
      // Try local parsing on original URL as a fallback
    }
  }

  try {
    const result = parseExpandedGoogleMapsUrl(urlToParse);
    result.isShortUrl = isShort;
    result.resolvedUrl = resolvedUrl;
    return result;
  } catch (parseErr: any) {
    // If we resolved a short URL and failed, or if we haven't tried server resolution yet, try server resolution once
    if (!resolvedUrl && (trimmed.includes('google.com/maps') || trimmed.includes('maps.google.com'))) {
      try {
        const serverResolved = await resolveShortUrl(trimmed);
        if (serverResolved && serverResolved !== trimmed) {
          const secondResult = parseExpandedGoogleMapsUrl(serverResolved);
          secondResult.isShortUrl = isShort;
          secondResult.resolvedUrl = serverResolved;
          return secondResult;
        }
      } catch {
        // Fall through to throw original error
      }
    }
    throw parseErr;
  }
}
