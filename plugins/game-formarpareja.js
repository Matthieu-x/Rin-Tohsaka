const toM = (a) => '@' + a.split('@')[0]

const handler = async (m, { conn, groupMetadata }) => {
    const ps = groupMetadata.participants.map((v) => v.id)
    const a = ps[Math.floor(Math.random() * ps.length)]
    let b
    do b = ps[Math.floor(Math.random() * ps.length)]
    while (b === a)

    await conn.sendMessage(
        m.chat,
        {
            text:
                `ꕥ *Pareja Formada*\n\n` +
                `〄 *Integrantes*\n` +
                `${toM(a)} y ${toM(b)}\n\n` +
                `> Deberían casarse, hacen una bonita pareja`,
            mentions: [a, b]
        },
        { quoted: m }
    )
}

handler.help = ['formarpareja']
handler.tags = ['fun']
handler.command = ['formarpareja', 'formarparejas', 'parejas']
handler.group = true
handler.register = true
handler.description = 'casate con alguien'

export default handler
