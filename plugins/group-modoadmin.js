const SIMBOLO = 'ꕥ'
const SIMBOLO_ALT = '〄'
const SIMBOLO_OK = '✰'

let handler = async (m, { conn, text, usedPrefix, command, isAdmin, isOwner, chat }) => {
    if (!m.isGroup) {
        return conn.reply(m.chat, `${SIMBOLO} *Solo en grupos*\n\n> Este comando solo funciona en grupos`, m)
    }

    if (!isAdmin && !isOwner) {
        return conn.reply(m.chat, `${SIMBOLO} *Solo administradores*\n\n> Solo un admin puede cambiar esto`, m)
    }

    if (!text?.trim()) {
        const estado = chat.modoadmin ? 'Activado' : 'Desactivado'
        return conn.reply(
            m.chat,
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

    if (opcion === 'on' || opcion === '1' || opcion === 'si' || opcion === 'activar') {
        chat.modoadmin = true
        return conn.reply(m.chat, `${SIMBOLO_OK} *Modo admin activado*\n\n> El bot solo responderá a admins del grupo`, m)
    }

    if (opcion === 'off' || opcion === '0' || opcion === 'no' || opcion === 'desactivar') {
        chat.modoadmin = false
        return conn.reply(m.chat, `${SIMBOLO_OK} *Modo admin desactivado*\n\n> El bot responderá a todos`, m)
    }

    return conn.reply(m.chat, `${SIMBOLO} *Opción inválida*\n\n> Usa *on* o *off*`, m)
}

handler.help = ['modoadmin on/off']
handler.tags = ['grupos']
handler.command = ['modoadmin', 'adminmode', 'soloadmin']
handler.admin = true
handler.group = true
handler.description = 'Solo los admins del grupo pueden usar comandos cuando está activado'

export default handler