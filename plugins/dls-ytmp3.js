import fetch from 'node-fetch'

const API_BASE = 'https://orbit-cloud.onrender.com/api/v1'
const API_KEY = 'MATTH-HIEUX'
const ORBIT_IP = '10.25.121.79'

const HEADERS = {
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'x-orbit-ip': ORBIT_IP
}

const SIMBOLO = 'ꕥ'
const SIMBOLO_ALT = '〄'
const SIMBOLO_OK = '✰'
const SIMBOLO_NOTA = '✐'
const SIMBOLO_X = '✖'

const MAX_RESULTADOS = 5
const TIEMPO_SELECCION_MS = 3 * 60 * 1000
const PREFIJO_FILA = '#play_sel:'

const sesionesPendientes = new Map()

const fetchConTimeout = async (url, timeout = 20000) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)
    try {
        return await fetch(url, { headers: HEADERS, signal: controller.signal })
    } catch (error) {
        if (error?.name === 'AbortError') throw new Error('Tiempo de espera agotado')
        throw error
    } finally {
        clearTimeout(timer)
    }
}

const obtenerJson = async res => {
    const texto = await res.text()
    if (!texto) throw new Error('Respuesta vacía de la API')
    try {
        return JSON.parse(texto)
    } catch {
        throw new Error('La API no devolvió JSON válido')
    }
}

const limpiarVistas = vistas => {
    if (typeof vistas === 'string') return vistas.replace(/\s*views?$/i, '')
    return String(vistas || '0')
}

const limpiarNombre = texto => {
    return String(texto || 'audio')
        .replace(/[\\/:*?"<>|]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 60) || 'audio'
}

const buscarYouTube = async query => {
    const url = `${API_BASE}/search?apikey=${API_KEY}&query=${encodeURIComponent(query)}`
    const res = await fetchConTimeout(url)
    const data = await obtenerJson(res)
    if (!res.ok || !data?.status) throw new Error(data?.message || 'Error en la búsqueda')
    if (!Array.isArray(data?.results) || !data.results.length) throw new Error('Sin resultados')
    return data.results.slice(0, MAX_RESULTADOS)
}

const descargarAudio = async youtubeUrl => {
    const url = `${API_BASE}/download/ytaudio?apikey=${API_KEY}&url=${encodeURIComponent(youtubeUrl)}`
    const res = await fetchConTimeout(url, 60000)
    const data = await obtenerJson(res)
    if (!res.ok || !data?.status) throw new Error(data?.message || 'Error al procesar el audio')
    const downloadUrl = data.download_url
    if (!downloadUrl) throw new Error('La API no devolvió el enlace de descarga')
    return {
        title: data.title || 'Audio',
        thumbnail: data.thumbnail || '',
        duration: data.duration || 0,
        download_url: downloadUrl
    }
}

const descargarBuffer = async url => {
    const res = await fetchConTimeout(url, 90000)
    if (!res.ok) throw new Error(`Descarga fallida (${res.status})`)
    const buffer = Buffer.from(await res.arrayBuffer())
    if (!buffer.length) throw new Error('Buffer vacío')
    return buffer
}

const formatearDuracion = segundos => {
    const total = Number(segundos || 0)
    const m = Math.floor((total % 3600) / 60)
    const s = Math.floor(total % 60)
    return `${m}:${String(s).padStart(2, '0')}`
}

const handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text?.trim()) {
        return conn.reply(m.chat, `${SIMBOLO} *Falta el nombre o link*\n\n> Ejemplo: *${usedPrefix}${command} gato*\n> También acepta un link de YouTube`, m)
    }

    const consulta = text.trim()

    await m.react('🔎')

    let resultados
    try {
        resultados = await buscarYouTube(consulta)
    } catch (error) {
        await m.react('✖️')
        return conn.reply(m.chat, `${SIMBOLO_X} *Error buscando*\n\n> ${error.message}`, m)
    }

    if (!resultados?.length) {
        await m.react('✖️')
        return conn.reply(m.chat, `${SIMBOLO_X} *Sin resultados*\n\n> No se encontró nada para *${consulta}*`, m)
    }

    const clave = `${m.chat}|${m.sender}`
    sesionesPendientes.set(clave, {
        resultados,
        expira: Date.now() + TIEMPO_SELECCION_MS
    })

    const filas = resultados.map((r, i) => ({
        title: limpiarNombre(r.title || 'Sin título'),
        description: `${r.author || 'Desconocido'} · ${r.duration}`,
        id: `${PREFIJO_FILA}${i}`
    }))

    try {
        await conn.sendMessage(m.chat, {
            text: `${SIMBOLO_ALT} *Elige una canción*`,
            title: `${SIMBOLO} Resultados para "${consulta}"`,
            footer: 'Selecciona una opción',
            buttons: [
                {
                    text: '🎵 Ver canciones',
                    sections: [{ title: 'Resultados', rows: filas }]
                }
            ]
        }, { quoted: m })
        await m.react('✔️')
    } catch (error) {
        sesionesPendientes.delete(clave)
        await m.react('✖️')
        await conn.reply(m.chat, `${SIMBOLO_X} *Error al mostrar el selector*`, m)
    }
}

