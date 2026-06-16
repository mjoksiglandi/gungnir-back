import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type {
  DeviceCallsignAssignmentsReplaceDto,
  DeviceListQueryDto,
} from '../dto/device.schemas';
import type { DeviceCallsignAssignmentRecord, DeviceUpsertInput } from '../types/device.types';
import { DevicesRepository } from '../repositories/devices.repository';

@Injectable()
export class DevicesService {
  constructor(private readonly devicesRepository: DevicesRepository) {}

  private getCurrentCallsignAssignment(assignments: DeviceCallsignAssignmentRecord[]) {
    const now = Date.now();
    return assignments.find(
      (assignment) =>
        assignment.startTime.getTime() <= now
        && (assignment.endTime == null || assignment.endTime.getTime() >= now),
    ) ?? null;
  }

  private buildDeviceResponse(
    device: Awaited<ReturnType<DevicesRepository['getRecord']>>,
    assignments: DeviceCallsignAssignmentRecord[],
    includeHistory: boolean,
  ) {
    const currentCallsignAssignment = this.getCurrentCallsignAssignment(assignments);
    return {
      ...device,
      currentCallsignAssignment,
      ...(includeHistory ? { callsignAssignments: assignments } : {}),
    };
  }

  async list(query: DeviceListQueryDto = {}) {
    const deviceRows = await this.devicesRepository.list(query);
    const callsignMap = await this.devicesRepository.getCallsignAssignmentsMap(
      deviceRows.map((device) => device.id),
    );

    return deviceRows.map((device) =>
      this.buildDeviceResponse(device, callsignMap.get(device.id) ?? [], false),
    );
  }

  async get(id: string) {
    const device = await this.devicesRepository.getRecord(id);
    const callsignMap = await this.devicesRepository.getCallsignAssignmentsMap([id]);
    return this.buildDeviceResponse(device, callsignMap.get(id) ?? [], true);
  }

  async callsigns(id: string) {
    await this.devicesRepository.getRecord(id);
    const callsignMap = await this.devicesRepository.getCallsignAssignmentsMap([id]);
    return callsignMap.get(id) ?? [];
  }

  async replaceCallsignAssignments(
    id: string,
    input: DeviceCallsignAssignmentsReplaceDto,
  ) {
    const device = await this.devicesRepository.getRecord(id);

    await this.devicesRepository.replaceCallsignAssignments(
      id,
      input,
      device.assetId,
    );

    return this.callsigns(id);
  }

  async create(input: DeviceUpsertInput) {
    const id = await this.devicesRepository.create(input);
    return this.get(id);
  }

  async update(id: string, input: DeviceUpsertInput) {
    const existingDevice = await this.devicesRepository.getRecord(id);
    await this.devicesRepository.update(id, input, existingDevice.platformType);
    return this.get(id);
  }

  async currentState(id: string) {
    await this.devicesRepository.getRecord(id);
    return this.devicesRepository.findCurrentStateByDeviceId(id);
  }

  async telemetry(id: string) {
    await this.devicesRepository.getRecord(id);
    return this.devicesRepository.findTelemetryByDeviceId(id);
  }

  async commands(id: string) {
    await this.devicesRepository.getRecord(id);
    return this.devicesRepository.findCommandsByDeviceId(id);
  }

  @OnEvent('mqtt.device.status')
  async handleMqttDeviceStatus(payload: { deviceId?: string; status?: 'online' | 'offline' | 'degraded' | 'retired'; lastSeenAt?: string }) {
    if (!payload.deviceId || !payload.status) {
      return;
    }

    await this.devicesRepository.updateStatus({
      deviceId: payload.deviceId,
      status: payload.status,
      lastSeenAt: payload.lastSeenAt,
    });
  }
}
