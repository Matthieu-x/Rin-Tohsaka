import fetch from 'node-fetch'
import { verificarLimiteDescargas, registrarDescarga, construirMensajeLimiteAlcanzado } from '../lib/limits.js'

const API_KEY = 'dvyer343179430300'
const API_BASE = 'https://dv-yer-api.online'

const SIMBOLO = 'ꕥ'
const SIMBOLO_ALT = '〄'
const SIMBOLO_OK = '✰'
const SIMBOLO_NOTA = '✐'

const DURACION_MAXIMA_SEGUNDOS = 20 * 60
const PESO_MAXIMO_MB = 60
const INTENTOS_MAXIMOS = 3
const TIEMPO_ENTRE_INTENTOS = 1500

const cacheBusquedas = new Map()
const TIEMPO_CACHE_MS = 5 * 60 * 1000

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const extraerVideoId = (texto) => {
  const patrones = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|music\.youtube\.com\/watch\?v=|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
  ]
  for (const patron of patrones) {
    const coincidencia = texto.match(patron)
    if (coincidencia) return coincidencia[1]
  }
  return null
}

const esUrlYoutube = (texto) => /youtu\.?be/i.test(texto)

const normalizarConsulta = (texto) => {
  return texto
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/(official\s*(music\s*)?video|lyrics?|hd|4k|audio\s*oficial)/gi, '')
    .trim()
}

