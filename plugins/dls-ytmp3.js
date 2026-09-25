/**
 * ============================================================================
 * COMANDO: PLAY / YTMP3
 * DESCRIPCIÓN: Busca música en YouTube y la descarga en formato MP3.
 * API UTILIZADA: Noth API (https://noth.hidenplay.net)
 * CRÉDITOS DE API: Noth
 * ============================================================================
 * 
 * Este módulo ha sido refactorizado y expandido para proporcionar una
 * experiencia de usuario más rica, con manejo de errores robusto,
 * reintentos automáticos, caché de búsquedas y una interfaz de selección
 * interactiva mejorada.
 */

import fetch from 'node-fetch'
import {
    verificarLimiteDescargas,
    registrarDescarga,
    construirMensajeLimiteAlcanzado
} from '../lib/limits.js'

// ============================================================================
// CONFIGURACIÓN DE LA API
// ============================================================================

const API_KEY = 'nothPniC'
const API_BASE = 'https://noth.hidenplay.net'
const API_CREADOR = 'Noth'

// ============================================================================
// CONSTANTES DE ESTILO Y SÍMBOLOS
// ============================================================================

const SIMBOLO = 'ꕥ'
const SIMBOLO_ALT = '〄'
const SIMBOLO_OK = '✰'
const SIMBOLO_NOTA = '✐'
const SIMBOLO_MUSICA = '🎵'
const SIMBOLO_DESCARGAR = '📥'

// ============================================================================
// LÍMITES Y RESTRICCIONES
// ============================================================================

const DURACION_MAXIMA_SEGUNDOS = 30 * 60 // 30 minutos
const PESO_MAXIMO_MB = 50 // 50 MB
const INTENTOS_MAXIMOS = 3
const TIEMPO_ENTRE_INTENTOS = 1500 // 1.5 segundos
const MAX_RESULTADOS_LISTA = 5
const TIEMPO_SELECCION_MS = 3 * 60 * 1000 // 3 minutos
const TIEMPO_CACHE_MS = 5 * 60 * 1000 // 5 minutos

// ============================================================================
// PREFIJOS Y ESTADOS GLOBALES
// ============================================================================

const PREFIJO_FILA = '#ytmp3sel:'
const cacheBusquedas = new Map()
const seleccionesPendientes = new Map()

// ============================================================================
// FUNCIONES DE UTILIDAD GENERAL
// ============================================================================

/**
 * Pausa la ejecución durante un tiempo determinado.
 * @param {number} ms - Milisegundos a esperar.
 * @returns {Promise<void>}
 */
const esperar = ms =>
    new Promise(resolve => setTimeout(resolve, ms))

/**
 * Realiza una petición fetch con un tiempo de espera máximo (timeout).
 * @param {string} url - URL a consultar.
 * @param {object} opciones - Opciones de fetch.
 * @param {number} timeout - Tiempo máximo en ms.
 * @returns {Promise<Response>}
 */
const fetchConTimeout = async (
    url,
    opciones = {},
    timeout = 20000
) => {
    const controller = new AbortController()

    const timer = setTimeout(() => {
        controller.abort()
    }, timeout)

    try {
        return await fetch(url, {
            ...opciones,
            signal: controller.signal
        })
    } catch (error) {
        if (error?.name === 'AbortError') {
            throw new Error(
                `La solicitud tardó más de ${Math.floor(timeout / 1000)} segundos`
            )
        }
        throw error
    } finally {
        clearTimeout(timer)
    }
}

/**
 * Extrae el ID de un video de YouTube a partir de una URL.
 * @param {string} texto - URL o texto que contiene el ID.
 * @returns {string|null}
 */
const extraerVideoId = texto => {
    const patrones = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|music\.youtube\.com\/watch\?v=|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
    ]

    for (const patron of patrones) {
        const coincidencia = String(texto).match(patron)
        if (coincidencia) {
            return coincidencia[1]
        }
    }
    return null
}

/**
 * Verifica si un texto corresponde a una URL de YouTube.
 * @param {string} texto - Texto a verificar.
 * @returns {boolean}
 */
const esUrlYoutube = texto =>
    /(?:youtube\.com|youtu\.be)/i.test(texto)

