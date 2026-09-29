import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import fetch from 'node-fetch'
import os from 'os'
import osu from 'node-os-utils'

const SIMBOLO = 'ꕥ'
const SIMBOLO_ALT = '〄'
const SIMBOLO_OK = '✰'
const SIMBOLO_NOTA = '✐'
const SIMBOLO_X = '✖'

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const ANCHO = 1000
const ALTO = 700

const CARPETA_FUENTES = join(process.cwd(), 'media', 'fonts')
const RUTA_FUENTE_BOLD = join(CARPETA_FUENTES, 'Poppins-Bold.ttf')
const RUTA_FUENTE_REGULAR = join(CARPETA_FUENTES, 'Poppins-Regular.ttf')

const URL_FUENTE_BOLD = 'https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-Bold.ttf'
const URL_FUENTE_REGULAR = 'https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-Regular.ttf'

const FAMILIA_BOLD = 'PoppinsBold'
const FAMILIA_REGULAR = 'PoppinsRegular'

const COLOR_FONDO = '#0f0f1a'
const COLOR_FONDO_TARJETA = '#1a1a2e'
const COLOR_ACENTO = '#a855f7'
const COLOR_ACENTO_CLARO = '#c084fc'
const COLOR_TEXTO = '#ffffff'
const COLOR_TEXTO_GRIS = '#a1a1aa'
const COLOR_VERDE = '#22c55e'
const COLOR_AMARILLO = '#eab308'
const COLOR_ROJO = '#ef4444'

// ============================================================================
// REGISTRO DE FUENTES
// ============================================================================

let fuentesListas = false

const descargarFuente = async (url, rutaDestino, nombre) => {
    if (existsSync(rutaDestino)) return true
    try {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const buffer = Buffer.from(await res.arrayBuffer())
        writeFileSync(rutaDestino, buffer)
        return true
    } catch {
        return false
    }
}

const prepararFuentes = async () => {
    if (fuentesListas) return
    try {
        if (!existsSync(CARPETA_FUENTES)) mkdirSync(CARPETA_FUENTES, { recursive: true })
        const okBold = await descargarFuente(URL_FUENTE_BOLD, RUTA_FUENTE_BOLD, 'Bold')
        const okRegular = await descargarFuente(URL_FUENTE_REGULAR, RUTA_FUENTE_REGULAR, 'Regular')
        if (okBold) {
            try { GlobalFonts.registerFromPath(RUTA_FUENTE_BOLD, FAMILIA_BOLD) } catch {}
        }
        if (okRegular) {
            try { GlobalFonts.registerFromPath(RUTA_FUENTE_REGULAR, FAMILIA_REGULAR) } catch {}
        }
        fuentesListas = true
    } catch {
        fuentesListas = true
    }
}

// ============================================================================
// UTILIDADES
// ============================================================================

const formatearBytes = bytes => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

const formatearUptime = segundos => {
    const dias = Math.floor(segundos / 86400)
    const horas = Math.floor((segundos % 86400) / 3600)
    const minutos = Math.floor((segundos % 3600) / 60)
    const segs = Math.floor(segundos % 60)

    const partes = []
    if (dias > 0) partes.push(`${dias}d`)
    if (horas > 0) partes.push(`${horas}h`)
    if (minutos > 0) partes.push(`${minutos}m`)
    partes.push(`${segs}s`)

    return partes.join(' ')
}

const dibujarBarra = (ctx, x, y, ancho, alto, porcentaje, color) => {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'
    ctx.beginPath()
    ctx.roundRect(x, y, ancho, alto, alto / 2)
    ctx.fill()

    const rellenoAncho = Math.max(alto, (ancho * Math.min(porcentaje, 100)) / 100)
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.roundRect(x, y, rellenoAncho, alto, alto / 2)
    ctx.fill()
}

const obtenerColorPorcentaje = porcentaje => {
    if (porcentaje < 50) return COLOR_VERDE
    if (porcentaje < 80) return COLOR_AMARILLO
    return COLOR_ROJO
}

// ============================================================================
// GENERADOR DE LA TARJETA DE ESTADO
// ============================================================================

