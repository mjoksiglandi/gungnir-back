import { createCipheriv } from 'node:crypto';
import {
  buildAadV1,
  buildNonceV1,
  decryptAes256Gcm,
  fnv1a32,
} from './guardian-uplink-e2e.crypto';

describe('guardian-uplink-e2e crypto', () => {
  it('reproduces the RFC AAD format', () => {
    expect(buildAadV1(1, 'gsm', 'trk-12345678', 1n)).toBe(
      'v1|gsm|trk-12345678|00000000|00000001',
    );
  });

  it('decrypts AES-256-GCM payloads with deterministic nonce and AAD', () => {
    const key = Buffer.from(
      '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff',
      'hex',
    );
    const seq = 1n;
    const deviceId = 'trk-12345678';
    const nonce = buildNonceV1(deviceId, seq);
    const aad = buildAadV1(1, 'gsm', deviceId, seq);
    const plaintext = Buffer.from('guardian-test-payload-32-bytes!!');

    expect(plaintext.length).toBe(32);
    expect(fnv1a32(deviceId)).toBe(nonce.readUInt32BE(0));

    const cipher = createCipheriv('aes-256-gcm', key, nonce);
    cipher.setAAD(Buffer.from(aad, 'ascii'));
    const ciphertext = Buffer.concat([
      cipher.update(plaintext),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    const decrypted = decryptAes256Gcm({
      aad,
      ciphertext,
      key,
      nonce,
      tag,
    });

    expect(decrypted.equals(plaintext)).toBe(true);
  });
});
