const API_KEY = 'dvyer343179430300'
const API_BASE = 'https://dv-yer-api.online'

const SIMBOLO = 'ꕥ'
const SIMBOLO_ALT = '〄'

const extraerVideoId = (texto) => {
  const patrones = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|music\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/
  ]

  for (const patron of patrones) {
    const coincidencia = texto.match(patron)
    if (coincidencia) return coincidencia[1]
  }

  return null
}

const limpiarNombre = (texto) => {
  return String(texto || 'audio')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180)
}

const formatearDuracion = (segundos) => {
  segundos = Number(segundos || 0)

  const horas = Math.floor(segundos / 3600)
  const minutos = Math.floor((segundos % 3600) / 60)
  const segundosRestantes = Math.floor(segundos % 60)

  if (horas > 0) {
    return `${horas}:${minutos.toString().padStart(2, '0')}:${segundosRestantes.toString().padStart(2, '0')}`
  }

  return `${minutos}:${segundosRestantes.toString().padStart(2, '0')}`
}

const buscarYouTube = async (query) => {
  const url =
    `${API_BASE}/ytsearch?q=${encodeURIComponent(query)}` +
    `&limit=5&apikey=${encodeURIComponent(API_KEY)}`

  const respuesta = await fetch(url)

  if (!respuesta.ok) {
    throw new Error(`Error en búsqueda (${respuesta.status})`)
  }

  const data = await respuesta.json()

  if (!data.ok || !data.results?.length) {
    return null
  }

  return data.results[0]
}

const obtenerAudio = async (youtubeUrl) => {
  const url =
    `${API_BASE}/ytmp3?mode=link` +
    `&url=${encodeURIComponent(youtubeUrl)}` +
    `&apikey=${encodeURIComponent(API_KEY)}`

  const respuesta = await fetch(url)

  if (!respuesta.ok) {
    throw new Error(`Error procesando el audio (${respuesta.status})`)
  }

  const data = await respuesta.json()

  if (!data.ok || !data.ready || !data.download_url) {
    throw new Error(
      data.message ||
      data.reason ||
      'La API no pudo preparar el audio'
    )
  }

  return data
}

const descargarBuffer = async (url) => {
  const respuesta = await fetch(url)

  if (!respuesta.ok) {
    throw new Error(`Error descargando el archivo (${respuesta.status})`)
  }

  const arrayBuffer = await respuesta.arrayBuffer()

  return Buffer.from(arrayBuffer)
}

const obtenerMiniatura = async (url) => {
  if (!url) return null

  try {
    const respuesta = await fetch(url)

    if (!respuesta.ok) return null

    const arrayBuffer = await respuesta.arrayBuffer()

    return Buffer.from(arrayBuffer)
  } catch {
    return null
  }
}

const handler = async (m, { conn, text }) => {
  if (!text) {
    await conn.reply(
      m.chat,
      `${SIMBOLO} *Falta el nombre o link*\n\n` +
      `> Ejemplo: *.ytmp3 shape of you*\n` +
      `> También acepta un link de YouTube`,
      m
    )
    return
  }

  await m.react('🕒')

  try {
    let youtubeUrl = text.trim()
    let resultadoBusqueda = null

    const videoId = extraerVideoId(youtubeUrl)

    if (!videoId) {
      resultadoBusqueda = await buscarYouTube(youtubeUrl)

      if (!resultadoBusqueda) {
        await m.react('✖️')

        await conn.reply(
          m.chat,
          `${SIMBOLO} *Sin resultados*\n\n` +
          `> No se encontró ningún resultado para *${youtubeUrl}*`,
          m
        )

        return
      }

      youtubeUrl = resultadoBusqueda.url
    } else {
      youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`
    }

    const info = await obtenerAudio(youtubeUrl)

    const buffer = await descargarBuffer(info.download_url)

    const thumbnail = await obtenerMiniatura(info.thumbnail)

    const titulo = limpiarNombre(
      info.title ||
      resultadoBusqueda?.title ||
      'Audio'
    )

    const artista =
      info.author ||
      info.channel ||
      resultadoBusqueda?.channel ||
      'Desconocido'

    const duracion = formatearDuracion(
      info.duration_seconds ||
      info.duration ||
      resultadoBusqueda?.duration_seconds ||
      0
    )

    const pesoMb = (buffer.length / (1024 * 1024)).toFixed(2)

    const formato =
      info.format ||
      info.quality ||
      'M4A'

    const mensajeAudio = {
      audio: buffer,
      mimetype: info.mime_type || 'audio/mp4',
      fileName: `${titulo}.m4a`,
      ptt: false
    }

    if (thumbnail) {
      mensajeAudio.jpegThumbnail = thumbnail
    }

    await conn.sendMessage(
      m.chat,
      mensajeAudio,
      {
        quoted: m
      }
    )

    const caption =
      `${SIMBOLO} *${info.title || resultadoBusqueda?.title || 'Audio'}*\n\n` +
      `${SIMBOLO_ALT} *Detalles*\n` +
      `> Artista: ${artista}\n` +
      `> Duración: ${duracion}\n` +
      `> Peso: ${pesoMb} MB\n` +
      `> Formato: ${formato}\n` +
      `> Calidad: ${info.quality || 'M4A'}\n` +
      `> Plataforma: YouTube`

    await conn.reply(
      m.chat,
      caption,
      m
    )

    await m.react('✔️')

  } catch (error) {
    console.error('Error YTMP3:', error)

    await m.react('✖️')

    await conn.reply(
      m.chat,
      `${SIMBOLO} *Error al descargar*\n\n` +
      `> ${error.message || 'Error desconocido'}`,
      m
    )
  }
}

handler.help = ['ytmp3']
handler.tags = ['descargas']
handler.command = ['ytmp3', 'play', 'mp3']
handler.description = 'Busca y descarga música'
export default handler