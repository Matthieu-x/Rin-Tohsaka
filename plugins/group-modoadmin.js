import fs from 'fs-extra'

const SIMBOLO = 'ꕥ'
const SIMBOLO_ALT = '〄'
const SIMBOLO_OK = '✰'

const DB_PATH = './plugins/database/modoadmin.json'

const leerDB = () => {
    if (!fs.existsSync(DB_PATH)) {
        fs.writeJsonSync(DB_PATH, {})
        return {}
    }
    try {
        return fs.readJsonSync(DB_PATH)
    } catch {
        return {}
    }
}

const guardarDB = (data) => fs.writeJsonSync(DB_PATH, data)

const handler = async (m, { conn, text, usedPrefix, command, isAdmin }) => {
    const chatId = m.chat
    const db = leerDB()

    // Solo grupos
    if (!chatId.endsWith('@g.us')) {
        return conn.reply(chatId, `${SIMBOLO} *Solo en grupos*\n\n> Este comando solo funciona en grupos`, m)
    }

    // Solo admins pueden activarlo
    if (!isAdmin) {
        return conn.reply(chatId, `${SIMBOLO} *Solo administradores*\n\n> Solo un admin puede cambiar esto`, m)
    }

    if (!text?.trim()) {
        const estado = db[chatId] ? 'Activado' : 'Desactivado'
        return conn.reply(
            chatId,
            `${SIMBOLO} *Modo admin*\n\n` +
            `${SIMBOLO_ALT} *Estado actual:* ${estado}\n\n` +
            `*Uso:*\n` +
            `> *${usedPrefix}${command} on* — Activar\n` +
            `> *${usedPrefix}${command} off* — Desactivar\n\n` +
            `> Cuando está activado, el bot solo responde a admins del grupo.`,
            m
        )
    }

    const opcion = text.trim().toLowerCase()

    if (opcion === 'on' || opcion === '1' || opcion === 'si') {
        db[chatId] = true
        guardarDB(db)
        return conn.reply(chatId, `${SIMBOLO_OK} *Modo admin activado*\n\n> El bot solo responderá a admins del grupo`, m)
    }

    if (opcion === 'off' || opcion === '0' || opcion === 'no') {
        db[chatId] = false
        guardarDB(db)
        return conn.reply(chatId, `${SIMBOLO_OK} *Modo admin desactivado*\n\n> El bot responderá a todos`, m)
    }

    return conn.reply(chatId, `${SIMBOLO} *Opción inválida*\n\n> Usa *on* o *off*`, m)
}

handler.help = ['modoadmin on/off']
handler.tags = ['grupos']
handler.command = ['modoadmin', 'adminmode', 'soloadmin']
handler.admin = true
handler.group = true
handler.description = 'Activa el modo en que el bot solo responde a admins del grupo'

export default handler