const generarEstado = async (conn, datosExtra = {}) => {
    await prepararFuentes()

    const canvas = createCanvas(ANCHO, ALTO)
    const ctx = canvas.getContext('2d')

    // Fondo con degradado
    const gradiente = ctx.createLinearGradient(0, 0, ANCHO, ALTO)
    gradiente.addColorStop(0, '#0f0f1a')
    gradiente.addColorStop(0.5, '#15152b')
    gradiente.addColorStop(1, '#1a1a2e')
    ctx.fillStyle = gradiente
    ctx.fillRect(0, 0, ANCHO, ALTO)

    // Burbujas decorativas
    const burbujas = [
        { x: 850, y: 100, r: 180, color: 'rgba(168, 85, 247, 0.15)' },
        { x: 100, y: 600, r: 150, color: 'rgba(192, 132, 252, 0.1)' },
        { x: 950, y: 620, r: 120, color: 'rgba(168, 85, 247, 0.12)' }
    ]
    for (const b of burbujas) {
        const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r)
        grad.addColorStop(0, b.color)
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
        ctx.fill()
    }

    // Título
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'

    ctx.font = `bold 56px ${FAMILIA_BOLD}, sans-serif`
    ctx.fillStyle = COLOR_TEXTO
    ctx.fillText('Estado del Bot', 60, 50)

    ctx.font = `26px ${FAMILIA_REGULAR}, sans-serif`
    ctx.fillStyle = COLOR_ACENTO_CLARO
    ctx.fillText('Información del sistema en tiempo real', 60, 120)

    ctx.strokeStyle = COLOR_ACENTO
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(60, 165)
    ctx.lineTo(ANCHO - 60, 165)
    ctx.stroke()

    // Datos
    const uptime = process.uptime()
    const memoriaUsada = process.memoryUsage().rss
    const memoriaTotal = os.totalmem()
    const memoriaLibre = os.freemem()
    const cpuUso = await osu.cpu.usage().catch(() => 0)
    const plataforma = os.platform()
    const versionNode = process.version
    const nucleos = os.cpus().length

    let totalChats = 0
    let totalGrupos = 0
    if (conn?.chats) {
        for (const id of Object.keys(conn.chats)) {
            totalChats++
            if (id.endsWith('@g.us')) totalGrupos++
        }
    }

    // Tarjeta 1: Uptime
    const c1X = 60, c1Y = 200, cAncho = 440, cAlto = 180

    ctx.fillStyle = COLOR_FONDO_TARJETA
    ctx.beginPath()
    ctx.roundRect(c1X, c1Y, cAncho, cAlto, 20)
    ctx.fill()

    ctx.fillStyle = COLOR_ACENTO
    ctx.beginPath()
    ctx.roundRect(c1X, c1Y, cAncho, 6, [20, 20, 0, 0])
    ctx.fill()

    ctx.font = `bold 24px ${FAMILIA_BOLD}, sans-serif`
    ctx.fillStyle = COLOR_ACENTO_CLARO
    ctx.fillText('TIEMPO ACTIVO', c1X + 30, c1Y + 30)

    ctx.font = `bold 52px ${FAMILIA_BOLD}, sans-serif`
    ctx.fillStyle = COLOR_TEXTO
    ctx.fillText(formatearUptime(uptime), c1X + 30, c1Y + 75)

    ctx.font = `20px ${FAMILIA_REGULAR}, sans-serif`
    ctx.fillStyle = COLOR_TEXTO_GRIS
    ctx.fillText(`Iniciado: ${new Date(Date.now() - uptime * 1000).toLocaleString('es-ES')}`, c1X + 30, c1Y + 140)

    // Tarjeta 2: CPU
    const c2X = 520, c2Y = 200

    ctx.fillStyle = COLOR_FONDO_TARJETA
    ctx.beginPath()
    ctx.roundRect(c2X, c2Y, cAncho, cAlto, 20)
    ctx.fill()

    ctx.fillStyle = COLOR_ACENTO
    ctx.beginPath()
    ctx.roundRect(c2X, c2Y, cAncho, 6, [20, 20, 0, 0])
    ctx.fill()

    ctx.font = `bold 24px ${FAMILIA_BOLD}, sans-serif`
    ctx.fillStyle = COLOR_ACENTO_CLARO
    ctx.fillText('CPU', c2X + 30, c2Y + 30)

    ctx.font = `bold 52px ${FAMILIA_BOLD}, sans-serif`
    ctx.fillStyle = COLOR_TEXTO
    ctx.fillText(`${cpuUso.toFixed(1)}%`, c2X + 30, c2Y + 75)

    dibujarBarra(ctx, c2X + 30, c2Y + 135, cAncho - 60, 10, cpuUso, obtenerColorPorcentaje(cpuUso))

    ctx.font = `18px ${FAMILIA_REGULAR}, sans-serif`
    ctx.fillStyle = COLOR_TEXTO_GRIS
    ctx.fillText(`${nucleos} núcleos · ${plataforma}`, c2X + 30, c2Y + 150)

    // Tarjeta 3: Memoria
    const c3X = 60, c3Y = 400

    ctx.fillStyle = COLOR_FONDO_TARJETA
    ctx.beginPath()
    ctx.roundRect(c3X, c3Y, cAncho, cAlto, 20)
    ctx.fill()

    ctx.fillStyle = COLOR_ACENTO
    ctx.beginPath()
    ctx.roundRect(c3X, c3Y, cAncho, 6, [20, 20, 0, 0])
    ctx.fill()

    ctx.font = `bold 24px ${FAMILIA_BOLD}, sans-serif`
    ctx.fillStyle = COLOR_ACENTO_CLARO
    ctx.fillText('MEMORIA DEL BOT', c3X + 30, c3Y + 30)

    ctx.font = `bold 52px ${FAMILIA_BOLD}, sans-serif`
    ctx.fillStyle = COLOR_TEXTO
    ctx.fillText(formatearBytes(memoriaUsada), c3X + 30, c3Y + 75)

    const porcentajeMemoriaBot = (memoriaUsada / memoriaTotal) * 100
    dibujarBarra(ctx, c3X + 30, c3Y + 135, cAncho - 60, 10, porcentajeMemoriaBot, obtenerColorPorcentaje(porcentajeMemoriaBot))

    ctx.font = `18px ${FAMILIA_REGULAR}, sans-serif`
    ctx.fillStyle = COLOR_TEXTO_GRIS
    ctx.fillText(`Sistema: ${formatearBytes(memoriaTotal - memoriaLibre)} / ${formatearBytes(memoriaTotal)}`, c3X + 30, c3Y + 150)

    // Tarjeta 4: Conexiones
    const c4X = 520, c4Y = 400

    ctx.fillStyle = COLOR_FONDO_TARJETA
    ctx.beginPath()
    ctx.roundRect(c4X, c4Y, cAncho, cAlto, 20)
    ctx.fill()

    ctx.fillStyle = COLOR_ACENTO
    ctx.beginPath()
    ctx.roundRect(c4X, c4Y, cAncho, 6, [20, 20, 0, 0])
    ctx.fill()

    ctx.font = `bold 24px ${FAMILIA_BOLD}, sans-serif`
    ctx.fillStyle = COLOR_ACENTO_CLARO
    ctx.fillText('CONEXIONES', c4X + 30, c4Y + 30)

    ctx.font = `bold 36px ${FAMILIA_BOLD}, sans-serif`
    ctx.fillStyle = COLOR_TEXTO
    ctx.fillText(`${totalChats}`, c4X + 30, c4Y + 75)

    ctx.font = `20px ${FAMILIA_REGULAR}, sans-serif`
    ctx.fillStyle = COLOR_TEXTO_GRIS
    ctx.fillText(`Chats totales`, c4X + 30, c4Y + 118)

    ctx.font = `bold 36px ${FAMILIA_BOLD}, sans-serif`
    ctx.fillStyle = COLOR_TEXTO
    ctx.fillText(`${totalGrupos}`, c4X + 240, c4Y + 75)

    ctx.font = `20px ${FAMILIA_REGULAR}, sans-serif`
    ctx.fillStyle = COLOR_TEXTO_GRIS
    ctx.fillText(`Grupos`, c4X + 240, c4Y + 118)

    // Pie de página
    ctx.font = `20px ${FAMILIA_REGULAR}, sans-serif`
    ctx.fillStyle = COLOR_TEXTO_GRIS
    ctx.textAlign = 'center'
    ctx.fillText(`Node ${versionNode} · ${plataforma} · ${new Date().toLocaleString('es-ES')}`, ANCHO / 2, ALTO - 40)

    // Indicador de estado
    ctx.beginPath()
    ctx.arc(ANCHO - 60, ALTO - 50, 10, 0, Math.PI * 2)
    ctx.fillStyle = COLOR_VERDE
    ctx.fill()

    const auraGrad = ctx.createRadialGradient(ANCHO - 60, ALTO - 50, 0, ANCHO - 60, ALTO - 50, 30)
    auraGrad.addColorStop(0, 'rgba(34, 197, 94, 0.5)')
    auraGrad.addColorStop(1, 'rgba(34, 197, 94, 0)')
    ctx.fillStyle = auraGrad
    ctx.beginPath()
    ctx.arc(ANCHO - 60, ALTO - 50, 30, 0, Math.PI * 2)
    ctx.fill()

    return canvas.toBuffer('image/png')
}

// ============================================================================
// HANDLER DEL COMANDO
// ============================================================================

const handler = async (m, { conn }) => {
    await m.react('🕒')

    try {
        const buffer = await generarEstado(conn)

        await conn.sendMessage(
            m.chat,
            {
                image: buffer,
                caption:
                    `${SIMBOLO} *Estado del Bot*\n\n` +
                    `${SIMBOLO_ALT} Toda la información del sistema en una imagen\n` +
                    `${SIMBOLO_NOTA} Actualizado en tiempo real`
            },
            { quoted: m }
        )

        await m.react('✔️')

    } catch (error) {
        console.error('[STATUS] Error:', error)
        await m.react('✖️')
        await conn.reply(
            m.chat,
            `${SIMBOLO_X} *Error generando el estado*\n\n> ${error?.message || 'Error desconocido'}`,
            m
        )
    }
}

handler.help = ['status']
handler.tags = ['info']
handler.command = ['status', 'estado', 'botinfo']
handler.description = 'Muestra el estado del bot en una imagen generada con Canvas'

export default handler