const formatearDuracion = (segundos) => {
  const total = Number(segundos || 0)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = Math.floor(total % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

const limpiarNombre = (texto) => {
  return String(texto || 'audio')
    .replace(/[\\/:*?"<>|]/g, '')
    .trim()
    .slice(0, 60)
}

const conReintentos = async (fn, etiqueta) => {
  let ultimoError = null
  for (let intento = 1; intento <= INTENTOS_MAXIMOS; intento++) {
    try {
      return await fn()
    } catch (error) {
      ultimoError = error
      if (intento < INTENTOS_MAXIMOS) {
        await esperar(TIEMPO_ENTRE_INTENTOS * intento)
      }
    }
  }
  throw new Error(`${etiqueta} fallo tras ${INTENTOS_MAXIMOS} intentos: ${ultimoError.message}`)
}

const buscarYouTube = async (query) => {
  const clave = query.toLowerCase()
  const enCache = cacheBusquedas.get(clave)
  if (enCache && Date.now() - enCache.timestamp < TIEMPO_CACHE_MS) {
    return enCache.datos
  }

  const ejecutarBusqueda = async (consulta) => {
    const url =
      `${API_BASE}/ytsearch?q=${encodeURIComponent(consulta)}` +
      `&limit=5&apikey=${encodeURIComponent(API_KEY)}`
    const res = await fetch(url, { timeout: 15000 })
    if (!res.ok) throw new Error(`Error en busqueda (${res.status})`)
    const data = await res.json()
    if (!data?.ok || !data?.results?.length) return null
    return data.results
  }

  let resultados = await conReintentos(() => ejecutarBusqueda(query), 'Busqueda')

  if (!resultados) {
    const queryAlterna = normalizarConsulta(query)
    if (queryAlterna && queryAlterna.toLowerCase() !== clave) {
      resultados = await conReintentos(() => ejecutarBusqueda(queryAlterna), 'Busqueda alterna')
    }
  }

  if (!resultados) return null

  const mejorResultado = resultados[0]
  cacheBusquedas.set(clave, { datos: mejorResultado, timestamp: Date.now() })
  return mejorResultado
}

const descargarInfo = async (youtubeUrl) => {
  const ejecutar = async () => {
    const url =
      `${API_BASE}/ytmp3?mode=link` +
      `&url=${encodeURIComponent(youtubeUrl)}` +
      `&apikey=${encodeURIComponent(API_KEY)}`
    const res = await fetch(url, { timeout: 30000 })
    if (!res.ok) throw new Error(`Error procesando el audio (${res.status})`)
    const data = await res.json()
    if (!data?.ok || !data?.ready || !data?.download_url) {
      throw new Error(data?.message || data?.reason || 'No se pudo preparar el audio')
    }
    return data
  }
  return conReintentos(ejecutar, 'Procesamiento')
}

const descargarABuffer = async (url) => {
  const res = await fetch(url, { timeout: 60000 })
  if (!res.ok) throw new Error(`Descarga fallida (${res.status})`)
  const contentLength = res.headers.get('content-length')
  if (contentLength && Number(contentLength) > PESO_MAXIMO_MB * 1024 * 1024) {
    throw new Error(`El archivo pesa mas de ${PESO_MAXIMO_MB} MB`)
  }
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

const construirCaptionInfo = (titulo, artista, duracion, pesoMb, calidad, formato, tiempoTotal) => {
  let caption = `${SIMBOLO} *${titulo}*\n\n`
  caption += `${SIMBOLO_ALT} *Detalles*\n`
  caption += `> Artista: ${artista}\n`
  caption += `> Duracion: ${duracion}\n`
  caption += `> Peso: ${pesoMb} MB\n`
  caption += `> Calidad: ${calidad}\n`
  caption += `> Formato: ${formato}\n`
  caption += `> Tiempo de proceso: ${tiempoTotal} s`
  return caption
}

const handler = async (m, { conn, text, usedPrefix }) => {
  if (!text) {
    await conn.reply(
      m.chat,
      `${SIMBOLO} *Falta el nombre o link*\n\n> Ejemplo: *${usedPrefix}play shape of you*\n> Tambien acepta un link de YouTube o YouTube Music`,
      m
    )
    return
  }

  const estadoLimite = verificarLimiteDescargas(m.sender, conn)
  if (!estadoLimite.permitido) {
    await m.react('⛔')
    await conn.reply(m.chat, construirMensajeLimiteAlcanzado(estadoLimite, usedPrefix), m)
    return
  }

  await m.react('🕒')
  const inicioProceso = Date.now()

  try {
    let videoId = extraerVideoId(text)
    let resultadoBusqueda = null
    let youtubeUrl = text.trim()

    if (!videoId && esUrlYoutube(text)) {
      await m.react('✖️')
      await conn.reply(
        m.chat,
        `${SIMBOLO} *Link no reconocido*\n\n> Parece un link de YouTube pero no se pudo extraer el video ID\n> Verifica que el link este completo`,
        m
      )
      return
    }

    if (!videoId) {
      resultadoBusqueda = await buscarYouTube(text.trim())
      if (!resultadoBusqueda) {
        await m.react('✖️')
        await conn.reply(
          m.chat,
          `${SIMBOLO} *Sin resultados*\n\n> No se encontro ninguna cancion para *${text}*\n> Intenta con el titulo exacto o pega el link directo`,
          m
        )
        return
      }
      youtubeUrl = resultadoBusqueda.url
      videoId = resultadoBusqueda.video_id
    } else {
      youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`
    }

    const duracionEstimada =
      resultadoBusqueda?.duration_seconds || resultadoBusqueda?.duration || 0

    if (duracionEstimada && duracionEstimada > DURACION_MAXIMA_SEGUNDOS) {
      await m.react('✖️')
      await conn.reply(
        m.chat,
        `${SIMBOLO} *Video demasiado largo*\n\n> Duracion: ${formatearDuracion(duracionEstimada)}\n> Maximo permitido: ${formatearDuracion(DURACION_MAXIMA_SEGUNDOS)}`,
        m
      )
      return
    }

    const info = await descargarInfo(youtubeUrl)

    const duracionFinal = Number(
      info.duration_seconds || info.duration || duracionEstimada || 0
    )

    if (duracionFinal > DURACION_MAXIMA_SEGUNDOS) {
      await m.react('✖️')
      await conn.reply(
        m.chat,
        `${SIMBOLO} *Video demasiado largo*\n\n> Duracion: ${formatearDuracion(duracionFinal)}\n> Maximo permitido: ${formatearDuracion(DURACION_MAXIMA_SEGUNDOS)}`,
        m
      )
      return
    }

    const titulo = limpiarNombre(info.title || resultadoBusqueda?.title || 'Audio')
    const artista = info.author || info.channel || resultadoBusqueda?.channel || 'Desconocido'
    const duracionTexto = formatearDuracion(duracionFinal)
    const thumbnail =
      info.thumbnail || resultadoBusqueda?.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`

    const buffer = await descargarABuffer(info.download_url)
    const pesoMb = (buffer.length / (1024 * 1024)).toFixed(2)

    if (Number(pesoMb) > PESO_MAXIMO_MB) {
      await m.react('✖️')
      await conn.reply(
        m.chat,
        `${SIMBOLO} *Archivo demasiado pesado*\n\n> Peso: ${pesoMb} MB\n> Maximo permitido: ${PESO_MAXIMO_MB} MB`,
        m
      )
      return
    }

    const cantidadUsada = registrarDescarga(m.sender, conn)
    const tiempoTotal = ((Date.now() - inicioProceso) / 1000).toFixed(2)

    const caption = construirCaptionInfo(
      titulo,
      artista,
      duracionTexto,
      pesoMb,
      info.quality || 'M4A',
      info.format || 'M4A',
      tiempoTotal
    )

    await conn.sendMessage(
      m.chat,
      { image: { url: thumbnail }, caption },
      { quoted: m }
    )

    await conn.sendMessage(
      m.chat,
      {
        audio: buffer,
        mimetype: info.mime_type || 'audio/mp4',
        fileName: `${titulo}.m4a`,
        ptt: false
      },
      { quoted: m }
    )

    let piePagina = `${SIMBOLO_NOTA} *${estadoLimite.esPremium ? 'Premium' : 'Normal'}*\n`
    if (estadoLimite.ilimitado) {
      piePagina += `> Descargas hoy: ${cantidadUsada} / Ilimitado`
    } else {
      piePagina += `> Descargas hoy: ${cantidadUsada} / ${estadoLimite.limite}\n`
      if (!estadoLimite.esPremium) {
        piePagina += `> ${SIMBOLO_OK} Hazte premium para subir tu limite a 300 descargas diarias`
      }
    }

    await conn.reply(m.chat, piePagina, m)
    await m.react('✔️')
  } catch (error) {
    console.error('PLAY:', error)
    await m.react('✖️')
    await conn.reply(
      m.chat,
      `${SIMBOLO} *Error*\n\n> ${error.message || 'Error desconocido'}`,
      m
    )
  }
}

handler.help = ['play <nombre o link>']
handler.tags = ['descargas']
handler.command = ['ytmp3', 'play', 'mp3']
handler.description = 'Busca y descarga musica de YouTube en audio'

export default handler
