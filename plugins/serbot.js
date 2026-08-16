import path, { join } from 'path'
import { fileURLToPath } from 'url'
import { MichiJadiBot, puedeCrearSubbot } from './subs-conexion.js'
import { verificarExpiracionPremium } from '../lib/premium-tokens.js'

const SIMBOLO = 'ꕥ'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const handler = async (m, { conn, text, usedPrefix, command }) => {
  verificarExpiracionPremium(m.sender)
  const user = global.db.data.users[m.sender] || {}
  const esPremium = Boolean(user.premium)

  const senderNumber = m.sender.split('@')[0]
  const estado = puedeCrearSubbot(senderNumber, esPremium)

  if (!estado.permitido) {
    let texto = `${SIMBOLO} *Limite de subbots alcanzado*\n\n`
    texto += `> Tipo de cuenta: ${esPremium ? 'Premium' : 'Normal'}\n`
    texto += `> Subbots activos: ${estado.actuales} / ${estado.limite}\n\n`
    if (!esPremium) {
      texto += `> Hazte premium con un token del owner para crear hasta 5 subbots`
    }
    await conn.reply(m.chat, texto, m)
    return
  }

  const numeroObjetivo = text ? text.replace(/\D/g, '') : ''
  if (!numeroObjetivo || numeroObjetivo.length < 8) {
    await conn.reply(
      m.chat,
      `${SIMBOLO} *Falta el numero*\n\n> Debes indicar el numero al que se enviara el codigo\n> Ejemplo: *${usedPrefix}serbot 5219999999999*`,
      m
    )
    return
  }

  const carpetaSubbot = join(process.cwd(), 'Sessions', 'SubBot', numeroObjetivo)

  await conn.reply(
    m.chat,
    `${SIMBOLO} *Generando codigo de vinculacion*\n\n> Espera unos segundos...`,
    m
  )

  await MichiJadiBot({
    pathMichiJadiBot: carpetaSubbot,
    m,
    conn,
    args: numeroObjetivo,
    usedPrefix,
    command
  })
}

handler.help = ['code <numero>']
handler.tags = ['serbot']
handler.command = ['serbot', 'subbot', 'code']
handler.description = 'Hazte subbot'

export default handler
