const SIMBOLO = 'ꕥ'
const SIMBOLO_ALT = '〄'

function esAdminDeGrupo(jid, groupMetadata) {
  if (!jid || !groupMetadata?.participants) return false
  const p = groupMetadata.participants.find(
    (x) => x.id === jid || x.lid === jid
  )
  return !!p && (p.admin === 'admin' || p.admin === 'superadmin')
}

function resolverJid(raw, participants) {
  if (!raw) return raw
  if (raw.endsWith('@lid')) {
    const match = participants?.find((p) => p.lid === raw)
    if (match?.id) return match.id
  }
  return raw
}

const handler = async (m, { conn, participants, groupMetadata, isAdmin, isOwner }) => {
  const adminReal = esAdminDeGrupo(m.sender, groupMetadata)

  if (!adminReal && !isAdmin && !isOwner) {
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
      `${SIMBOLO} *Falta el usuario*\n\n> Menciona a alguien o responde su mensaje con el comando *promote*`,
      m
    )
    return
  }

  try {
    await conn.groupParticipantsUpdate(m.chat, [objetivo], 'promote')

    const mention = '@' + objetivo.split('@')[0]

    let texto = `${SIMBOLO} *Nuevo administrador*\n\n`
    texto += `${SIMBOLO_ALT} *Detalles*\n`
    texto += `> Usuario: ${mention}\n`
    texto += `> Ascendido por: @${m.sender.split('@')[0]}`

    await conn.sendMessage(
      m.chat,
      { text: texto, mentions: [objetivo, m.sender] },
      { quoted: m }
    )
    await m.react('✔️')
  } catch (error) {
    await m.react('✖️')
    await conn.reply(
      m.chat,
      `${SIMBOLO} *No se pudo dar admin*\n\n> ${error.message}`,
      m
    )
  }
}

handler.help = ['promote <@mencion>']
handler.tags = ['group']
handler.command = ['promote', 'admin']
handler.description = 'Da admin a un usuario del grupo'
handler.group = true
handler.admin = true          
handler.botAdmin = true

export default handler