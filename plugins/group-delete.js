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

  if (!m.quoted) {
    await conn.reply(
      m.chat,
      `${SIMBOLO} *Falta el mensaje*\n\n> Responde al mensaje del bot que quieras eliminar con el comando *delete*`,
      m
    )
    return
  }

  try {
    const mensaje = m.quoted

    if (!mensaje?.key) {
      await conn.reply(
        m.chat,
        `${SIMBOLO} *No se pudo eliminar*\n\n> No se encontró la información del mensaje`,
        m
      )
      return
    }

    await conn.sendMessage(m.chat, {
      delete: mensaje.key
    })

    await m.react('✔️')
  } catch (error) {
    await m.react('✖️')
    await conn.reply(
      m.chat,
      `${SIMBOLO} *No se pudo eliminar el mensaje*\n\n> ${error.message}`,
      m
    )
  }
}

handler.help = ['delete']
handler.tags = ['group']
handler.command = ['delete', 'del', 'borrar']
handler.description = 'Elimina un mensaje respondiendo a ese mensaje'
handler.group = true
handler.botAdmin = true

export default handler
