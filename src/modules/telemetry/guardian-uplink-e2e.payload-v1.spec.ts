import {
  knotsX10ToMetersPerSecond,
  parseGuardianPayloadV1,
} from './guardian-uplink-e2e.payload-v1';

describe('guardian-uplink-e2e payload parser', () => {
  it('parses the fixed 32-byte payload layout', () => {
    const payload = Buffer.alloc(32);
    payload.writeUInt8(1, 0);
    payload.writeUInt8(7, 1);
    payload.writeInt32LE(-3347524, 2);
    payload.writeInt32LE(-7061877, 6);
    payload.writeInt32LE(512, 10);
    payload.writeUInt16LE(301, 14);
    payload.writeUInt16LE(270, 16);
    payload.writeUInt32LE(1_716_387_065, 18);
    payload.writeUInt8(0b0000_1011, 22);
    payload.writeUInt8(9, 23);
    payload.writeUInt16LE(15, 24);
    payload.writeUInt16LE(380, 26);
    payload.writeUInt32LE(0, 28);

    const parsed = parseGuardianPayloadV1(payload);

    expect(parsed.payloadVersion).toBe(1);
    expect(parsed.reportType).toBe(7);
    expect(parsed.lat).toBe(-33.47524);
    expect(parsed.lon).toBe(-70.61877);
    expect(parsed.altitudeM).toBe(512);
    expect(parsed.speedKnX10).toBe(301);
    expect(parsed.headingDeg).toBe(270);
    expect(parsed.fixTimeUnix).toBe(1_716_387_065);
    expect(parsed.flags).toBe(0b0000_1011);
    expect(parsed.satCount).toBe(9);
    expect(parsed.hdopX10).toBe(15);
    expect(parsed.batteryMvDiv10).toBe(380);
    expect(knotsX10ToMetersPerSecond(parsed.speedKnX10)).toBeCloseTo(15.485, 3);
  });
});
