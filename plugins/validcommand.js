const SIMBOLO = 'ꕥ'

const construirRegexPrefijo = (prefijo) => {
  if (prefijo instanceof RegExp) return prefijo
  if (Array.isArray(prefijo)) {
    const escapados = prefijo.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    return new RegExp(`^(${escapados.join('|')})`)
  }
  if (typeof prefijo === 'string') {
    return new RegExp(`^${prefijo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)
  }
  return null
}

const extraerComando = (texto, regexPrefijo) => {
  const coincidencia = regexPrefijo.exec(texto)
  if (!coincidencia) return null
  const usedPrefix = coincidencia[0]
  const sinPrefijo = texto.slice(usedPrefix.length)
  const partes = sinPrefijo.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return null
  return { usedPrefix, comando: partes[0].toLowerCase() }
}

const obtenerListaComandos = (plugin) => {
  if (!plugin.command) return []
  if (plugin.command instanceof RegExp) return [plugin.command]
  if (Array.isArray(plugin.command)) return plugin.command
  if (typeof plugin.command === 'string') return [plugin.command]
  return []
}

const comandoExisteEnPlugins = (comando) => {
  if (!global.plugins) return true
  for (const nombre in global.plugins) {
    const plugin = global.plugins[nombre]
    if (!plugin || plugin.disabled) continue
    const lista = obtenerListaComandos(plugin)
    for (const item of lista) {
      if (item instanceof RegExp) {
        if (item.test(comando)) return true
      } else if (item === comando) {
        return true
      }
    }
  }
  return false
}

const yaFueAdvertido = new Map()
const TIEMPO_ENFRIAMIENTO = 8000

const puedeAdvertir = (sender) => {
  const ahora = Date.now()
  const ultima = yaFueAdvertido.get(sender) || 0
  if (ahora - ultima < TIEMPO_ENFRIAMIENTO) return false
  yaFueAdvertido.set(sender, ahora)
  return true
}

const handler = async function (m, { conn, chat }) {
  if (!m.text) return
  if (m.isCommand) return
  if (chat && chat.isBanned) return

  const regexPrefijo = construirRegexPrefijo(global.prefix)
  if (!regexPrefijo) return

  const resultado = extraerComando(m.text, regexPrefijo)
  if (!resultado) return

  const { usedPrefix, comando } = resultado
  if (!comando) return
  if (comandoExisteEnPlugins(comando)) return
  if (!puedeAdvertir(m.sender)) return

  let texto = `${SIMBOLO} *Comando no encontrado*\n\n`
  texto += `> El comando *${usedPrefix}${comando}* no existe\n`
  texto += `> Usa *${usedPrefix}menu* para ver la lista completa de comandos disponibles`

  await conn.sendMessage(
    m.chat,
    { text: texto },
    { quoted: m }
  )
}

export default { all: handler }
