import type {
  RoofMeasurementProvider,
  RoofMeasurementRequest,
  RoofMeasurementResult,
} from "../types";

type SettingGetter = (key: string) => string | null | undefined;

const SQFT_PER_M2 = 10.76391041671;

function imageryDate(data: any): string | null {
  const date = data?.imageryDate;
  if (!date?.year) return null;
  const month = String(date.month || 1).padStart(2, "0");
  const day = String(date.day || 1).padStart(2, "0");
  return `${date.year}-${month}-${day}`;
}

function pitchLabel(degrees: unknown): string | null {
  const deg = Number(degrees);
  if (!Number.isFinite(deg)) return null;
  const rise = Math.tan((deg * Math.PI) / 180) * 12;
  const rounded = Math.round(rise * 2) / 2;
  return `${rounded}/12`;
}

async function fetchBuildingInsights(
  apiKey: string,
  lat: number,
  lng: number,
  quality: "HIGH" | "MEDIUM" | "LOW",
) {
  const url =
    "https://solar.googleapis.com/v1/buildingInsights:findClosest" +
    `?location.latitude=${lat}&location.longitude=${lng}&requiredQuality=${quality}&key=${encodeURIComponent(apiKey)}`;
  return fetch(url, { signal: AbortSignal.timeout(15000) });
}

export function createGoogleSolarProvider(getSetting: SettingGetter): RoofMeasurementProvider {
  return {
    id: "google-solar",

    isConfigured() {
      return Boolean(getSetting("google_maps_api_key"));
    },

    async measure(request: RoofMeasurementRequest): Promise<RoofMeasurementResult | null> {
      const apiKey = getSetting("google_maps_api_key");
      if (!apiKey || !Number.isFinite(request.lat) || !Number.isFinite(request.lng)) return null;

      try {
        let response = await fetchBuildingInsights(apiKey, request.lat!, request.lng!, "MEDIUM");
        if (response.status === 404) {
          response = await fetchBuildingInsights(apiKey, request.lat!, request.lng!, "LOW");
        }
        if (!response.ok) {
          const details = await response.text().catch(() => "");
          console.warn("[RoofScan:GoogleSolar] HTTP " + response.status + ": " + details.slice(0, 400));
          return null;
        }

        const data: any = await response.json();
        const solarPotential = data?.solarPotential;
        const wholeRoof = solarPotential?.wholeRoofStats;
        const segments = Array.isArray(solarPotential?.roofSegmentStats)
          ? solarPotential.roofSegmentStats
          : [];
        const areaMeters2 = Number(wholeRoof?.areaMeters2);
        if (!Number.isFinite(areaMeters2) || areaMeters2 <= 0) return null;

        const totalArea = areaMeters2 * SQFT_PER_M2;
        const dominant = [...segments].sort(
          (a: any, b: any) => Number(b?.stats?.areaMeters2 || 0) - Number(a?.stats?.areaMeters2 || 0),
        )[0];

        return {
          source: "google-solar",
          address: request.address,
          squares: Number((totalArea / 100).toFixed(2)),
          totalArea: Math.round(totalArea),
          pitch: pitchLabel(dominant?.pitchDegrees),
          facets: segments.length || null,
          ridgeLength: null,
          valleyLength: null,
          eaveLength: null,
          hipLength: null,
          rakeLength: null,
          confidence: null,
          imageryDate: imageryDate(data),
          providerMetadata: JSON.stringify({
            provider: "Google Solar API",
            imageryQuality: data?.imageryQuality ?? null,
            center: data?.center ?? null,
            roofSegmentCount: segments.length,
          }),
          rawData: JSON.stringify(data),
          verificationStatus: "prototype",
        };
      } catch (error) {
        console.warn("[RoofScan:GoogleSolar] Request failed:", error);
        return null;
      }
    },
  };
}
