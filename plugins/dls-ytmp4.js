import fetch from 'node-fetch'
import ffmpeg from 'fluent-ffmpeg'
import { randomUUID } from 'crypto'
import os from 'os'
import path from 'path'
import fs from 'fs/promises'
import {
    verificarLimiteDescargas,
    registrarDescarga,
    construirMensajeLimiteAlcanzado
} from '../lib/limits.js'

const API_KEY = 'edward'
const API_BASE = 'https://dv-edward.onrender.com'

const SIMBOLO = 'ꕥ'
const SIMBOLO_ALT = '〄'
const SIMBOLO_OK = '✰'
const SIMBOLO_NOTA = '✐'

const DURACION_MAXIMA_SEGUNDOS = 20 * 60
const PESO_MAXIMO_MB = 90

const INTENTOS_MAXIMOS = 3
const TIEMPO_ENTRE_INTENTOS = 1500

const MAX_RESULTADOS_LISTA = 5
const TIEMPO_SELECCION_MS = 3 * 60 * 1000

const PREFIJO_FILA = '#ytmp4sel:'

const TIEMPO_CACHE_MS = 5 * 60 * 1000

const cacheBusquedas = new Map()
const seleccionesPendientes = new Map()

const esperar = ms =>
    new Promise(resolve => setTimeout(resolve, ms))

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

const esUrlYoutube = texto =>
    /(?:youtube\.com|youtu\.be)/i.test(texto)

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

const convertirDuracion = duracion => {
    if (typeof duracion === 'number') {
        return duracion
    }

    if (!duracion) {
        return 0
    }

    const partes = String(duracion)
        .split(':')
        .map(Number)

    if (partes.some(Number.isNaN)) {
        return 0
    }

    if (partes.length === 3) {
        return (
            partes[0] * 3600 +
            partes[1] * 60 +
            partes[2]
        )
    }

    if (partes.length === 2) {
        return (
            partes[0] * 60 +
            partes[1]
        )
    }

    return Number(partes[0]) || 0
}

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

