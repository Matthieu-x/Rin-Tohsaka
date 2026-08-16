const SIMBOLO = 'ꕥ'
const SIMBOLO_ALT = '〄'

const handler = async (m, { conn, isAdmin, isOwner }) => {
  if (!isAdmin && !isOwner) {
    await m.react('✖️')
    await conn.reply(
      m.chat,
      `${SIMBOLO} *Solo los administradores del grupo pueden usar este comando*`,
      m
    )
    return
  }

  const menciones = (await m.mentionedJid) || []
  const objetivo = m.quoted
    ? m.quoted.sender
    : menciones[0]

  if (!objetivo) {
    await conn.reply(
      m.chat,
      `${SIMBOLO} *Falta el usuario*\n\n> Menciona a alguien o responde su mensaje con el comando *demote*`,
      m
    )
    return
  }

  try {
    await conn.groupParticipantsUpdate(m.chat, [objetivo], 'demote')

    const mention = '@' + objetivo.split('@')[0]

    let texto = `${SIMBOLO} *Administrador removido*\n\n`
    texto += `${SIMBOLO_ALT} *Detalles*\n`
    texto += `> Usuario: ${mention}\n`
    texto += `> Removido por: @${m.sender.split('@')[0]}`

    await conn.sendMessage(
      m.chat,
      {
        text: texto,
        mentions: [objetivo, m.sender]
      },
      { quoted: m }
    )

    await m.react('✔️')
  } catch (error) {
    await m.react('✖️')
    await conn.reply(
      m.chat,
      `${SIMBOLO} *No se pudo quitar admin*\n\n> ${error.message}`,
      m
    )
  }
}

handler.help = ['demote']
handler.tags = ['group']
handler.command = ['demote', 'unadmin', 'revoke']
handler.description = 'Quita admin a un usuario del grupo'
handler.group = true
handler.botAdmin = true

export default handler
