declare module 'libsodium-wrappers' {
  interface ISodium {
    ready: Promise<void>;
    crypto_sign_keypair(): { publicKey: Uint8Array; privateKey: Uint8Array };
    // Ajoutez ici d'autres méthodes utilisées dans useCrypto.ts
  }
  const sodium: ISodium;
  export default sodium;
}