/**
 * Normaliza una consulta de búsqueda eliminando palabras innecesarias.
 * @param {string} texto - Consulta original.
 * @returns {string}
 */
const normalizarConsulta = texto => {
    return String(texto || '')
        .trim()
        .replace(/\s+/g, ' ')
        .replace(
            /(official\s*(music\s*)?video|lyrics?|hd|4k|audio\s*oficial)/gi,
            ''
        )
        .trim()
}

/**
 * Convierte una duración en formato string (ej. "3:13") a segundos.
 * @param {string|number} duracion - Duración a convertir.
 * @returns {number}
 */
const convertirDuracion = duracion => {
    if (typeof duracion === 'number') return duracion
    if (!duracion) return 0

    const partes = String(duracion)
        .split(':')
        .map(Number)

    if (partes.some(Number.isNaN)) return 0

    if (partes.length === 3) {
        return partes[0] * 3600 + partes[1] * 60 + partes[2]
    }
    if (partes.length === 2) {
        return partes[0] * 60 + partes[1]
    }
    return Number(partes[0]) || 0
}

/**
 * Formatea una cantidad de segundos a un string legible (ej. "3:13").
 * @param {number} segundos - Segundos a formatear.
 * @returns {string}
 */
const formatearDuracion = segundos => {
    const total = Number(segundos || 0)
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = Math.floor(total % 60)

    if (h > 0) {
        return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    }
    return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * Formatea números grandes (ej. 1500000 -> 1.5M).
 * @param {number|string} numero - Número a formatear.
 * @returns {string}
 */
const formatearNumero = numero => {
    const num = Number(numero)
    if (isNaN(num)) return '0'
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
}

/**
 * Limpia un nombre de archivo para evitar caracteres no válidos.
 * @param {string} texto - Texto a limpiar.
 * @returns {string}
 */
const limpiarNombre = texto => {
    return String(texto || 'audio')
        .replace(/[\\/:*?"<>|]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 60) || 'audio'
}

// ============================================================================
// FUNCIONES DE REINTENTO Y PARSEO JSON
// ============================================================================

/**
 * Ejecuta una función asíncrona con reintentos automáticos.
 * @param {Function} fn - Función a ejecutar.
 * @param {string} etiqueta - Nombre de la operación para logs.
 * @returns {Promise<any>}
 */
const conReintentos = async (fn, etiqueta) => {
    let ultimoError = null

    for (let intento = 1; intento <= INTENTOS_MAXIMOS; intento++) {
        try {
            console.log(`[PLAY] ${etiqueta}: intento ${intento}/${INTENTOS_MAXIMOS}`)
            return await fn()
        } catch (error) {
            ultimoError = error
            console.error(`[PLAY] ${etiqueta} intento ${intento}:`, error?.message || error)

            if (intento < INTENTOS_MAXIMOS) {
                await esperar(TIEMPO_ENTRE_INTENTOS * intento)
            }
        }
    }

    throw new Error(
        `${etiqueta} falló tras ${INTENTOS_MAXIMOS} intentos: ${ultimoError?.message || 'Error desconocido'}`
    )
}

/**
 * Parsea una respuesta HTTP a JSON, con manejo de errores.
 * @param {Response} res - Respuesta de fetch.
 * @returns {Promise<object>}
 */
const obtenerJson = async res => {
    const texto = await res.text()

    if (!texto) {
        throw new Error('La API devolvió una respuesta vacía')
    }

    try {
        return JSON.parse(texto)
    } catch {
        console.error('[PLAY] Respuesta no JSON:', texto.slice(0, 1000))
        throw new Error('La API devolvió una respuesta inválida')
    }
}

// ============================================================================
// LÓGICA DE BÚSQUEDA EN YOUTUBE
// ============================================================================

/**
 * Busca videos en YouTube utilizando la API de Noth.
 * @param {string} query - Término de búsqueda.
 * @returns {Promise<Array|null>} - Lista de resultados.
 */
const buscarYouTubeLista = async query => {
    const consultaOriginal = String(query || '').trim()
    const clave = consultaOriginal.toLowerCase().replace(/\s+/g, ' ')

    // Verificar caché
    const cache = cacheBusquedas.get(clave)
    if (cache && Date.now() - cache.timestamp < TIEMPO_CACHE_MS) {
        console.log('[PLAY] Resultado obtenido desde caché')
        return cache.datos
    }

    const ejecutarBusqueda = async consulta => {
        const url = `${API_BASE}/api/busqueda/youtube` +
            `?query=${encodeURIComponent(consulta)}` +
            `&apikey=${encodeURIComponent(API_KEY)}`

        console.log('[PLAY] Buscando en Noth API:', consulta)
        console.log('[PLAY] Endpoint:', `${API_BASE}/api/busqueda/youtube`)

        const res = await fetchConTimeout(
            url,
            {
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    'User-Agent': 'Si-Ying-Bot/1.0 (Noth-API-Client)'
                }
            },
            20000
        )

        console.log('[PLAY] HTTP Status:', res.status)
        const data = await obtenerJson(res)

        console.log('[PLAY] API status:', data?.status)

        if (!res.ok || !data?.status) {
            throw new Error(
                data?.message ||
                data?.error ||
                `Error HTTP ${res.status}`
            )
        }

        if (!Array.isArray(data?.data) || !data.data.length) {
            throw new Error(
                data?.message ||
                data?.error ||
                'La API no devolvió resultados'
            )
        }

        // Mapear resultados de la API de Noth
        return data.data.map(item => ({
            type: item.type,
            videoId: item.videoId,
            url: item.url,
            title: item.title,
            description: item.description,
            image: item.image,
            thumbnail: item.thumbnail,
            duration: item.duration,
            views: item.views,
            isLive: item.isLive,
            author: item.author?.name || 'Desconocido',
            authorUrl: item.author?.url || ''
        }))
    }

    let resultados = null
    let ultimoError = null

    try {
        resultados = await conReintentos(
            () => ejecutarBusqueda(consultaOriginal),
            'Búsqueda'
        )
    } catch (error) {
        ultimoError = error
        console.error('[PLAY] Error búsqueda principal:', error?.message)
    }

    // Intento alternativo con consulta normalizada
    if (!resultados?.length) {
        const consultaAlterna = normalizarConsulta(consultaOriginal)
        if (consultaAlterna && consultaAlterna.toLowerCase() !== clave) {
            try {
                resultados = await conReintentos(
                    () => ejecutarBusqueda(consultaAlterna),
                    'Búsqueda alterna'
                )
            } catch (error) {
                ultimoError = error
                console.error('[PLAY] Error búsqueda alterna:', error?.message)
            }
        }
    }

    if (!resultados?.length) {
        if (ultimoError) throw ultimoError
        return null
    }

    const lista = resultados.filter(Boolean).slice(0, MAX_RESULTADOS_LISTA)
    if (!lista.length) return null

    // Guardar en caché
    cacheBusquedas.set(clave, {
        datos: lista,
        timestamp: Date.now()
    })

    return lista
}

// ============================================================================
// LÓGICA DE DESCARGA DE AUDIO
// ============================================================================

/**
 * Obtiene la información de descarga de un video de YouTube.
 * @param {string} youtubeUrl - URL del video.
 * @returns {Promise<object>} - Información del audio.
 */
const descargarInfo = async youtubeUrl => {
    const ejecutar = async () => {
        const url = `${API_BASE}/api/descargas/ytmp3` +
            `?url=${encodeURIComponent(youtubeUrl)}` +
            `&apikey=${encodeURIComponent(API_KEY)}`

        console.log('[PLAY] Procesando descarga con Noth API:', youtubeUrl)

        const res = await fetchConTimeout(
            url,
            {
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    'User-Agent': 'Si-Ying-Bot/1.0 (Noth-API-Client)'
                }
            },
            60000
        )

        console.log('[PLAY] Procesamiento HTTP:', res.status)
        const data = await obtenerJson(res)

        if (!res.ok || !data?.status) {
            throw new Error(
                data?.message ||
                data?.error ||
                `Error HTTP ${res.status}`
            )
        }

        if (!data?.data?.download) {
            throw new Error(
                data?.message ||
                data?.error ||
                'No se pudo preparar el audio'
            )
        }

        // Retornar datos mapeados de la API de Noth
        return {
            title: data.data.title,
            author: data.data.author,
            channel: data.data.channel,
            views: data.data.views,
            likes: data.data.likes,
            thumbnail: data.data.image,
            format: data.data.format,
            download_url: data.data.download,
            quality: '128 kbps', // La API no especifica, se asume 128
            mime_type: 'audio/mpeg'
        }
    }

    return conReintentos(ejecutar, 'Procesamiento')
}

/**
 * Descarga el archivo de audio a un Buffer en memoria.
 * @param {string} url - URL de descarga directa.
 * @returns {Promise<Buffer>}
 */
const descargarABuffer = async url => {
    if (!url) {
        throw new Error('La API no proporcionó el enlace de descarga')
    }

    console.log('[PLAY] Descargando archivo desde CDN...')

    const res = await fetchConTimeout(
        url,
        {
            method: 'GET',
            headers: {
                'User-Agent': 'Si-Ying-Bot/1.0 (Noth-API-Client)'
            }
        },
        90000
    )

    if (!res.ok) {
        throw new Error(`Descarga fallida (${res.status})`)
    }

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

// ============================================================================
// CONSTRUCCIÓN DE MENSAJES Y CAPTIONS
// ============================================================================

/**
 * Construye el caption o pie de foto para el audio enviado.
 * @param {object} info - Información del audio.
 * @param {string} pesoMb - Peso del archivo en MB.
 * @param {string} tiempoTotal - Tiempo total de proceso.
 * @param {object} estadoLimite - Información del límite del usuario.
 * @param {number} cantidadUsada - Descargas usadas hoy.
 * @returns {string}
 */
const construirCaptionInfo = (
    info,
    pesoMb,
    tiempoTotal,
    estadoLimite,
    cantidadUsada
) => {
    let caption = `${SIMBOLO} *${info.title}*\n\n`

    caption += `${SIMBOLO_ALT} *Detalles de la descarga*\n`
    caption += `> Artista: ${info.author || 'Desconocido'}\n`
    caption += `> Canal: ${info.channel || 'Desconocido'}\n`
    caption += `> Duración: ${formatearDuracion(convertirDuracion(info.duration))}\n`
    caption += `> Peso: ${pesoMb} MB\n`
    caption += `> Formato: ${info.format || 'MP3'}\n`
    caption += `> Calidad: ${info.quality || '128 kbps'}\n`
    caption += `> Vistas: ${formatearNumero(info.views)}\n`
    caption += `> Likes: ${formatearNumero(info.likes)}\n`
    caption += `> Tiempo de proceso: ${tiempoTotal} s\n\n`

    caption += `${SIMBOLO_NOTA} *Créditos de API:* ${API_CREADOR}\n`
    caption += `> API Endpoint: ${API_BASE}\n`

    let piePagina = `${estadoLimite.esPremium ? 'Premium' : 'Normal'} · `
    piePagina += estadoLimite.ilimitado
        ? `Descargas hoy: ${cantidadUsada} / Ilimitado`
        : `Descargas hoy: ${cantidadUsada} / ${estadoLimite.limite}`

    return `${caption}\n${piePagina}`
}

// ============================================================================
// GESTIÓN DE SELECCIONES INTERACTIVAS
// ============================================================================

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
        if (actual?.ephemeralMessage?.message) {
            actual = actual.ephemeralMessage.message
            continue
        }
        if (actual?.viewOnceMessage?.message) {
            actual = actual.viewOnceMessage.message
            continue
        }
        if (actual?.viewOnceMessageV2?.message) {
            actual = actual.viewOnceMessageV2.message
            continue
        }
        if (actual?.viewOnceMessageV2Extension?.message) {
            actual = actual.viewOnceMessageV2Extension.message
            continue
        }
        break
    }
    return actual
}