const limpiarNombre = texto => {
    return String(texto || 'video')
        .replace(/[\\/:*?"<>|]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 60) || 'video'
}

const extensionDesdeFormato = formato => {
    const f = String(formato || 'mp4').toLowerCase()

    if (/webm/.test(f)) return 'webm'
    if (/mkv/.test(f)) return 'mkv'
    if (/mov/.test(f)) return 'mov'

    return 'mp4'
}

const conReintentos = async (fn, etiqueta) => {
    let ultimoError = null

    for (
        let intento = 1;
        intento <= INTENTOS_MAXIMOS;
        intento++
    ) {
        try {
            return await fn()
        } catch (error) {
            ultimoError = error

            if (
                intento < INTENTOS_MAXIMOS
            ) {
                await esperar(
                    TIEMPO_ENTRE_INTENTOS * intento
                )
            }
        }
    }

    throw new Error(
        `${etiqueta} falló tras ${INTENTOS_MAXIMOS} intentos: ${
            ultimoError?.message ||
            'Error desconocido'
        }`
    )
}

const obtenerJson = async res => {
    const texto = await res.text()

    if (!texto) {
        throw new Error(
            'La API devolvió una respuesta vacía'
        )
    }

    try {
        return JSON.parse(texto)
    } catch {
        throw new Error(
            'La API devolvió una respuesta inválida'
        )
    }
}

const buscarYouTubeLista = async query => {
    const consultaOriginal =
        String(query || '').trim()

    const clave =
        consultaOriginal
            .toLowerCase()
            .replace(/\s+/g, ' ')

    const cache =
        cacheBusquedas.get(clave)

    if (
        cache &&
        Date.now() - cache.timestamp <
            TIEMPO_CACHE_MS
    ) {
        return cache.datos
    }

    const ejecutarBusqueda = async consulta => {
        const url =
            `${API_BASE}/api/search/youtube` +
            `?apiKey=${encodeURIComponent(API_KEY)}` +
            `&query=${encodeURIComponent(consulta)}`

        const res =
            await fetchConTimeout(
                url,
                {
                    method: 'GET',
                    headers: {
                        Accept:
                            'application/json',
                        'User-Agent':
                            'Si-Ying-Bot/1.0'
                    }
                },
                20000
            )

        const data =
            await obtenerJson(res)

        if (!res.ok) {
            throw new Error(
                data?.message ||
                data?.error ||
                `Error HTTP ${res.status}`
            )
        }

        if (
            !Array.isArray(data?.data) ||
            !data.data.length
        ) {
            throw new Error(
                data?.message ||
                data?.error ||
                'La API no devolvió resultados'
            )
        }

        return data.data
    }

    let resultados = null
    let ultimoError = null

    try {
        resultados =
            await conReintentos(
                () =>
                    ejecutarBusqueda(
                        consultaOriginal
                    ),
                'Búsqueda'
            )
    } catch (error) {
        ultimoError = error
    }

    if (!resultados?.length) {
        const consultaAlterna =
            normalizarConsulta(
                consultaOriginal
            )

        if (
            consultaAlterna &&
            consultaAlterna.toLowerCase() !== clave
        ) {
            try {
                resultados =
                    await conReintentos(
                        () =>
                            ejecutarBusqueda(
                                consultaAlterna
                            ),
                        'Búsqueda alterna'
                    )
            } catch (error) {
                ultimoError = error
            }
        }
    }

    if (!resultados?.length) {
        if (ultimoError) {
            throw ultimoError
        }

        return null
    }

    const lista =
        resultados
            .filter(Boolean)
            .slice(
                0,
                MAX_RESULTADOS_LISTA
            )

    if (!lista.length) {
        return null
    }

    cacheBusquedas.set(
        clave,
        {
            datos: lista,
            timestamp: Date.now()
        }
    )

    return lista
}

const descargarInfoVideo = async youtubeUrl => {
    const ejecutar = async () => {
        const url =
            `${API_BASE}/api/download/ytvideo` +
            `?url=${encodeURIComponent(youtubeUrl)}` +
            `&apiKey=${encodeURIComponent(API_KEY)}`

        const res =
            await fetchConTimeout(
                url,
                {
                    method: 'GET',
                    headers: {
                        Accept:
                            'application/json',
                        'User-Agent':
                            'Si-Ying-Bot/1.0'
                    }
                },
                60000
            )

        const data =
            await obtenerJson(res)

        if (!res.ok) {
            throw new Error(
                data?.message ||
                data?.error ||
                `Error HTTP ${res.status}`
            )
        }

        if (
            !data?.status ||
            !data?.result?.download_url
        ) {
            throw new Error(
                data?.message ||
                data?.error ||
                'No se pudo preparar el video'
            )
        }

        return data.result
    }

    return conReintentos(
        ejecutar,
        'Procesamiento'
    )
}

const descargarABuffer = async url => {
    if (!url) {
        throw new Error(
            'La API no proporcionó el enlace de descarga'
        )
    }

    const res =
        await fetchConTimeout(
            url,
            {
                method: 'GET',
                headers: {
                    'User-Agent':
                        'Si-Ying-Bot/1.0'
                }
            },
            120000
        )

    if (!res.ok) {
        throw new Error(
            `Descarga fallida (${res.status})`
        )
    }

    const contentLength =
        res.headers.get(
            'content-length'
        )

    if (
        contentLength &&
        Number(contentLength) >
            PESO_MAXIMO_MB *
            1024 *
            1024
    ) {
        throw new Error(
            `El archivo pesa más de ${PESO_MAXIMO_MB} MB`
        )
    }

    const arrayBuffer =
        await res.arrayBuffer()

    const buffer =
        Buffer.from(arrayBuffer)

    if (
        buffer.length >
        PESO_MAXIMO_MB *
        1024 *
        1024
    ) {
        throw new Error(
            `El archivo pesa más de ${PESO_MAXIMO_MB} MB`
        )
    }

    return buffer
}

const limpiarArchivo = async ruta => {
    if (!ruta) return

    try {
        await fs.unlink(ruta)
    } catch {}
}

const inspeccionarConFfprobe = ruta => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(ruta, (error, metadata) => {
            if (error) {
                reject(error)
                return
            }

            resolve(metadata)
        })
    })
}

