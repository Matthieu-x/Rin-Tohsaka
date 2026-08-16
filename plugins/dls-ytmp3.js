import fetch from 'node-fetch'

const API_KEY = 'dvyer343179430300'
const API_BASE = 'https://dv-yer-api.online'

const SIMBOLO = 'ꕥ'
const SIMBOLO_ALT = '〄'

const extraerVideoId = (texto) => {
  const patrones = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|music\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/
  ]

  for (const patron of patrones) {
    const coincidencia = texto.match(patron)
    if (coincidencia) return coincidencia[1]
  }

  return null
}

const formatearDuracion = (segundos) => {
  const m = Math.floor(Number(segundos || 0) / 60)
  const s = Math.floor(Number(segundos || 0) % 60)

  return `${m}:${s.toString().padStart(2, '0')}`
}

const limpiarNombre = (texto) => {
  return String(texto || 'audio')
    .replace(/[\\/:*?"<>|]/g, '')
    .trim()
}

const buscarYouTube = async (query) => {
  const url =
    `${API_BASE}/ytsearch?q=${encodeURIComponent(query)}` +
    `&limit=5&apikey=${encodeURIComponent(API_KEY)}`

  const res = await fetch(url)

  if (!res.ok) {
    throw new Error(`Error en búsqueda (${res.status})`)
  }

  const data = await res.json()

  if (!data?.ok || !data?.results?.length) {
    return null
  }

  return data.results[0]
}

const descargarInfo = async (youtubeUrl) => {
  const url =
    `${API_BASE}/ytmp3?mode=link` +
    `&url=${encodeURIComponent(youtubeUrl)}` +
    `&apikey=${encodeURIComponent(API_KEY)}`

  const res = await fetch(url)

  if (!res.ok) {
    throw new Error(`Error procesando el audio (${res.status})`)
  }

  const data = await res.json()

  if (!data?.ok || !data?.ready || !data?.download_url) {
    throw new Error(
      data?.message ||
      data?.reason ||
      'No se pudo preparar el audio'
    )
  }

  return data
}

const descargarABuffer = async (url) => {
  const res = await fetch(url)

  if (!res.ok) {
    throw new Error(`Descarga fallida (${res.status})`)
  }

  const arrayBuffer = await res.arrayBuffer()

  return Buffer.from(arrayBuffer)
}

const handler = async (m, { conn, text }) => {
  if (!text) {
    await conn.reply(
      m.chat,
      `${SIMBOLO} *Falta el nombre o link*\n\n> Ejemplo: *.ytmp3 shape of you*\n> Tambien acepta un link de YouTube o YouTube Music`,
      m
    )
    return
  }

  await m.react('🕒')

  try {
    let videoId = extraerVideoId(text)
    let resultadoBusqueda = null
    let youtubeUrl = text.trim()

    if (!videoId) {
      resultadoBusqueda = await buscarYouTube(text.trim())

      if (!resultadoBusqueda) {
        await m.react('✖️')

        await conn.reply(
          m.chat,
          `${SIMBOLO} *Sin resultados*\n\n> No se encontro ninguna cancion para *${text}*`,
          m
        )

        return
      }

      youtubeUrl = resultadoBusqueda.url
      videoId = resultadoBusqueda.video_id
    } else {
      youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`
    }

    const info = await descargarInfo(youtubeUrl)

    const titulo =
      info.title ||
      resultadoBusqueda?.title ||
      'Audio'

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

    const thumbnail =
      info.thumbnail ||
      resultadoBusqueda?.thumbnail ||
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`

    const buffer = await descargarABuffer(info.download_url)

    const pesoMb = (buffer.length / (1024 * 1024)).toFixed(2)

    const caption =
      `${SIMBOLO} *${titulo}*\n\n` +
      `${SIMBOLO_ALT} *Detalles*\n` +
      `> Artista: ${artista}\n` +
      `> Duracion: ${duracion}\n` +
      `> Peso: ${pesoMb} MB\n` +
      `> Calidad: ${info.quality || 'M4A'}\n` +
      `> Formato: ${info.format || 'M4A'}`

    await conn.sendMessage(
      m.chat,
      {
        image: {
          url: thumbnail
        },
        caption
      },
      {
        quoted: m
      }
    )

    await conn.sendMessage(
      m.chat,
      {
        audio: buffer,
        mimetype: info.mime_type || 'audio/mp4',
        fileName: `${limpiarNombre(titulo)}.m4a`,
        ptt: false
      },
      {
        quoted: m
      }
    )

    await m.react('✔️')

  } catch (error) {
    console.error('YTMP3:', error)

    await m.react('✖️')

    await conn.reply(
      m.chat,
      `${SIMBOLO} *Error*\n\n> ${error.message || 'Error desconocido'}`,
      m
    )
  }
}

handler.help = ['ytmp3']
handler.tags = ['descargas']
handler.command = ['ytmp3', 'play', 'mp3']
handler.description = 'busca y descarga musica'

export default handler