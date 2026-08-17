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
    const monto = parsearMonto(text?.trim(), usuario.saldo || 0)

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

    if (monto > (usuario.saldo || 0)) {
        await conn.reply(
            m.chat,
            `ꕥ *No tenés suficiente efectivo*\n\n` +
            `〄 *Disponible*\n` +
            `> ${formatearDinero(usuario.saldo)}`,
            m
        )

        return
    }

    const espacioLibre = (usuario.limiteBanco || 0) - (usuario.banco || 0)

    if (monto > espacioLibre) {
        await conn.reply(
            m.chat,
            `ꕥ *Tu banco no tiene espacio suficiente*\n\n` +
            `〄 *Espacio libre*\n` +
            `> ${formatearDinero(espacioLibre)}\n\n` +
            `✐ *Límite actual*\n` +
            `> ${formatearDinero(usuario.limiteBanco)}`,
            m
        )

        return
    }

    guardarUsuario(m.sender, {
        saldo: usuario.saldo - monto,
        banco: usuario.banco + monto
    })

    await conn.reply(
        m.chat,
        `ꕥ *Depósito realizado*\n\n` +
        `〄 *Depositaste*\n` +
        `> ${formatearDinero(monto)}\n\n` +
        `✰ *Banco ahora*\n` +
        `> ${formatearDinero(usuario.banco + monto)}`,
        m
    )
}

handler.help = ['depositar <monto/todo>']
handler.tags = ['economia']
handler.command = ['depositar', 'deposit']

handler.description = 'Guardá dinero en el banco (protegido de robos)'

export default handler
