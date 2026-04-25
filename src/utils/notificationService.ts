import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from '../types';

export const sendNotification = async (
  targetUsers: User[],
  title: string,
  message: string
) => {
  try {
    for (const u of targetUsers) {
      if (!u.uid) continue;
      
      // Cria a notificação no Firestore para o usuário
      // O app local ou uma Firebase Function pode processar este documento para enviar o push de fato
      // para u.fcmTokens
      await addDoc(collection(db, "notifications"), {
        userId: u.uid,
        title,
        message,
        read: false,
        createdAt: new Date().toISOString(),
        fcmTokens: u.fcmTokens || [] // Salva os tokens caso um trigger backend precise deles
      });
    }
  } catch (error) {
    console.error("Erro ao enviar notificação: ", error);
  }
};
