const SIMBOLO = 'ꕥ'
const API_KEY = 'NTH-hLqNuLVBIZIgkuB1Z29B-6FIs_8ALzQn'
const API_URL = 'https://ianoth.hidenplay.net/api/v1/chat/completions'
const MODELO = 'noth-oss'

if (!global.modoNoth) global.modoNoth = new Map()
if (!global.historialNoth) global.historialNoth = new Map()

const MAX_HISTORIAL = 20

async function preguntarIA(pregunta, chatId) {
  const historial = global.historialNoth.get(chatId) || []

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
      `Error HTTP ${response.status}`
    )
  }

  const respuesta = data?.choices?.[0]?.message?.content?.trim()

  if (!respuesta) {
    throw new Error('Noth no devolvió ninguna respuesta')
  }

  historial.push({ role: 'user', content: pregunta })
  historial.push({ role: 'assistant', content: respuesta })

  if (historial.length > MAX_HISTORIAL * 2) {
    historial.splice(0, historial.length - MAX_HISTORIAL * 2)
  }

  global.historialNoth.set(chatId, historial)

  return respuesta
}

const handler = async (m, { conn, text, command, usedPrefix }) => {
  const chatId = m.chat || m.key?.remoteJid

  if (command === 'noth') {
    const opcion = text?.trim()?.toLowerCase()

    if (opcion === 'off' || opcion === '0' || opcion === 'no' || opcion === 'desactivar') {
      global.modoNoth.delete(chatId)
      global.historialNoth.delete(chatId)
      await m.react('✔️')
      return conn.reply(chatId, `${SIMBOLO} *Modo Noth desactivado*`, m)
    }

    global.modoNoth.set(chatId, true)
    global.historialNoth.set(chatId, [])
    await m.react('✔️')
    return conn.reply(chatId, `${SIMBOLO} *Modo Noth activado*\n\n> Responde a cualquier mensaje sin prefijo\n> Usa *.noth off* para desactivar`, m)
  }

  const pregunta = text?.trim()

  if (!pregunta) {
    await m.react('✖️')
    return conn.reply(chatId, `${SIMBOLO} *Escribe algo*\n\n> Ejemplo: .nothmini Hola`, m)
  }

  try {
    await m.react('⏳')
    const respuesta = await preguntarIA(pregunta, chatId)
    await conn.reply(chatId, `${SIMBOLO} *Noth OSS*\n\n${respuesta}`, m)
    await m.react('✔️')
  } catch (error) {
    await m.react('✖️')
    await conn.reply(chatId, `${SIMBOLO} *Error*\n\n> ${error.message}`, m)
  }
}

handler.before = async function (m, { conn }) {
  const chatId = m.chat || m.key?.remoteJid

  if (!chatId) return false

  if (!global.modoNoth.get(chatId)) return false

  if (m.key?.fromMe) return false

  const texto = (m.text || '').trim()
  if (!texto) return false

  // Ignorar comandos (que empiezan con prefijo del bot)
  const prefix = global.prefix
  let esComando = false

  if (prefix instanceof RegExp) {
    esComando = prefix.test(texto)
  } else if (typeof prefix === 'string') {
    esComando = texto.startsWith(prefix)
  } else {
    esComando = texto.startsWith('.')
  }

  if (esComando) return false

  // Responde
  try {
    const respuesta = await preguntarIA(texto, chatId)
    await conn.reply(chatId, `${SIMBOLO} *Noth OSS*\n\n${respuesta}`, m)
  } catch (error) {
    // Silencioso para no spamear
    console.log('[NOTH] Error:', error.message)
  }

  return false
}

handler.help = ['noth', 'nothmini <texto>']
handler.tags = ['ai']
handler.command = ['noth', 'nothmini', 'nmini']
handler.description = 'Modo conversación continua con Noth OSS'

export default handler