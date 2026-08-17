import {
    obtenerUsuario,
    ejecutarRuleta,
    formatearDinero
} from '../lib/economia.js'

const APUESTA_MINIMA = 50

const EMOJI_COLOR = {
    rojo: '🔴',
    negro: '⚫',
    verde: '🟢'
}

const handler = async (m, { conn, text, usedPrefix, command }) => {
    const partes = text?.trim().split(/\s+/) || []
    const valorTexto = partes[0]?.toLowerCase()
    const montoTexto = partes[1]

    if (!valorTexto || !montoTexto) {
        await conn.reply(
            m.chat,
            `ꕥ *Uso incorrecto*\n\n` +
            `〄 *Ejemplos*\n` +
            `> ${usedPrefix}${command} rojo 500\n` +
            `> ${usedPrefix}${command} negro 500 (paga x2)\n` +
            `> ${usedPrefix}${command} par 500\n` +
            `> ${usedPrefix}${command} impar 500 (paga x2)\n` +
            `> ${usedPrefix}${command} 17 500 (número exacto, paga x36)`,
            m
        )

        return
    }

    let tipo
    let valor

    if (['rojo', 'negro'].includes(valorTexto)) {
        tipo = 'color'
        valor = valorTexto
    } else if (['par', 'impar'].includes(valorTexto)) {
        tipo = 'paridad'
        valor = valorTexto
    } else if (/^\d+$/.test(valorTexto) && Number(valorTexto) >= 0 && Number(valorTexto) <= 36) {
        tipo = 'numero'
        valor = Number(valorTexto)
    } else {
        await conn.reply(
            m.chat,
            `ꕥ *Apuesta inválida*\n\n` +
            `〄 *Opciones*\n` +
            `> rojo / negro / par / impar / un número del 0 al 36`,
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

    const resultado = ejecutarRuleta(m.sender, tipo, valor, monto)
    const emoji = EMOJI_COLOR[resultado.colorSalido]

    if (resultado.gano) {
        await conn.reply(
            m.chat,
            `ꕥ *${emoji} Salió ${resultado.numeroSalido} (${resultado.colorSalido}) — ¡ganaste!*\n\n` +
            `〄 *Detalles*\n` +
            `> ${resultado.texto}\n\n` +
            `✰ *Ganancia*\n` +
            `> ${formatearDinero(resultado.ganancia)}`,
            m
        )

        return
    }

    await conn.reply(
        m.chat,
        `ꕥ *${emoji} Salió ${resultado.numeroSalido} (${resultado.colorSalido}) — perdiste*\n\n` +
        `〄 *Detalles*\n` +
        `> ${resultado.texto}\n\n` +
        `✐ *Pérdida*\n` +
        `> -${formatearDinero(monto)}`,
        m
    )
}

handler.help = ['ruleta <rojo/negro/par/impar/número> <monto>']
handler.tags = ['economia']
handler.command = ['ruleta', 'roulette', 'rulet']

handler.description = 'Apostá en la ruleta a color, paridad o número exacto'

export default handler
