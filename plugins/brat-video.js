const SIMBOLO = 'ꕥ'
const SIMBOLO_ALT = '〄'

const API_URL = 'https://noth.hidenplay.net/api/herramientas/bratvideo'
const API_KEY = 'nothPniC'

const handler = async (m, { conn, text, args, usedPrefix, command }) => {
  try {
    const texto = text?.trim() || args.join(' ').trim()

    if (!texto) {
      await m.react('✖️')
      return conn.reply(
        m.chat,
        `${SIMBOLO} *Ingresa un texto para generar el video*\n\n` +
        `${SIMBOLO_ALT} *Ejemplo*\n` +
        `> ${usedPrefix + command} Noth API`,
        m
      )
    }

    await m.react('🕒')

    const url = `${API_URL}?text=${encodeURIComponent(texto)}&apikey=${API_KEY}`
    const res = await fetch(url)
    const json = await res.json()

    if (!json?.status || !json?.data?.url) {
      throw new Error('La API no devolvió un video válido')
    }

    const videoUrl = json.data.url
    const caption =
      `${SIMBOLO} *Brat Video*\n\n` +
      `${SIMBOLO_ALT} *Detalles*\n` +
      `> Texto: ${texto}\n` +
      `> Tipo: ${json.data.type}\n` +
      `> Solicitado por: @${m.sender.split('@')[0]}`

    await conn.sendMessage(
      m.chat,
      {
        video: { url: videoUrl },
        caption,
        mentions: [m.sender]
      },
      { quoted: m }
    )

    await m.react('✔️')
  } catch (error) {
    await m.react('✖️')
    await conn.reply(
      m.chat,
      `${SIMBOLO} *No se pudo generar el video*\n\n> ${error.message}`,
      m
    )
  }
}

handler.help = ['brat <texto>']
handler.tags = ['tools']
handler.command = ['brat', 'bratvideo']
handler.description = 'Genera un video estilo brat con el texto indicado'

export default handler