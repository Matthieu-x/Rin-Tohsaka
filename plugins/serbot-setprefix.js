import fs from 'fs'
import { join } from 'path'
import { actualizarPrefixCache } from '../handler.js'

const SIMBOLO = 'ꕥ'
const CARACTERES_MULTI = /^[#$@*&?,;:+×!_\-.]/

const construirRegexPrefix = (prefijo) => {
  if (prefijo === 'multi') return CARACTERES_MULTI

  const caracteres = [...prefijo].map((c) =>
    c.replace(/([.*+?^${}()|[\]\\])/g, '\\$1')
  )

  return new RegExp(`^(${caracteres.join('|')})`)
}

const buscarConfigSubbot = (numeroBot) => {
  const rutaBase = join(process.cwd(), 'Sessions', 'SubBot')
  if (!fs.existsSync(rutaBase)) return null

  const carpetas = fs.readdirSync(rutaBase)

  for (const carpeta of carpetas) {
    const rutaConfig = join(rutaBase, carpeta, 'config.json')
    if (!fs.existsSync(rutaConfig)) continue

    try {
      const config = JSON.parse(fs.readFileSync(rutaConfig))
      if (config.numero === numeroBot) {
        return { rutaConfig, config }
      }
    } catch (e) {}
  }

  return null
}

const handler = async (m, { conn, text, usedPrefix }) => {
  const senderNumber = m.sender.split('@')[0]

  if (!conn.isSubBot) {
    const esOwner =
      Array.isArray(global.owner) &&
      global.owner.some((o) => Array.isArray(o) && o[0] === senderNumber)

    if (!esOwner) {
      await conn.reply(
        m.chat,
        `${SIMBOLO} *Solo los owners del bot principal pueden cambiar este prefijo*`,
        m
      )
      return
    }
  } else {
    const user = global.db.data.users[m.sender]
    const esPremium = Boolean(user?.premium)

    if (!esPremium) {
      await conn.reply(
        m.chat,
        `${SIMBOLO} *Funcion solo para premium*\n\n> Hazte premium para poder cambiar el prefijo de tu subbot`,
        m
      )
      return
    }
  }

  const nuevoPrefijo = (text || '').trim()

  if (!nuevoPrefijo) {
    let texto = `${SIMBOLO} *Falta el prefijo*\n\n`
    texto += `> Ejemplo: *${usedPrefix}setprefix !*\n`
    texto += `> Tambien puedes usar varios simbolos: *${usedPrefix}setprefix !.#*`
    await conn.reply(m.chat, texto, m)
    return
  }

  if (nuevoPrefijo.length > 5) {
    await conn.reply(
      m.chat,
      `${SIMBOLO} *El prefijo es muy largo*\n\n> Usa maximo 5 caracteres`,
      m
    )
    return
  }

  const nuevoRegex = construirRegexPrefix(nuevoPrefijo)

  if (!conn.isSubBot) {
    global.prefix = nuevoRegex
  } else {
    const numeroBot = conn.user.jid.split('@')[0]
    const encontrado = buscarConfigSubbot(numeroBot)

    if (!encontrado) {
      await conn.reply(
        m.chat,
        `${SIMBOLO} *No se encontro la configuracion de este subbot*`,
        m
      )
      return
    }

    encontrado.config.prefix = nuevoPrefijo
    fs.writeFileSync(
      encontrado.rutaConfig,
      JSON.stringify(encontrado.config, null, 2)
    )

    actualizarPrefixCache(numeroBot, nuevoRegex)
  }

  await conn.reply(
    m.chat,
    `${SIMBOLO} *Prefijo actualizado a:* ${nuevoPrefijo}`,
    m
  )
}

handler.help = ['setprefix']
handler.tags = ['serbot']
handler.command = ['setprefix']
handler.description = 'cambia el prefijo de tu sub-bot'

export default handler
