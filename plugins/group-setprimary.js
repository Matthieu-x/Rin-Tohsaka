const SIMBOLO = 'ꕥ'
const SIMBOLO_ALT = '〄'

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

  const numeroBot = conn.user.jid.split('@')[0]

  if (chat.primaryBot === conn.user.jid) {
    await conn.reply(
      m.chat,
      `${SIMBOLO} *Este bot ya es el único activo en este grupo*\n\n> Número: @${numeroBot}`,
      m
    )
    return
  }

  chat.primaryBot = conn.user.jid

  let texto = `${SIMBOLO} *Bot único configurado*\n\n`
  texto += `${SIMBOLO_ALT} *Detalles*\n`
  texto += `> Solo este bot (@${numeroBot}) responderá en el grupo\n`
  texto += `> Otros bots o subbots presentes se quedarán en silencio\n`
  texto += `> Usa *.delprimary* para quitar la restricción`

  await conn.sendMessage(
    m.chat,
    {
      text: texto,
      mentions: [conn.user.jid]
    },
    { quoted: m }
  )

  await m.react('✔️')
}

handler.help = ['setprimary']
handler.tags = ['group']
handler.command = ['setprimary']
handler.description = 'Deja a este bot como el unico que responde en el grupo'
handler.group = true

export default handler
