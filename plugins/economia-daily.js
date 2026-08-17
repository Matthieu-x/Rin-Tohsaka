import {
    ejecutarDaily,
    formatearDinero,
    formatearTiempo
} from '../lib/economia.js'

const handler = async (m, { conn }) => {
    const resultado = ejecutarDaily(m.sender)

    if (!resultado.ok) {
        await conn.reply(
            m.chat,
            `ꕥ *Ya reclamaste tu daily*\n\n` +
            `〄 *Cooldown*\n` +
            `> Volvé a intentarlo en: ${formatearTiempo(resultado.restante)}`,
            m
        )

        return
    }

    await conn.reply(
        m.chat,
        `ꕥ *Recompensa diaria*\n\n` +
        `〄 *Detalles*\n` +
        `> ${resultado.texto}\n\n` +
        `✰ *Ganancia*\n` +
        `> ${formatearDinero(resultado.monto)}`,
        m
    )
}

handler.help = ['daily']
handler.tags = ['economia']
handler.command = ['daily', 'diario']

handler.description = 'Reclamá tu recompensa diaria (cada 24hs)'

export default handler
