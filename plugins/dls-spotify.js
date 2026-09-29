import fetch from 'node-fetch'
import {
    verificarLimiteDescargas,
    registrarDescarga,
    construirMensajeLimiteAlcanzado
} from '../lib/limits.js'

const SIMBOLO = 'ꕥ'
const SIMBOLO_ALT = '〄'
const SIMBOLO_OK = '✰'
const SIMBOLO_NOTA = '✐'
const SIMBOLO_X = '✖'

const API_KEY = 'nothPniC'
const API_BASE = 'https://noth.hidenplay.net'
const API_CREADOR = 'Noth'

const DURACION_MAXIMA_SEGUNDOS = 30 * 60
const PESO_MAXIMO_MB = 50

const INTENTOS_MAXIMOS = 3
const TIEMPO_ENTRE_INTENTOS = 1500

const MAX_RESULTADOS_LISTA = 5
const TIEMPO_SELECCION_MS = 3 * 60 * 1000

const PREFIJO_FILA = '#spotify_dl_sel:'
const TIEMPO_CACHE_MS = 5 * 60 * 1000

const cacheBusquedas = new Map()
const seleccionesPendientes = new Map()

const esperar = ms => new Promise(resolve => setTimeout(resolve, ms))

const fetchConTimeout = async (url, opciones = {}, timeout = 20000) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)
    try {
        return await fetch(url, { ...opciones, signal: controller.signal })
    } catch (error) {
        if (error?.name === 'AbortError') {
            throw new Error(`La solicitud tardó más de ${Math.floor(timeout / 1000)} segundos`)
        }
        throw error
    } finally {
        clearTimeout(timer)
    }
}

const extraerTrackId = texto => {
    const patron = /(?:open\.spotify\.com\/track\/|spotify:track:)([a-zA-Z0-9]{22})/
    const coincidencia = String(texto).match(patron)
    return coincidencia ? coincidencia[1] : null
}

const esUrlSpotify = texto => /open\.spotify\.com|spotify:track:/i.test(texto)

const normalizarConsulta = texto => {
    return String(texto || '')
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/(official\s*(music\s*)?video|lyrics?|hd|4k|audio\s*oficial|remastered)/gi, '')
        .trim()
}

const convertirDuracion = duracion => {
    if (typeof duracion === 'number') return duracion
    if (!duracion) return 0
    const partes = String(duracion).split(':').map(Number)
    if (partes.some(Number.isNaN)) return 0
    if (partes.length === 3) return partes[0] * 3600 + partes[1] * 60 + partes[2]
    if (partes.length === 2) return partes[0] * 60 + partes[1]
    return Number(partes[0]) || 0
}

const formatearDuracion = segundos => {
    const total = Number(segundos || 0)
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = Math.floor(total % 60)
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return `${m}:${String(s).padStart(2, '0')}`
}

