const SIMBOLO = 'ꕥ'
const API_KEY = 'NTH-hLqNuLVBIZIgkuB1Z29B-6FIs_8ALzQn'
const API_URL = 'https://ianoth.hidenplay.net/api/v1/chat/completions'
const MODELO = 'noth-oss'

// Map global para saber en qué chats está activo el modo conversación
if (!global.modoNoth) global.modoNoth = new Map()
// Map global para guardar el historial de cada chat
if (!global.historialNoth) global.historialNoth = new Map()

const MAX_HISTORIAL = 10

async function preguntarIA(pregunta, chatId) {
  // Recuperar historial del chat
  const historial = global.historialNoth.get(chatId) || []

  // Armar array de mensajes con el historial + la nueva pregunta
  const messages = [
    ...historial,
    { role: 'user', content: pregunta }
  ]

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY
    },
    body: JSON.stringify({
      model: MODELO,
      messages
    })
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
      data?.error ||
      'Error al conectar con Noth API'
    )
  }

  const respuesta = data?.choices?.[0]?.message?.content?.trim()

  if (!respuesta) {
    throw new Error('Noth no devolvió ninguna respuesta')
  }

  // Actualizar historial: agregar pregunta y respuesta
  historial.push({ role: 'user', content: pregunta })
  historial.push({ role: 'assistant', content: respuesta })

  // Recortar si supera el máximo
  if (historial.length > MAX_HISTORIAL * 2) {
    historial.splice(0, historial.length - MAX_HISTORIAL * 2)
  }

  global.historialNoth.set(chatId, historial)

  return respuesta
}

const handler = async (m, { conn, text, command, usedPrefix }) => {
  const chatId = m.chat

  // --- COMANDO .noth (activar/desactivar modo conversación) ---
  if (command === 'noth') {
    const opcion = text?.trim()?.toLowerCase()

    if (opcion === 'off' || opcion === '0' || opcion === 'no' || opcion === 'desactivar') {
      global.modoNoth.delete(chatId)
      global.historialNoth.delete(chatId)
      await m.react('✔️')
      return conn.reply(chatId, `${SIMBOLO} *Modo Noth desactivado*\n\n> Ya no responderé automáticamente en este chat.`, m)
    }

    global.modoNoth.set(chatId, true)
    global.historialNoth.set(chatId, [])
    await m.react('✔️')
    return conn.reply(chatId, `${SIMBOLO} *Modo Noth activado*\n\n> Ahora responderé a todos los mensajes de este chat sin necesidad de usar un prefijo.\n> Escribe *.noth off* para desactivar.`, m)
  }

  // --- COMANDO .nothmini (pregunta directa, sin activar modo) ---
  const pregunta = text?.trim()

  if (!pregunta) {
    await m.react('✖️')
    return conn.reply(chatId, `${SIMBOLO} *Escribe algo para preguntarle a Noth*\n\n> Ejemplo: .nothmini Hola, ¿cómo estás?`, m)
  }

  try {
    await m.react('⏳')
    const respuesta = await preguntarIA(pregunta, chatId)
    await conn.reply(chatId, `${SIMBOLO} *Noth OSS*\n\n${respuesta}`, m)
    await m.react('✔️')
  } catch (error) {
    await m.react('✖️')
    await conn.reply(chatId, `${SIMBOLO} *No se pudo consultar Noth*\n\n> ${error.message}`, m)
  }
}

// Este before se ejecuta en CADA mensaje del bot, antes de que se procesen los comandos
handler.before = async function (m, { conn }) {
  const chatId = m.chat

  // Si el mensaje es un comando con prefijo, no interceptar
  const texto = m.text || ''
  const prefijo = global.prefix || '.'
  if (texto.startsWith(prefijo)) return

  // Si el chat no está en modo Noth, no interceptar
  if (!global.modoNoth.get(chatId)) return

  // Evitar que el bot se responda a sí mismo
  if (m.key.fromMe) return

  // Si no hay texto, ignorar
  if (!texto.trim()) return

  // Consultar a la IA y responder
  try {
    const respuesta = await preguntarIA(texto.trim(), chatId)
    await conn.reply(chatId, `${SIMBOLO} *Noth OSS*\n\n${respuesta}`, m)
  } catch (error) {
    // Silencioso para no spamear si falla
  }
}

handler.help = ['noth', 'nothmini <texto>']
handler.tags = ['ai']
handler.command = ['noth', 'nothmini', 'nmini']
handler.description = 'Activa el modo conversación continua o pregunta directamente a Noth OSS'

export default handler