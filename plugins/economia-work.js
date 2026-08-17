import {
    ejecutarTrabajo,
    formatearDinero,
    formatearTiempo
} from '../lib/economia.js'

const CONTEXTO_CANAL = {
    forwardedNewsletterMessageInfo: {
        newsletterJid: '120363410031000704@newsletter',
        newsletterName: 'Rin-Tohsaka',
        serverMessageId: 1
    }
}

const handler = async (m, { conn }) => {
    const resultado = ejecutarTrabajo(m.sender)

    if (!resultado.ok) {
        await conn.sendMessage(
            m.chat,
            {
                text:
                    `ꕥ *Todavía estás cansado del último laburo*\n\n` +
                    `〄 *Cooldown*\n` +
                    `> Podés volver a trabajar en: ${formatearTiempo(resultado.restante)}`,
                contextInfo: CONTEXTO_CANAL
            },
            { quoted: m }
        )

        return
    }

    let texto =
        `ꕥ *Trabajaste de ${resultado.trabajo}*\n\n` +
        `〄 *Detalles*\n` +
        `> ${resultado.texto}\n\n` +
        `✰ *Ganancia*\n` +
        `> ${formatearDinero(resultado.monto)}`

    if (resultado.bonusTexto) {
        texto +=
            `\n\n✐ *Bonus*\n` +
            `> ${resultado.bonusTexto} (+${formatearDinero(resultado.montoBonus)})`
    }

    await conn.sendMessage(
        m.chat,
        {
            text: texto,
            contextInfo: CONTEXTO_CANAL
        },
        { quoted: m }
    )
}

handler.help = ['trabajar']
handler.tags = ['economia']
handler.command = ['trabajar', 'work', 'laburar']

handler.description = 'Trabajá para ganar dinero'

export default handler
