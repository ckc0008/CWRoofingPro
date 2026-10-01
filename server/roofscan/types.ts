export type RoofMeasurementSource =
  | "artemis"
  | "cw-open-data"
  | "eagleview"
  | "nearmap"
  | "uploaded-report"
  | "manual";

export interface RoofMeasurementResult {
  source: RoofMeasurementSource;
  address: string;
  squares: number;
  totalArea: number;
  pitch?: string | null;
  facets?: number | null;
  ridgeLength?: number | null;
  valleyLength?: number | null;
  eaveLength?: number | null;
  hipLength?: number | null;
  rakeLength?: number | null;
  confidence?: number | null;
  reportUrl?: string | null;
  reportId?: string | null;
  imageryDate?: string | null;
  providerMetadata?: string | null;
  rawData?: string | null;
  verificationStatus?: "verified" | "prototype";
}

export interface RoofMeasurementRequest {
  address: string;
  lat?: number;
  lng?: number;
}

export interface RoofMeasurementProvider {
  id: RoofMeasurementSource;
  isConfigured(): boolean;
  measure(request: RoofMeasurementRequest): Promise<RoofMeasurementResult | null>;
}

export class RoofMeasurementUnavailableError extends Error {
  readonly code = "ROOF_MEASUREMENT_UNAVAILABLE";

  constructor(message = "No verified roof measurement source is available for this property.") {
    super(message);
    this.name = "RoofMeasurementUnavailableError";
  }
}

export function isUsableMeasurement(result: RoofMeasurementResult | null): result is RoofMeasurementResult {
  return !!result
    && Number.isFinite(result.totalArea)
    && result.totalArea > 0
    && Number.isFinite(result.squares)
    && result.squares > 0;
}
