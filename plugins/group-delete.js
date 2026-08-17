const handler = async (m, { conn }) => {
    if (!m.quoted) {
        await conn.reply(
            m.chat,
            `ꕥ *Falta el mensaje*\n\n` +
            `〄 *Uso*\n` +
            `> Cita el mensaje que deseas eliminar`,
            m
        )

        return
    }

    try {
        const participant = m.message.extendedTextMessage.contextInfo.participant
        const stanzaId = m.message.extendedTextMessage.contextInfo.stanzaId

        return await conn.sendMessage(m.chat, {
            delete: { remoteJid: m.chat, fromMe: false, id: stanzaId, participant }
        })
    } catch {
        return await conn.sendMessage(m.chat, { delete: m.quoted.key })
    }
}

handler.help = ['delete']
handler.tags = ['grupo']
handler.command = ['del', 'delete', 'borrar']
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler
