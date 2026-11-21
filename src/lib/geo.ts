export type LatLon = { lat: number; lon: number };

const DEFAULT_CENTER: LatLon = { lat: 43.65, lon: -79.38 };

/** Rough land bounds; the app is Canada/US-oriented, so elsewhere geolocation is ignored. */
const inServiceArea = ({ lat, lon }: LatLon) => lat > 20 && lat < 72 && lon > -141 && lon < -50;

function getCurrentPosition(timeout = 6000): Promise<LatLon> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation is not supported on this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (e) => reject(new Error(e.message || "Location permission denied.")),
      { enableHighAccuracy: false, timeout, maximumAge: 5 * 60_000 },
    );
  });
}

/**
 * Initial map centre: the device position when available and inside the service area,
 * otherwise Toronto. Never rejects — the default is the fallback.
 */
export async function initialCenter(): Promise<LatLon> {
  try {
    const pos = await getCurrentPosition();
    return inServiceArea(pos) ? pos : DEFAULT_CENTER;
  } catch {
    return DEFAULT_CENTER;
  }
}

export { DEFAULT_CENTER };
