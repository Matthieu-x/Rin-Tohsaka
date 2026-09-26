import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import fetch from 'node-fetch'
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas'

const { initAuthCreds, BufferJSON, proto } = (await import('baileys')).default

// ============================================================================
// CONFIGURACIÓN DE LA CARTA DE BIENVENIDA
// ============================================================================

const URL_FOTO_FONDO = 'https://i.ibb.co/Y4zcX7fr/file-00000000271081f5825ba8a8ebc6a680.png'

const ANCHO_CARTA = 1200
const ALTO_CARTA = 700

const FOTO_X = 70
const FOTO_Y = 240
const FOTO_TAMANO = 220

const TEXTO_X = FOTO_X + FOTO_TAMANO + 50
const TEXTO_Y = 300

const CARPETA_FUENTES = join(process.cwd(), 'media', 'fonts')

const RUTA_FUENTE_BOLD = join(CARPETA_FUENTES, 'Poppins-Bold.ttf')
const RUTA_FUENTE_REGULAR = join(CARPETA_FUENTES, 'Poppins-Regular.ttf')

const URL_FUENTE_BOLD = 'https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-Bold.ttf'
const URL_FUENTE_REGULAR = 'https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-Regular.ttf'

const FAMILIA_BOLD = 'PoppinsBold'
const FAMILIA_REGULAR = 'PoppinsRegular'

// ============================================================================
// DESCARGA Y REGISTRO DE FUENTES
// ============================================================================

let fuentesListas = false

