import type { RoofMeasurementProvider, RoofMeasurementRequest, RoofMeasurementResult } from "../types";

type SettingGetter = (key: string) => string | null | undefined;

export function createCwOpenDataProvider(getSetting: SettingGetter): RoofMeasurementProvider {
  return {
    id: "cw-open-data",

    isConfigured() {
      return Boolean(getSetting("roofscan_worker_url") && getSetting("roofscan_worker_token"));
    },

    async measure(request: RoofMeasurementRequest): Promise<RoofMeasurementResult | null> {
      const workerUrl = getSetting("roofscan_worker_url")?.replace(/\/$/, "");
      const workerToken = getSetting("roofscan_worker_token");
      if (!workerUrl || !workerToken || !Number.isFinite(request.lat) || !Number.isFinite(request.lng)) return null;

      try {
        const response = await fetch(workerUrl + "/v1/measure", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + workerToken,
          },
          body: JSON.stringify({
            address: request.address,
            lat: request.lat,
            lng: request.lng,
          }),
          signal: AbortSignal.timeout(120000),
        });

        if (!response.ok) {
          const details = await response.text().catch(() => "");
          console.error("[RoofScan:CW] Worker HTTP " + response.status + ": " + details);
          return null;
        }

        const data: any = await response.json();

        if (data.status === "verified" && data.measurement) {
          const m = data.measurement;
          return {
            source: "cw-open-data",
            address: request.address,
            squares: Number(m.squares),
            totalArea: Number(m.totalArea),
            pitch: m.pitch ?? null,
            facets: m.facets ?? null,
            ridgeLength: m.ridgeLength ?? null,
            valleyLength: m.valleyLength ?? null,
            eaveLength: m.eaveLength ?? null,
            hipLength: m.hipLength ?? null,
            rakeLength: m.rakeLength ?? null,
            confidence: m.confidence ?? null,
            imageryDate: m.imageryDate ?? null,
            providerMetadata: JSON.stringify(data.provenance ?? {}),
            rawData: JSON.stringify(data),
            verificationStatus: "verified",
          };
        }

        // Prototype output is useful for field review, but must never be
        // persisted as a verified customer measurement.
        if (data.status === "prototype" && data.prototype?.facetMetrics) {
          const prototype = data.prototype;
          const totalArea = Number(prototype.facetMetrics.totalRoofAreaSqFt);
          const squares = Number(prototype.facetMetrics.squares ?? totalArea / 100);
          if (!Number.isFinite(totalArea) || totalArea <= 0 || !Number.isFinite(squares) || squares <= 0) {
            return null;
          }

          const edgeTotal = (type: string) =>
            (prototype.candidateEdges ?? [])
              .filter((edge: any) => edge?.type === type)
              .reduce((sum: number, edge: any) => sum + Number(edge?.lengthFt ?? edge?.length ?? 0), 0);

          return {
            source: "cw-open-data",
            address: request.address,
            squares: Number(squares.toFixed(2)),
            totalArea: Math.round(totalArea),
            pitch: prototype.dominantPitch ?? null,
            facets: Number(prototype.planeCount ?? prototype.facetMetrics.facets?.length ?? 0) || null,
            ridgeLength: Number(edgeTotal("ridge").toFixed(1)) || null,
            valleyLength: Number(edgeTotal("valley").toFixed(1)) || null,
            eaveLength: Number(prototype.exteriorMetrics?.eaveLength ?? 0) || null,
            hipLength: Number(edgeTotal("hip").toFixed(1)) || null,
            rakeLength: Number(prototype.exteriorMetrics?.rakeLength ?? 0) || null,
            confidence: null,
            imageryDate: null,
            providerMetadata: JSON.stringify(data.provenance ?? {}),
            rawData: JSON.stringify(data),
            verificationStatus: "prototype",
          };
        }

        return null;
      } catch (error) {
        console.error("[RoofScan:CW] Worker request failed:", error);
        return null;
      }
    },
  };
}
