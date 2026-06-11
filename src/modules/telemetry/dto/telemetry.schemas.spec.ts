import { telemetryIngestSchema } from './telemetry.schemas';

describe('telemetryIngestSchema', () => {
  it('normalizes compact telemetry payloads into the ingest DTO', () => {
    const parsed = telemetryIngestSchema.parse({
      i: 'device-compact-001',
      s: 'g',
      t: 1,
      a: -33448900,
      o: -70669300,
      h: 120,
      v: 28,
      r: 0,
      d: '20260611T195230Z',
    });

    expect(parsed).toMatchObject({
      deviceId: 'device-compact-001',
      source: 'gsm',
      timestamp: '2026-06-11T19:52:30Z',
      lat: -33.4489,
      lon: -70.6693,
      altitudeM: 120,
      headingDeg: 0,
    });
    expect(parsed.groundSpeedMs).toBeCloseTo(14.404432, 6);
    expect(parsed.rawPayload).toMatchObject({
      i: 'device-compact-001',
      s: 'g',
      t: 1,
    });
  });
});
