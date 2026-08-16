import { search, download } from '../lib/ytmusic.js'
import { pipeline } from 'stream/promises'
import { createWriteStream, createReadStream, unlinkSync } from 'fs'
import path from 'path'
import os from 'os'

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
  const m = Math.floor(segundos / 60)
  const s = Math.floor(segundos % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

const elegirMejorFormato = (formatos) => {
  const conUrl = formatos.filter((f) => f.url)
  if (conUrl.length === 0) return null
  return conUrl.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0]
}

const descargarABuffer = async (url) => {
  const respuesta = await fetch(url)
  if (!respuesta.ok) throw new Error(`Descarga fallida (${respuesta.status})`)
  const arrayBuffer = await respuesta.arrayBuffer()
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
    let tituloBusqueda = null
    let artistaBusqueda = null

    if (!videoId) {
      const resultados = await search(text.trim(), 'songs')
      const primero = resultados.results.find((r) => r.resultType === 'song' && r.videoId)
      if (!primero) {
        await m.react('✖️')
        await conn.reply(m.chat, `${SIMBOLO} *Sin resultados*\n\n> No se encontro ninguna cancion para *${text}*`, m)
        return
      }
      videoId = primero.videoId
      tituloBusqueda = primero.title
      artistaBusqueda = primero.artists?.map((a) => a.name).join(', ') || null
    }

    const info = await download(videoId)

    if (info.status !== 'OK') {
      await m.react('✖️')
      await conn.reply(
        m.chat,
        `${SIMBOLO} *No se pudo procesar*\n\n> Motivo: ${info.reason || 'desconocido'}`,
        m
      )
      return
    }

    const mejorFormato = elegirMejorFormato(info.audioFormats)
    if (!mejorFormato) {
      await m.react('✖️')
      await conn.reply(
        m.chat,
        `${SIMBOLO} *Formato no disponible*\n\n> No se encontro un formato de audio valido para este video, es posible que YouTube haya cambiado su sistema de firmas`,
        m
      )
      return
    }

    const buffer = await descargarABuffer(mejorFormato.url)
    const duracion = formatearDuracion(info.lengthSeconds || 0)
    const pesoMb = (buffer.length / (1024 * 1024)).toFixed(2)

    let caption = `${SIMBOLO} *${info.title || tituloBusqueda || 'Audio'}*\n\n`
    caption += `${SIMBOLO_ALT} *Detalles*\n`
    caption += `> Artista: ${info.artist || artistaBusqueda || 'Desconocido'}\n`
    caption += `> Duracion: ${duracion}\n`
    caption += `> Peso: ${pesoMb} MB\n`
    caption += `> Calidad: ${mejorFormato.audioQuality || 'estandar'}`

    await conn.sendMessage(
      m.chat,
      {
        audio: buffer,
        mimetype: 'audio/mpeg',
        fileName: `${(info.title || 'audio').replace(/[\\/:*?"<>|]/g, '')}.mp3`,
        ptt: false
      },
      { quoted: m }
    )

    await conn.reply(m.chat, caption, m)
    await m.react('✔️')
  } catch (error) {
    await m.react('✖️')
    await conn.reply(m.chat, `${SIMBOLO} *Error*\n\n> ${error.message}`, m)
  }
}

handler.help = ['ytmp3']
handler.tags = ['descargas']
handler.command = ['ytmp3', 'play', 'mp3']
handler.description = 'busca y descarga musica'

export default handler
