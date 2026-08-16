import fs from 'fs'
import { join } from 'path'
import { obtenerSubbotsActivos } from './subs-conexion.js'

const SIMBOLO = 'ꕥ'

const runtime = (segundos) => {
  segundos = Number(segundos)

  const d = Math.floor(segundos / (3600 * 24))
  const h = Math.floor((segundos % (3600 * 24)) / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  const s = Math.floor(segundos % 60)

  const dDisplay = d > 0 ? d + (d === 1 ? ' dia, ' : ' dias, ') : ''
  const hDisplay = h > 0 ? h + (h === 1 ? ' hora, ' : ' horas, ') : ''
  const mDisplay = m > 0 ? m + (m === 1 ? ' minuto, ' : ' minutos, ') : ''
  const sDisplay = s > 0 ? s + (s === 1 ? ' segundo' : ' segundos') : ''

  return dDisplay + hDisplay + mDisplay + sDisplay || '0 segundos'
}

const leerConfig = (rutaCarpeta) => {
  const rutaConfig = join(rutaCarpeta, 'config.json')
  if (!fs.existsSync(rutaConfig)) return null
  try {
    return JSON.parse(fs.readFileSync(rutaConfig))
  } catch (e) {
    return null
  }
}

const handler = async (m, { conn, usedPrefix }) => {
  const senderNumber = m.sender.split('@')[0]

  const esOwner =
    global.owner && Array.isArray(global.owner)
      ? global.owner.some((o) => Array.isArray(o) && o[0] === senderNumber)
      : false

  const activos = obtenerSubbotsActivos()

  const listaConDatos = activos
    .map((activo) => {
      const config = leerConfig(activo.path)
      return {
        numero: activo.numero || config?.numero || 'Desconocido',
        conectado: activo.conectado,
        creadoPor: config?.creadoPor || null,
        creadoEn: config?.creadoEn || null
      }
    })
    .filter((sub) => esOwner || sub.creadoPor === senderNumber)

  if (listaConDatos.length === 0) {
    await conn.reply(
      m.chat,
      `${SIMBOLO} *Sin subbots activos*\n\n> ${esOwner ? 'No hay ningun subbot conectado en este momento' : 'No tienes ningun subbot conectado en este momento'}\n> Usa *${usedPrefix}serbot <numero>* para crear uno`,
      m
    )
    return
  }

  let texto = `${SIMBOLO} *Subbots activos*\n\n`

  listaConDatos.forEach((sub, i) => {
    const estado = sub.conectado ? 'Conectado ✅' : 'Conectando ⏳'
    const tiempoActivo = sub.creadoEn ? runtime((Date.now() - sub.creadoEn) / 1000) : 'Desconocido'

    texto += `╭─❑ SUBBOT ${i + 1} ❑\n`
    texto += `│ Numero: ${sub.numero}\n`
    texto += `│ Estado: ${estado}\n`
    if (esOwner) {
      texto += `│ Creado por: ${sub.creadoPor || 'Desconocido'}\n`
    }
    texto += `│ Activo desde: ${tiempoActivo}\n`
    texto += `╰────────────────\n`
  })

  texto += `\n> Total: ${listaConDatos.length} subbot${listaConDatos.length === 1 ? '' : 's'}`

  await conn.reply(m.chat, texto, m)
}

handler.help = ['bots']
handler.tags = ['serbot']
handler.command = ['bots', 'listbots', 'subbots']
handler.description = 'Lista los subbots activos'

export default handler
