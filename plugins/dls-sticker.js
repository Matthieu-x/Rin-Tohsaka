import fetch from 'node-fetch'
import sharp from 'sharp'
import webpmux from 'node-webpmux'

const SIMBOLO = 'ꕥ'
const SIMBOLO_ALT = '〄'
const SIMBOLO_OK = '✰'
const SIMBOLO_NOTA = '✐'

const API_BASE = 'https://noth.hidenplay.net'
const API_KEY = 'nothPniC'
const API_CREADOR = 'Noth'

const MAX_RESULTADOS = 5
const TIEMPO_SELECCION_MS = 3 * 60 * 1000
const PREFIJO_FILA = '#stickerlysel:'

const seleccionesPendientes = new Map()

const esperar = ms => new Promise(resolve => setTimeout(resolve, ms))

const fetchConTimeout = async (url, opciones = {}, timeout = 20000) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)
    try {
        return await fetch(url, { ...opciones, signal: controller.signal })
    } catch (error) {
        if (error?.name === 'AbortError') throw new Error(`La solicitud tardó más de ${Math.floor(timeout / 1000)} segundos`)
        throw error
    } finally {
        clearTimeout(timer)
    }
}

const obtenerJson = async res => {
    const texto = await res.text()
    if (!texto) throw new Error('La API devolvió una respuesta vacía')
    try { return JSON.parse(texto) } catch { throw new Error('La API devolvió una respuesta inválida') }
}

