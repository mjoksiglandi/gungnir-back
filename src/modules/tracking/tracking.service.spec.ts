import { TrackingService } from './services/tracking.service';

describe('TrackingService', () => {
  it('falls back to current tracks when bbox is empty', async () => {
    const current = [{ id: 'track-device-1' }];
    const service = new TrackingService({
      bbox: jest.fn().mockResolvedValue(current),
    } as never);

    const result = await service.bbox({});
    expect(result).toEqual(current);
  });
});
