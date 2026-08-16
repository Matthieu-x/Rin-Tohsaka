const SIMBOLO = 'ꕥ'

const handler = async (m, { conn, isAdmin, isOwner }) => {
  if (!isAdmin && !isOwner) {
    await conn.reply(
      m.chat,
      `${SIMBOLO} *Solo los administradores del grupo pueden usar este comando*`,
      m
    )
    return
  }

  const objetivo = m.quoted
    ? m.quoted.sender
    : m.mentionedJid && m.mentionedJid[0]

  if (!objetivo) {
    await conn.reply(
      m.chat,
      `${SIMBOLO} *Falta el usuario*\n\n> Menciona a alguien o responde su mensaje con el comando *kick*`,
      m
    )
    return
  }

  try {
    await conn.groupParticipantsUpdate(m.chat, [objetivo], 'remove')

    const mention = '@' + objetivo.split('@')[0]

    await conn.sendMessage(
      m.chat,
      {
        text: `${SIMBOLO} *${mention} fue expulsado del grupo*`,
        mentions: [objetivo]
      },
      { quoted: m }
    )
  } catch (error) {
    await conn.reply(
      m.chat,
      `${SIMBOLO} *No se pudo expulsar*\n\n> ${error.message}`,
      m
    )
  }
}

handler.help = ['kick <@mencion>']
handler.tags = ['group']
handler.command = ['kick', 'expulsar']
handler.description = 'Expulsa a un usuario del grupo'
handler.group = true
handler.botAdmin = true

export default handler
