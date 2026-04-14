import { GoogleGenAI, Type } from "@google/genai";

let ai: GoogleGenAI | null = null;

function getAiClient() {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY não está configurada nas variáveis de ambiente.");
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

export async function parseCommand(command: string) {
  const aiClient = getAiClient();
  const response = await aiClient.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Interprete o comando: "${command}". 
    Determine a ação: CREATE_EVENT, CREATE_VOLUNTEER, CREATE_NOTIFICATION, ou CREATE_ANNOUNCEMENT.
    
    Se CREATE_EVENT: retorne title, type (CULTO, ENSAIO, REUNIAO), date (ISO string), description.
    Também suporte RECORRÊNCIA: se o usuário pedir algo como "toda quinta", retorne isRecurring: true, frequency: "WEEKLY", daysOfWeek: [4] (0=dom, 1=seg...), e durationMonths (número de meses para gerar).
    
    Se CREATE_VOLUNTEER: retorne displayName, email, role (LIDER_I, LIDER_II, VOLUNTARIO), specialty.
    Se CREATE_NOTIFICATION: retorne title, message, targetUserEmail (opcional).
    Se CREATE_ANNOUNCEMENT: retorne title, date (ISO string), description.

    Retorne SEMPRE um JSON com o campo "action" e os campos específicos.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          action: { type: Type.STRING, enum: ["CREATE_EVENT", "CREATE_VOLUNTEER", "CREATE_NOTIFICATION", "CREATE_ANNOUNCEMENT"] },
          event: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["CULTO", "ENSAIO", "REUNIAO"] },
              date: { type: Type.STRING },
              description: { type: Type.STRING },
              isRecurring: { type: Type.BOOLEAN },
              frequency: { type: Type.STRING, enum: ["WEEKLY", "MONTHLY"] },
              daysOfWeek: { type: Type.ARRAY, items: { type: Type.NUMBER } },
              durationMonths: { type: Type.NUMBER }
            }
          },
          volunteer: {
            type: Type.OBJECT,
            properties: {
              displayName: { type: Type.STRING },
              email: { type: Type.STRING },
              role: { type: Type.STRING, enum: ["LIDER_I", "LIDER_II", "VOLUNTARIO"] },
              specialty: { type: Type.STRING }
            }
          },
          notification: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              message: { type: Type.STRING },
              targetUserEmail: { type: Type.STRING }
            }
          },
          announcement: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              date: { type: Type.STRING },
              description: { type: Type.STRING }
            }
          }
        },
        required: ["action"]
      }
    }
  });

  return JSON.parse(response.text);
}
