import { createDecipheriv } from 'node:crypto';

const FNV_OFFSET_BASIS_32 = 0x811c9dc5;
const FNV_PRIME_32 = 0x01000193;
const SEQ_MASK_32 = 0xffff_ffffn;

export function hexToBuffer(hex: string): Buffer {
  return Buffer.from(hex, 'hex');
}

export function fnv1a32(input: string): number {
  let hash = FNV_OFFSET_BASIS_32;
  const bytes = Buffer.from(input, 'utf8');

  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, FNV_PRIME_32) >>> 0;
  }

  return hash >>> 0;
}

export function buildNonceV1(deviceId: string, seq: bigint): Buffer {
  const nonce = Buffer.alloc(12);
  nonce.writeUInt32BE(fnv1a32(deviceId), 0);
  nonce.writeBigUInt64BE(seq, 4);
  return nonce;
}

export function buildAadV1(
  version: number,
  channel: string,
  deviceId: string,
  seq: bigint,
): string {
  const seqHi = Number((seq >> 32n) & SEQ_MASK_32)
    .toString(16)
    .padStart(8, '0');
  const seqLo = Number(seq & SEQ_MASK_32)
    .toString(16)
    .padStart(8, '0');
  return `v${version}|${channel}|${deviceId}|${seqHi}|${seqLo}`;
}

export function decryptAes256Gcm(params: {
  aad: string;
  ciphertext: Buffer;
  key: Buffer;
  nonce: Buffer;
  tag: Buffer;
}): Buffer {
  const decipher = createDecipheriv('aes-256-gcm', params.key, params.nonce);
  decipher.setAAD(Buffer.from(params.aad, 'ascii'));
  decipher.setAuthTag(params.tag);
  return Buffer.concat([decipher.update(params.ciphertext), decipher.final()]);
}
