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
    await conn.groupSettingUpdate(m.chat, 'not_announcement')

    let texto = `${SIMBOLO} *Grupo abierto*\n\n`
    texto += `${SIMBOLO_ALT} *Detalles*\n`
    texto += `> Grupo: ${m.chat}\n`
    texto += `> Acción realizada por: @${m.sender.split('@')[0]}\n`
    texto += `> Los usuarios ya pueden enviar mensajes`

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
      `${SIMBOLO} *No se pudo abrir el grupo*\n\n> ${error.message}`,
      m
    )
  }
}

handler.help = ['open']
handler.tags = ['group']
handler.command = ['open', 'abrir']
handler.description = 'Abre el grupo para que los usuarios puedan enviar mensajes'
handler.group = true
handler.botAdmin = true

export default handler