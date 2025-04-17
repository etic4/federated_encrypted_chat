/**
 * Composable pour la gestion des messages chiffrés dans une application de chat.
 * Fournit les fonctions d'envoi et de chargement de l'historique des messages pour une conversation donnée,
 * en s'appuyant sur les stores Pinia (auth, messages, conversations) et des utilitaires cryptographiques.
 * Les messages sont chiffrés côté client avant envoi et déchiffrés lors du chargement de l'historique.
 * Ce composable assure la confidentialité des messages et la gestion des erreurs liées au chiffrement/déchiffrement.
 */

import { useAuthStore } from '@/stores/auth'
import { useMessageStore } from '@/stores/messages'
import { useCrypto } from '@/composables/useCrypto'
import { useConversationsStore } from '@/stores/conversations'
import type { DecryptedMessage, MessageCreate, MessageCreateResponse, MessageResponse } from '~/types/models'
import { useApiFetch } from './useApiFetch'

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

      // Récupère la clé de session pour la conversation
      const sessionKey = conversationStore.getSessionKey(conversationId)
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

      // Convertit le message en clair en tableau d'octets
      const plaintextBytes = crypto.stringToUint8Array(plaintext)

      // Chiffre le message avec la clé de session
      const { cipher, nonce } = await crypto.encryptMessage(plaintextBytes, sessionKey)

      // Encode les éléments nécessaires en base64 pour l'envoi
      const nonceB64 = await crypto.toBase64(nonce)
      const ciphertextB64 = await crypto.toBase64(cipher)

      // Prépare la charge utile à envoyer à l'API
      const payload: MessageCreate = {
        conversationId,
        nonce: nonceB64,
        ciphertext: ciphertextB64,
        associatedData: associatedDataObj
      }

      try {
        // Envoie le message chiffré à l'API backend
        const response = await useApiFetch<MessageCreateResponse>('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authStore.getAuthToken ? `Bearer ${authStore.getAuthToken}` : ''
          },
          body: payload
        })

        console.log('Réponse API:', response)

        // Optionnel : mise à jour optimiste du store local (décommenter si souhaité)
        // messageStore.addMessage(conversationId, {
        //   sender: username,
        //   content: plaintext,
        //   timestamp: new Date().toISOString()
        // })

    } catch (error: any) {
      // Vérifie si l'erreur est liée à l'authentification
      // Si l'erreur est 401, on peut supposer que le token a expiré ou est invalide
      if (error?.status === 401) {
        authStore.clearAuthState();
      }
      console.error('Erreur lors de l\'envoi du message:', error);
    }
  }

  /**
   * Charge et déchiffre l'historique des messages d'une conversation.
   * @param conversationId - Identifiant de la conversation cible
   */
  async function loadHistory(conversationId: number) {
    const crypto = useCrypto()
      // Récupère l'historique chiffré depuis l'API backend
      try {
      const messagesList = await useApiFetch<MessageResponse[]>(`/api/conversations/${conversationId}/messages`, {
        method: 'GET',
        headers: {
          'Authorization': authStore.getAuthToken ? `Bearer ${authStore.getAuthToken}` : ''
        }
      })
       // Récupère la clé de session pour la conversation
       const sessionKey = conversationStore.getSessionKey(conversationId)
       if (!sessionKey) {
         throw new Error('Clé de session introuvable pour cette conversation')
       }
 
       // Tableau pour stocker les messages déchiffrés
       const decryptedMessages: DecryptedMessage[] = []
 
       // Parcourt chaque message reçu
       for (const msg of messagesList) {
         try {
           // Décode les champs base64 en Uint8Array
           const nonce = await crypto.fromBase64(msg.nonce)
           const ciphertext = await crypto.fromBase64(msg.ciphertext)
 
           // Déchiffre le message
           const plaintextBytes = await crypto.decryptMessage(ciphertext, nonce, sessionKey)
           if (!plaintextBytes) {
             throw new Error('Erreur déchiffement message')
           }
           const plaintext = crypto.uint8ArrayToString(plaintextBytes)
 
           // Ajoute le message déchiffré au tableau
           decryptedMessages.push({
             conversationId: msg.conversationId,
             messageId: msg.messageId,
             senderId: msg.senderId,
             plaintext: plaintext,
             timestamp: msg.timestamp
           })
         } catch (error) {
           // En cas d'échec de déchiffrement, ajoute un message d'erreur
           console.error('Erreur déchiffrement message', error)
           decryptedMessages.push({
             conversationId: msg.conversationId,
             messageId: msg.messageId,
             senderId: msg.senderId,
             plaintext: '***ERREUR DE DÉCHIFFREMENT***',
             timestamp: msg.timestamp,
             error: 'Erreur de déchiffrement'
           })
         }
       }
 
       // Met à jour le store local avec les messages déchiffrés
       messageStore.setMessagesForConversation(conversationId, decryptedMessages)
    } catch (error: any) {
      console.error('Erreur API chargement historique')
      if (error.status == 401) {
        authStore.clearAuthState();
      }
    }
  }

  // Expose les fonctions principales du composable
  return {
    sendMessage,
    loadHistory
  }
}