import fs from 'fs'
import { join } from 'path'
import { obtenerSubbotsActivos } from './subs-conexion.js'

const SIMBOLO = 'ꕥ'
const SIMBOLO_ALT = '〄'

const runtime = (segundos) => {
  segundos = Number(segundos)

  const d = Math.floor(segundos / (3600 * 24))
  const h = Math.floor((segundos % (3600 * 24)) / 3600)
  const m = Math.floor((segundos % 3600) / 60)

  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
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
      const creadorJid = config?.creadoPor ? `${config.creadoPor}@s.whatsapp.net` : null
      const esPremium = creadorJid ? Boolean(global.db?.data?.users?.[creadorJid]?.premium) : false

      return {
        numero: activo.numero || config?.numero || 'Desconocido',
        conectado: activo.conectado,
        creadoPor: config?.creadoPor || null,
        creadoEn: config?.creadoEn || null,
        esPremium
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

  const construirFila = (sub) => {
    const estado = sub.conectado ? 'Conectado' : 'Conectando'
    const tiempoActivo = sub.creadoEn ? runtime((Date.now() - sub.creadoEn) / 1000) : '?'

    let descripcion = `${estado} · ${tiempoActivo}`
    if (esOwner && sub.creadoPor) descripcion += ` · Creado por ${sub.creadoPor}`

    return {
      title: sub.numero,
      description: descripcion,
      id: `#subbotinfo:${sub.numero}`
    }
  }

  const premium = listaConDatos.filter((s) => s.esPremium).map(construirFila)
  const normales = listaConDatos.filter((s) => !s.esPremium).map(construirFila)

  const sections = []
  if (premium.length) sections.push({ title: `Premium (${premium.length})`, rows: premium })
  if (normales.length) sections.push({ title: `Normales (${normales.length})`, rows: normales })

  await conn.sendMessage(
    m.chat,
    {
      text: `${SIMBOLO_ALT} *Total: ${listaConDatos.length} subbot${listaConDatos.length === 1 ? '' : 's'}*`,
      title: `${SIMBOLO} Subbots activos`,
      buttonText: 'Ver subbots',
      sections
    },
    { quoted: m }
  )
}

handler.help = ['bots']
handler.tags = ['serbot']
handler.command = ['bots', 'listbots', 'subbots']
handler.description = 'Lista los subbots activos separados por Premium y Normal'

export default handler
