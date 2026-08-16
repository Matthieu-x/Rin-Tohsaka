const SIMBOLO = 'ꕥ'

function resolverJid(raw, participants) {
  if (!raw) return raw
  if (raw.endsWith('@lid')) {
    const match = participants?.find((p) => p.lid === raw)
    if (match?.id) return match.id
  }
  return raw
}

const handler = async (m, { conn, participants, isAdmin, isOwner }) => {
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
  const crudo = m.quoted ? m.quoted.sender : menciones[0]
  const objetivo = resolverJid(crudo, participants)

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

    await m.react('✔️')
  } catch (error) {
    await m.react('✖️')
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
