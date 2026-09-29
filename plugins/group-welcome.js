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

    const p = usedPrefix

    switch (command) {
        // ====================================================================
        // WELCOME - MENÚ PRINCIPAL
        // ====================================================================
        case 'welcome':
        case 'bienvenida': {
            if (!text?.trim()) {
                const estado = chat.welcome ? 'Activado' : 'Desactivado'
                const mensajeBienvenida = chat.sWelcome?.trim() ? chat.sWelcome : `_(predeterminado)_`
                const mensajeDespedida = chat.sBye?.trim() ? chat.sBye : `_(predeterminado)_`

                await conn.reply(
                    m.chat,
                    `${SIMBOLO} *Configuración de bienvenidas*\n\n` +

                    `${SIMBOLO_ALT} *Estado actual:*\n` +
                    `> Bienvenidas: *${estado}*\n` +
                    `> Mensaje bienvenida: ${mensajeBienvenida}\n` +
                    `> Mensaje despedida: ${mensajeDespedida}\n\n` +

                    `${SIMBOLO_NOTA} *Comandos disponibles:*\n\n` +

                    `> *${p}welcome on* — Activar bienvenidas\n` +
                    `> *${p}welcome off* — Desactivar bienvenidas\n\n` +

                    `> *${p}setwelcome <mensaje>* — Configurar mensaje de bienvenida\n` +
                    `> *${p}setbye <mensaje>* — Configurar mensaje de despedida\n\n` +

                    `> *${p}resetwelcome* — Restaurar bienvenida predeterminada\n` +
                    `> *${p}resetbye* — Restaurar despedida predeterminada\n\n` +

                    `> *${p}verwelcome* — Ver la configuración completa\n\n` +

                    `${SIMBOLO_ALT} *Variables disponibles:*\n` +
                    `> *@user* — Menciona al usuario\n` +
                    `> *@grupo* — Nombre del grupo\n` +
                    `> *@total* — Total de miembros\n` +
                    `> *@desc* — Descripción del grupo`,
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
                await conn.reply(
                    m.chat,
                    `${SIMBOLO_X} *Opción inválida*\n\n` +
                    `> Usa *on* o *off*\n` +
                    `> Ejemplo: *${p}welcome on*`,
                    m
                )
            }
            return
        }

        // ====================================================================
        // SETWELCOME
        // ====================================================================
        case 'setwelcome':
        case 'setbienvenida': {
            if (!text?.trim()) {
                await conn.reply(
                    m.chat,
                    `${SIMBOLO} *Falta el mensaje*\n\n` +
                    `*Ejemplo:*\n` +
                    `> *${p}setwelcome* Hola @user, bienvenido a @grupo\n\n` +
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

        // ====================================================================
        // SETBYE
        // ====================================================================
        case 'setbye':
        case 'setdespedida': {
            if (!text?.trim()) {
                await conn.reply(
                    m.chat,
                    `${SIMBOLO} *Falta el mensaje*\n\n` +
                    `*Ejemplo:*\n` +
                    `> *${p}setbye* Adiós @user, esperamos verte pronto\n\n` +
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

        // ====================================================================
        // RESETWELCOME
        // ====================================================================
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

        // ====================================================================
        // RESETBYE
        // ====================================================================
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

        // ====================================================================
        // VERWELCOME - VER CONFIGURACIÓN
        // ====================================================================
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