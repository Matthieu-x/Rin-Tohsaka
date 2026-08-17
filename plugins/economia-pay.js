import {
    obtenerUsuario,
    modificarSaldo,
    formatearDinero,
    extraerJidMencionado
} from '../lib/economia.js'

const handler = async (m, { conn, text, usedPrefix, command }) => {
    const jidObjetivo = extraerJidMencionado(m)
    const partes = text?.trim().split(/\s+/) || []
    const montoTexto = partes.find(p => /^\d+$/.test(p))
    const monto = Number(montoTexto)

    if (!jidObjetivo || !montoTexto || !Number.isInteger(monto) || monto <= 0) {
        await conn.reply(
            m.chat,
            `ꕥ *Uso incorrecto*\n\n` +
            `〄 *Ejemplo*\n` +
            `> ${usedPrefix}${command} @usuario 500`,
            m
        )

        return
    }

    if (jidObjetivo === m.sender) {
        await conn.reply(
            m.chat,
            `ꕥ *No podés transferirte plata a vos mismo*`,
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

    modificarSaldo(m.sender, -monto)
    modificarSaldo(jidObjetivo, monto)

    await conn.sendMessage(
        m.chat,
        {
            text:
                `ꕥ *Transferencia realizada*\n\n` +
                `〄 *Detalles*\n` +
                `> Le enviaste ${formatearDinero(monto)} a @${jidObjetivo.split('@')[0]}`,
            mentions: [jidObjetivo]
        },
        { quoted: m }
    )
}

handler.help = ['pay @usuario <monto>']
handler.tags = ['economia']
handler.command = ['pay', 'transferir', 'enviar']

handler.description = 'Transferí efectivo a otro usuario'

export default handler
