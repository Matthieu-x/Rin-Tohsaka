const SIMBOLO = 'ꕥ'
const SIMBOLO_ALT = '〄'

const handler = async (m, { conn, text, participants, groupMetadata, isAdmin, isOwner }) => {
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

  let texto = `${SIMBOLO} *${groupMetadata?.subject || 'Grupo'}*\n\n`
  texto += `${SIMBOLO_ALT} *Mencion a todos*\n`
  texto += mensaje ? `> ${mensaje}\n\n` : `\n`

  for (const participante of participants) {
    texto += `> @${participante.id.split('@')[0]}\n`
  }

  try {
    await conn.sendMessage(
      m.chat,
      {
        text: texto,
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

handler.help = ['tagall <mensaje>']
handler.tags = ['group']
handler.command = ['tagall', 'everyone', 'invocar']
handler.description = 'Menciona a todos los miembros listandolos uno por uno'
handler.group = true

export default handler
