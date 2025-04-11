/**
 * Composable Vue pour la gestion de la cryptographie côté frontend.
 *
 * Ce module centralise toutes les opérations cryptographiques nécessaires à une application de messagerie sécurisée :
 * - Génération et gestion de paires de clés (identité, session)
 * - Dérivation de clés à partir de mots de passe (KDF Argon2id)
 * - Chiffrement/déchiffrement symétrique et asymétrique (libsodium)
 * - Signature et vérification de messages
 * - Encodage/décodage (base64, hex, string)
 * - Calcul de "numéro de sécurité" pour la vérification d'identité
 *
 * Toutes les fonctions sont asynchrones et utilisent la librairie `libsodium-wrappers-sumo` chargée via un plugin Nuxt (window.$sodium).
 *
 * Sécurité :
 * - Les clés privées ne quittent jamais le navigateur.
 * - Les opérations sont faites sur des Uint8Array pour éviter les fuites de données sensibles.
 * - Les paramètres cryptographiques sont choisis pour un bon compromis sécurité/performance (OPSLIMIT/MEMLIMIT modérés).
 *
 * À utiliser dans les composants ou autres composables pour toute opération cryptographique.
 */
import { ref } from 'vue'

// Charge la bibliothèque libsodium depuis l'objet global `window`
/**
 * Récupère l'instance libsodium initialisée sur l'objet global window.
 * Doit être appelée avant toute opération cryptographique.
 * @throws {Error} Si libsodium n'est pas initialisé (plugin manquant ou non chargé)
 * @returns {Promise<typeof import('libsodium-wrappers-sumo')>} Instance sodium prête à l'emploi
 */
const getSodium = async (): Promise<typeof import('libsodium-wrappers-sumo')> => {
  if (!window.$sodium) {
    throw new Error('Libsodium is not initialized')
  }
  return window.$sodium
}

