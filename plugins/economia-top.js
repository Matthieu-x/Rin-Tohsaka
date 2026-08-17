import {
    obtenerTopUsuarios,
    formatearDinero
} from '../lib/economia.js'

const MEDALLAS = ['🥇', '🥈', '🥉']

const handler = async (m, { conn }) => {
    const top = obtenerTopUsuarios(10)

    if (!top.length) {
        await conn.reply(
            m.chat,
            `ꕥ *Todavía no hay nadie en el ranking*`,
            m
        )

        return
    }

    const lineas = top.map((usuario, indice) => {
        const posicion = MEDALLAS[indice] || `${indice + 1}.`
        const numero = usuario.jid.split('@')[0]

        return `${posicion} @${numero} — ${formatearDinero(usuario.total)}`
    })

    await conn.sendMessage(
        m.chat,
        {
            text:
                `ꕥ *Top ricos*\n\n` +
                `〄 *Ranking*\n` +
                `${lineas.join('\n')}`,
            mentions: top.map(u => u.jid)
        },
        { quoted: m }
    )
}

handler.help = ['topricos']
handler.tags = ['economia']
handler.command = ['topricos', 'ranking', 'top']

handler.description = 'Muestra el ranking de los usuarios con más plata'

export default handler
