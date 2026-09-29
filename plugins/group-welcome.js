const SIMBOLO = 'ꕥ'
const SIMBOLO_ALT = '〄'
const SIMBOLO_OK = '✰'
const SIMBOLO_NOTA = '✐'
const SIMBOLO_X = '✖'

const MENSAJE_BIENVENIDA_DEFAULT = `Hola *@user*, bienvenido/a a *@grupo*`
const MENSAJE_DESPEDIDA_DEFAULT = `*@user* salió de *@grupo*`

const handler = async (m, { conn, text, usedPrefix, command, isAdmin, isOwner }) => {
    const chatId = m.chat

    if (!global.db || !global.db.data) {
        await conn.reply(m.chat, `${SIMBOLO} *Base de datos no disponible*`, m)
        return
    }

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

    if (!isAdmin && !isOwner) {
        await conn.reply(
            m.chat,
            `${SIMBOLO} *Solo administradores*\n\n> Este comando solo lo pueden usar los admins del grupo.`,
            m
        )
        return
    }

    switch (command) {
        case 'welcome': {
            if (!text?.trim()) {
                const estado = chat.welcome ? 'activado' : 'desactivado'
                await conn.reply(
                    m.chat,
                    `${SIMBOLO} *Sistema de bienvenida*\n\n` +
                    `> Estado actual: *${estado}*\n\n` +
                    `${SIMBOLO_ALT} *Uso:*\n` +
                    `> *${usedPrefix}welcome on* — Activar\n` +
                    `> *${usedPrefix}welcome off* — Desactivar`,
                    m
                )
                return
            }

            const opcion = text.trim().toLowerCase()

            if (opcion === 'on' || opcion === '1' || opcion === 'si' || opcion === 'activar') {
                chat.welcome = true
                await conn.reply(m.chat, `${SIMBOLO_OK} *Bienvenidas activadas*`, m)
            } else if (opcion === 'off' || opcion === '0' || opcion === 'no' || opcion === 'desactivar') {
                chat.welcome = false
                await conn.reply(m.chat, `${SIMBOLO_OK} *Bienvenidas desactivadas*`, m)
            } else {
                await conn.reply(m.chat, `${SIMBOLO} *Opción inválida*\n\n> Usa *on* o *off*`, m)
            }
            return
        }

        case 'setwelcome': {
            if (!text?.trim()) {
                await conn.reply(
                    m.chat,
                    `${SIMBOLO} *Falta el mensaje*\n\n` +
                    `*Ejemplo:*\n` +
                    `> *${usedPrefix}setwelcome* Hola @user, bienvenido a @grupo\n\n` +
                    `${SIMBOLO_ALT} *Variables disponibles:*\n` +
                    `> *@user* — Menciona al usuario\n` +
                    `> *@grupo* — Nombre del grupo\n` +
                    `> *@total* — Total de miembros\n` +
                    `> *@desc* — Descripción del grupo`,
                    m
                )
                return
            }

            let nuevoMensaje = text.trim()

            const quoted = m.quoted?.text || m.quoted?.body || null
            if (!nuevoMensaje && quoted) {
                nuevoMensaje = quoted
            }

            chat.sWelcome = nuevoMensaje
            chat.welcome = true

            await conn.reply(
                m.chat,
                `${SIMBOLO_OK} *Mensaje de bienvenida guardado*\n\n` +
                `${SIMBOLO_ALT} *Vista previa:*\n` +
                `> ${nuevoMensaje.replace(/@user/g, '@' + m.sender.split('@')[0])}`,
                m
            )
            return
        }

        case 'setbye': {
            if (!text?.trim()) {
                await conn.reply(
                    m.chat,
                    `${SIMBOLO} *Falta el mensaje*\n\n` +
                    `*Ejemplo:*\n` +
                    `> *${usedPrefix}setbye* Adiós @user, esperamos verte pronto\n\n` +
                    `${SIMBOLO_ALT} *Variables disponibles:*\n` +
                    `> *@user* — Menciona al usuario\n` +
                    `> *@grupo* — Nombre del grupo\n` +
                    `> *@total* — Total de miembros\n` +
                    `> *@desc* — Descripción del grupo`,
                    m
                )
                return
            }

            const nuevoMensaje = text.trim()
            chat.sBye = nuevoMensaje
            chat.welcome = true

            await conn.reply(
                m.chat,
                `${SIMBOLO_OK} *Mensaje de despedida guardado*\n\n` +
                `${SIMBOLO_ALT} *Vista previa:*\n` +
                `> ${nuevoMensaje.replace(/@user/g, '@' + m.sender.split('@')[0])}`,
                m
            )
            return
        }

        case 'resetwelcome': {
            chat.sWelcome = ''
            await conn.reply(
                m.chat,
                `${SIMBOLO_OK} *Mensaje de bienvenida restaurado al predeterminado*\n\n` +
                `> ${MENSAJE_BIENVENIDA_DEFAULT}`,
                m
            )
            return
        }

        case 'resetbye': {
            chat.sBye = ''
            await conn.reply(
                m.chat,
                `${SIMBOLO_OK} *Mensaje de despedida restaurado al predeterminado*\n\n` +
                `> ${MENSAJE_DESPEDIDA_DEFAULT}`,
                m
            )
            return
        }

        case 'verwelcome': {
            const mensajeBienvenida = chat.sWelcome?.trim() ? chat.sWelcome : `_(predeterminado)_ ${MENSAJE_BIENVENIDA_DEFAULT}`
            const mensajeDespedida = chat.sBye?.trim() ? chat.sBye : `_(predeterminado)_ ${MENSAJE_DESPEDIDA_DEFAULT}`

            await conn.reply(
                m.chat,
                `${SIMBOLO} *Configuración actual*\n\n` +
                `${SIMBOLO_ALT} *Estado:* ${chat.welcome ? 'Activado' : 'Desactivado'}\n\n` +
                `${SIMBOLO_NOTA} *Bienvenida:*\n> ${mensajeBienvenida}\n\n` +
                `${SIMBOLO_NOTA} *Despedida:*\n> ${mensajeDespedida}`,
                m
            )
            return
        }

        default:
            return
    }
}

handler.help = [
    'welcome on/off',
    'setwelcome <mensaje>',
    'setbye <mensaje>',
    'resetwelcome',
    'resetbye',
    'verwelcome'
]

handler.tags = ['grupos']

handler.command = [
    'welcome',
    'bienvenida',
    'setwelcome',
    'setbienvenida',
    'setbye',
    'setdespedida',
    'resetwelcome',
    'resetbye',
    'verwelcome'
]

handler.admin = true
handler.group = true

handler.description = 'Configura los mensajes de bienvenida y despedida del grupo'

export default handler