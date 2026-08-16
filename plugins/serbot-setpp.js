import { guardarFotoIdentidad } from '../lib/identidad.js'

const SIMBOLO = 'ꕥ'

const obtenerMensajeConImagen = (m) => {
  if (m.quoted && m.quoted.mimetype && m.quoted.mimetype.startsWith('image')) {
    return m.quoted
  }
  if (m.mimetype && m.mimetype.startsWith('image')) {
    return m
  }
  return null
}

const handler = async (m, { conn, usedPrefix }) => {
  const mensajeImagen = obtenerMensajeConImagen(m)

  if (!mensajeImagen) {
    await conn.reply(
      m.chat,
      `${SIMBOLO} *Falta la imagen*\n\n> Envia una foto con el comando *${usedPrefix}setpp* como descripcion\n> O responde a una imagen con *${usedPrefix}setpp*`,
      m
    )
    return
  }

  try {
    const buffer = await mensajeImagen.download()
    if (!buffer || buffer.length === 0) {
      throw new Error('No se pudo descargar la imagen')
    }

    await conn.updateProfilePicture(conn.user.id, buffer)
    guardarFotoIdentidad(conn, buffer)

    let texto = `${SIMBOLO} *Foto de perfil actualizada*\n\n`
    texto += `> Puede tardar unos segundos en reflejarse en WhatsApp`

    await conn.reply(m.chat, texto, m)
  } catch (error) {
    await conn.reply(
      m.chat,
      `${SIMBOLO} *No se pudo actualizar la foto*\n\n> ${error.message}`,
      m
    )
  }
}

handler.help = ['setpp']
handler.tags = ['serbot']
handler.command = ['setpp', 'setprofilepic', 'setfoto']
handler.description = 'Cambia la foto de perfil de este bot o subbot'

export default handler
