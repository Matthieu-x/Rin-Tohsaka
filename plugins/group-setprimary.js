const SIMBOLO = 'ꕥ'
const SIMBOLO_ALT = '〄'

function resolverJid(raw, participants) {
  if (!raw) return raw
  if (raw.endsWith('@lid')) {
    const match = participants?.find((p) => p.lid === raw)
    if (match?.id) return match.id
  }
  return raw
}

const handler = async (m, { conn, chat, participants, isAdmin, isOwner }) => {
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
  const crudo = menciones[0] || m.quoted?.sender || conn.user.jid
  const jidObjetivo = resolverJid(crudo, participants)

  const numeroObjetivoDigitos = jidObjetivo.split('@')[0].replace(/\D/g, '')

  const botConectado = (global.conns || []).find((c) => {
    if (!c?.user?.jid || c.ws?.socket?.readyState === 3) return false
    if (c.user.jid === jidObjetivo) return true
    return c.user.jid.split('@')[0].replace(/\D/g, '') === numeroObjetivoDigitos
  })

  if (!botConectado) {
    await m.react('✖️')
    await conn.reply(
      m.chat,
      `${SIMBOLO} *Ese número no es un bot conectado*\n\n> Menciona al bot principal o a un subbot activo\n> Ejemplo: *.setprimary @numero*`,
      m
    )
    return
  }

  const numeroObjetivo = botConectado.user.jid.split('@')[0]

  if (chat.primaryBot === botConectado.user.jid) {
    await conn.reply(
      m.chat,
      `${SIMBOLO} *Ese bot ya es el único activo en este grupo*\n\n> Número: @${numeroObjetivo}`,
      m
    )
    return
  }

  chat.primaryBot = botConectado.user.jid

  let texto = `${SIMBOLO} *Bot único configurado*\n\n`
  texto += `${SIMBOLO_ALT} *Detalles*\n`
  texto += `> Solo @${numeroObjetivo} responderá en el grupo\n`
  texto += `> Otros bots o subbots presentes se quedarán en silencio\n`
  texto += `> Usa *.delprimary* para quitar la restricción`

  await conn.sendMessage(
    m.chat,
    {
      text: texto,
      mentions: [botConectado.user.jid]
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
