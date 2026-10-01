const SIMBOLO = 'ꕥ'
const SIMBOLO_ALT = '〄'

const handler = async (m, { conn }) => {
    const sender = m.key.participant || m.key.remoteJid

    const texto =
        `${SIMBOLO} *Info LID*\n\n` +
        `${SIMBOLO_ALT} *Sender:*\n` +
        `> ${sender}`

    await conn.reply(m.chat, texto, m)
}

handler.help = ['lid']
handler.tags = ['info']
handler.command = ['lid', 'verlid', 'mylid']
handler.description = 'Muestra el sender del usuario'

export default handler