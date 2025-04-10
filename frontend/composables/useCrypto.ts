import { ref } from 'vue'

const getSodium = async () => {
  if (!globalThis.$sodium) {
    throw new Error('Libsodium is not initialized')
  }
  return globalThis.$sodium
}

export function useCrypto() {
  const sodiumReady = ref(false)

  const init = async () => {
    const sodium = await getSodium()
    sodiumReady.value = true
    return sodium
  }

  const generateIdentityKeyPair = async () => {
    const sodium = await getSodium()
    return sodium.crypto_box_keypair()
  }

  const deriveKeyFromPassword = async (password: string, salt: Uint8Array) => {
    const sodium = await getSodium()
    return sodium.crypto_pwhash(
      sodium.crypto_secretbox_KEYBYTES,
      password,
      salt,
      sodium.crypto_pwhash_OPSLIMIT_MODERATE,
      sodium.crypto_pwhash_MEMLIMIT_MODERATE,
      sodium.crypto_pwhash_ALG_DEFAULT
    )
  }

  const generateKdfSalt = async () => {
    const sodium = await getSodium()
    return sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES)
  }

  const encryptPrivateKey = async (privateKey: Uint8Array, key: Uint8Array) => {
    const sodium = await getSodium()
    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES)
    const cipher = sodium.crypto_secretbox_easy(privateKey, nonce, key)
    return { cipher, nonce }
  }

  const decryptPrivateKey = async (cipher: Uint8Array, nonce: Uint8Array, key: Uint8Array) => {
    const sodium = await getSodium()
    return sodium.crypto_secretbox_open_easy(cipher, nonce, key)
  }

  const generateSessionKey = async () => {
    const sodium = await getSodium()
    return sodium.randombytes_buf(sodium.crypto_secretbox_KEYBYTES)
  }

  const encryptAsymmetric = async (message: Uint8Array, publicKey: Uint8Array, privateKey: Uint8Array) => {
    const sodium = await getSodium()
    const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES)
    const cipher = sodium.crypto_box_easy(message, nonce, publicKey, privateKey)
    return { cipher, nonce }
  }

  const decryptAsymmetric = async (cipher: Uint8Array, nonce: Uint8Array, publicKey: Uint8Array, privateKey: Uint8Array) => {
    const sodium = await getSodium()
    return sodium.crypto_box_open_easy(cipher, nonce, publicKey, privateKey)
  }

  const encryptMessage = async (message: Uint8Array, key: Uint8Array) => {
    const sodium = await getSodium()
    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES)
    const cipher = sodium.crypto_secretbox_easy(message, nonce, key)
    return { cipher, nonce }
  }

  const decryptMessage = async (cipher: Uint8Array, nonce: Uint8Array, key: Uint8Array) => {
    const sodium = await getSodium()
    return sodium.crypto_secretbox_open_easy(cipher, nonce, key)
  }

  const sign = async (message: Uint8Array, privateKey: Uint8Array) => {
    const sodium = await getSodium()
    return sodium.crypto_sign_detached(message, privateKey)
  }

  const verifySignature = async (message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array) => {
    const sodium = await getSodium()
    return sodium.crypto_sign_verify_detached(signature, message, publicKey)
  }

  const calculateSafetyNumber = async (publicKey1: Uint8Array, publicKey2: Uint8Array) => {
    const sodium = await getSodium()
    const concat = sodium.to_base64(publicKey1) + sodium.to_base64(publicKey2)
    return sodium.crypto_generichash(32, concat)
  }

  const toBase64 = async (data: Uint8Array) => {
    const sodium = await getSodium()
    return sodium.to_base64(data)
  }

  const fromBase64 = async (data: string) => {
    const sodium = await getSodium()
    return sodium.from_base64(data)
  }

  const toHex = async (data: Uint8Array) => {
    const sodium = await getSodium()
    return sodium.to_hex(data)
  }

  const fromHex = async (data: string) => {
    const sodium = await getSodium()
    return sodium.from_hex(data)
  }

  const stringToUint8Array = (str: string) => {
    return new TextEncoder().encode(str)
  }

  const uint8ArrayToString = (arr: Uint8Array) => {
    return new TextDecoder().decode(arr)
  }

  return {
    sodiumReady,
    init,
    generateIdentityKeyPair,
    deriveKeyFromPassword,
    generateKdfSalt,
    encryptPrivateKey,
    decryptPrivateKey,
    generateSessionKey,
    encryptAsymmetric,
    decryptAsymmetric,
    encryptMessage,
    decryptMessage,
    sign,
    verifySignature,
    calculateSafetyNumber,
    toBase64,
    fromBase64,
    toHex,
    fromHex,
    stringToUint8Array,
    uint8ArrayToString
  }
}