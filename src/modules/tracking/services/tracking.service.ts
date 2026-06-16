import { Injectable } from '@nestjs/common';
import { TrackingRepository } from '../repositories/tracking.repository';

@Injectable()
export class TrackingService {
  constructor(private readonly trackingRepository: TrackingRepository) {}

  current() {
    return this.trackingRepository.current();
  }

  history() {
    return this.trackingRepository.history();
  }

  get(id: string) {
    return this.trackingRepository.get(id);
  }

  bbox(query: { minLat?: number; minLon?: number; maxLat?: number; maxLon?: number }) {
    return this.trackingRepository.bbox(query);
  }
}
