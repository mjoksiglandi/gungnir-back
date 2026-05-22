import { GuardianUplinkE2eService } from './guardian-uplink-e2e.service';

describe('GuardianUplinkE2eService', () => {
  const keyHex =
    '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff';

  it('ignores guardian uplinks when the E2E key is missing', async () => {
    const telemetryService = { ingest: jest.fn() };
    const service = new GuardianUplinkE2eService(
      {} as never,
      { unsafe: jest.fn(), types: {} } as never,
      { get: jest.fn(() => undefined) } as never,
      telemetryService as never,
    );

    await service.handleGuardianUplink({
      type: 'guardian.uplink.e2e',
      schema: 'guardian.e2e.v1',
      device_id: 'trk-12345678',
      channel: 'gsm',
      e2e: {
        alg: 'AES-256-GCM',
        version: 1,
        seq: '0000000000000001',
        nonce: 'a1b2c3d40000000000000001',
        ciphertext: '00',
        tag: '00112233445566778899aabbccddeeff',
      },
    });

    expect(telemetryService.ingest).not.toHaveBeenCalled();
  });

  it('accepts a valid uplink and delegates it to telemetry ingest', async () => {
    const telemetryService = { ingest: jest.fn().mockResolvedValue(undefined) };
    const sqlClient = Object.assign(
      jest.fn().mockResolvedValue([{ device_id: 'trk-12345678' }]),
      { unsafe: jest.fn(), types: {} },
    );
    const service = new GuardianUplinkE2eService(
      {} as never,
      sqlClient as never,
      { get: jest.fn(() => keyHex) } as never,
      telemetryService as never,
    );

    await service.handleGuardianUplink({
      type: 'guardian.uplink.e2e',
      schema: 'guardian.e2e.v1',
      device_id: 'trk-12345678',
      channel: 'gsm',
      sent_at_utc: '2026-05-22T14:31:05Z',
      e2e: {
        alg: 'AES-256-GCM',
        version: 1,
        seq: '0000000000000001',
        nonce: 'af912e9f0000000000000001',
        ciphertext:
          '9d53c38126d17a315eabfeda516ef5270ea03755d036b263e66dc030d197a5dc',
        tag: 'fbc4d7bbe891577a71d80a3122331577',
      },
    });

    expect(telemetryService.ingest).toHaveBeenCalledWith(
      expect.objectContaining({
        deviceId: 'trk-12345678',
        source: 'guardian-e2e:gsm',
        lat: -33.47524,
        lon: -70.61877,
        headingDeg: 270,
      }),
    );
  });
});
