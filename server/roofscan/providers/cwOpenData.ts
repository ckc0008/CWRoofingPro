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
        // The worker only declares a result verified after roof-plane QC passes.
        if (data.status !== "verified" || !data.measurement) return null;

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
        };
      } catch (error) {
        console.error("[RoofScan:CW] Worker request failed:", error);
        return null;
      }
    },
  };
}
