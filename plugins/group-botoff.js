const SIMBOLO = 'ꕥ'
const SIMBOLO_ALT = '〄'

const handler = async (m, { conn, text, usedPrefix, chat, isAdmin, isOwner, groupMetadata }) => {
  if (!isAdmin && !isOwner) {
    await m.react('✖️')
    await conn.reply(
      m.chat,
      `${SIMBOLO} *Solo un administrador del grupo, el owner o el propio bot pueden usar este comando*`,
      m
    )
    return
  }

  const opcion = (text || '').trim().toLowerCase()

  if (opcion !== 'on' && opcion !== 'off') {
    let texto = `${SIMBOLO} *Estado del bot*\n\n`
    texto += `> Estado actual: *${chat.botOff ? 'Apagado' : 'Encendido'}*\n\n`
    texto += `> Ejemplo: *${usedPrefix}bot off*\n`
    texto += `> Ejemplo: *${usedPrefix}bot on*`
    await conn.reply(m.chat, texto, m)
    return
  }

  chat.botOff = opcion === 'off'

  let texto = `${SIMBOLO} *Bot ${chat.botOff ? 'apagado' : 'encendido'} en este grupo*\n\n`
  texto += `${SIMBOLO_ALT} *Detalles*\n`
  texto += `> Grupo: ${groupMetadata?.subject || 'Este grupo'}\n`
  texto += `> Acción realizada por: @${m.sender.split('@')[0]}\n`
  texto += chat.botOff
    ? `> El bot dejará de responder aquí hasta que se use *${usedPrefix}bot on*`
    : `> El bot volverá a responder normalmente en este grupo`

  await conn.sendMessage(
    m.chat,
    {
      text: texto,
      mentions: [m.sender]
    },
    { quoted: m }
  )

  await m.react('✔️')
}

handler.help = ['bot <on/off>']
handler.tags = ['group']
handler.command = ['bot']
handler.description = 'Apaga o enciende al bot en el grupo donde se usa el comando'
handler.group = true

export default handler
