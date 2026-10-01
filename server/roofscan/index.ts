import { storage } from "../storage";
import { createArtemisProvider } from "./providers/artemis";
import { createCwOpenDataProvider } from "./providers/cwOpenData";
import {
  RoofMeasurementUnavailableError,
  isUsableMeasurement,
  type RoofMeasurementRequest,
  type RoofMeasurementResult,
} from "./types";

const providers = [
  // Prefer the CW-owned engine when it can verify its geometry.
  createCwOpenDataProvider((key) => storage.getSetting(key)),
  createArtemisProvider((key) => storage.getSetting(key)),
];

export function getRoofScanProviderStatus() {
  return providers.map((provider) => ({
    id: provider.id,
    configured: provider.isConfigured(),
  }));
}

export async function measureRoof(request: RoofMeasurementRequest): Promise<RoofMeasurementResult> {
  for (const provider of providers) {
    if (!provider.isConfigured()) continue;

    const result = await provider.measure(request);
    if (isUsableMeasurement(result)) return result;
  }

  throw new RoofMeasurementUnavailableError(
    "CW RoofScan could not obtain a verified measurement. No estimated or randomized values were saved. Configure a supported provider or upload a verified measurement report."
  );
}

export * from "./types";
