import {
    ejecutarTrabajo,
    formatearDinero,
    formatearTiempo
} from '../lib/economia.js'

// Datos reales del canal
const CANAL_JID = '120363410031000704@newsletter'
const CANAL_NOMBRE = 'Rin-Tohsaka'

const handler = async (m, { conn }) => {
    const resultado = ejecutarTrabajo(m.sender)

    if (!resultado.ok) {
        await conn.sendMessage(
            m.chat,
            {
                text:
                    `ꕥ *Todavía estás cansado del último laburo*\n\n` +
                    `〄 *Cooldown*\n` +
                    `> Podés volver a trabajar en: ${formatearTiempo(resultado.restante)}`
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

    // Este es el tipo de mensaje que realmente muestra la tarjeta
    // clickeable de "Ver canal" — no un contextInfo dentro de un texto normal.
    await conn.sendMessage(
        m.chat,
        {
            text: texto,
            newsletterFollowerInvite: {
                newsletterJid: CANAL_JID,
                newsletterName: CANAL_NOMBRE
                // jpegThumbnail: fs.readFileSync('./media/rin.jpeg') // opcional
            }
        },
        { quoted: m }
    )
}

handler.help = ['trabajar']
handler.tags = ['economia']
handler.command = ['trabajar', 'work', 'laburar']

handler.description = 'Trabajá para ganar dinero'
export default handler
