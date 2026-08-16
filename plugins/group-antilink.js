const SIMBOLO = 'ꕥ'
const REGEX_LINK_GRUPO = /chat\.whatsapp\.com\/([0-9A-Za-z]{15,24})/i

const handler = async (m, { conn, text, usedPrefix, chat, isAdmin, isOwner }) => {
  if (!isAdmin && !isOwner) {
    await conn.reply(
      m.chat,
      `${SIMBOLO} *Solo los administradores del grupo pueden usar este comando*`,
      m
    )
    return
  }

  const opcion = (text || '').trim().toLowerCase()

  if (opcion !== 'on' && opcion !== 'off') {
    let texto = `${SIMBOLO} *Antilink*\n\n`
    texto += `> Estado actual: *${chat.antiLink ? 'Activado' : 'Desactivado'}*\n\n`
    texto += `> Ejemplo: *${usedPrefix}antilink on*\n`
    texto += `> Ejemplo: *${usedPrefix}antilink off*`
    await conn.reply(m.chat, texto, m)
    return
  }

  chat.antiLink = opcion === 'on'

  await conn.reply(
    m.chat,
    `${SIMBOLO} *Antilink ${chat.antiLink ? 'activado' : 'desactivado'}*`,
    m
  )
}

handler.before = async function (
  m,
  { conn, chat, isAdmin, isOwner, isMods, isBotAdmin }
) {
  if (!m.isGroup) return false
  if (!chat.antiLink) return false
  if (!m.text) return false
  if (!REGEX_LINK_GRUPO.test(m.text)) return false
  if (isAdmin || isOwner || isMods) return false
  if (!isBotAdmin) return false

  try {
    await conn.sendMessage(m.chat, { delete: m.key })
  } catch (e) {}

  try {
    await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove')
  } catch (e) {}

  const mention = '@' + m.sender.split('@')[0]

  await conn
    .sendMessage(
      m.chat,
      {
        text: `${SIMBOLO} *Antilink*\n\n> ${mention} fue expulsado por enviar un link de invitacion a un grupo`,
        mentions: [m.sender]
      },
      { quoted: m }
    )
    .catch(() => null)

  return true
}

handler.help = ['antilink <on/off>']
handler.tags = ['group']
handler.command = ['antilink']
handler.description = 'Activa o desactiva la expulsion automatica por enviar links de grupo'
handler.group = true
hakdler.admin = true

export default handler
