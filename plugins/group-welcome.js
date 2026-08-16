const SIMBOLO = 'ꕥ'

const handler = async (
  m,
  { conn, command, text, usedPrefix, chat, isAdmin, isOwner }
) => {
  if (!isAdmin && !isOwner) {
    await conn.reply(
      m.chat,
      `${SIMBOLO} *Solo los administradores del grupo pueden usar este comando*`,
      m
    )
    return
  }

  if (command === 'setwelcome') {
    if (!text || !text.trim()) {
      let texto = `${SIMBOLO} *Falta el mensaje*\n\n`
      texto += `> Ejemplo: *${usedPrefix}setwelcome Hola @user, bienvenido a @grupo*\n\n`
      texto += `> Variables disponibles:\n`
      texto += `> *@user* - menciona al nuevo integrante\n`
      texto += `> *@grupo* - nombre del grupo`
      await conn.reply(m.chat, texto, m)
      return
    }

    chat.sWelcome = text.trim()
    await conn.reply(m.chat, `${SIMBOLO} *Mensaje de bienvenida actualizado*`, m)
    return
  }

  if (command === 'setbye') {
    if (!text || !text.trim()) {
      let texto = `${SIMBOLO} *Falta el mensaje*\n\n`
      texto += `> Ejemplo: *${usedPrefix}setbye @user salio de @grupo*\n\n`
      texto += `> Variables disponibles:\n`
      texto += `> *@user* - menciona al que sale\n`
      texto += `> *@grupo* - nombre del grupo`
      await conn.reply(m.chat, texto, m)
      return
    }

    chat.sBye = text.trim()
    await conn.reply(m.chat, `${SIMBOLO} *Mensaje de despedida actualizado*`, m)
    return
  }

  const opcion = (text || '').trim().toLowerCase()

  if (opcion !== 'on' && opcion !== 'off') {
    let texto = `${SIMBOLO} *Bienvenida*\n\n`
    texto += `> Estado actual: *${chat.welcome ? 'Activado' : 'Desactivado'}*\n\n`
    texto += `> Ejemplo: *${usedPrefix}welcome on*\n`
    texto += `> Ejemplo: *${usedPrefix}welcome off*\n\n`
    texto += `> Usa *${usedPrefix}setwelcome* y *${usedPrefix}setbye* para personalizar los mensajes`
    await conn.reply(m.chat, texto, m)
    return
  }

  chat.welcome = opcion === 'on'

  await conn.reply(
    m.chat,
    `${SIMBOLO} *Bienvenida ${chat.welcome ? 'activada' : 'desactivada'}*`,
    m
  )
}

handler.help = ['welcome <on/off>', 'setwelcome <texto>', 'setbye <texto>']
handler.tags = ['group']
handler.command = ['welcome', 'setwelcome', 'setbye']
handler.description = 'Activa/desactiva y personaliza los mensajes de bienvenida y despedida'
handler.group = true

export default handler
