import {
    obtenerUsuario,
    ejecutarApuesta,
    formatearDinero
} from '../lib/economia.js'

const APUESTA_MINIMA = 50

const handler = async (m, { conn, text, usedPrefix, command }) => {
    const partes = text?.trim().split(/\s+/) || []
    const eleccion = partes[0]?.toLowerCase()
    const montoTexto = partes[1]

    if (!['cara', 'cruz'].includes(eleccion) || !montoTexto) {
        await conn.reply(
            m.chat,
            `ꕥ *Uso incorrecto*\n\n` +
            `〄 *Ejemplo*\n` +
            `> ${usedPrefix}${command} cara 500\n` +
            `> Opciones: cara / cruz`,
            m
        )

        return
    }

    const monto = Number(montoTexto)

    if (!Number.isInteger(monto) || monto < APUESTA_MINIMA) {
        await conn.reply(
            m.chat,
            `ꕥ *Apuesta inválida*\n\n` +
            `〄 *Mínimo*\n` +
            `> ${formatearDinero(APUESTA_MINIMA)}`,
            m
        )

        return
    }

    const usuario = obtenerUsuario(m.sender)

    if ((usuario.saldo || 0) < monto) {
        await conn.reply(
            m.chat,
            `ꕥ *No tenés suficiente efectivo*\n\n` +
            `〄 *Tu saldo*\n` +
            `> ${formatearDinero(usuario.saldo)}`,
            m
        )

        return
    }

    const resultado = ejecutarApuesta(m.sender, eleccion, monto)

    if (resultado.gano) {
        await conn.reply(
            m.chat,
            `ꕥ *Salió ${resultado.resultado}, ¡ganaste!*\n\n` +
            `〄 *Detalles*\n` +
            `> ${resultado.texto}\n\n` +
            `✰ *Ganancia*\n` +
            `> ${formatearDinero(monto)}`,
            m
        )

        return
    }

    await conn.reply(
        m.chat,
        `ꕥ *Salió ${resultado.resultado}, perdiste*\n\n` +
        `〄 *Detalles*\n` +
        `> ${resultado.texto}\n\n` +
        `✐ *Pérdida*\n` +
        `> -${formatearDinero(monto)}`,
        m
    )
}

handler.help = ['apostar <cara/cruz> <monto>']
handler.tags = ['economia']
handler.command = ['apostar', 'flip', 'coinflip']

handler.description = 'Apostá a cara o cruz, duplicá o perdé tu apuesta'

export default handler
