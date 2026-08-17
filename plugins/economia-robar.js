import {
    ejecutarRobo,
    formatearDinero,
    formatearTiempo,
    extraerJidMencionado
} from '../lib/economia.js'

const handler = async (m, { conn }) => {
    const jidObjetivo = extraerJidMencionado(m)

    if (!jidObjetivo) {
        await conn.reply(
            m.chat,
            `ꕥ *Falta la víctima*\n\n` +
            `〄 *Ejemplo*\n` +
            `> .robar @usuario`,
            m
        )

        return
    }

    if (jidObjetivo === m.sender) {
        await conn.reply(
            m.chat,
            `ꕥ *No podés robarte a vos mismo*`,
            m
        )

        return
    }

    const resultado = ejecutarRobo(m.sender, jidObjetivo)

    if (!resultado.ok) {
        if (resultado.motivo === 'cooldown') {
            await conn.reply(
                m.chat,
                `ꕥ *Estás muy visto para robar de nuevo*\n\n` +
                `〄 *Cooldown*\n` +
                `> Podés reintentar en: ${formatearTiempo(resultado.restante)}`,
                m
            )

            return
        }

        await conn.reply(
            m.chat,
            `ꕥ *Esa persona no tiene nada para robarle*`,
            m
        )

        return
    }

    if (resultado.exito) {
        await conn.sendMessage(
            m.chat,
            {
                text:
                    `ꕥ *¡Robo exitoso!*\n\n` +
                    `〄 *Detalles*\n` +
                    `> ${resultado.texto}\n\n` +
                    `✰ *Botín*\n` +
                    `> ${formatearDinero(resultado.monto)}`,
                mentions: [jidObjetivo]
            },
            { quoted: m }
        )

        return
    }

    await conn.reply(
        m.chat,
        `ꕥ *¡Te agarraron!*\n\n` +
        `〄 *Detalles*\n` +
        `> ${resultado.texto}\n\n` +
        `✐ *Multa*\n` +
        `> -${formatearDinero(resultado.multa)}`,
        m
    )
}

handler.help = ['robar @usuario']
handler.tags = ['economia']
handler.command = ['robar', 'rob', 'steal']

handler.description = 'Intentá robarle efectivo a otro usuario (riesgo de multa)'

export default handler