const extraerIdInteractivo = msg => {
    const interactive = msg?.interactiveResponseMessage
    if (!interactive) return null

    const nativeFlow = interactive?.nativeFlowResponseMessage
    const paramsJson = nativeFlow?.paramsJson

    console.log('[PLAY] Native Flow recibido:', paramsJson)

    if (!paramsJson) return null

    try {
        const params = JSON.parse(paramsJson)
        console.log('[PLAY] Native Flow params:', params)
        return (
            params?.id ||
            params?.selectedId ||
            params?.selectedRowId ||
            params?.row_id ||
            null
        )
    } catch (error) {
        console.error('[PLAY] Error leyendo paramsJson:', error)
        return null
    }
}

const obtenerSeleccion = m => {
    const msg = desempaquetarMensaje(m)
    console.log('[PLAY] Tipo recibido:', m?.mtype)
    console.log('[PLAY] Claves del mensaje:', Object.keys(msg || {}))

    const interactiveId = extraerIdInteractivo(msg)
    if (interactiveId) return interactiveId

    const listId = msg?.listResponseMessage?.singleSelectReply?.selectedRowId
    if (listId) {
        console.log('[PLAY] List ID:', listId)
        return listId
    }

    const buttonId = msg?.buttonsResponseMessage?.selectedButtonId
    if (buttonId) {
        console.log('[PLAY] Button ID:', buttonId)
        return buttonId
    }

    return null
}

