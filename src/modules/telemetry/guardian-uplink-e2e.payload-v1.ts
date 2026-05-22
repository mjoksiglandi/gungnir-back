export type GuardianPayloadV1 = {
  payloadVersion: number;
  reportType: number;
  lat: number;
  lon: number;
  altitudeM: number;
  speedKnX10: number;
  headingDeg: number;
  fixTimeUnix: number;
  flags: number;
  satCount: number;
  hdopX10: number;
  batteryMvDiv10: number;
  reserved: number;
};

const PAYLOAD_V1_SIZE = 32;

export function parseGuardianPayloadV1(plaintext: Buffer): GuardianPayloadV1 {
  if (plaintext.length !== PAYLOAD_V1_SIZE) {
    throw new Error(`guardian_payload_v1_bad_length:${plaintext.length}`);
  }

  const payloadVersion = plaintext.readUInt8(0);
  if (payloadVersion !== 1) {
    throw new Error(`guardian_payload_version_unsupported:${payloadVersion}`);
  }

  return {
    payloadVersion,
    reportType: plaintext.readUInt8(1),
    lat: plaintext.readInt32LE(2) / 100000,
    lon: plaintext.readInt32LE(6) / 100000,
    altitudeM: plaintext.readInt32LE(10),
    speedKnX10: plaintext.readUInt16LE(14),
    headingDeg: plaintext.readUInt16LE(16),
    fixTimeUnix: plaintext.readUInt32LE(18),
    flags: plaintext.readUInt8(22),
    satCount: plaintext.readUInt8(23),
    hdopX10: plaintext.readUInt16LE(24),
    batteryMvDiv10: plaintext.readUInt16LE(26),
    reserved: plaintext.readUInt32LE(28),
  };
}

export function knotsX10ToMetersPerSecond(speedKnX10: number): number {
  return (speedKnX10 / 10) * 0.514444;
}