const limpiarNombre = texto => {
    return String(texto || 'audio')
        .replace(/[\\/:*?"<>|]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 60) || 'audio'
}

const conReintentos = async (fn, etiqueta) => {
    let ultimoError = null
    for (let intento = 1; intento <= INTENTOS_MAXIMOS; intento++) {
        try {
            return await fn()
        } catch (error) {
            ultimoError = error
            if (intento < INTENTOS_MAXIMOS) await esperar(TIEMPO_ENTRE_INTENTOS * intento)
        }
    }
    throw new Error(`${etiqueta} falló tras ${INTENTOS_MAXIMOS} intentos: ${ultimoError?.message || 'Error desconocido'}`)
}

const obtenerJson = async res => {
    const texto = await res.text()
    if (!texto) throw new Error('La API devolvió una respuesta vacía')
    try {
        return JSON.parse(texto)
    } catch {
        throw new Error('La API devolvió una respuesta inválida')
    }
}

const buscarSpotify = async query => {
    const consultaOriginal = String(query || '').trim()
    const clave = consultaOriginal.toLowerCase().replace(/\s+/g, ' ')

    const cache = cacheBusquedas.get(clave)
    if (cache && Date.now() - cache.timestamp < TIEMPO_CACHE_MS) {
        return cache.datos
    }

    const ejecutarBusqueda = async consulta => {
        const url = `${API_BASE}/api/busqueda/spotify?query=${encodeURIComponent(consulta)}&apikey=${encodeURIComponent(API_KEY)}`
        const res = await fetchConTimeout(url, {
            method: 'GET',
            headers: { Accept: 'application/json', 'User-Agent': 'Rin-Tohsaka/1.0' }
        }, 20000)

        const data = await obtenerJson(res)
        if (!res.ok || !data?.status) {
            throw new Error(data?.message || data?.error || `Error HTTP ${res.status}`)
        }
        if (!Array.isArray(data?.data) || !data.data.length) {
            throw new Error('La API no devolvió resultados')
        }

        return data.data.map(item => ({
            type: item.type,
            id: item.id,
            title: item.title,
            artist: item.artist,
            album: item.album,
            duration: item.duration,
            url: item.url,
            image: item.image
        }))
    }

    let resultados = null
    let ultimoError = null

    try {
        resultados = await conReintentos(() => ejecutarBusqueda(consultaOriginal), 'Búsqueda')
    } catch (error) {
        ultimoError = error
    }

    if (!resultados?.length) {
        const consultaAlterna = normalizarConsulta(consultaOriginal)
        if (consultaAlterna && consultaAlterna.toLowerCase() !== clave) {
            try {
                resultados = await conReintentos(() => ejecutarBusqueda(consultaAlterna), 'Búsqueda alterna')
            } catch (error) {
                ultimoError = error
            }
        }
    }

    if (!resultados?.length) {
        if (ultimoError) throw ultimoError
        return null
    }

    const lista = resultados.filter(Boolean).slice(0, MAX_RESULTADOS_LISTA)
    if (!lista.length) return null

    cacheBusquedas.set(clave, { datos: lista, timestamp: Date.now() })
    return lista
}

const obtenerInfoDescarga = async urlTrack => {
    const ejecutar = async () => {
        const url = `${API_BASE}/api/descargas/spotify?url=${encodeURIComponent(urlTrack)}&apikey=${encodeURIComponent(API_KEY)}`
        const res = await fetchConTimeout(url, {
            method: 'GET',
            headers: { Accept: 'application/json', 'User-Agent': 'Rin-Tohsaka/1.0' }
        }, 60000)

        const data = await obtenerJson(res)
        if (!res.ok || !data?.status) {
            throw new Error(data?.message || data?.error || `Error HTTP ${res.status}`)
        }

        const info = data.data || data.result || data

        const urlDescarga = info.link || info.download || info.url || info.audio

        if (!urlDescarga) {
            throw new Error('La API no devolvió el link de descarga')
        }

        return {
            title: info.title || 'Audio',
            artist: info.author || info.artist || 'Desconocido',
            album: info.album || '',
            duration: info.duration || 0,
            thumbnail: info.image || info.thumbnail || null,
            download_url: urlDescarga,
            format: info.format || 'mp3',
            quality: info.quality || '128 kbps'
        }
    }

    return conReintentos(ejecutar, 'Procesamiento')
}

const descargarABuffer = async url => {
    if (!url) throw new Error('La API no proporcionó el enlace de descarga')

    const res = await fetchConTimeout(url, {
        method: 'GET',
        headers: { 'User-Agent': 'Rin-Tohsaka/1.0' }
    }, 90000)

    if (!res.ok) throw new Error(`Descarga fallida (${res.status})`)

    const contentLength = res.headers.get('content-length')
    if (contentLength && Number(contentLength) > PESO_MAXIMO_MB * 1024 * 1024) {
        throw new Error(`El archivo pesa más de ${PESO_MAXIMO_MB} MB`)
    }

    const arrayBuffer = await res.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    if (buffer.length > PESO_MAXIMO_MB * 1024 * 1024) {
        throw new Error(`El archivo pesa más de ${PESO_MAXIMO_MB} MB`)
    }

    return buffer
}

const construirCaption = (info, pesoMb, tiempoTotal, estadoLimite, cantidadUsada) => {
    let caption = `${SIMBOLO} *${info.title}*\n\n`
    caption += `${SIMBOLO_ALT} *Detalles*\n`
    caption += `> Artista: ${info.artist}\n`
    if (info.album) caption += `> Álbum: ${info.album}\n`
    caption += `> Duración: ${formatearDuracion(convertirDuracion(info.duration))}\n`
    caption += `> Peso: ${pesoMb} MB\n`
    caption += `> Formato: ${info.format}\n`
    caption += `> Calidad: ${info.quality}\n`
    caption += `> Tiempo de proceso: ${tiempoTotal} s\n\n`
    caption += `${SIMBOLO_NOTA} *API:* ${API_CREADOR}`

    let piePagina = `${estadoLimite.esPremium ? 'Premium' : 'Normal'} · `
    piePagina += estadoLimite.ilimitado
        ? `Descargas hoy: ${cantidadUsada} / Ilimitado`
        : `Descargas hoy: ${cantidadUsada} / ${estadoLimite.limite}`

    return `${caption}\n\n${piePagina}`
}

const limpiarSeleccionesVencidas = () => {
    const ahora = Date.now()
    for (const [clave, valor] of seleccionesPendientes) {
        if (!valor || ahora > valor.expira) {
            seleccionesPendientes.delete(clave)
        }
    }
}

const desempaquetarMensaje = m => {
    let actual = m?.message || m?.msg || m
    let anterior = null
    while (actual && actual !== anterior) {
        anterior = actual
        if (actual?.ephemeralMessage?.message) { actual = actual.ephemeralMessage.message; continue }
        if (actual?.viewOnceMessage?.message) { actual = actual.viewOnceMessage.message; continue }
        if (actual?.viewOnceMessageV2?.message) { actual = actual.viewOnceMessageV2.message; continue }
        if (actual?.viewOnceMessageV2Extension?.message) { actual = actual.viewOnceMessageV2Extension.message; continue }
        break
    }
    return actual
}

const extraerIdInteractivo = msg => {
    const interactive = msg?.interactiveResponseMessage
    if (!interactive) return null
    const nativeFlow = interactive?.nativeFlowResponseMessage
    const paramsJson = nativeFlow?.paramsJson
    if (!paramsJson) return null
    try {
        const params = JSON.parse(paramsJson)
        return params?.id || params?.selectedId || params?.selectedRowId || params?.row_id || null
    } catch {
        return null
    }
}

const obtenerSeleccion = m => {
    const msg = desempaquetarMensaje(m)
    const interactiveId = extraerIdInteractivo(msg)
    if (interactiveId) return interactiveId
    const listId = msg?.listResponseMessage?.singleSelectReply?.selectedRowId
    if (listId) return listId
    const buttonId = msg?.buttonsResponseMessage?.selectedButtonId
    if (buttonId) return buttonId
    return null
}

const procesarYEnviar = async (m, conn, urlTrack, resultadoBusqueda) => {
    const estadoLimite = verificarLimiteDescargas(m.sender, conn)
    if (!estadoLimite.permitido) {
        await m.react('⛔')
        await conn.reply(m.chat, construirMensajeLimiteAlcanzado(estadoLimite, '.'), m)
        return
    }

    await m.react('🕒')
    const inicioProceso = Date.now()

    try {
        const info = await obtenerInfoDescarga(urlTrack)

        const duracionFinal = convertirDuracion(info.duration) || convertirDuracion(resultadoBusqueda?.duration) || 0
        if (duracionFinal > DURACION_MAXIMA_SEGUNDOS) {
            await m.react('✖️')
            await conn.reply(m.chat, `${SIMBOLO_X} *Audio demasiado largo*\n\n> Duración: ${formatearDuracion(duracionFinal)}\n> Máximo: ${formatearDuracion(DURACION_MAXIMA_SEGUNDOS)}`, m)
            return
        }

        const titulo = limpiarNombre(info.title || resultadoBusqueda?.title || 'Audio')
        const artista = info.artist || resultadoBusqueda?.artist || 'Desconocido'
        const thumbnail = info.thumbnail || resultadoBusqueda?.image || null

        const buffer = await descargarABuffer(info.download_url)
        const pesoMb = (buffer.length / (1024 * 1024)).toFixed(2)

        if (Number(pesoMb) > PESO_MAXIMO_MB) {
            await m.react('✖️')
            await conn.reply(m.chat, `${SIMBOLO_X} *Archivo muy pesado*\n\n> Peso: ${pesoMb} MB\n> Máximo: ${PESO_MAXIMO_MB} MB`, m)
            return
        }

        const cantidadUsada = registrarDescarga(m.sender, conn)
        const tiempoTotal = ((Date.now() - inicioProceso) / 1000).toFixed(2)

        const caption = construirCaption(
            { ...info, title: titulo, artist: artista, duration: duracionFinal },
            pesoMb,
            tiempoTotal,
            estadoLimite,
            cantidadUsada
        )

        if (thumbnail) {
            await conn.sendMessage(m.chat, {
                image: { url: thumbnail },
                caption
            }, { quoted: m })
        } else {
            await conn.reply(m.chat, caption, m)
        }

        await conn.sendMessage(m.chat, {
            audio: buffer,
            mimetype: 'audio/mpeg',
            fileName: `${titulo}.mp3`,
            ptt: false
        }, { quoted: m })

        if (!estadoLimite.ilimitado && !estadoLimite.esPremium) {
            await conn.reply(m.chat, `${SIMBOLO_NOTA} *${SIMBOLO_OK} Hazte premium para subir tu límite a 300 descargas diarias*`, m)
        }

        await m.react('✔️')

    } catch (error) {
        await m.react('✖️')
        await conn.reply(m.chat, `${SIMBOLO_X} *Error*\n\n> ${error?.message || 'Error desconocido'}`, m)
    }
}

const handler = async (m, { conn, text, usedPrefix }) => {
    if (!text?.trim()) {
        await conn.reply(
            m.chat,
            `${SIMBOLO} *Falta el nombre o link*\n\n` +
            `> Ejemplo: *${usedPrefix}spotify this is for*\n` +
            `> También acepta un link de Spotify\n` +
            `> API: ${API_CREADOR}`,
            m
        )
        return
    }

    const consulta = text.trim()
    const trackIdDirecto = extraerTrackId(consulta)

    if (!trackIdDirecto && esUrlSpotify(consulta)) {
        await m.react('✖️')
        await conn.reply(m.chat, `${SIMBOLO_X} *Link no reconocido*\n\n> Verifica que el link de Spotify esté completo`, m)
        return
    }

    if (trackIdDirecto) {
        const spotifyUrl = `https://open.spotify.com/track/${trackIdDirecto}`
        await procesarYEnviar(m, conn, spotifyUrl, null)
        return
    }

    await m.react('🔎')

    let resultados
    try {
        resultados = await buscarSpotify(consulta)
    } catch (error) {
        await m.react('✖️')
        await conn.reply(m.chat, `${SIMBOLO_X} *Error buscando*\n\n> ${error?.message || 'Error desconocido'}`, m)
        return
    }

    if (!resultados?.length) {
        await m.react('✖️')
        await conn.reply(m.chat, `${SIMBOLO_X} *Sin resultados*\n\n> No se encontró nada para *${consulta}*`, m)
        return
    }

    limpiarSeleccionesVencidas()

    const clave = `${m.chat}|${m.sender}`
    seleccionesPendientes.set(clave, {
        resultados,
        expira: Date.now() + TIEMPO_SELECCION_MS
    })

    const filas = resultados.map((r, i) => ({
        title: limpiarNombre(r.title || 'Sin título'),
        description: `${r.artist || 'Desconocido'} · ${formatearDuracion(convertirDuracion(r.duration))}`,
        id: `${PREFIJO_FILA}${i}`
    }))

    try {
        await conn.sendMessage(m.chat, {
            text: `${SIMBOLO_ALT} *Elige una canción de Spotify*\n> API: ${API_CREADOR}`,
            title: `${SIMBOLO} Resultados para "${consulta}"`,
            footer: 'Selecciona una canción',
            buttons: [
                {
                    text: '🎵 Ver canciones',
                    sections: [
                        {
                            title: 'Resultados',
                            rows: filas
                        }
                    ]
                }
            ]
        }, { quoted: m })
        await m.react('✔️')
    } catch (error) {
        seleccionesPendientes.delete(clave)
        await m.react('✖️')
        await conn.reply(m.chat, `${SIMBOLO_X} *No se pudo mostrar el selector*\n\n> ${error?.message || 'Error desconocido'}`, m)
    }
}

handler.before = async function (m, { conn }) {
    try {
        const filaId = obtenerSeleccion(m)
        if (!filaId || !String(filaId).startsWith(PREFIJO_FILA)) return

        const clave = `${m.chat}|${m.sender}`
        const pendiente = seleccionesPendientes.get(clave)

        if (!pendiente || Date.now() > pendiente.expira) {
            seleccionesPendientes.delete(clave)
            await conn.reply(m.chat, `${SIMBOLO_X} *Esa búsqueda ya venció*\n\n> Vuelve a buscar con .spotify`, m)
            return true
        }

        const indice = Number(String(filaId).slice(PREFIJO_FILA.length))
        if (!Number.isInteger(indice) || indice < 0) return true

        const resultado = pendiente.resultados?.[indice]
        if (!resultado) {
            await conn.reply(m.chat, `${SIMBOLO_X} *Resultado inválido*`, m)
            return true
        }

        seleccionesPendientes.delete(clave)

        const spotifyUrl = resultado.url || (resultado.id ? `https://open.spotify.com/track/${resultado.id}` : null)
        if (!spotifyUrl) {
            await conn.reply(m.chat, `${SIMBOLO_X} *No se encontró el link del track*`, m)
            return true
        }

        await procesarYEnviar(m, conn, spotifyUrl, resultado)
        return true

    } catch (error) {
        return true
    }
}

handler.help = ['spotify']
handler.tags = ['descargas']
handler.command = ['spotify', 'sp', 'spdl']
handler.description = `Busca y descarga música de Spotify en MP3. API: ${API_CREADOR}`

export default handler