// ============================================================================
// LÓGICA PRINCIPAL DE PROCESAMIENTO Y ENVÍO
// ============================================================================

const procesarYEnviar = async (
    m,
    conn,
    youtubeUrl,
    resultadoBusqueda,
    videoIdEntrada
) => {
    // 1. Verificar límites del usuario
    const estadoLimite = verificarLimiteDescargas(m.sender, conn)

    if (!estadoLimite.permitido) {
        await m.react('⛔')
        await conn.reply(
            m.chat,
            construirMensajeLimiteAlcanzado(estadoLimite, '.'),
            m
        )
        return
    }

    await m.react('🕒')
    const inicioProceso = Date.now()

    try {
        // 2. Validar duración estimada (si viene de búsqueda)
        const duracionEstimada = convertirDuracion(resultadoBusqueda?.duration)
        if (duracionEstimada && duracionEstimada > DURACION_MAXIMA_SEGUNDOS) {
            await m.react('✖️')
            await conn.reply(
                m.chat,
                `${SIMBOLO} *Video demasiado largo*\n\n` +
                `> Duración: ${formatearDuracion(duracionEstimada)}\n` +
                `> Máximo permitido: ${formatearDuracion(DURACION_MAXIMA_SEGUNDOS)}`,
                m
            )
            return
        }

        // 3. Obtener información de descarga desde la API
        const info = await descargarInfo(youtubeUrl)

        const duracionFinal = convertirDuracion(info.duration) || duracionEstimada || 0
        if (duracionFinal > DURACION_MAXIMA_SEGUNDOS) {
            await m.react('✖️')
            await conn.reply(
                m.chat,
                `${SIMBOLO} *Video demasiado largo*\n\n` +
                `> Duración: ${formatearDuracion(duracionFinal)}\n` +
                `> Máximo permitido: ${formatearDuracion(DURACION_MAXIMA_SEGUNDOS)}`,
                m
            )
            return
        }

        // 4. Preparar datos del audio
        const titulo = limpiarNombre(info.title || resultadoBusqueda?.title || 'Audio')
        const artista = info.author || resultadoBusqueda?.author || 'Desconocido'
        
        // 5. Descargar el buffer de audio
        const buffer = await descargarABuffer(info.download_url)
        const pesoMb = (buffer.length / (1024 * 1024)).toFixed(2)

        if (Number(pesoMb) > PESO_MAXIMO_MB) {
            await m.react('✖️')
            await conn.reply(
                m.chat,
                `${SIMBOLO} *Archivo demasiado pesado*\n\n` +
                `> Peso: ${pesoMb} MB\n` +
                `> Máximo permitido: ${PESO_MAXIMO_MB} MB`,
                m
            )
            return
        }

        // 6. Registrar la descarga en el sistema de límites
        const cantidadUsada = registrarDescarga(m.sender, conn)
        const tiempoTotal = ((Date.now() - inicioProceso) / 1000).toFixed(2)

        // 7. Construir y enviar el mensaje con la portada
        const caption = construirCaptionInfo(
            {
                ...info,
                title: titulo,
                author: artista,
                duration: duracionFinal
            },
            pesoMb,
            tiempoTotal,
            estadoLimite,
            cantidadUsada
        )

        const thumbnail = info.thumbnail || resultadoBusqueda?.thumbnail || 
            (videoIdEntrada ? `https://i.ytimg.com/vi/${videoIdEntrada}/hqdefault.jpg` : null)

        if (thumbnail) {
            await conn.sendMessage(
                m.chat,
                {
                    image: { url: thumbnail },
                    caption: caption
                },
                { quoted: m }
            )
        } else {
            await conn.reply(m.chat, caption, m)
        }

        // 8. Enviar el archivo de audio
        await conn.sendMessage(
            m.chat,
            {
                audio: buffer,
                mimetype: info.mime_type || 'audio/mpeg',
                fileName: `${titulo}.mp3`,
                ptt: false
            },
            { quoted: m }
        )

        // 9. Mensaje promocional si no es premium
        if (!estadoLimite.ilimitado && !estadoLimite.esPremium) {
            await conn.reply(
                m.chat,
                `${SIMBOLO_NOTA} *${SIMBOLO_OK} Hazte premium para subir tu límite a 300 descargas diarias*`,
                m
            )
        }

        await m.react('✔️')

    } catch (error) {
        console.error('[PLAY] ERROR PROCESANDO:', error)
        await m.react('✖️')
        await conn.reply(
            m.chat,
            `${SIMBOLO} *Error al procesar la descarga*\n\n> ${error?.message || 'Error desconocido'}`,
            m
        )
    }
}

