/**
 * Composable Vue 3 pour la gestion des messages chiffrés dans une application de chat.
 * Fournit les fonctions d'envoi et de chargement de l'historique des messages pour une conversation donnée,
 * en s'appuyant sur les stores Pinia (auth, messages, conversations) et des utilitaires cryptographiques.
 * Les messages sont chiffrés côté client avant envoi et déchiffrés lors du chargement de l'historique.
 * Ce composable assure la confidentialité des messages et la gestion des erreurs liées au chiffrement/déchiffrement.
 */

import { useAuthStore } from '@/stores/auth'
import { useMessageStore } from '@/stores/messages'
import { useCrypto } from '@/composables/useCrypto'
import { useConversationsStore } from '@/stores/conversations'

/**
 * Composable fournissant les fonctions d'envoi et de chargement des messages chiffrés
 * pour une conversation donnée.
 */
export function useMessages() {
  // Accès aux stores nécessaires (authentification, messages, conversations)
  const authStore = useAuthStore()
  const messageStore = useMessageStore()
  const conversationStore = useConversationsStore()
  const crypto = useCrypto()

  /**
   * Envoie un message chiffré dans une conversation.
   * @param conversationId - Identifiant de la conversation cible
   * @param plaintext - Message en clair à envoyer
   */
  async function sendMessage(conversationId: number, plaintext: string) {
    try {
      // Récupère la clé de session pour la conversation
      const sessionKey = await messageStore.getConversationKey(conversationId)
      if (!sessionKey) {
        throw new Error('Clé de session introuvable')
      }

      // Récupère le nom d'utilisateur de l'expéditeur
      const username = authStore.getUsername
      if (!username) {
        throw new Error('Utilisateur non authentifié')
      }

      // Prépare les données associées (utilisées pour l'authentification du message)
      const associatedDataObj = { convId: conversationId, senderId: username }
      const associatedDataStr = JSON.stringify(associatedDataObj)
      const associatedData = crypto.stringToUint8Array(associatedDataStr)

      // Convertit le message en clair en tableau d'octets
      const plaintextBytes = crypto.stringToUint8Array(plaintext)

      // Chiffre le message avec la clé de session
      const { cipher, nonce } = await crypto.encryptMessage(plaintextBytes, sessionKey)

      // Récupère l'instance sodium (librairie de cryptographie)
      const sodium = await (globalThis as any).$sodium

      // Encode les éléments nécessaires en base64 pour l'envoi
      const nonceB64 = sodium.to_base64(nonce)
      const ciphertextB64 = sodium.to_base64(cipher)
      const associatedDataB64 = sodium.to_base64(associatedData)

      // Prépare la charge utile à envoyer à l'API
      const payload = {
        conversationId,
        nonce: nonceB64,
        ciphertext: ciphertextB64,
        associatedData: associatedDataB64
      }

      // Envoie le message chiffré à l'API backend
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authStore.getAuthToken ? `Bearer ${authStore.getAuthToken}` : ''
        },
        body: JSON.stringify(payload)
      })

      // Vérifie la réponse de l'API
      if (!response.ok) {
        console.error('Erreur API envoi message', await response.text())
        throw new Error('Erreur lors de l’envoi du message')
      }

      // Optionnel : mise à jour optimiste du store local (décommenter si souhaité)
      // messageStore.addMessage(conversationId, {
      //   sender: username,
      //   content: plaintext,
      //   timestamp: new Date().toISOString()
      // })

    } catch (error) {
      // Gestion des erreurs lors de l'envoi
      console.error('Erreur envoi message:', error)
      throw error
    }
  }

  /**
   * Charge et déchiffre l'historique des messages d'une conversation.
   * @param conversationId - Identifiant de la conversation cible
   */
  async function loadHistory(conversationId: number) {
    try {
      // Récupère l'historique chiffré depuis l'API backend
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'GET',
        headers: {
          'Authorization': authStore.getAuthToken ? `Bearer ${authStore.getAuthToken}` : ''
        }
      })

      // Vérifie la réponse de l'API
      if (!response.ok) {
        console.error('Erreur API chargement historique', await response.text())
        throw new Error('Erreur lors du chargement de l’historique')
      }

      // Récupère les données JSON (liste des messages chiffrés)
      const data = await response.json()
      // Récupère l'instance sodium (librairie de cryptographie)
      const sodium = await (globalThis as any).$sodium

      // Récupère la clé de session pour la conversation
      const sessionKey = conversationStore.getSessionKey(conversationId)
      if (!sessionKey) {
        throw new Error('Clé de session introuvable pour cette conversation')
      }

      // Tableau pour stocker les messages déchiffrés
      const decryptedMessages = []

      // Parcourt chaque message reçu
      for (const msg of data) {
        try {
          // Décode les champs base64 en Uint8Array
          const nonce = sodium.from_base64(msg.nonce)
          const ciphertext = sodium.from_base64(msg.ciphertext)
          // Champs optionnels (non utilisés ici mais prévus pour compatibilité)
          const authTag = msg.authTag ? sodium.from_base64(msg.authTag) : undefined
          const associatedData = msg.associatedData ? sodium.from_base64(msg.associatedData) : undefined

          // Déchiffre le message
          const plaintextBytes = await crypto.decryptMessage(ciphertext, nonce, sessionKey)
          const plaintext = crypto.uint8ArrayToString(plaintextBytes)

          // Ajoute le message déchiffré au tableau
          decryptedMessages.push({
            messageId: msg.id,
            senderId: msg.sender,
            plaintext: plaintext,
            timestamp: msg.timestamp
          })
        } catch (error) {
          // En cas d'échec de déchiffrement, ajoute un message d'erreur
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

      // Met à jour le store local avec les messages déchiffrés
      messageStore.setMessagesForConversation(conversationId, decryptedMessages)
    } catch (error) {
      // Gestion des erreurs lors du chargement de l'historique
      console.error('Erreur chargement historique:', error)
    }
  }

  // Expose les fonctions principales du composable
  return {
    sendMessage,
    loadHistory
  }
}