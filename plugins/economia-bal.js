import {
    obtenerUsuario,
    formatearDinero
} from '../lib/economia.js'

const handler = async (m, { conn }) => {
    const usuario = obtenerUsuario(m.sender)

    const total = (usuario.saldo || 0) + (usuario.banco || 0)

    const texto =
        `ꕥ *Tu billetera*\n\n` +
        `〄 *Efectivo*\n` +
        `> ${formatearDinero(usuario.saldo)}\n\n` +
        `〄 *Banco*\n` +
        `> ${formatearDinero(usuario.banco)} / ${formatearDinero(usuario.limiteBanco)}\n\n` +
        `✰ *Total*\n` +
        `> ${formatearDinero(total)}`

    await conn.reply(m.chat, texto, m)
}

handler.help = ['saldo']
handler.tags = ['economia']
handler.command = ['saldo', 'bal', 'balance']

handler.description = 'Muestra tu saldo en efectivo y en el banco'

export default handler
