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
});