const validarVideoJugable = async ruta => {
    const metadata =
        await inspeccionarConFfprobe(ruta)

    const streamVideo =
        metadata?.streams?.find(
            s => s.codec_type === 'video'
        )

    const duracion =
        Number(
            metadata?.format?.duration || 0
        )

    if (!streamVideo) {
        throw new Error(
            'El archivo no tiene pista de video'
        )
    }

    if (!duracion || duracion <= 0) {
        throw new Error(
            'El archivo quedó con duración inválida (corrupto)'
        )
    }

    return true
}

const remuxRapido = (rutaEntrada, rutaSalida) => {
    return new Promise((resolve, reject) => {
        ffmpeg(rutaEntrada)
            .outputOptions([
                '-c copy',
                '-movflags +faststart'
            ])
            .format('mp4')
            .on('error', reject)
            .on('end', resolve)
            .save(rutaSalida)
    })
}

const recodificarRapido = (rutaEntrada, rutaSalida) => {
    return new Promise((resolve, reject) => {
        ffmpeg(rutaEntrada)
            .videoCodec('libx264')
            .outputOptions([
                '-preset ultrafast',
                '-profile:v main',
                '-level 4.0',
                '-pix_fmt yuv420p',
                '-crf 26',
                '-movflags +faststart',
                '-threads 0',
                '-max_muxing_queue_size 1024'
            ])
            .audioCodec('aac')
            .audioBitrate('128k')
            .audioChannels(2)
            .audioFrequency(44100)
            .format('mp4')
            .on('error', reject)
            .on('end', resolve)
            .save(rutaSalida)
    })
}

const recodificarSinAudio = (rutaEntrada, rutaSalida) => {
    return new Promise((resolve, reject) => {
        ffmpeg(rutaEntrada)
            .videoCodec('libx264')
            .outputOptions([
                '-preset ultrafast',
                '-profile:v main',
                '-level 4.0',
                '-pix_fmt yuv420p',
                '-crf 26',
                '-movflags +faststart',
                '-threads 0'
            ])
            .noAudio()
            .format('mp4')
            .on('error', reject)
            .on('end', resolve)
            .save(rutaSalida)
    })
}

const procesarVideoConFfmpeg = async (
    bufferOrigen,
    formatoOrigen
) => {
    const carpetaTemp =
        os.tmpdir()

    const idUnico =
        randomUUID()

    const extOrigen =
        extensionDesdeFormato(
            formatoOrigen
        )

    const rutaEntrada =
        path.join(
            carpetaTemp,
            `ytv-in-${idUnico}.${extOrigen}`
        )

    const rutaSalida =
        path.join(
            carpetaTemp,
            `ytv-out-${idUnico}.mp4`
        )

    try {
        await fs.writeFile(
            rutaEntrada,
            bufferOrigen
        )

        let quedoValido = false

        try {
            await remuxRapido(
                rutaEntrada,
                rutaSalida
            )

            await validarVideoJugable(
                rutaSalida
            )

            quedoValido = true

        } catch {
            quedoValido = false
        }

        if (!quedoValido) {
            await limpiarArchivo(
                rutaSalida
            )

            try {
                await recodificarRapido(
                    rutaEntrada,
                    rutaSalida
                )

                await validarVideoJugable(
                    rutaSalida
                )

            } catch {
                await limpiarArchivo(
                    rutaSalida
                )

                await recodificarSinAudio(
                    rutaEntrada,
                    rutaSalida
                )

                await validarVideoJugable(
                    rutaSalida
                )
            }
        }

        const bufferFinal =
            await fs.readFile(
                rutaSalida
            )

        return bufferFinal

    } finally {
        await limpiarArchivo(
            rutaEntrada
        )

        await limpiarArchivo(
            rutaSalida
        )
    }
}