export function useCrypto() {

  /**
   * Génère une paire de clés (publique/privée) pour l'identité d'un utilisateur.
   * Utilise l'algorithme crypto_box (Curve25519, XSalsa20, Poly1305).
   * @returns {Promise<{publicKey: Uint8Array, privateKey: Uint8Array}>}
   * À utiliser pour l'identité principale de l'utilisateur.
   */
  const generateIdentityKeyPair = async () => {
    const sodium = await getSodium()
    return sodium.crypto_box_keypair()
  }

  /**
   * Dérive une clé symétrique à partir d'un mot de passe utilisateur et d'un sel, via Argon2id.
   * @param {string} password - Mot de passe utilisateur (UTF-8)
   * @param {Uint8Array} salt - Sel cryptographique (généré aléatoirement)
   * @returns {Promise<{key: Uint8Array, params: object}>} Clé dérivée et paramètres utilisés
   * Sécurité : le sel doit être unique par utilisateur/mot de passe.
   * Usage : chiffrement de la clé privée sur le device.
   */
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

  /**
   * Génère un sel aléatoire pour la dérivation de clé (KDF).
   * @param {number} [length] - Longueur du sel (par défaut : valeur recommandée par sodium)
   * @returns {Promise<Uint8Array>} Sel aléatoire
   * Usage : à stocker avec le hash de mot de passe ou la clé chiffrée.
   */
  const generateKdfSalt = async (length?: number) => {
    const sodium = await getSodium()
    const saltLength = length ?? sodium.crypto_pwhash_SALTBYTES
    return sodium.randombytes_buf(saltLength)
  }

  /**
   * Chiffre une clé privée (ou tout secret) avec une clé symétrique (ex : issue du KDF).
   * @param {Uint8Array} privateKey - Clé privée à protéger
   * @param {Uint8Array} key - Clé symétrique (ex : issue de deriveKeyFromPassword)
   * @returns {Promise<{cipher: Uint8Array, nonce: Uint8Array}>}
   * Sécurité : le nonce est aléatoire et doit être stocké avec le cipher.
   */
  const encryptPrivateKey = async (privateKey: Uint8Array, key: Uint8Array) => {
    const sodium = await getSodium()
    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES)
    const cipher = sodium.crypto_secretbox_easy(privateKey, nonce, key)
    return { cipher, nonce }
  }

  /**
   * Déchiffre une clé privée chiffrée avec une clé symétrique.
   * @param {Uint8Array} cipher - Données chiffrées
   * @param {Uint8Array} nonce - Nonce utilisé lors du chiffrement
   * @param {Uint8Array} key - Clé symétrique
   * @returns {Promise<Uint8Array|null>} Clé privée ou null si échec (mauvaise clé)
   */
  const decryptPrivateKey = async (cipher: Uint8Array, nonce: Uint8Array, key: Uint8Array) => {
    const sodium = await getSodium()
    return sodium.crypto_secretbox_open_easy(cipher, nonce, key)
  }

  /**
   * Génère une clé de session symétrique aléatoire (pour chiffrer les messages).
   * @returns {Promise<Uint8Array>} Clé de session
   * Usage : pour le chiffrement symétrique temporaire.
   */
  const generateSessionKey = async () => {
    const sodium = await getSodium()
    return sodium.randombytes_buf(sodium.crypto_secretbox_KEYBYTES)
  }

  /**
   * Chiffre un message de façon asymétrique (crypto_box).
   * @param {Uint8Array} message - Message à chiffrer
   * @param {Uint8Array} publicKey - Clé publique du destinataire
   * @param {Uint8Array} privateKey - Clé privée de l'expéditeur
   * @returns {Promise<{cipher: Uint8Array, nonce: Uint8Array}>}
   * Usage : envoi de messages privés.
   */
  const encryptAsymmetric = async (message: Uint8Array, publicKey: Uint8Array, privateKey: Uint8Array) => {
    const sodium = await getSodium()
    const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES)
    const cipher = sodium.crypto_box_easy(message, nonce, publicKey, privateKey)
    return { cipher, nonce }
  }

  /**
   * Déchiffre un message asymétrique (crypto_box).
   * @param {Uint8Array} cipher - Message chiffré
   * @param {Uint8Array} nonce - Nonce utilisé
   * @param {Uint8Array} publicKey - Clé publique de l'expéditeur
   * @param {Uint8Array} privateKey - Clé privée du destinataire
   * @returns {Promise<Uint8Array|null>} Message déchiffré ou null si échec
   */
  const decryptAsymmetric = async (cipher: Uint8Array, nonce: Uint8Array, publicKey: Uint8Array, privateKey: Uint8Array) => {
    const sodium = await getSodium()
    return sodium.crypto_box_open_easy(cipher, nonce, publicKey, privateKey)
  }

  /**
   * Chiffre un message avec une clé symétrique (crypto_secretbox).
   * @param {Uint8Array} message - Message à chiffrer
   * @param {Uint8Array} key - Clé symétrique
   * @returns {Promise<{cipher: Uint8Array, nonce: Uint8Array}>}
   * Usage : messages de session, stockage local.
   */
  const encryptMessage = async (message: Uint8Array, key: Uint8Array) => {
    const sodium = await getSodium()
    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES)
    const cipher = sodium.crypto_secretbox_easy(message, nonce, key)
    return { cipher, nonce }
  }

  /**
   * Déchiffre un message chiffré symétriquement.
   * @param {Uint8Array} cipher - Message chiffré
   * @param {Uint8Array} nonce - Nonce utilisé
   * @param {Uint8Array} key - Clé symétrique
   * @returns {Promise<Uint8Array|null>} Message déchiffré ou null si échec
   */
  const decryptMessage = async (cipher: Uint8Array, nonce: Uint8Array, key: Uint8Array) => {
    const sodium = await getSodium()
    return sodium.crypto_secretbox_open_easy(cipher, nonce, key)
  }

  /**
   * Signe un message avec une clé privée (Ed25519).
   * @param {Uint8Array} message - Message à signer
   * @param {Uint8Array} privateKey - Clé privée de signature
   * @returns {Promise<Uint8Array>} Signature détachée
   * Usage : authentification, vérification d'intégrité.
   */
  const sign = async (message: Uint8Array, privateKey: Uint8Array) => {
    const sodium = await getSodium()
    return sodium.crypto_sign_detached(message, privateKey)
  }

  /**
   * Vérifie la signature d'un message.
   * @param {Uint8Array} message - Message original
   * @param {Uint8Array} signature - Signature à vérifier
   * @param {Uint8Array} publicKey - Clé publique de l'expéditeur
   * @returns {Promise<boolean>} true si valide, false sinon
   */
  const verifySignature = async (message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array) => {
    const sodium = await getSodium()
    return sodium.crypto_sign_verify_detached(signature, message, publicKey)
  }

  /**
   * Calcule un "numéro de sécurité" humainement vérifiable à partir de deux paires (clé publique, id).
   * Permet de vérifier l'authenticité d'une conversation (protection contre MITM).
   * @param {Uint8Array} myPublicKey - Clé publique locale
   * @param {Uint8Array} theirPublicKey - Clé publique distante
   * @param {string} myId - Identifiant local (ex : userId)
   * @param {string} theirId - Identifiant distant
   * @returns {Promise<string>} Numéro de sécurité formaté (groupes de chiffres)
   * Algorithme : concat, hash SHA-512, tronquage, conversion en groupes de chiffres.
   */
  const calculateSafetyNumber = async (
    myPublicKey: Uint8Array,
    theirPublicKey: Uint8Array,
    myId: string,
    theirId: string
  ): Promise<string> => {
    const sodium = await getSodium()
    // Convertir les clés en base64 pour concaténation stable
    const myKeyB64 = sodium.to_base64(myPublicKey)
    const theirKeyB64 = sodium.to_base64(theirPublicKey)
    // Ordre stable pour éviter les collisions
    let concatStr: string
    if (myId < theirId) {
      concatStr = myId + myKeyB64 + theirId + theirKeyB64
    } else {
      concatStr = theirId + theirKeyB64 + myId + myKeyB64
    }
    // Hash SHA-512, tronqué à 30 octets, puis conversion en groupes de 4 chiffres (10 bits)
    const encoder = new TextEncoder()
    const dataToHash = encoder.encode(concatStr)
    const fullHash = sodium.crypto_hash_sha512(dataToHash)
    const truncatedHash = fullHash.slice(0, 30)
    let bitBuffer = 0
    let bitBufferLen = 0
    const digits: string[] = []
    for (const byte of truncatedHash) {
      bitBuffer = (bitBuffer << 8) | byte
      bitBufferLen += 8
      while (bitBufferLen >= 10) {
        bitBufferLen -= 10
        const number = (bitBuffer >> bitBufferLen) & 0x3ff
        digits.push(number.toString().padStart(4, '0'))
      }
    }
    if (bitBufferLen > 0) {
      const number = (bitBuffer & ((1 << bitBufferLen) - 1)) << (10 - bitBufferLen)
      digits.push((number & 0x3ff).toString().padStart(4, '0'))
    }
    // Groupes de 20 chiffres séparés par des espaces
    const groups: string[] = []
    for (let i = 0; i < digits.length; i += 5) {
      groups.push(digits.slice(i, i + 5).join(''))
    }
    return groups.join(' ')
  }

  /**
   * Chiffre un message avec crypto_box_seal (chiffrement asymétrique, anonyme, sans nonce).
   * @param {Uint8Array} message - Message à chiffrer
   * @param {Uint8Array} publicKey - Clé publique du destinataire
   * @returns {Promise<Uint8Array>} Message chiffré
   * Usage : envoi anonyme, onboarding, etc.
   */
  const seal = async (message: Uint8Array, publicKey: Uint8Array) => {
    const sodium = await getSodium()
    return sodium.crypto_box_seal(message, publicKey)
  }

  /**
   * Déchiffre un message chiffré avec crypto_box_seal.
   * @param {Uint8Array} cipher - Message chiffré
   * @param {Uint8Array} publicKey - Clé publique du destinataire
   * @param {Uint8Array} privateKey - Clé privée du destinataire
   * @returns {Promise<Uint8Array|null>} Message déchiffré ou null si échec
   */
  const sealOpen = async (cipher: Uint8Array, publicKey: Uint8Array, privateKey: Uint8Array) => {
    const sodium = await getSodium()
    return sodium.crypto_box_seal_open(cipher, publicKey, privateKey)
  }

  /**
   * Encode des données binaires en base64 (pour stockage ou transmission).
   * @param {Uint8Array} data - Données à encoder
   * @returns {Promise<string>} Chaîne base64
   */
  const toBase64 = async (data: Uint8Array) => {
    const sodium = await getSodium()
    return sodium.to_base64(data)
  }

  /**
   * Décode une chaîne base64 en Uint8Array.
   * @param {string} data - Chaîne base64
   * @returns {Promise<Uint8Array>} Données binaires
   */
  const fromBase64 = async (data: string) => {
    const sodium = await getSodium()
    return sodium.from_base64(data)
  }

  /**
   * Décode une chaîne base64 avec une variante optionnelle (ex : URL-safe).
   * @param {string} str - Chaîne base64
   * @param {number} [variant] - Variante sodium (ex : sodium.base64_variants.URLSAFE)
   * @returns {Promise<Uint8Array>}
   */
  const decodeBase64 = async (str: string, variant?: number): Promise<Uint8Array> => {
    const sodium = await getSodium()
    return sodium.from_base64(str, variant)
  }

  /**
   * Déchiffre un message avec une clé symétrique et un nonce (alias pour compatibilité).
   * @param {Uint8Array} cipher - Message chiffré
   * @param {Uint8Array} nonce - Nonce utilisé
   * @param {Uint8Array} key - Clé symétrique
   * @returns {Promise<Uint8Array|null>}
   */
  const secretboxOpenEasy = async (cipher: Uint8Array, nonce: Uint8Array, key: Uint8Array): Promise<Uint8Array | null> => {
    const sodium = await getSodium()
    return sodium.crypto_secretbox_open_easy(cipher, nonce, key)
  }

  /**
   * Retourne la taille (en octets) du nonce requis pour crypto_secretbox.
   * @returns {Promise<number>}
   */
  const getSecretboxNonceBytes = async (): Promise<number> => {
    const sodium = await getSodium()
    return sodium.crypto_secretbox_NONCEBYTES
  }

  /**
   * Encode des données binaires en hexadécimal (pour debug ou stockage).
   * @param {Uint8Array} data - Données à encoder
   * @returns {Promise<string>} Chaîne hexadécimale
   */
  const toHex = async (data: Uint8Array) => {
    const sodium = await getSodium()
    return sodium.to_hex(data)
  }

  /**
   * Décode une chaîne hexadécimale en Uint8Array.
   * @param {string} data - Chaîne hexadécimale
   * @returns {Promise<Uint8Array>}
   */
  const fromHex = async (data: string) => {
    const sodium = await getSodium()
    return sodium.from_hex(data)
  }

  /**
   * Convertit une chaîne UTF-8 en Uint8Array.
   * @param {string} str - Chaîne à encoder
   * @returns {Uint8Array}
   */
  const stringToUint8Array = (str: string) => {
    return new TextEncoder().encode(str)
  }

  /**
   * Convertit un Uint8Array en chaîne UTF-8.
   * @param {Uint8Array} arr - Données à décoder
   * @returns {string}
   */
  const uint8ArrayToString = (arr: Uint8Array) => {
    return new TextDecoder().decode(arr)
  }

  // Expose toutes les fonctions du composable
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