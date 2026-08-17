const SIMBOLO = 'ꕥ'

const handler = async (m, { conn, chat, isAdmin, isOwner }) => {
  if (!m.isGroup) {
    await conn.reply(m.chat, `${SIMBOLO} *Este comando solo funciona en grupos*`, m)
    return
  }

  if (!isAdmin && !isOwner) {
    await m.react('✖️')
    await conn.reply(
      m.chat,
      `${SIMBOLO} *Solo los administradores del grupo pueden usar este comando*`,
      m
    )
    return
  }

  if (!chat.primaryBot) {
    await conn.reply(
      m.chat,
      `${SIMBOLO} *No hay ningún bot único configurado en este grupo*`,
      m
    )
    return
  }

  const jidAnterior = chat.primaryBot
  const numeroAnterior = jidAnterior.split('@')[0]

  chat.primaryBot = null

  await conn.sendMessage(
    m.chat,
    {
      text: `${SIMBOLO} *Restricción quitada*\n\n> @${numeroAnterior} ya no es el único bot\n> Todos los bots y subbots presentes en el grupo volverán a responder`,
      mentions: [jidAnterior]
    },
    { quoted: m }
  )

  await m.react('✔️')
}

handler.help = ['delprimary']
handler.tags = ['group']
handler.command = ['delprimary']
handler.description = 'Quita la restriccion de bot unico en el grupo'
handler.group = true

export default handler
