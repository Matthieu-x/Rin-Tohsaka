import {
    ejecutarCrimen,
    formatearDinero,
    formatearTiempo
} from '../lib/economia.js'

const handler = async (m, { conn }) => {
    const resultado = ejecutarCrimen(m.sender)

    if (!resultado.ok) {
        await conn.reply(
            m.chat,
            `ꕥ *Todavía estás escondido de la última vez*\n\n` +
            `〄 *Cooldown*\n` +
            `> Podés volver a arriesgarte en: ${formatearTiempo(resultado.restante)}`,
            m
        )

        return
    }

    if (resultado.exito) {
        await conn.reply(
            m.chat,
            `ꕥ *¡El golpe salió perfecto!*\n\n` +
            `〄 *Detalles*\n` +
            `> ${resultado.texto}\n\n` +
            `✰ *Botín*\n` +
            `> ${formatearDinero(resultado.monto)}`,
            m
        )

        return
    }

    await conn.reply(
        m.chat,
        `ꕥ *Te agarraron*\n\n` +
        `〄 *Detalles*\n` +
        `> ${resultado.texto}\n\n` +
        `✐ *Multa*\n` +
        `> -${formatearDinero(resultado.multa)}`,
        m
    )
}

handler.help = ['crimen']
handler.tags = ['economia']
handler.command = ['crimen', 'crime', 'asaltar']

handler.description = 'Arriesgate a cometer un crimen — alta recompensa, alto riesgo'

export default handler
