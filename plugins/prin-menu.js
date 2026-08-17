import moment from 'moment-timezone'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  obtenerNombreIdentidad,
  obtenerRutaFotoIdentidad
} from '../lib/identidad.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const RUTA_FOTO_MENU = path.join(__dirname, '../media/rin.jpeg')

const CANAL_JID = '120363410031000704@newsletter'
const ZONA_POR_DEFECTO = 'America/Tegucigalpa'

const obtenerTipoBot = (conn) => {
  if (!conn.isSubBot) {
    return { etiqueta: 'Principal', esSubbot: false, esPremium: false }
  }

  const numeroBot = conn.user?.jid?.split('@')[0]
  const rutaConfig = path.join('./Sessions/SubBot', numeroBot || '', 'config.json')

  let creadoPor = null
  try {
    if (fs.existsSync(rutaConfig)) {
      const config = JSON.parse(fs.readFileSync(rutaConfig))
      creadoPor = config?.creadoPor || null
    }
  } catch (e) {}

  const esPremium = creadoPor
    ? Boolean(global.db?.data?.users?.[`${creadoPor}@s.whatsapp.net`]?.premium)
    : false

  return {
    etiqueta: esPremium ? 'Subbot Premium' : 'Subbot Normal',
    esSubbot: true,
    esPremium
  }
}

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

  return dDisplay + hDisplay + mDisplay + sDisplay
}

const capitalizar = (texto) =>
  texto.charAt(0).toUpperCase() + texto.slice(1)

const ordenTags = [
  'main',
  'principal',
  'group',
  'grupo',
  'downloader',
  'descargas',
  'rpg',
  'ai',
  'ia',
  'sticker',
  'tools',
  'herramientas',
  'nsfw',
  'owner',
  'serbot',
  'economia'
]

const nombreTags = {
  main: 'Principal',
  principal: 'Principal',
  group: 'Grupo',
  grupo: 'Grupo',
  downloader: 'Descargas',
  descargas: 'Descargas',
  rpg: 'RPG',
  ai: 'Inteligencia Artificial',
  ia: 'Inteligencia Artificial',
  sticker: 'Stickers',
  tools: 'Herramientas',
  herramientas: 'Herramientas',
  nsfw: 'NSFW',
  owner: 'Owner',
  serbot: 'Subbots',
  economia: 'Economia'
}

const obtenerAliasesComando = (plugin) => {
  if (!plugin.command) return []

  let lista = []

  if (Array.isArray(plugin.command)) {
    lista = plugin.command
  } else if (plugin.command instanceof RegExp) {
    lista = [plugin.command.source]
  } else {
    lista = [plugin.command]
  }

  return lista.filter((c) => typeof c === 'string')
}

const obtenerDescripcionComando = (plugin) => {
  if (plugin.description && typeof plugin.description === 'string') {
    return plugin.description
  }

  if (plugin.desc && typeof plugin.desc === 'string') {
    return plugin.desc
  }

  return ''
}

const construirBloqueCategoria = (tag, plugins, usedPrefix) => {
  const nombreVisible = nombreTags[tag] || capitalizar(tag)

  let bloque = `\n╭─❑ ${nombreVisible.toUpperCase()} ❑\n`

  for (const plugin of plugins) {
    const aliases = obtenerAliasesComando(plugin)

    if (aliases.length === 0) continue

    const aliasesVisibles = aliases.slice(0, 3)

    const linea = aliasesVisibles
      .map((alias) => `(${usedPrefix})${alias}`)
      .join(' , ')

    bloque += `│ ${linea}\n`

    const descripcion = obtenerDescripcionComando(plugin)

    if (descripcion) {
      bloque += `> ${descripcion}\n`
    }
  }

  bloque += `╰────────────────\n`

  return bloque
}

const agruparPluginsPorTag = (plugins, esOwner) => {
  const agrupado = {}

  for (const key in plugins) {
    const plugin = plugins[key]

    if (!plugin || plugin.disabled) continue
    if (!plugin.command && !plugin.customPrefix) continue
    if (plugin.owner && !esOwner) continue
    if (plugin.rowner && !esOwner) continue

    let tags = plugin.tags || plugin.tag || ['sin-categoria']

    if (!Array.isArray(tags)) {
      tags = [tags]
    }

    for (const tag of tags) {
      const tagNormalizado = String(tag).toLowerCase()

      if (!agrupado[tagNormalizado]) {
        agrupado[tagNormalizado] = []
      }

      agrupado[tagNormalizado].push(plugin)
    }
  }

  return agrupado
}

const ordenarTagsDisponibles = (agrupado) => {
  const claves = Object.keys(agrupado)

  claves.sort((a, b) => {
    const indexA = ordenTags.indexOf(a)
    const indexB = ordenTags.indexOf(b)

    const valorA = indexA === -1 ? 999 : indexA
    const valorB = indexB === -1 ? 999 : indexB

    if (valorA === valorB) {
      return a.localeCompare(b)
    }

    return valorA - valorB
  })

  return claves
}

