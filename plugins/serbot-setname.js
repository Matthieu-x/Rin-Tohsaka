const SIMBOLO = 'ꕥ'

const handler = async (m, { conn, text, usedPrefix }) => {
  if (!text || !text.trim()) {
    await conn.reply(
      m.chat,
      `${SIMBOLO} *Falta el nombre*\n\n> Ejemplo: *${usedPrefix}setname Rin-Tohsaka*`,
      m
    )
    return
  }

  const nuevoNombre = text.trim().slice(0, 25)

  try {
    await conn.updateProfileName(nuevoNombre)

    let texto = `${SIMBOLO} *Nombre actualizado*\n\n`
    texto += `> Nuevo nombre: *${nuevoNombre}*\n`
    texto += `> Puede tardar unos segundos en reflejarse en WhatsApp`

    await conn.reply(m.chat, texto, m)
  } catch (error) {
    await conn.reply(
      m.chat,
      `${SIMBOLO} *No se pudo actualizar el nombre*\n\n> ${error.message}`,
      m
    )
  }
}

handler.help = ['setname <nombre>']
handler.tags = ['serbot']
handler.command = ['setname', 'setbotname']
handler.description = 'Cambia el nombre de perfil de este bot o subbot'

export default handler
