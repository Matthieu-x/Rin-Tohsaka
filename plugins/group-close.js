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

  try {
    await conn.groupSettingUpdate(m.chat, 'announcement')

    let texto = `${SIMBOLO} *Grupo cerrado*\n\n`
    texto += `${SIMBOLO_ALT} *Detalles*\n`
    texto += `> Grupo: ${m.chat}\n`
    texto += `> Acción realizada por: @${m.sender.split('@')[0]}\n`
    texto += `> Los usuarios ya no pueden enviar mensajes`

    await conn.sendMessage(
      m.chat,
      {
        text: texto,
        mentions: [m.sender]
      },
      { quoted: m }
    )

    await m.react('✔️')
  } catch (error) {
    await m.react('✖️')
    await conn.reply(
      m.chat,
      `${SIMBOLO} *No se pudo cerrar el grupo*\n\n> ${error.message}`,
      m
    )
  }
}

handler.help = ['close']
handler.tags = ['group']
handler.command = ['close', 'cerrar']
handler.description = 'Cierra el grupo para que solo los administradores puedan enviar mensajes'
handler.group = true
handler.botAdmin = true

export default handler