const descargarFuente = async (url, rutaDestino, nombre) => {
    if (existsSync(rutaDestino)) return true

    try {
        console.log(`[WELCOME] Descargando fuente ${nombre}...`)
        const res = await fetch(url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const buffer = Buffer.from(await res.arrayBuffer())
        writeFileSync(rutaDestino, buffer)
        console.log(`[WELCOME] Fuente ${nombre} descargada`)
        return true
    } catch (error) {
        console.warn(`[WELCOME] No se pudo descargar ${nombre}:`, error.message)
        return false
    }
}

const prepararFuentes = async () => {
    if (fuentesListas) return

    try {
        if (!existsSync(CARPETA_FUENTES)) {
            mkdirSync(CARPETA_FUENTES, { recursive: true })
        }

        const okBold = await descargarFuente(URL_FUENTE_BOLD, RUTA_FUENTE_BOLD, 'Poppins-Bold')
        const okRegular = await descargarFuente(URL_FUENTE_REGULAR, RUTA_FUENTE_REGULAR, 'Poppins-Regular')

        if (okBold) {
            try {
                GlobalFonts.registerFromPath(RUTA_FUENTE_BOLD, FAMILIA_BOLD)
                console.log('[WELCOME] Fuente Bold registrada')
            } catch (e) {
                console.warn('[WELCOME] Error registrando Bold:', e.message)
            }
        }

        if (okRegular) {
            try {
                GlobalFonts.registerFromPath(RUTA_FUENTE_REGULAR, FAMILIA_REGULAR)
                console.log('[WELCOME] Fuente Regular registrada')
            } catch (e) {
                console.warn('[WELCOME] Error registrando Regular:', e.message)
            }
        }

        fuentesListas = true
    } catch (error) {
        console.error('[WELCOME] Error preparando fuentes:', error.message)
        fuentesListas = true
    }
}

// ============================================================================
// CACHÉ DEL FONDO
// ============================================================================

let fondoCache = null
let fondoCacheTimestamp = 0
const FONDO_CACHE_MS = 60 * 60 * 1000

const obtenerFondo = async () => {
    const ahora = Date.now()

    if (fondoCache && (ahora - fondoCacheTimestamp) < FONDO_CACHE_MS) {
        return fondoCache
    }

    try {
        console.log('[WELCOME] Descargando fondo...')
        const res = await fetch(URL_FOTO_FONDO)
        const buffer = Buffer.from(await res.arrayBuffer())
        fondoCache = await loadImage(buffer)
        fondoCacheTimestamp = ahora
        console.log('[WELCOME] Fondo cargado')
        return fondoCache
    } catch (error) {
        console.error('[WELCOME] Error cargando fondo:', error.message)
        throw error
    }
}

// ============================================================================
// GENERADOR DE CARTA
// ============================================================================

const generarCarta = async (fotoUsuarioUrl, nombreUsuario, tipo = 'add') => {
    await prepararFuentes()

    const fondo = await obtenerFondo()

    const canvas = createCanvas(ANCHO_CARTA, ALTO_CARTA)
    const ctx = canvas.getContext('2d')

    ctx.drawImage(fondo, 0, 0, ANCHO_CARTA, ALTO_CARTA)

    let fotoUsuario = null
    if (fotoUsuarioUrl) {
        try {
            const res = await fetch(fotoUsuarioUrl)
            if (res.ok) {
                const buffer = Buffer.from(await res.arrayBuffer())
                fotoUsuario = await loadImage(buffer)
            }
        } catch (e) {
            console.error('[WELCOME] No se pudo cargar foto:', e.message)
        }
    }

    ctx.save()
    ctx.beginPath()
    ctx.arc(
        FOTO_X + FOTO_TAMANO / 2,
        FOTO_Y + FOTO_TAMANO / 2,
        FOTO_TAMANO / 2,
        0,
        Math.PI * 2,
        true
    )
    ctx.closePath()
    ctx.clip()

    if (fotoUsuario) {
        ctx.drawImage(fotoUsuario, FOTO_X, FOTO_Y, FOTO_TAMANO, FOTO_TAMANO)
    } else {
        ctx.fillStyle = '#4a4a4a'
        ctx.fillRect(FOTO_X, FOTO_Y, FOTO_TAMANO, FOTO_TAMANO)
        ctx.fillStyle = '#ffffff'
        ctx.font = `bold ${FOTO_TAMANO * 0.6}px ${FAMILIA_BOLD}, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(
            (nombreUsuario || '?')[0].toUpperCase(),
            FOTO_X + FOTO_TAMANO / 2,
            FOTO_Y + FOTO_TAMANO / 2
        )
    }

    ctx.restore()

    ctx.beginPath()
    ctx.arc(
        FOTO_X + FOTO_TAMANO / 2,
        FOTO_Y + FOTO_TAMANO / 2,
        FOTO_TAMANO / 2,
        0,
        Math.PI * 2,
        true
    )
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 6
    ctx.stroke()

    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
    ctx.shadowBlur = 10
    ctx.shadowOffsetX = 2
    ctx.shadowOffsetY = 2

    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'

    ctx.font = `bold 46px ${FAMILIA_BOLD}, sans-serif`
    ctx.fillStyle = '#ffffff'
    ctx.fillText(nombreUsuario || 'Usuario', TEXTO_X, TEXTO_Y)

    const subtitulo = tipo === 'add' ? '¡Bienvenido/a!' : '¡Hasta pronto!'
    ctx.font = `italic 30px ${FAMILIA_REGULAR}, sans-serif`
    ctx.fillStyle = '#f0f0f0'
    ctx.fillText(subtitulo, TEXTO_X, TEXTO_Y + 60)

    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0

    return canvas.toBuffer('image/png')
}

// ============================================================================
// FUNCIÓN PRINCIPAL (BIND)
// ============================================================================

function bind(conn) {
    if (!conn.chats) conn.chats = {}
    function updateNameToDb(contacts) {
        if (!contacts) return
        try {
            contacts = contacts.contacts || contacts
            for (const contact of contacts) {
                const id = conn.decodeJid(contact.id)
                if (!id || id === 'status@broadcast') continue
                let chats = conn.chats[id]
                if (!chats) chats = conn.chats[id] = { ...contact, id }
                conn.chats[id] = {
                    ...chats,
                    ...({
                        ...contact, id, ...(id.endsWith('@g.us') ?
                            { subject: contact.subject || contact.name || chats.subject || '' } :
                            { name: contact.notify || contact.name || chats.name || chats.notify || '' })
                    } || {})
                }
            }
        } catch (e) {
            console.error(e)
        }
    }
    conn.ev.on('contacts.upsert', updateNameToDb)
    conn.ev.on('groups.update', updateNameToDb)
    conn.ev.on('contacts.set', updateNameToDb)
    conn.ev.on('chats.set', async ({ chats }) => {
        try {
            for (let { id, name, readOnly } of chats) {
                id = conn.decodeJid(id)
                if (!id || id === 'status@broadcast') continue
                const isGroup = id.endsWith('@g.us')
                let chats = conn.chats[id]
                if (!chats) chats = conn.chats[id] = { id }
                chats.isChats = !readOnly
                if (name) chats[isGroup ? 'subject' : 'name'] = name
                if (isGroup) {
                    const metadata = await conn.groupMetadata(id).catch(_ => null)
                    if (name || metadata?.subject) chats.subject = name || metadata.subject
                    if (!metadata) continue
                    chats.metadata = metadata
                }
            }
        } catch (e) {
            console.error(e)
        }
    })
    conn.ev.on('group-participants.update', async function updateParticipantsToDb({ id, participants, action }) {
        if (!id) return
        id = conn.decodeJid(id)
        if (id === 'status@broadcast') return
        if (!(id in conn.chats)) conn.chats[id] = { id }
        let chats = conn.chats[id]
        chats.isChats = true
        const groupMetadata = await conn.groupMetadata(id).catch(_ => null)
        if (!groupMetadata) return
        chats.subject = groupMetadata.subject
        chats.metadata = groupMetadata
    })

    conn.ev.on('group-participants.update', async function enviarBienvenidaDespedida({ id, participants, action }) {
        try {
            if (!id) return
            const chatId = conn.decodeJid(id)
            if (chatId === 'status@broadcast') return
            if (action !== 'add' && action !== 'remove') return
            if (!global.db || !global.db.data) return

            const chat = global.db.data.chats[chatId] || (global.db.data.chats[chatId] = {
                isBanned: false,
                welcome: true,
                sWelcome: '',
                sBye: '',
                detect: true,
                primaryBot: null,
                modoadmin: false,
                antiLink: true,
                nsfw: false,
                economy: true,
                gacha: true
            })

            if (!chat.welcome) return

            const groupMetadata = await conn.groupMetadata(chatId).catch(_ => null)
            const nombreGrupo = groupMetadata?.subject || 'el grupo'

            for (const participante of participants) {
                const participantJid = typeof participante === 'string'
                    ? participante
                    : (participante?.id || participante?.jid || '')

                if (!participantJid) continue

                const numeroUsuario = participantJid.split('@')[0]
                const mentionTexto = `@${numeroUsuario}`

                const nombreUsuario =
                    conn.chats[participantJid]?.name ||
                    conn.chats[participantJid]?.notify ||
                    participante?.name ||
                    participante?.notify ||
                    'Usuario'

                let fotoUsuarioUrl = null
                try {
                    fotoUsuarioUrl = await conn.profilePictureUrl(participantJid, 'image')
                } catch (e) {}

                const plantillaBase = action === 'add'
                    ? (chat.sWelcome && chat.sWelcome.trim() ? chat.sWelcome : `Hola *@user*, bienvenido/a a *@grupo*`)
                    : (chat.sBye && chat.sBye.trim() ? chat.sBye : `*@user* salió de *@grupo*`)

                const texto = plantillaBase
                    .replace(/@user/g, mentionTexto)
                    .replace(/@grupo/g, nombreGrupo)

                const encabezado = action === 'add' ? 'ꕥ *Bienvenida*' : 'ꕥ *Despedida*'
                const caption = `${encabezado}\n\n> ${texto}`

                try {
                    const cartaBuffer = await generarCarta(
                        fotoUsuarioUrl,
                        nombreUsuario,
                        action
                    )

                    await conn.sendMessage(
                        chatId,
                        {
                            image: cartaBuffer,
                            caption: caption,
                            mentions: [participantJid]
                        }
                    ).catch(_ => null)

                } catch (error) {
                    console.error('[WELCOME] Error generando carta:', error.message)

                    await conn.sendMessage(
                        chatId,
                        {
                            image: { url: URL_FOTO_FONDO },
                            caption: caption,
                            mentions: [participantJid]
                        }
                    ).catch(_ => null)
                }
            }
        } catch (e) {
            console.error(e)
        }
    })

    conn.ev.on('groups.update', async function groupUpdatePushToDb(groupsUpdates) {
        try {
            for (const update of groupsUpdates) {
                const id = conn.decodeJid(update.id)
                if (!id || id === 'status@broadcast') continue
                const isGroup = id.endsWith('@g.us')
                if (!isGroup) continue
                let chats = conn.chats[id]
                if (!chats) chats = conn.chats[id] = { id }
                chats.isChats = true
                const metadata = await conn.groupMetadata(id).catch(_ => null)
                if (metadata) chats.metadata = metadata
                if (update.subject || metadata?.subject) chats.subject = update.subject || metadata.subject
            }
        } catch (e) {
            console.error(e)
        }
    })
    conn.ev.on('chats.upsert', function chatsUpsertPushToDb(chatsUpsert) {
        try {
            const { id, name } = chatsUpsert
            if (!id || id === 'status@broadcast') return
            conn.chats[id] = { ...(conn.chats[id] || {}), ...chatsUpsert, isChats: true }
            const isGroup = id.endsWith('@g.us')
            if (isGroup) conn.insertAllGroup().catch(_ => null)
        } catch (e) {
            console.error(e)
        }
    })
    conn.ev.on('presence.update', async function presenceUpdatePushToDb({ id, presences }) {
        try {
            const sender = Object.keys(presences)[0] || id
            const _sender = conn.decodeJid(sender)
            const presence = presences[sender]['lastKnownPresence'] || 'composing'
            let chats = conn.chats[_sender]
            if (!chats) chats = conn.chats[_sender] = { id: sender }
            chats.presences = presence
            if (id.endsWith('@g.us')) {
                let chats = conn.chats[id]
                if (!chats) chats = conn.chats[id] = { id }
            }
        } catch (e) {
            console.error(e)
        }
    })
}

const KEY_MAP = {
    'pre-key': 'preKeys',
    'session': 'sessions',
    'sender-key': 'senderKeys',
    'app-state-sync-key': 'appStateSyncKeys',
    'app-state-sync-version': 'appStateVersions',
    'sender-key-memory': 'senderKeyMemory'
}

function useSingleFileAuthState(filename, logger) {
    let creds, keys = {}, saveCount = 0
    const saveState = (forceSave) => {
        logger?.trace('saving auth state')
        saveCount++
        if (forceSave || saveCount > 5) {
            writeFileSync(
                filename,
                JSON.stringify({ creds, keys }, BufferJSON.replacer, 2)
            )
            saveCount = 0
        }
    }

    if (existsSync(filename)) {
        const result = JSON.parse(
            readFileSync(filename, { encoding: 'utf-8' }),
            BufferJSON.reviver
        )
        creds = result.creds
        keys = result.keys
    } else {
        creds = initAuthCreds()
        keys = {}
    }

    return {
        state: {
            creds,
            keys: {
                get: (type, ids) => {
                    const key = KEY_MAP[type]
                    return ids.reduce(
                        (dict, id) => {
                            let value = keys[key]?.[id]
                            if (value) {
                                if (type === 'app-state-sync-key') {
                                    value = proto.AppStateSyncKeyData.fromObject(value)
                                }
                                dict[id] = value
                            }
                            return dict
                        }, {}
                    )
                },
                set: (data) => {
                    for (const _key in data) {
                        const key = KEY_MAP[_key]
                        keys[key] = keys[key] || {}
                        Object.assign(keys[key], data[_key])
                    }
                    saveState()
                }
            }
        },
        saveState
    }
}

export default {
    bind,
    useSingleFileAuthState
}