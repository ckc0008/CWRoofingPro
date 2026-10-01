import type {
  RoofMeasurementProvider,
  RoofMeasurementRequest,
  RoofMeasurementResult,
} from "../types";

type SettingGetter = (key: string) => string | null | undefined;

function numberOrNull(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function createArtemisProvider(getSetting: SettingGetter): RoofMeasurementProvider {
  return {
    id: "artemis",

    isConfigured() {
      return Boolean(getSetting("artemis_api_key") && getSetting("artemis_api_url"));
    },

    async measure(request: RoofMeasurementRequest): Promise<RoofMeasurementResult | null> {
      const apiKey = getSetting("artemis_api_key");
      const apiUrl = getSetting("artemis_api_url");
      if (!apiKey || !apiUrl) return null;

      const body: Record<string, unknown> = { address: request.address };
      if (Number.isFinite(request.lat)) body.lat = request.lat;
      if (Number.isFinite(request.lng)) body.lng = request.lng;

      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            Authorization: "Bearer " + apiKey,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const details = await response.text().catch(() => "");
          console.error("[RoofScan:Artemis] HTTP " + response.status + ": " + details);
          return null;
        }

        const data: any = await response.json();
        const totalArea = numberOrNull(data.roofArea ?? data.totalArea ?? data.totalAreaSqFt);
        const reportedSquares = numberOrNull(data.squares);
        const normalizedArea = totalArea ?? (reportedSquares ? reportedSquares * 100 : null);
        if (!normalizedArea || normalizedArea <= 0) return null;

        const squares = reportedSquares ?? normalizedArea / 100;
        const confidence = numberOrNull(data.confidence ?? data.confidenceScore);

        return {
          source: "artemis",
          address: request.address,
          squares: Number(squares.toFixed(2)),
          totalArea: Math.round(normalizedArea),
          pitch: data.pitch ?? data.dominantPitch ?? null,
          facets: numberOrNull(data.facets ?? data.segmentCount ?? data.segments?.length),
          ridgeLength: numberOrNull(data.ridgeLength),
          valleyLength: numberOrNull(data.valleyLength),
          eaveLength: numberOrNull(data.eaveLength),
          hipLength: numberOrNull(data.hipLength),
          rakeLength: numberOrNull(data.rakeLength),
          confidence: confidence == null ? null : Math.max(0, Math.min(1, confidence > 1 ? confidence / 100 : confidence)),
          reportUrl: data.reportUrl ?? null,
          reportId: data.reportId == null ? null : String(data.reportId),
          imageryDate: data.imageryDate ?? data.imageDate ?? null,
          rawData: JSON.stringify(data),
        };
      } catch (error) {
        console.error("[RoofScan:Artemis] Request failed:", error);
        return null;
      }
    },
  };
}
