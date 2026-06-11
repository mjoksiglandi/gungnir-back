import { TelemetryService } from './telemetry.service';

describe('TelemetryService', () => {
  it('delegates MQTT telemetry payloads into ingest', async () => {
    const service = new TelemetryService({} as never, {} as never, { emit: jest.fn() } as never);
    const ingestSpy = jest.spyOn(service, 'ingest').mockResolvedValue({
      id: 'telemetry-1',
      assetId: 'asset-1',
      deviceId: 'device-1',
      status: 'ingested',
    });

    await service.handleMqttTelemetry({
      deviceId: 'device-1',
      assetId: 'asset-1',
      source: 'mqtt',
      timestamp: new Date().toISOString(),
      lat: -33.44,
      lon: -70.66,
    });

    expect(ingestSpy).toHaveBeenCalled();
  });

  it('normalizes compact MQTT telemetry payloads before ingesting', async () => {
    const service = new TelemetryService({} as never, {} as never, { emit: jest.fn() } as never);
    const ingestSpy = jest.spyOn(service, 'ingest').mockResolvedValue({
      id: 'telemetry-1',
      assetId: 'asset-1',
      deviceId: 'device-compact-001',
      status: 'ingested',
    });

    await service.handleMqttTelemetry({
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

    expect(ingestSpy).toHaveBeenCalledWith(expect.objectContaining({
      deviceId: 'device-compact-001',
      source: 'gsm',
      lat: -33.4489,
      lon: -70.6693,
    }));
  });
});
