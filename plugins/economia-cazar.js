import {
    ejecutarCazar,
    formatearDinero,
    formatearTiempo
} from '../lib/economia.js'

const handler = async (m, { conn }) => {
    const resultado = ejecutarCazar(m.sender)

    if (!resultado.ok) {
        await conn.reply(
            m.chat,
            `ꕥ *Todavía estás cansado de la última cacería*\n\n` +
            `〄 *Cooldown*\n` +
            `> Podés volver a cazar en: ${formatearTiempo(resultado.restante)}`,
            m
        )

        return
    }

    if (!resultado.exito) {
        await conn.reply(
            m.chat,
            `ꕥ *Cacería sin suerte*\n\n` +
            `〄 *Detalles*\n` +
            `> ${resultado.texto}`,
            m
        )

        return
    }

    await conn.reply(
        m.chat,
        `ꕥ *¡Cacería exitosa!*\n\n` +
        `〄 *Capturaste*\n` +
        `> ${resultado.item}\n\n` +
        `✰ *Ganancia*\n` +
        `> ${formatearDinero(resultado.monto)}`,
        m
    )
}

handler.help = ['cazar']
handler.tags = ['economia']
handler.command = ['cazar', 'hunt', 'cazeria']

handler.description = 'Salí a cazar para ganar dinero'

export default handler
