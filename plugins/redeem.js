import { redimirToken } from '../lib/premium-tokens.js'

const SIMBOLO = 'ꕥ'

const formatearFecha = (timestamp) => {
  const fecha = new Date(timestamp)
  return fecha.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const handler = async (m, { conn, text, usedPrefix }) => {
  if (!text) {
    await conn.reply(
      m.chat,
      `${SIMBOLO} *Falta el codigo*\n\n> Ejemplo: *${usedPrefix}redeem ABCD-EFGH-1234*`,
      m
    )
    return
  }

  const resultado = redimirToken(text, m.sender)

  if (!resultado.exito) {
    const mensajes = {
      no_existe: 'Ese codigo no existe o ya expiro',
      ya_usado: 'Ese codigo ya fue usado anteriormente'
    }
    await conn.reply(
      m.chat,
      `${SIMBOLO} *No se pudo activar*\n\n> ${mensajes[resultado.motivo] || 'Error desconocido'}`,
      m
    )
    return
  }

  let texto = `${SIMBOLO} *Premium activado*\n\n`
  texto += `> Duracion agregada: ${resultado.diasDuracion} dias\n`
  texto += `> Vence el: ${formatearFecha(resultado.premiumExpira)}\n\n`
  texto += `> Ahora tienes 300 descargas diarias en vez de 10`

  await conn.reply(m.chat, texto, m)
}

handler.help = ['redeem']
handler.tags = ['serbot']
handler.command = ['redeem', 'canjear', 'get']
handler.description = 'Sub-bot premium'

export default handler
