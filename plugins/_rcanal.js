import fs from 'fs'
import path from 'path'

export async function before(m, { conn }) {
  try {
    let nombreBot = global.botname || 'Bot'
    let bannerFinal = 'https://files.catbox.moe/wp5z1y.jpg'

    const botActual = conn.user?.jid?.split('@')[0]?.replace(/\D/g, '')

    const configPath = path.join(
      './Sessions/SubBot',
      botActual,
      'config.json'
    )

    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(
          fs.readFileSync(configPath, 'utf8')
        )

        if (config.name) nombreBot = config.name
        if (config.banner) bannerFinal = config.banner

      } catch (err) {
        console.log(
          '⚠️ No se pudo leer config del subbot en rcanal:',
          err
        )
      }
    }

    // Canal aleatorio configurado globalmente
    const canales = [
      global.idcanal,
      global.idcanal2
    ].filter(Boolean)

    const newsletterJidRandom =
      canales.length
        ? canales[Math.floor(Math.random() * canales.length)]
        : null

    // Usa el canal generado por _fakes.js
    const channelData = global.channelRD || {
      id: newsletterJidRandom || '120363403739366547@newsletter',
      name: 'Duan 𝗖𝗛𝗡𝗟︎'
    }

    global.rcanal = {
      contextInfo: {
        isForwarded: true,
        forwardingScore: 1,

        forwardedNewsletterMessageInfo: {
          newsletterJid: channelData.id,
          serverMessageId: 100,
          newsletterName: channelData.name
        },

        externalAdReply: {
          title: nombreBot,
          body: '✎ ⍴᥆ᥕᥱrᥱძ ᑲᥡ 𝗗𝘂𝗮𝗻',
          thumbnailUrl: bannerFinal,
          sourceUrl: 'https://api-adonix.ultraplus.click',
          mediaType: 1,
          renderLargerThumbnail: false
        }
      }
    }

  } catch (e) {
    console.log('Error al generar rcanal:', e)
  }
}