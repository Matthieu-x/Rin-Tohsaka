import { redimirToken } from '../lib/premium-tokens.js'
import { enviarAvisoCanal } from '../lib/canal.js'

const SIMBOLO = 'ꕥ'

const formatearFecha = (timestamp) => {
  const fecha = new Date(timestamp)
  return fecha.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const NUMERO_VENTAS = '584223342535'

const handler = async (m, { conn, text, usedPrefix }) => {
  if (!text) {
    let texto = `${SIMBOLO} *Sub-bot premium*\n\n`
    texto += `> Si ya tienes un codigo, canjealo asi:\n`
    texto += `> *${usedPrefix}redeem ABCD-EFGH-1234*\n\n`
    texto += `> ¿No tienes codigo? Puedes comprarlo por *$0.50*\n`
    texto += `> Contacta: https://wa.me/${NUMERO_VENTAS}`
    await conn.reply(m.chat, texto, m)
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
      `${SIMBOLO} *No se pudo activar*\n\n> ${mensajes[resultado.motivo] || 'Error desconocido'}\n\n> ¿No tienes codigo? Puedes comprarlo por *$0.50*\n> Contacta: https://wa.me/${NUMERO_VENTAS}`,
      m
    )
    return
  }

  let texto = `${SIMBOLO} *Premium activado*\n\n`
  texto += `> Duracion agregada: ${resultado.diasDuracion} dias\n`
  texto += `> Vence el: ${formatearFecha(resultado.premiumExpira)}\n\n`
  texto += `> Ahora tienes 300 descargas diarias en vez de 10`

  await conn.reply(m.chat, texto, m)

  if (global.db?.data?.canalGlobal?.jid) {
    await enviarAvisoCanal(
      `${SIMBOLO} *Nuevo premium activado*\n\n> Numero: ${m.sender.split('@')[0]}\n> Duracion: ${resultado.diasDuracion} dias`
    )
  }
}

handler.help = ['redeem']
handler.tags = ['serbot']
handler.command = ['redeem', 'canjear', 'get']
handler.description = 'Sub-bot premium'

export default handler
