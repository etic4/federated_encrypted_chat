export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}


export interface UserCreate {
  username: string;
  publicKey: string; // Base64
  encryptedPrivateKey: string; // Base64
  kdfSalt: string; // Base64
  kdfParams: KdfParams;
}

export interface AuthState {
  isAuthenticated: boolean
  user: User | null
  token: string | null
  privateKey: Uint8Array<ArrayBufferLike> | null
  publicKey: string | null
  kdfSalt: string | null
  kdfParams: KdfParams | null  
}


export interface ChallengeResponse {
  challenge: string;
  publicKey: string;
  encryptedPrivateKey: string;
  kdfSalt: string;
  kdfParams: KdfParams;
}

export interface AuthResponse {
  token: string;
  userId: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface KdfParams {
  algorithm: string;
  iterations: number;
  memory: number;
  parallelism: number;
}

export interface Token {
  accessToken: string;
  tokenType: string;
}

export interface ChallengeRequest {
  username: string;
}

export interface VerifyRequest {
  username: string;
  challenge: string; // Base64
  signature: string; // Base64
}

export interface ChangePasswordRequest {
  newEncryptedPrivateKey: string; // Base64
}

export interface UserPublicKeyResponse {
  username: string;
  publicKey: string; // Base64
}

export interface MessageCreateResponse {
  messageId: number;
  timestamp: string; // ISO 8601 format
}


export interface MessageCreate {
  conversationId: number;
  nonce: string; // Base64
  ciphertext: string; // Base64
  associatedData?: Record<string, unknown>;
}

export interface MessageResponse {
  conversationId: number;
  messageId: number;
  senderId: string; // Username
  timestamp: string; // ISO 8601 format
  nonce: string; // Base64
  ciphertext: string; // Base64
  associatedData?: Record<string, unknown>;
}

export interface DecryptedMessage {
  conversationId: number;
  messageId: number;
  senderId: string;
  timestamp: string;
  plaintext: string;
  error?: string;
}

export interface ConversationCreateRequest {
  participants: string[]; // Usernames
  encryptedKeys: Record<string, string>; // username: encryptedKey (Base64)
}

export interface ConversationResponse {
  conversationId: number;
  participants: string[];
  createdAt: string; // ISO 8601 format
}


export interface ParticipantAddRequest {
  userId: number; // ID utilisateur
  encryptedSessionKey: string; // Base64 (clé chiffrée)
}

export interface SessionKeyUpdateRequest {
  participants: string[]; // Usernames restants
  newEncryptedKeys: Record<string, string>; // username: newEncryptedKey
}