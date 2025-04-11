import { ref } from 'vue'

// Charge la bibliothèque libsodium depuis l'objet global `window`
const getSodium = async (): Promise<typeof import('libsodium-wrappers-sumo')> => {
  if (!window.$sodium) {
    throw new Error('Libsodium is not initialized')
  }
  return window.$sodium
}

export function useCrypto() {

  // Génère une paire de clés pour l'identité (clé publique et clé privée)
  const generateIdentityKeyPair = async () => {
    const sodium = await getSodium()
    return sodium.crypto_box_keypair()
  }

  // Dérive une clé à partir d'un mot de passe et d'un sel en utilisant Argon2id
  const deriveKeyFromPassword = async (password: string, salt: Uint8Array) => {
    const sodium = await getSodium()

    const keyLength = sodium.crypto_secretbox_KEYBYTES

    const key = sodium.crypto_pwhash(
      keyLength,
      password,
      salt,
      sodium.crypto_pwhash_OPSLIMIT_MODERATE,
      sodium.crypto_pwhash_MEMLIMIT_MODERATE,
      sodium.crypto_pwhash_ALG_DEFAULT
    )

    return {
      key,
      params: {
        algorithm: "argon2id",
        iterations: sodium.crypto_pwhash_OPSLIMIT_MODERATE,
        memory: sodium.crypto_pwhash_MEMLIMIT_MODERATE,
        parallelism: 1
      }
    }
  }

  // Génère un sel aléatoire pour la dérivation de clé
  const generateKdfSalt = async (length?: number) => {
    const sodium = await getSodium()
    const saltLength = length ?? sodium.crypto_pwhash_SALTBYTES
    return sodium.randombytes_buf(saltLength)
  }

  // Chiffre une clé privée avec une clé symétrique
  const encryptPrivateKey = async (privateKey: Uint8Array, key: Uint8Array) => {
    const sodium = await getSodium()
    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES)
    const cipher = sodium.crypto_secretbox_easy(privateKey, nonce, key)
    return { cipher, nonce }
  }

  // Déchiffre une clé privée avec une clé symétrique
  const decryptPrivateKey = async (cipher: Uint8Array, nonce: Uint8Array, key: Uint8Array) => {
    const sodium = await getSodium()
    return sodium.crypto_secretbox_open_easy(cipher, nonce, key)
  }

  // Génère une clé de session aléatoire
  const generateSessionKey = async () => {
    const sodium = await getSodium()
    return sodium.randombytes_buf(sodium.crypto_secretbox_KEYBYTES)
  }

  // Chiffre un message de manière asymétrique
  const encryptAsymmetric = async (message: Uint8Array, publicKey: Uint8Array, privateKey: Uint8Array) => {
    const sodium = await getSodium()
    const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES)
    const cipher = sodium.crypto_box_easy(message, nonce, publicKey, privateKey)
    return { cipher, nonce }
  }

  // Déchiffre un message de manière asymétrique
  const decryptAsymmetric = async (cipher: Uint8Array, nonce: Uint8Array, publicKey: Uint8Array, privateKey: Uint8Array) => {
    const sodium = await getSodium()
    return sodium.crypto_box_open_easy(cipher, nonce, publicKey, privateKey)
  }

  // Chiffre un message avec une clé symétrique
  const encryptMessage = async (message: Uint8Array, key: Uint8Array) => {
    const sodium = await getSodium()
    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES)
    const cipher = sodium.crypto_secretbox_easy(message, nonce, key)
    return { cipher, nonce }
  }

  // Déchiffre un message avec une clé symétrique
  const decryptMessage = async (cipher: Uint8Array, nonce: Uint8Array, key: Uint8Array) => {
    const sodium = await getSodium()
    return sodium.crypto_secretbox_open_easy(cipher, nonce, key)
  }

  // Signe un message avec une clé privée
  const sign = async (message: Uint8Array, privateKey: Uint8Array) => {
    const sodium = await getSodium()
    return sodium.crypto_sign_detached(message, privateKey)
  }

  // Vérifie une signature avec une clé publique
  const verifySignature = async (message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array) => {
    const sodium = await getSodium()
    return sodium.crypto_sign_verify_detached(signature, message, publicKey)
  }

  // Calcule un numéro de sécurité basé sur des clés publiques et des identifiants
  const calculateSafetyNumber = async (
    myPublicKey: Uint8Array,
    theirPublicKey: Uint8Array,
    myId: string,
    theirId: string
  ): Promise<string> => {
    const sodium = await getSodium()

    // Convertir les clés en base64
    const myKeyB64 = sodium.to_base64(myPublicKey)
    const theirKeyB64 = sodium.to_base64(theirPublicKey)

    // Déterminer l'ordre stable basé sur les IDs
    let concatStr: string
    if (myId < theirId) {
      concatStr = myId + myKeyB64 + theirId + theirKeyB64
    } else {
      concatStr = theirId + theirKeyB64 + myId + myKeyB64
    }

    // Convertir en Uint8Array UTF-8
    const encoder = new TextEncoder()
    const dataToHash = encoder.encode(concatStr)

    // Hasher avec SHA-512
    const fullHash = sodium.crypto_hash_sha512(dataToHash)

    // Tronquer à 30 premiers octets (240 bits)
    const truncatedHash = fullHash.slice(0, 30)

    // Convertir en une chaîne de chiffres lisibles
    let bitBuffer = 0
    let bitBufferLen = 0
    const digits: string[] = []

    for (const byte of truncatedHash) {
      bitBuffer = (bitBuffer << 8) | byte
      bitBufferLen += 8
      while (bitBufferLen >= 10) { // groupes de 10 bits
        bitBufferLen -= 10
        const number = (bitBuffer >> bitBufferLen) & 0x3ff // 10 bits = 0..1023
        digits.push(number.toString().padStart(4, '0')) // 4 chiffres avec padding
      }
    }

    // S'il reste des bits, on les traite aussi
    if (bitBufferLen > 0) {
      const number = (bitBuffer & ((1 << bitBufferLen) - 1)) << (10 - bitBufferLen)
      digits.push((number & 0x3ff).toString().padStart(4, '0'))
    }

    // Concaténer les groupes avec des espaces tous les 5 groupes (20 chiffres)
    const groups: string[] = []
    for (let i = 0; i < digits.length; i += 5) {
      groups.push(digits.slice(i, i + 5).join(''))
    }

    return groups.join(' ')
  }

  // Chiffre un message avec crypto_box_seal (chiffrement asymétrique sans nonce)
  const seal = async (message: Uint8Array, publicKey: Uint8Array) => {
    const sodium = await getSodium()
    return sodium.crypto_box_seal(message, publicKey)
  }

  // Déchiffre un message avec crypto_box_seal_open (optionnel, pour usage futur)
  const sealOpen = async (cipher: Uint8Array, publicKey: Uint8Array, privateKey: Uint8Array) => {
    const sodium = await getSodium()
    return sodium.crypto_box_seal_open(cipher, publicKey, privateKey)
  }

  // Convertit des données en base64
  const toBase64 = async (data: Uint8Array) => {
    const sodium = await getSodium()
    return sodium.to_base64(data)
  }

  // Convertit une chaîne base64 en Uint8Array
  const fromBase64 = async (data: string) => {
    const sodium = await getSodium()
    return sodium.from_base64(data)
  }

  // Décode une chaîne base64 avec une variante optionnelle
  const decodeBase64 = async (str: string, variant?: number): Promise<Uint8Array> => {
    const sodium = await getSodium()
    return sodium.from_base64(str, variant)
  }

  // Déchiffre un message avec une clé symétrique et un nonce
  const secretboxOpenEasy = async (cipher: Uint8Array, nonce: Uint8Array, key: Uint8Array): Promise<Uint8Array | null> => {
    const sodium = await getSodium()
    return sodium.crypto_secretbox_open_easy(cipher, nonce, key)
  }

  // Retourne la taille du nonce pour le secretbox
  const getSecretboxNonceBytes = async (): Promise<number> => {
    const sodium = await getSodium()
    return sodium.crypto_secretbox_NONCEBYTES
  }

  // Convertit des données en hexadécimal
  const toHex = async (data: Uint8Array) => {
    const sodium = await getSodium()
    return sodium.to_hex(data)
  }

  // Convertit une chaîne hexadécimale en Uint8Array
  const fromHex = async (data: string) => {
    const sodium = await getSodium()
    return sodium.from_hex(data)
  }

  // Convertit une chaîne en Uint8Array
  const stringToUint8Array = (str: string) => {
    return new TextEncoder().encode(str)
  }

  // Convertit un Uint8Array en chaîne
  const uint8ArrayToString = (arr: Uint8Array) => {
    return new TextDecoder().decode(arr)
  }

  return {
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
    decodeBase64,
    secretboxOpenEasy,
    getSecretboxNonceBytes,
    toHex,
    fromHex,
    stringToUint8Array,
    uint8ArrayToString,
    seal,
    sealOpen
  }
}

export { getSodium }