const limpiarSeleccionesVencidas = () => {
    const ahora = Date.now()
    for (const [clave, valor] of seleccionesPendientes) {
        if (!valor || ahora > valor.expira) seleccionesPendientes.delete(clave)
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
    } catch { return null }
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

const buscarStickerly = async query => {
    const url = `${API_BASE}/api/busqueda/stickerly?query=${encodeURIComponent(query)}&apikey=${encodeURIComponent(API_KEY)}`
    const res = await fetchConTimeout(url, { method: 'GET', headers: { Accept: 'application/json', 'User-Agent': 'Rin-Tohsaka/1.0' } }, 20000)
    const data = await obtenerJson(res)
    if (!res.ok || !data?.status) throw new Error(data?.message || data?.error || `Error HTTP ${res.status}`)
    if (!Array.isArray(data?.data) || !data.data.length) throw new Error('La API no devolvió resultados')
    return data.data.slice(0, MAX_RESULTADOS)
}

const extraerStickersDelPack = async urlPack => {
    const res = await fetchConTimeout(
        urlPack,
        {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        },
        30000
    )
    if (!res.ok) throw new Error(`No se pudo acceder al pack (HTTP ${res.status})`)

    const html = await res.text()
    const regex = /https:\/\/stickerly\.pstatic\.net\/sticker_pack\/[^\s"'<>\\]+/g
    const matches = html.match(regex) || []
    const unicos = [...new Set(matches)]
    const stickers = unicos.filter(u => !u.includes('preview'))
    const listaFinal = stickers.length >= 5 ? stickers : unicos

    if (!listaFinal.length) throw new Error('No se encontraron stickers en el pack')

    return listaFinal
}

/**
 * Convierte un buffer de imagen a WebP sticker con metadatos EXIF del pack.
 * 1. sharp convierte a WebP 512x512 limpio
 * 2. node-webpmux inyecta el pack y autor en el EXIF
 */
const convertirASticker = async (buffer, packname, author) => {
    // 1. Convertir con sharp a WebP estándar
    const webpBuffer = await sharp(buffer, { animated: true })
        .resize(512, 512, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .webp({ quality: 90 })
        .toBuffer()

    // 2. Inyectar metadatos EXIF con node-webpmux
    const img = new webpmux.Image()
    await img.load(webpBuffer)

    const json = {
        'sticker-pack-id': 'stickerly_' + Date.now(),
        'sticker-pack-name': packname,
        'sticker-pack-publisher': author,
        'emojis': ['🎨']
    }

    const exifAttr = Buffer.from([
        0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00,
        0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x16, 0x00, 0x00, 0x00
    ])

    const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8')
    const exif = Buffer.concat([exifAttr, jsonBuffer])
    exif.writeUIntLE(jsonBuffer.length, 14, 4)

    img.exif = exif

    return await img.save(null)
}

const handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text?.trim()) {
        await conn.reply(
            m.chat,
            `${SIMBOLO} *Falta el nombre*\n\n` +
            `> Ejemplo: *${usedPrefix}${command} my melody*\n` +
            `> API proporcionada por: *${API_CREADOR}*`,
            m
        )
        return
    }

    const consulta = text.trim()

    await m.react('🔎')

    let resultados
    try {
        resultados = await buscarStickerly(consulta)
    } catch (error) {
        await m.react('✖️')
        await conn.reply(m.chat, `${SIMBOLO} *Error buscando*\n\n> ${error?.message || 'Error desconocido'}`, m)
        return
    }

    if (!resultados?.length) {
        await m.react('✖️')
        await conn.reply(m.chat, `${SIMBOLO} *Sin resultados*\n\n> No se encontró nada para *${consulta}*`, m)
        return
    }

    limpiarSeleccionesVencidas()

    const clave = `${m.chat}|${m.sender}`
    seleccionesPendientes.set(clave, {
        resultados,
        expira: Date.now() + TIEMPO_SELECCION_MS
    })

    const filas = resultados.map((r, i) => ({
        title: r.name?.slice(0, 50) || 'Sin título',
        description: `${r.author || 'Desconocido'} · ${r.sticker_count} stickers · ${r.view_count} vistas`,
        id: `${PREFIJO_FILA}${i}`
    }))

    try {
        await conn.sendMessage(
            m.chat,
            {
                text: `${SIMBOLO_ALT} *Elige un paquete de stickers*\n> API: ${API_CREADOR}`,
                title: `${SIMBOLO} Resultados para "${consulta}"`,
                footer: 'Selecciona un paquete',
                buttons: [
                    {
                        text: '🎨 Ver paquetes',
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
        await m.react('✔️')
    } catch (error) {
        seleccionesPendientes.delete(clave)
        await m.react('✖️')
        await conn.reply(m.chat, `${SIMBOLO} *No se pudo mostrar el selector*\n\n> ${error?.message || 'Error desconocido'}`, m)
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
            await conn.reply(m.chat, `${SIMBOLO} *Esa búsqueda ya venció*\n\n> Vuelve a buscar con .stickerly`, m)
            return true
        }

        const indice = Number(String(filaId).slice(PREFIJO_FILA.length))
        const resultado = pendiente.resultados?.[indice]

        if (!resultado) {
            await conn.reply(m.chat, `${SIMBOLO} *Resultado inválido*`, m)
            return true
        }

        seleccionesPendientes.delete(clave)

        await m.react('🕒')

        try {
            const stickersUrls = await extraerStickersDelPack(resultado.url)

            const packname = (resultado.name || 'Stickerly').slice(0, 60)
            const author = (resultado.author || 'Desconocido').slice(0, 40)

            await conn.reply(
                m.chat,
                `${SIMBOLO} *Enviando paquete de stickers*\n\n` +
                `> Nombre: ${packname}\n` +
                `> Autor: ${author}\n` +
                `> Cantidad: ${stickersUrls.length} stickers\n\n` +
                `${SIMBOLO_NOTA} En WhatsApp toca "Agregar" para guardar el pack completo.`,
                m
            )

            let enviados = 0
            const maxEnviar = 30

            for (const url of stickersUrls) {
                if (enviados >= maxEnviar) break

                try {
                    const res = await fetchConTimeout(
                        url,
                        {
                            method: 'GET',
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                                'Referer': 'https://sticker.ly/'
                            }
                        },
                        30000
                    )

                    if (!res.ok) continue

                    const buffer = Buffer.from(await res.arrayBuffer())
                    const stickerBuffer = await convertirASticker(buffer, packname, author)

                    await conn.sendMessage(
                        m.chat,
                        { sticker: stickerBuffer },
                        { quoted: m }
                    )

                    enviados++
                    await esperar(500)

                } catch (e) {
                    console.error('[STICKERLY] Error enviando sticker:', e.message)
                }
            }

            if (enviados === 0) {
                await m.react('✖️')
                await conn.reply(m.chat, `${SIMBOLO} *No se pudo enviar ningún sticker*`, m)
                return true
            }

            await conn.reply(
                m.chat,
                `${SIMBOLO_OK} *Paquete enviado*\n\n` +
                `> ${enviados} stickers de *${packname}*\n` +
                `> Autor: ${author}\n\n` +
                `> Toca "Agregar" en WhatsApp para guardarlo completo.`,
                m
            )

            await m.react('✔️')

        } catch (error) {
            console.error('[STICKERLY] Error procesando:', error)
            await m.react('✖️')
            await conn.reply(m.chat, `${SIMBOLO} *Error procesando*\n\n> ${error?.message || 'Error desconocido'}`, m)
        }

        return true

    } catch (error) {
        console.error('[STICKERLY] Error en handler.before:', error)
        return true
    }
}

handler.help = ['stickerly']
handler.tags = ['descargas']
handler.command = ['stickerly', 'stickers', 'stickerpack']
handler.description = `Busca y descarga paquetes de stickers de Stickerly con nombre y autor. API proporcionada por ${API_CREADOR}.`

export default handler