handler.before = async function (m, { conn }) {
    const msg = m.message?.interactiveResponseMessage || m.msg?.interactiveResponseMessage
    if (!msg) return
    const nativeFlow = msg.nativeFlowResponseMessage
    if (!nativeFlow?.paramsJson) return

    let params
    try {
        params = JSON.parse(nativeFlow.paramsJson)
    } catch {
        return
    }

    const filaId = params.id || params.selectedId || params.selectedRowId
    if (!filaId || !String(filaId).startsWith(PREFIJO_FILA)) return

    const clave = `${m.chat}|${m.sender}`
    const pendiente = sesionesPendientes.get(clave)
    if (!pendiente || Date.now() > pendiente.expira) {
        sesionesPendientes.delete(clave)
        return conn.reply(m.chat, `${SIMBOLO_X} *Esa búsqueda ya venció*`, m)
    }

    const indice = Number(String(filaId).slice(PREFIJO_FILA.length))
    const resultado = pendiente.resultados[indice]
    if (!resultado) {
        sesionesPendientes.delete(clave)
        return conn.reply(m.chat, `${SIMBOLO_X} *Resultado inválido*`, m)
    }

    sesionesPendientes.delete(clave)
    await m.react('🕒')

    try {
        const info = await descargarAudio(resultado.url)
        const buffer = await descargarBuffer(info.download_url)
        const pesoMb = (buffer.length / (1024 * 1024)).toFixed(2)

        const caption =
            `${SIMBOLO} *${limpiarNombre(info.title)}*\n\n` +
            `${SIMBOLO_ALT} *Detalles*\n` +
            `> Duración: ${formatearDuracion(info.duration)}\n` +
            `> Peso: ${pesoMb} MB\n` +
            `> Formato: MP3\n\n` +
            `${SIMBOLO_NOTA} *API:* Orbit`

        if (info.thumbnail) {
            await conn.sendMessage(m.chat, { image: { url: info.thumbnail }, caption }, { quoted: m })
        } else {
            await conn.reply(m.chat, caption, m)
        }

        await conn.sendMessage(m.chat, {
            audio: buffer,
            mimetype: 'audio/mpeg',
            fileName: `${limpiarNombre(info.title)}.mp3`,
            ptt: false
        }, { quoted: m })

        await m.react('✔️')
    } catch (error) {
        await m.react('✖️')
        await conn.reply(m.chat, `${SIMBOLO_X} *Error al descargar*\n\n> ${error.message}`, m)
    }

    return true
}

handler.help = ['play']
handler.tags = ['descargas']
handler.command = ['play', 'mp3', 'ytmp3']
handler.description = 'Busca y descarga música de YouTube en MP3 usando la API de Orbit'

export default handler