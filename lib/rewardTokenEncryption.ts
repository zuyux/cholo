import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const PREFIX = 'enc:v1:';

export function isEncryptedRewardToken(value: string | null) {
  return !!value?.startsWith(PREFIX);
}

function encryptionKey() {
  const encoded = process.env.REWARD_TOKEN_ENCRYPTION_KEY;
  if (!encoded) throw new Error('Falta REWARD_TOKEN_ENCRYPTION_KEY');
  const key = Buffer.from(encoded, 'base64');
  if (key.length !== 32) throw new Error('REWARD_TOKEN_ENCRYPTION_KEY debe contener exactamente 32 bytes en base64');
  return key;
}

export function encryptRewardToken(value: string) {
  if (value.startsWith(PREFIX)) return value;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${Buffer.concat([iv, tag, ciphertext]).toString('base64url')}`;
}

export function decryptRewardToken(value: string | null) {
  if (!value || !value.startsWith(PREFIX)) return value;
  const payload = Buffer.from(value.slice(PREFIX.length), 'base64url');
  if (payload.length < 29) throw new Error('Token OAuth cifrado inválido');
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const ciphertext = payload.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
