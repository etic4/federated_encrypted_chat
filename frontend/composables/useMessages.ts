import { useAuthStore } from '@/stores/auth'
import { useMessageStore } from '@/stores/messages'
import { useCrypto } from '@/composables/useCrypto'
import { useConversationsStore } from '@/stores/conversations'

export function useMessages() {
  const authStore = useAuthStore()
  const messageStore = useMessageStore()
  const conversationStore = useConversationsStore()
  const crypto = useCrypto()

  async function sendMessage(conversationId: number, plaintext: string) {
    try {
      const sessionKey = await messageStore.getConversationKey(conversationId)
      if (!sessionKey) {
        throw new Error('Clé de session introuvable')
      }

      const username = authStore.getUsername
      if (!username) {
        throw new Error('Utilisateur non authentifié')
      }

      const associatedDataObj = { convId: conversationId, senderId: username }
      const associatedDataStr = JSON.stringify(associatedDataObj)
      const associatedData = crypto.stringToUint8Array(associatedDataStr)

      const plaintextBytes = crypto.stringToUint8Array(plaintext)

      const { cipher, nonce } = await crypto.encryptMessage(plaintextBytes, sessionKey)

      const sodium = await (globalThis as any).$sodium

      const nonceB64 = sodium.to_base64(nonce)
      const ciphertextB64 = sodium.to_base64(cipher)
      const associatedDataB64 = sodium.to_base64(associatedData)

      const payload = {
        conversationId,
        nonce: nonceB64,
        ciphertext: ciphertextB64,
        associatedData: associatedDataB64
      }

      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authStore.getAuthToken ? `Bearer ${authStore.getAuthToken}` : ''
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        console.error('Erreur API envoi message', await response.text())
        throw new Error('Erreur lors de l’envoi du message')
      }

      // Optionnel : optimistic update
      // messageStore.addMessage(conversationId, {
      //   sender: username,
      //   content: plaintext,
      //   timestamp: new Date().toISOString()
      // })

    } catch (error) {
      console.error('Erreur envoi message:', error)
      throw error
    }
  }

  async function loadHistory(conversationId: number) {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'GET',
        headers: {
          'Authorization': authStore.getAuthToken ? `Bearer ${authStore.getAuthToken}` : ''
        }
      })

      if (!response.ok) {
        console.error('Erreur API chargement historique', await response.text())
        throw new Error('Erreur lors du chargement de l’historique')
      }

      const data = await response.json()
      const sodium = await (globalThis as any).$sodium

      const sessionKey = conversationStore.getSessionKey(conversationId)
      if (!sessionKey) {
        throw new Error('Clé de session introuvable pour cette conversation')
      }

      const decryptedMessages = []

      for (const msg of data) {
        try {
          const nonce = sodium.from_base64(msg.nonce)
          const ciphertext = sodium.from_base64(msg.ciphertext)
          const authTag = msg.authTag ? sodium.from_base64(msg.authTag) : undefined
          const associatedData = msg.associatedData ? sodium.from_base64(msg.associatedData) : undefined

          const plaintextBytes = await crypto.decryptMessage(ciphertext, nonce, sessionKey)
          const plaintext = crypto.uint8ArrayToString(plaintextBytes)

          decryptedMessages.push({
            messageId: msg.id,
            senderId: msg.sender,
            plaintext: plaintext,
            timestamp: msg.timestamp
          })
        } catch (error) {
          console.error('Erreur déchiffrement message', error)
          decryptedMessages.push({
            messageId: msg.id,
            senderId: msg.sender,
            plaintext: '',
            timestamp: msg.timestamp,
            error: 'Erreur de déchiffrement'
          })
        }
      }

      messageStore.setMessagesForConversation(conversationId, decryptedMessages)
    } catch (error) {
      console.error('Erreur chargement historique:', error)
    }
  }

  return {
    sendMessage,
    loadHistory
  }
}