// ============================================================================
// HANDLER PRINCIPAL DEL COMANDO
// ============================================================================

const handler = async (m, { conn, text, usedPrefix }) => {
    // Validar que se haya proporcionado un texto
    if (!text?.trim()) {
        await conn.reply(
            m.chat,
            `${SIMBOLO} *Falta el nombre o link*\n\n` +
            `> Ejemplo: *${usedPrefix}play shape of you*\n` +
            `> También acepta un link de YouTube o YouTube Music\n` +
            `> API proporcionada por: *${API_CREADOR}*`,
            m
        )
        return
    }

    const consulta = text.trim()
    const videoIdDirecto = extraerVideoId(consulta)

    // Validar si es una URL de YouTube pero no se pudo extraer el ID
    if (!videoIdDirecto && esUrlYoutube(consulta)) {
        await m.react('✖️')
        await conn.reply(
            m.chat,
            `${SIMBOLO} *Link no reconocido*\n\n` +
            `> Parece un link de YouTube pero no se pudo extraer el video ID\n` +
            `> Verifica que el link esté completo`,
            m
        )
        return
    }

    // Si es un link directo, procesar inmediatamente
    if (videoIdDirecto) {
        const youtubeUrl = `https://www.youtube.com/watch?v=${videoIdDirecto}`
        await procesarYEnviar(m, conn, youtubeUrl, null, videoIdDirecto)
        return
    }

    // Si es un término de búsqueda, buscar en la API
    await m.react('🔎')

    let resultados
    try {
        resultados = await buscarYouTubeLista(consulta)
    } catch (error) {
        console.error('[PLAY] ERROR BUSCANDO:', error)
        await m.react('✖️')
        await conn.reply(
            m.chat,
            `${SIMBOLO} *Error buscando*\n\n> ${error?.message || 'Error desconocido'}`,
            m
        )
        return
    }

    if (!resultados?.length) {
        await m.react('✖️')
        await conn.reply(
            m.chat,
            `${SIMBOLO} *Sin resultados*\n\n` +
            `> No se encontró ninguna canción para *${consulta}*\n` +
            `> Intenta con el título exacto o pega el link directo`,
            m
        )
        return
    }

    // Limpiar selecciones vencidas y guardar la nueva
    limpiarSeleccionesVencidas()
    const clave = `${m.chat}|${m.sender}`
    seleccionesPendientes.set(clave, {
        resultados,
        expira: Date.now() + TIEMPO_SELECCION_MS
    })

    // Construir filas para el selector interactivo
    const filas = resultados.map((resultado, indice) => ({
        title: limpiarNombre(resultado.title || 'Sin título'),
        description: `${resultado.author || 'Desconocido'} · ` +
            `${formatearDuracion(convertirDuracion(resultado.duration))} · ` +
            `${formatearNumero(resultado.views)} vistas`,
        id: `${PREFIJO_FILA}${indice}`
    }))

    console.log('[PLAY] Filas del selector:', JSON.stringify(filas, null, 2))

    // Enviar el mensaje interactivo
    try {
        await conn.sendMessage(
            m.chat,
            {
                text: `${SIMBOLO_ALT} *Elige una canción para descargar*\n> API: ${API_CREADOR}`,
                title: `${SIMBOLO} Resultados para "${consulta}"`,
                footer: 'Selecciona una canción',
                buttons: [
                    {
                        text: `${SIMBOLO_MUSICA} Ver canciones`,
                        sections: [
                            {
                                title: 'Resultados',
                                rows: filas
                            }
                        ]
                    }
                ]
            },
            { quoted: m }
        )
        console.log('[PLAY] Selector enviado correctamente')
        await m.react('✔️')
    } catch (error) {
        console.error('[PLAY] ERROR ENVIANDO SELECTOR:', error)
        seleccionesPendientes.delete(clave)
        await m.react('✖️')
        await conn.reply(
            m.chat,
            `${SIMBOLO} *No se pudo mostrar el selector*\n\n> ${error?.message || 'Error desconocido'}`,
            m
        )
    }
}

