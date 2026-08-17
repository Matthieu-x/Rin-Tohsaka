import { sendGifOrText } from './_gifHelper.js'
import { getUser, updateUser } from '../../utils/slayerGameStore.js'

const GIF_LIST = ['triste1.mp4', 'triste2.mp4', 'triste3.mp4']

const handler = async (m, { conn }) => {
    const user = getUser(m.sender, m.pushName)

    if (!user.spouse) {
        await conn.reply(
            m.chat,
            `ꕥ *Aviso*\n\n` +
            `〄 *Estado*\n` +
            `> No estás casad@ con nadie`,
            m
        )

        return
    }

    const partnerId = user.spouse

    updateUser(m.sender, m.pushName, (u) => { u.spouse = null })
    updateUser(partnerId, '', (u) => { u.spouse = null })

    const senderTag = `@${m.sender.split('@')[0]}`
    const partnerTag = `@${partnerId.split('@')[0]}`

    const mensaje =
        `ꕥ *Divorcio Procesado*\n\n` +
        `〄 *Integrantes*\n` +
        `${senderTag} y ${partnerTag}\n\n` +
        `✐ *Detalles*\n` +
        `> Han separado sus caminos y vuelven a estar solteros`

    try {
        await sendGifOrText(conn, m.chat, m, GIF_LIST, mensaje, [m.sender, partnerId], 'divorcio')
    } catch {
        await conn.sendMessage(
            m.chat,
            {
                text: mensaje,
                mentions: [m.sender, partnerId]
            },
            { quoted: m }
        )
    }
}

handler.help = ['divorcio']
handler.tags = ['fun']
handler.command = ['divorcio', 'divorciar']
handler.group = true
handler.register = true
handler.description = 'Te divorcias de tu pareja actual'

export default handler