const handler = async (m, { conn, usedPrefix }) => {
  const settingsConn =
    (global.db &&
      global.db.data &&
      global.db.data.settings &&
      conn.user &&
      global.db.data.settings[conn.user.jid]) ||
    {}

  const nombreBot =
    obtenerNombreIdentidad(conn) ||
    global.botname ||
    'Rin-Tohsaka'

  const modo = settingsConn.self ? 'Privado' : 'Publico'

  const version =
    global.versionBot ||
    global.vs ||
    '1.1.1'

  const esOwner =
    global.owner &&
    Array.isArray(global.owner)
      ? global.owner.some(
          (o) =>
            Array.isArray(o) &&
            o[0] === m.sender.split('@')[0]
        )
      : false

  const totalGrupos =
    global.db &&
    global.db.data &&
    global.db.data.chats
      ? Object.keys(global.db.data.chats).length
      : 0

  const totalPremium =
    global.db &&
    global.db.data &&
    global.db.data.users
      ? Object.values(global.db.data.users).filter(
          (u) => u && u.premium
        ).length
      : 0

  const uptimeTexto = runtime(process.uptime())
  const tipoBot = obtenerTipoBot(conn)

  const fecha = moment.tz(ZONA_POR_DEFECTO).format('DD/MM/YYYY')
  const hora = moment.tz(ZONA_POR_DEFECTO).format('HH:mm:ss')
  const dia = capitalizar(
    moment.tz(ZONA_POR_DEFECTO).locale('es').format('dddd')
  )

  const totalPlugins = global.plugins
    ? Object.keys(global.plugins).length
    : 0

  const agrupado = global.plugins
    ? agruparPluginsPorTag(global.plugins, esOwner)
    : {}

  const tagsDisponibles = ordenarTagsDisponibles(agrupado)

  const mention = '@' + m.sender.split('@')[0]

  const saludoMencion = `> Hola *${mention}*, soy *${nombreBot}*, tu asistente virtual\n\n`

  let encabezado = `┏━❑ ${nombreBot} ❑━┓\n`
  encabezado += `┃ *Dia*       : _${dia}_\n`
  encabezado += `┃ *Tipo*      : _${tipoBot.etiqueta}_\n`
  encabezado += `┃ *Estado*    : _${modo}_\n`
  encabezado += `┃ *Version*   : _${version}_\n`
  encabezado += `┃ *Uptime*    : _${uptimeTexto}_\n`
  encabezado += `┃ *Fecha*     : _${fecha}_\n`
  encabezado += `┃ *Hora*      : _${hora}_\n`
  encabezado += `┃ *Grupos*    : _${totalGrupos}_\n`
  encabezado += `┃ *Premium*   : _${totalPremium}_\n`
  encabezado += `┃ *Comandos*  : _${totalPlugins}_\n`
  encabezado += `┗━━━━━━━━━━━━━━┛\n`

  let cuerpo = ''

  for (const tag of tagsDisponibles) {
    if (tag === 'sin-categoria') continue

    const pluginsDelTag = agrupado[tag].sort((a, b) => {
      const nombreA = obtenerAliasesComando(a)[0] || ''
      const nombreB = obtenerAliasesComando(b)[0] || ''
      return nombreA.localeCompare(nombreB)
    })

    cuerpo += construirBloqueCategoria(tag, pluginsDelTag, usedPrefix)
  }

  if (agrupado['sin-categoria']) {
    cuerpo += construirBloqueCategoria(
      'sin-categoria',
      agrupado['sin-categoria'],
      usedPrefix
    )
  }

  const textoFinal = saludoMencion + encabezado + cuerpo

  let mediaBuffer = null

  try {
    const rutaFotoPersonalizada = obtenerRutaFotoIdentidad(conn)

    if (rutaFotoPersonalizada) {
      mediaBuffer = fs.readFileSync(rutaFotoPersonalizada)
    } else if (fs.existsSync(RUTA_FOTO_MENU)) {
      mediaBuffer = fs.readFileSync(RUTA_FOTO_MENU)
    }
  } catch (e) {
    mediaBuffer = null
  }

  const contextInfo = {
    mentionedJid: [m.sender],
    forwardingScore: 999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: CANAL_JID,
      newsletterName: 'Canal Oficial',
      serverMessageId: 143
    }
  }

  if (mediaBuffer) {
    await conn.sendMessage(
      m.chat,
      {
        image: mediaBuffer,
        caption: textoFinal,
        contextInfo
      },
      { quoted: m }
    )
  } else {
    await conn.sendMessage(
      m.chat,
      {
        text: textoFinal,
        mentions: [m.sender],
        contextInfo
      },
      { quoted: m }
    )
  }
}

handler.help = ['menu']
handler.tags = ['main']
handler.command = ['menu', 'help', 'ayuda']
handler.description = 'Muestra el menú principal de la bot.'

export default handler