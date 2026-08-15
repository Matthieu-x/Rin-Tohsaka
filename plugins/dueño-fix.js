import { execSync } from 'child_process'
import { performance } from 'perf_hooks'

const SIMBOLO = 'ꕥ'
const SIMBOLO_ALT = '〄'

const IGNORADOS = [
  '.npm/',
  '.cache/',
  'tmp/',
  'database.json',
  'sessions/Principal/',
  'sessions/subbot/',
  'npm-debug.log',
  '.env'
]

const ejecutar = (comando, opciones = {}) => {
  return execSync(comando, {
    encoding: 'utf-8',
    timeout: opciones.timeout || 30000,
    maxBuffer: 1024 * 1024 * 10,
    stdio: ['pipe', 'pipe', 'pipe']
  }).toString().trim()
}

const obtenerRamaActual = () => {
  try {
    return ejecutar('git rev-parse --abbrev-ref HEAD')
  } catch (e) {
    return 'desconocida'
  }
}

const obtenerHashActual = () => {
  try {
    return ejecutar('git rev-parse --short HEAD')
  } catch (e) {
    return null
  }
}

const obtenerEstadoArchivos = () => {
  try {
    const salida = ejecutar('git status --porcelain')
    if (!salida) return []
    return salida
      .split('\n')
      .filter((linea) => linea.trim())
      .map((linea) => ({
        codigo: linea.slice(0, 2).trim(),
        ruta: linea.slice(3).trim()
      }))
  } catch (e) {
    return []
  }
}

const esArchivoIgnorado = (ruta) => IGNORADOS.some((patron) => ruta.includes(patron))

const clasificarEstadoArchivos = (archivos) => {
  const relevantes = archivos.filter((a) => !esArchivoIgnorado(a.ruta))
  const modificados = relevantes.filter((a) => a.codigo.includes('M'))
  const agregados = relevantes.filter((a) => a.codigo.includes('A') || a.codigo === '??')
  const eliminados = relevantes.filter((a) => a.codigo.includes('D'))
  const renombrados = relevantes.filter((a) => a.codigo.includes('R'))
  return { relevantes, modificados, agregados, eliminados, renombrados }
}

const verificarConexionRemota = () => {
  try {
    ejecutar('git ls-remote --exit-code origin', { timeout: 10000 })
    return true
  } catch (e) {
    return false
  }
}

const obtenerCambiosPendientes = (rama) => {
  try {
    ejecutar('git fetch origin', { timeout: 15000 })
    const detras = ejecutar(`git rev-list HEAD..origin/${rama} --count`)
    return Number(detras) || 0
  } catch (e) {
    return null
  }
}

const obtenerResumenCommits = (hashAntes) => {
  try {
    const log = ejecutar(`git log ${hashAntes}..HEAD --pretty=format:"%h %s" -n 10`)
    return log ? log.split('\n').filter(Boolean) : []
  } catch (e) {
    return []
  }
}

const obtenerArchivosModificadosPorPull = () => {
  try {
    const salida = ejecutar('git diff --name-status HEAD@{1} HEAD')
    if (!salida) return []
    return salida
      .split('\n')
      .filter(Boolean)
      .map((linea) => {
        const partes = linea.split('\t')
        return { codigo: partes[0], ruta: partes[1] || '' }
      })
  } catch (e) {
    return []
  }
}

const construirBloqueConflictos = (clasificados, usedPrefix) => {
  let bloque = `${SIMBOLO} *No se pudo actualizar*\n\n`
  bloque += `> Hay cambios locales que entran en conflicto con el repositorio remoto\n\n`

  if (clasificados.modificados.length) {
    bloque += `${SIMBOLO_ALT} *Modificados*\n`
    for (const item of clasificados.modificados) {
      bloque += `> → ${item.ruta}\n`
    }
    bloque += '\n'
  }
  if (clasificados.agregados.length) {
    bloque += `${SIMBOLO_ALT} *Nuevos*\n`
    for (const item of clasificados.agregados) {
      bloque += `> → ${item.ruta}\n`
    }
    bloque += '\n'
  }
  if (clasificados.eliminados.length) {
    bloque += `${SIMBOLO_ALT} *Eliminados*\n`
    for (const item of clasificados.eliminados) {
      bloque += `> → ${item.ruta}\n`
    }
    bloque += '\n'
  }
  if (clasificados.renombrados.length) {
    bloque += `${SIMBOLO_ALT} *Renombrados*\n`
    for (const item of clasificados.renombrados) {
      bloque += `> → ${item.ruta}\n`
    }
    bloque += '\n'
  }

  bloque += `> Usa *${usedPrefix}update stash* para guardar tus cambios y actualizar de todas formas`
  return bloque
}