const construirCaptionInfo = (
    titulo,
    duracion,
    pesoMb,
    calidad,
    formato,
    tiempoTotal
) => {
    let caption =
        `${SIMBOLO} *${titulo}*\n\n`

    caption +=
        `${SIMBOLO_ALT} *Detalles*\n`

    caption +=
        `> Duración: ${duracion}\n`

    caption +=
        `> Peso: ${pesoMb} MB\n`

    caption +=
        `> Calidad: ${calidad}\n`

    caption +=
        `> Formato: ${formato}\n`

    caption +=
        `> Tiempo de proceso: ${tiempoTotal} s`

    return caption
}

const limpiarSeleccionesVencidas = () => {
    const ahora = Date.now()

    for (
        const [clave, valor]
        of seleccionesPendientes
    ) {
        if (
            !valor ||
            ahora > valor.expira
        ) {
            seleccionesPendientes.delete(
                clave
            )
        }
    }
}

const desempaquetarMensaje = m => {
    let actual =
        m?.message || m?.msg || m

    let anterior = null

    while (
        actual &&
        actual !== anterior
    ) {
        anterior = actual

        if (
            actual?.ephemeralMessage?.message
        ) {
            actual =
                actual.ephemeralMessage.message

            continue
        }

        if (
            actual?.viewOnceMessage?.message
        ) {
            actual =
                actual.viewOnceMessage.message

            continue
        }

        if (
            actual?.viewOnceMessageV2?.message
        ) {
            actual =
                actual.viewOnceMessageV2.message

            continue
        }

        if (
            actual
                ?.viewOnceMessageV2Extension
                ?.message
        ) {
            actual =
                actual
                    .viewOnceMessageV2Extension
                    .message

            continue
        }

        break
    }

    return actual
}

const extraerIdInteractivo = msg => {
    const interactive =
        msg?.interactiveResponseMessage

    if (!interactive) {
        return null
    }

    const nativeFlow =
        interactive
            ?.nativeFlowResponseMessage

    const paramsJson =
        nativeFlow?.paramsJson

    if (!paramsJson) {
        return null
    }

    try {
        const params =
            JSON.parse(paramsJson)

        return (
            params?.id ||
            params?.selectedId ||
            params?.selectedRowId ||
            params?.row_id ||
            null
        )

    } catch {
        return null
    }
}

const obtenerSeleccion = m => {
    const msg =
        desempaquetarMensaje(m)

    const interactiveId =
        extraerIdInteractivo(msg)

    if (interactiveId) {
        return interactiveId
    }

    const listId =
        msg
            ?.listResponseMessage
            ?.singleSelectReply
            ?.selectedRowId

    if (listId) {
        return listId
    }

    const buttonId =
        msg
            ?.buttonsResponseMessage
            ?.selectedButtonId

    if (buttonId) {
        return buttonId
    }

    return null
}

