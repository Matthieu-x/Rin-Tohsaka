import {
    obtenerUsuario,
    guardarUsuario,
    formatearDinero
} from '../lib/economia.js'

const parsearMonto = (texto, disponible) => {
    if (!texto) return null

    if (texto.toLowerCase() === 'todo' || texto.toLowerCase() === 'all') {
        return disponible
    }

    const numero = Number(texto)

    if (!Number.isInteger(numero) || numero <= 0) {
        return null
    }

    return numero
}

const handler = async (m, { conn, text, usedPrefix, command }) => {
    const usuario = obtenerUsuario(m.sender)
    const monto = parsearMonto(text?.trim(), usuario.banco || 0)

    if (!monto) {
        await conn.reply(
            m.chat,
            `ꕥ *Uso incorrecto*\n\n` +
            `〄 *Ejemplo*\n` +
            `> ${usedPrefix}${command} 500\n` +
            `> ${usedPrefix}${command} todo`,
            m
        )

        return
    }

    if (monto > (usuario.banco || 0)) {
        await conn.reply(
            m.chat,
            `ꕥ *No tenés suficiente saldo en el banco*\n\n` +
            `〄 *Disponible*\n` +
            `> ${formatearDinero(usuario.banco)}`,
            m
        )

        return
    }

    guardarUsuario(m.sender, {
        saldo: usuario.saldo + monto,
        banco: usuario.banco - monto
    })

    await conn.reply(
        m.chat,
        `ꕥ *Retiro realizado*\n\n` +
        `〄 *Retiraste*\n` +
        `> ${formatearDinero(monto)}\n\n` +
        `✰ *Efectivo ahora*\n` +
        `> ${formatearDinero(usuario.saldo + monto)}`,
        m
    )
}

handler.help = ['retirar <monto/todo>']
handler.tags = ['economia']
handler.command = ['retirar', 'withdraw', 're']

handler.description = 'Sacá dinero del banco'

export default handler
