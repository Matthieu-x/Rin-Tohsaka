import { crearToken } from '../lib/premium-tokens.js'

const SIMBOLO = 'ꕥ'

const handler = async (m, { conn, text, usedPrefix }) => {
  const dias = text && !isNaN(parseInt(text)) ? parseInt(text) : 30

  if (dias <= 0 || dias > 3650) {
    await conn.reply(
      m.chat,
      `${SIMBOLO} *Duracion invalida*\n\n> Ingresa un numero de dias entre 1 y 3650\n> Ejemplo: *${usedPrefix}gentoken 30*`,
      m
    )
    return
  }

  const codigo = crearToken(m.sender, dias)

  let texto = `${SIMBOLO} *Token generado*\n\n`
  texto += `> Codigo: *${codigo}*\n`
  texto += `> Duracion: ${dias} dias de premium\n\n`
  texto += `> Comparte este codigo con el usuario que quieres volver premium\n`
  texto += `> Debe usarlo con *${usedPrefix}redeem ${codigo}*`

  await conn.reply(m.chat, texto, m)
}

handler.help = ['gentoken <dias>']
handler.tags = ['owner']
handler.command = ['gentoken', 'crearpremium']
handler.rowner = true

export default handler