const procesarYEnviar = async (
    m,
    conn,
    youtubeUrl,
    resultadoBusqueda
) => {
    const estadoLimite =
        verificarLimiteDescargas(
            m.sender,
            conn
        )

    if (
        !estadoLimite.permitido
    ) {
        await m.react('⛔')

        await conn.reply(
            m.chat,
            construirMensajeLimiteAlcanzado(
                estadoLimite,
                '.'
            ),
            m
        )

        return
    }

    await m.react('🕒')

    const inicioProceso =
        Date.now()

    try {
        const duracionEstimada =
            convertirDuracion(
                resultadoBusqueda?.duration
            )

        if (
            duracionEstimada &&
            duracionEstimada >
                DURACION_MAXIMA_SEGUNDOS
        ) {
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

        const info =
            await descargarInfoVideo(
                youtubeUrl
            )

        const duracionFinal =
            convertirDuracion(
                info.duration
            ) ||
            duracionEstimada ||
            0

        if (
            duracionFinal >
            DURACION_MAXIMA_SEGUNDOS
        ) {
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

        const titulo =
            limpiarNombre(
                info.title ||
                resultadoBusqueda?.title ||
                'Video'
            )

        const duracionTexto =
            formatearDuracion(
                duracionFinal
            )

        const thumbnail =
            info.thumbnail ||
            resultadoBusqueda?.thumbnail ||
            null

        const bufferOrigen =
            await descargarABuffer(
                info.download_url
            )

        const buffer =
            await procesarVideoConFfmpeg(
                bufferOrigen,
                info.format
            )

        const pesoMb =
            (
                buffer.length /
                (1024 * 1024)
            ).toFixed(2)

        if (
            Number(pesoMb) >
            PESO_MAXIMO_MB
        ) {
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

        const cantidadUsada =
            registrarDescarga(
                m.sender,
                conn
            )

        const tiempoTotal =
            (
                (Date.now() -
                    inicioProceso) /
                1000
            ).toFixed(2)

        const caption =
            construirCaptionInfo(
                titulo,
                duracionTexto,
                pesoMb,
                info.quality ||
                    'Desconocida',
                'MP4',
                tiempoTotal
            )

        let piePagina =
            `${estadoLimite.esPremium ? 'Premium' : 'Normal'} · `

        piePagina +=
            estadoLimite.ilimitado
                ? `Descargas hoy: ${cantidadUsada} / Ilimitado`
                : `Descargas hoy: ${cantidadUsada} / ${estadoLimite.limite}`

        await conn.sendMessage(
            m.chat,
            {
                video: buffer,
                mimetype:
                    'video/mp4',
                caption:
                    `${caption}\n\n${SIMBOLO_NOTA} ${piePagina}`,
                fileName:
                    `${titulo}.mp4`,
                jpegThumbnail:
                    undefined,
                thumbnail:
                    thumbnail
                        ? { url: thumbnail }
                        : undefined
            },
            {
                quoted: m
            }
        )

        if (
            !estadoLimite.ilimitado &&
            !estadoLimite.esPremium
        ) {
            await conn.reply(
                m.chat,
                `${SIMBOLO_NOTA} *${SIMBOLO_OK} Hazte premium para subir tu límite a 300 descargas diarias*`,
                m
            )
        }

        await m.react('✔️')

    } catch (error) {
        await m.react('✖️')

        await conn.reply(
            m.chat,
            `${SIMBOLO} *Error*\n\n> ${
                error?.message ||
                'Error desconocido'
            }`,
            m
        )
    }
}

const handler = async (
    m,
    {
        conn,
        text,
        usedPrefix,
        command
    }
) => {
    if (!text?.trim()) {
        await conn.reply(
            m.chat,
            `${SIMBOLO} *Falta el nombre o link*\n\n` +
            `> Ejemplo: *${usedPrefix}${command} shape of you*\n` +
            `> También acepta un link de YouTube`,
            m
        )

        return
    }

    const consulta =
        text.trim()

    const videoIdDirecto =
        extraerVideoId(
            consulta
        )

    if (
        !videoIdDirecto &&
        esUrlYoutube(consulta)
    ) {
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

    if (videoIdDirecto) {
        const youtubeUrl =
            `https://www.youtube.com/watch?v=${videoIdDirecto}`

        await procesarYEnviar(
            m,
            conn,
            youtubeUrl,
            null
        )

        return
    }

    await m.react('🔎')

    let resultados

    try {
        resultados =
            await buscarYouTubeLista(
                consulta
            )

    } catch (error) {
        await m.react('✖️')

        await conn.reply(
            m.chat,
            `${SIMBOLO} *Error buscando*\n\n> ${
                error?.message ||
                'Error desconocido'
            }`,
            m
        )

        return
    }

    if (
        !resultados?.length
    ) {
        await m.react('✖️')

        await conn.reply(
            m.chat,
            `${SIMBOLO} *Sin resultados*\n\n` +
            `> No se encontró ningún video para *${consulta}*\n` +
            `> Intenta con el título exacto o pega el link directo`,
            m
        )

        return
    }

    limpiarSeleccionesVencidas()

    const clave =
        `${m.chat}|${m.sender}`

    seleccionesPendientes.set(
        clave,
        {
            resultados,
            expira:
                Date.now() +
                TIEMPO_SELECCION_MS
        }
    )

    const filas =
        resultados.map(
            (resultado, indice) => ({
                title:
                    limpiarNombre(
                        resultado.title ||
                        'Sin título'
                    ),

                description:
                    `${resultado.author || 'Desconocido'} · ` +
                    `${formatearDuracion(
                        convertirDuracion(
                            resultado.duration
                        )
                    )}`,

                id:
                    `${PREFIJO_FILA}${indice}`
            })
        )

    try {
        await conn.sendMessage(
            m.chat,
            {
                text:
                    `${SIMBOLO_ALT} *Elige un video para descargar*`,

                title:
                    `${SIMBOLO} Resultados para "${consulta}"`,

                footer:
                    'Selecciona un video',

                buttons: [
                    {
                        text:
                            '🎬 Ver videos',

                        sections: [
                            {
                                title:
                                    'Resultados',

                                rows:
                                    filas
                            }
                        ]
                    }
                ]
            },
            {
                quoted: m
            }
        )

        await m.react('✔️')

    } catch (error) {
        seleccionesPendientes.delete(
            clave
        )

        await m.react('✖️')

        await conn.reply(
            m.chat,
            `${SIMBOLO} *No se pudo mostrar el selector*\n\n> ${
                error?.message ||
                'Error desconocido'
            }`,
            m
        )
    }
}

handler.before = async function (
    m,
    {
        conn
    }
) {
    try {
        const filaId =
            obtenerSeleccion(m)

        if (!filaId) {
            return
        }

        if (
            !String(filaId)
                .startsWith(
                    PREFIJO_FILA
                )
        ) {
            return
        }

        const clave =
            `${m.chat}|${m.sender}`

        const pendiente =
            seleccionesPendientes.get(
                clave
            )

        if (!pendiente) {
            await conn.reply(
                m.chat,
                `${SIMBOLO} *Esa búsqueda ya venció*\n\n> Vuelve a buscar con *.ytmp4*`,
                m
            )

            return true
        }

        if (
            Date.now() >
            pendiente.expira
        ) {
            seleccionesPendientes.delete(
                clave
            )

            await conn.reply(
                m.chat,
                `${SIMBOLO} *Esa búsqueda ya venció*\n\n> Vuelve a buscar con *.ytmp4*`,
                m
            )

            return true
        }

        const indice =
            Number(
                String(filaId)
                    .slice(
                        PREFIJO_FILA.length
                    )
            )

        if (
            !Number.isInteger(indice) ||
            indice < 0
        ) {
            return true
        }

        const resultado =
            pendiente
                .resultados?.[indice]

        if (!resultado) {
            await conn.reply(
                m.chat,
                `${SIMBOLO} *Resultado inválido*\n\n> Vuelve a realizar la búsqueda.`,
                m
            )

            return true
        }

        seleccionesPendientes.delete(
            clave
        )

        const youtubeUrl =
            resultado.url ||
            (
                resultado.videoId
                    ? `https://www.youtube.com/watch?v=${resultado.videoId}`
                    : null
            )

        if (!youtubeUrl) {
            await conn.reply(
                m.chat,
                `${SIMBOLO} *No se encontró el enlace del video seleccionado*`,
                m
            )

            return true
        }

        await procesarYEnviar(
            m,
            conn,
            youtubeUrl,
            resultado
        )

        return true

    } catch (error) {
        try {
            await conn.reply(
                m.chat,
                `${SIMBOLO} *Error procesando la selección*\n\n> ${
                    error?.message ||
                    'Error desconocido'
                }`,
                m
            )
        } catch {}

        return true
    }
}

handler.help = [
    'ytmp4'
]

handler.tags = [
    'descargas'
]

handler.command = [
    'ytmp4',
    'video',
    'ytvideo'
]

handler.description =
    'Busca videos de YouTube y muestra un selector para descargar en MP4'

export default handler