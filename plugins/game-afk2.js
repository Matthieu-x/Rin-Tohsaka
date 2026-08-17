import fetch from 'node-fetch'

const handler = async (m, { conn, text }) => {
    const user = global.db.data.users[m.sender]

    user.afk = +new Date()
    user.afkReason = text || ''

    let thumb = null
    try {
        thumb = await (await fetch('https://i.postimg.cc/rFfVL8Ps/image.jpg')).buffer()
    } catch {
        thumb = null
    }

    const rin_catalog = {
        key: {
            remoteJid: 'status@broadcast',
            fromMe: false,
            id: 'RinTohsakaCatalog',
            participant: '0@s.whatsapp.net'
        },
        message: {
            productMessage: {
                product: {
                    productImage: thumb
                        ? {
                            mimetype: 'image/jpeg',
                            jpegThumbnail: thumb
                        }
                        : undefined,
                    title: 'WhatsApp Business • Estado',
                    description: 'Rin-Tohsaka',
                    currencyCode: 'USD',
                    priceAmount1000: '0',
                    retailerId: 'RinTohsakaCore',
                    productImageCount: 1
                },
                businessOwnerJid: '584242773183@s.whatsapp.net'
            }
        }
    }

    await conn.sendMessage(
        m.chat,
        {
            text:
                `ꕥ *Inactividad Registrada*\n\n` +
                `〄 *Estado*\n` +
                `> Ahora estás AFK\n\n` +
                `✐ *Motivo*\n` +
                `> ${text || 'sin especificar'}`
        },
        { quoted: rin_catalog }
    )
}

handler.help = ['afk [razón]']
handler.tags = ['fun']
handler.command = ['afk']

export default handler
