import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyPolarWebhook } from '../../src/infrastructure/webhook/verify-webhook';

const SECRET_RAW = 'unit_test_secret';
const SECRET_BASE64 = Buffer.from(SECRET_RAW, 'utf8').toString('base64');

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload, 'utf8').digest('base64');
}

function headersFor(id: string, timestamp: number, signature: string): Record<string, string> {
  return {
    'webhook-id': id,
    'webhook-timestamp': String(timestamp),
    'webhook-signature': `v1,${signature}`,
  };
}

const BODY = '{"type":"subscription.created","data":{"id":"sub_1"}}';
const ID = 'msg_1';
const TIMESTAMP = Math.floor(Date.now() / 1000);

describe('verifyPolarWebhook', () => {
  it('accepts a valid signature with a raw-UTF8 secret', async () => {
    const signature = sign(`${ID}.${TIMESTAMP}.${BODY}`, SECRET_RAW);
    await expect(verifyPolarWebhook(BODY, headersFor(ID, TIMESTAMP, signature), SECRET_RAW)).resolves.toBe(true);
  });

  it('accepts a whsec_-prefixed base64 secret', async () => {
    const signature = sign(`${ID}.${TIMESTAMP}.${BODY}`, SECRET_BASE64);
    await expect(
      verifyPolarWebhook(BODY, headersFor(ID, TIMESTAMP, signature), `whsec_${SECRET_BASE64}`),
    ).resolves.toBe(true);
  });

  it('rejects a signature made with the wrong secret', async () => {
    const signature = sign(`${ID}.${TIMESTAMP}.${BODY}`, 'other_secret');
    await expect(verifyPolarWebhook(BODY, headersFor(ID, TIMESTAMP, signature), SECRET_RAW)).resolves.toBe(false);
  });

  it('rejects a modified body', async () => {
    const signature = sign(`${ID}.${TIMESTAMP}.${BODY}`, SECRET_RAW);
    await expect(
      verifyPolarWebhook(BODY.replace('sub_1', 'sub_2'), headersFor(ID, TIMESTAMP, signature), SECRET_RAW),
    ).resolves.toBe(false);
  });

  it('rejects when a header is missing', async () => {
    const signature = sign(`${ID}.${TIMESTAMP}.${BODY}`, SECRET_RAW);
    const { 'webhook-signature': _dropped, ...withoutSignature } = headersFor(ID, TIMESTAMP, signature);
    await expect(verifyPolarWebhook(BODY, withoutSignature, SECRET_RAW)).resolves.toBe(false);
  });

  it('rejects deliveries older than the tolerance', async () => {
    const stale = Math.floor(Date.now() / 1000) - 3600;
    const signature = sign(`${ID}.${stale}.${BODY}`, SECRET_RAW);
    await expect(
      verifyPolarWebhook(BODY, headersFor(ID, stale, signature), SECRET_RAW, { toleranceMs: 5 * 60 * 1000 }),
    ).resolves.toBe(false);
  });

  it('reads headers through a Headers instance', async () => {
    const signature = sign(`${ID}.${TIMESTAMP}.${BODY}`, SECRET_RAW);
    const headers = new Headers(headersFor(ID, TIMESTAMP, signature));
    await expect(verifyPolarWebhook(BODY, headers, SECRET_RAW)).resolves.toBe(true);
  });
});
