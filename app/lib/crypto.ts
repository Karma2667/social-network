export async function generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  );

  const publicKey = await crypto.subtle.exportKey('spki', keyPair.publicKey);
  const privateKey = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

  return {
    publicKey: Buffer.from(publicKey).toString('base64'),
    privateKey: Buffer.from(privateKey).toString('base64'),
  };
}

export async function importPublicKey(publicKeyBase64: string): Promise<CryptoKey> {
  const publicKeyBuffer = Buffer.from(publicKeyBase64, 'base64');
  return crypto.subtle.importKey(
    'spki',
    publicKeyBuffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['encrypt']
  );
}

export async function importPrivateKey(privateKeyBase64: string): Promise<CryptoKey> {
  const privateKeyBuffer = Buffer.from(privateKeyBase64, 'base64');
  return crypto.subtle.importKey(
    'pkcs8',
    privateKeyBuffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['decrypt']
  );
}

export async function encryptMessage(message: string, publicKey: CryptoKey): Promise<string> {
  const encoded = new TextEncoder().encode(message);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    publicKey,
    encoded
  );
  return Buffer.from(encrypted).toString('base64');
}

export async function decryptMessage(encryptedBase64: string, privateKey: CryptoKey): Promise<string> {
  const encryptedBuffer = Buffer.from(encryptedBase64, 'base64');
  const decrypted = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    encryptedBuffer
  );
  return new TextDecoder().decode(decrypted);
}