// ============================================================================
// HANDLER BEFORE (PARA INTERCEPTAR SELECCIONES)
// ============================================================================

handler.before = async function (m, { conn }) {
    try {
        console.log('[PLAY] BEFORE:', m?.mtype)
        const filaId = obtenerSeleccion(m)
        if (!filaId) return

        console.log('[PLAY] SELECCIÓN DETECTADA:', filaId)

        if (!String(filaId).startsWith(PREFIJO_FILA)) return

        const clave = `${m.chat}|${m.sender}`
        const pendiente = seleccionesPendientes.get(clave)

        if (!pendiente) {
            await conn.reply(
                m.chat,
                `${SIMBOLO} *Esa búsqueda ya venció*\n\n> Vuelve a buscar con *.play*`,
                m
            )
            return true
        }

        if (Date.now() > pendiente.expira) {
            seleccionesPendientes.delete(clave)
            await conn.reply(
                m.chat,
                `${SIMBOLO} *Esa búsqueda ya venció*\n\n> Vuelve a buscar con *.play*`,
                m
            )
            return true
        }

        const indice = Number(String(filaId).slice(PREFIJO_FILA.length))
        if (!Number.isInteger(indice) || indice < 0) return true

        const resultado = pendiente.resultados?.[indice]
        if (!resultado) {
            await conn.reply(
                m.chat,
                `${SIMBOLO} *Resultado inválido*\n\n> Vuelve a realizar la búsqueda.`,
                m
            )
            return true
        }

        console.log('[PLAY] RESULTADO SELECCIONADO:', JSON.stringify(resultado, null, 2))
        seleccionesPendientes.delete(clave)

        const youtubeUrl = resultado.url || 
            (resultado.videoId ? `https://www.youtube.com/watch?v=${resultado.videoId}` : null)

        if (!youtubeUrl) {
            await conn.reply(
                m.chat,
                `${SIMBOLO} *No se encontró el enlace del video seleccionado*`,
                m
            )
            return true
        }

        console.log('[PLAY] URL A DESCARGAR:', youtubeUrl)
        await procesarYEnviar(m, conn, youtubeUrl, resultado, resultado.videoId)
        return true

    } catch (error) {
        console.error('[PLAY] ERROR EN HANDLER.BEFORE:', error)
        try {
            await conn.reply(
                m.chat,
                `${SIMBOLO} *Error procesando la selección*\n\n> ${error?.message || 'Error desconocido'}`,
                m
            )
        } catch {}
        return true
    }
}

// ============================================================================
// METADATOS DEL COMANDO
// ============================================================================

handler.help = ['play', 'ytmp3', 'mp3']
handler.tags = ['descargas']
handler.command = ['ytmp3', 'play', 'mp3']
handler.description = `Busca música de YouTube y muestra un selector para descargar. API proporcionada por ${API_CREADOR}.`

export default handler