const handler = async (m, { conn, text, usedPrefix }) => {
  await m.react('🕒')
  const inicio = performance.now()

  try {
    const conectado = verificarConexionRemota()
    if (!conectado) {
      await m.react('✖️')
      await conn.reply(
        m.chat,
        `${SIMBOLO} *Sin conexion*\n\n> No se pudo contactar al repositorio remoto, revisa la conexion del VPS`,
        m
      )
      return
    }

    const rama = obtenerRamaActual()
    const hashAntes = obtenerHashActual()
    const cambiosPendientes = obtenerCambiosPendientes(rama)

    if (cambiosPendientes === 0) {
      await m.react('✔️')
      await conn.reply(
        m.chat,
        `${SIMBOLO} *Ya estas al dia*\n\n> Rama: ${rama}\n> Commit actual: ${hashAntes}\n> No hay actualizaciones nuevas en el repositorio`,
        m
      )
      return
    }

    if (text && text.trim() === 'stash') {
      ejecutar('git stash push -u -m "auto-update"')
    }

    const argumentosExtra = m.fromMe && text && text.trim() !== 'stash' ? ' ' + text.trim() : ''
    const resultadoPull = ejecutar('git pull origin ' + rama + argumentosExtra, { timeout: 45000 })

    const fin = performance.now()
    const tiempoTotal = ((fin - inicio) / 1000).toFixed(2)

    if (resultadoPull.includes('Already up to date')) {
      await m.react('✔️')
      await conn.reply(
        m.chat,
        `${SIMBOLO} *Ya estas al dia*\n\n> Rama: ${rama}\n> Commit actual: ${hashAntes}`,
        m
      )
      return
    }

    const commits = obtenerResumenCommits(hashAntes)
    const archivosCambiados = obtenerArchivosModificadosPorPull()
    const hashDespues = obtenerHashActual()

    let mensaje = `${SIMBOLO} *Actualizacion completada*\n\n`
    mensaje += `> Rama: ${rama}\n`
    mensaje += `> Commit anterior: ${hashAntes}\n`
    mensaje += `> Commit actual: ${hashDespues}\n`
    mensaje += `> Tiempo: ${tiempoTotal} s\n\n`

    if (commits.length) {
      mensaje += `${SIMBOLO_ALT} *Cambios aplicados*\n`
      for (const linea of commits) {
        mensaje += `> ✐ ${linea}\n`
      }
      mensaje += '\n'
    }

    if (archivosCambiados.length) {
      const resumenTipos = { A: 0, M: 0, D: 0, R: 0 }
      for (const item of archivosCambiados) {
        const letra = item.codigo.charAt(0)
        if (resumenTipos[letra] !== undefined) resumenTipos[letra]++
      }
      mensaje += `${SIMBOLO_ALT} *Archivos*\n`
      mensaje += `> Agregados: ${resumenTipos.A}\n`
      mensaje += `> Modificados: ${resumenTipos.M}\n`
      mensaje += `> Eliminados: ${resumenTipos.D}\n`
      mensaje += `> Renombrados: ${resumenTipos.R}\n\n`
    }

    mensaje += `> ✰ Si el bot no responde tras la actualizacion, reinicia el proceso manualmente`

    await m.react('✔️')
    await conn.reply(m.chat, mensaje, m)
  } catch (error) {
    const estadoArchivos = obtenerEstadoArchivos()
    const clasificados = clasificarEstadoArchivos(estadoArchivos)

    if (clasificados.relevantes.length) {
      await m.react('✖️')
      await conn.reply(m.chat, construirBloqueConflictos(clasificados, usedPrefix), m)
      return
    }

    await m.react('✖️')
    await conn.reply(
      m.chat,
      `${SIMBOLO} *Error al actualizar*\n\n> ${error.message.split('\n')[0]}`,
      m
    )
  }
}

handler.help = ['update']
handler.tags = ['owner']
handler.command = ['update', 'fix', 'actualizar']
handler.rowner = true

export default handler
