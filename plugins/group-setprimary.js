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

  const menciones = (await m.mentionedJid) || []
  const jidObjetivo = menciones[0] || m.quoted?.sender || conn.user.jid

  const botConectado = (global.conns || []).find(
    (c) => c?.user?.jid === jidObjetivo && c.ws?.socket?.readyState !== 3
  )

  if (!botConectado) {
    await m.react('✖️')
    await conn.reply(
      m.chat,
      `${SIMBOLO} *Ese número no es un bot conectado*\n\n> Menciona al bot principal o a un subbot activo\n> Ejemplo: *.setprimary @numero*`,
      m
    )
    return
  }

  const numeroObjetivo = jidObjetivo.split('@')[0]

  if (chat.primaryBot === jidObjetivo) {
    await conn.reply(
      m.chat,
      `${SIMBOLO} *Ese bot ya es el único activo en este grupo*\n\n> Número: @${numeroObjetivo}`,
      m
    )
    return
  }

  chat.primaryBot = jidObjetivo

  let texto = `${SIMBOLO} *Bot único configurado*\n\n`
  texto += `${SIMBOLO_ALT} *Detalles*\n`
  texto += `> Solo @${numeroObjetivo} responderá en el grupo\n`
  texto += `> Otros bots o subbots presentes se quedarán en silencio\n`
  texto += `> Usa *.delprimary* para quitar la restricción`

  await conn.sendMessage(
    m.chat,
    {
      text: texto,
      mentions: [jidObjetivo]
    },
    { quoted: m }
  )

  await m.react('✔️')
}

handler.help = ['setprimary <@bot>']
handler.tags = ['group']
handler.command = ['setprimary']
handler.description = 'Deja a un bot (mencionalo) como el unico que responde en el grupo'
handler.group = true

export default handler
