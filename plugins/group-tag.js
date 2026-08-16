const SIMBOLO = 'ꕥ'

const handler = async (m, { conn, text, participants, isAdmin, isOwner }) => {
  if (!isAdmin && !isOwner) {
    await m.react('✖️')
    await conn.reply(
      m.chat,
      `${SIMBOLO} *Solo los administradores del grupo pueden usar este comando*`,
      m
    )
    return
  }

  if (!participants?.length) {
    await m.react('✖️')
    await conn.reply(m.chat, `${SIMBOLO} *No se pudo obtener la lista de participantes*`, m)
    return
  }

  const mensaje = (text || '').trim()

  if (!mensaje) {
    await conn.reply(
      m.chat,
      `${SIMBOLO} *Falta el mensaje*\n\n> Ejemplo: *.tag hola*`,
      m
    )
    return
  }

  try {
    await conn.sendMessage(
      m.chat,
      {
        text: mensaje,
        mentions: participants.map((p) => p.id)
      },
      { quoted: m }
    )

    await m.react('✔️')
  } catch (error) {
    await m.react('✖️')
    await conn.reply(m.chat, `${SIMBOLO} *No se pudo enviar*\n\n> ${error.message}`, m)
  }
}

handler.help = ['tag <mensaje>']
handler.tags = ['group']
handler.command = ['tag']
handler.description = 'Manda un mensaje mencionando a todos los miembros sin listarlos'
handler.group = true

export default handler
