const SIMBOLO = 'ꕥ'
const SIMBOLO_ALT = '〄'
const SIMBOLO_OK = '✰'
const SIMBOLO_NOTA = '✐'

const handler = async (m, { conn, text, usedPrefix }) => {
    const from = m.chat

    const contextInfo = {
        forwardingScore: 9999999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: global.canalId || '',
            serverMessageId: 0,
            newsletterName: global.canalNombre || ''
        }
    }

    const responder = async texto => {
        return conn.sendMessage(
            from,
            {
                text: texto,
                contextInfo
            },
            {
                quoted: m
            }
        )
    }

    const reaccionar = async emoji => {
        try {
            await m.react(emoji)
        } catch {}
    }

    try {
        if (!text?.trim()) {
            return await responder(
                `${SIMBOLO} *Falta el enlace*\n\n` +
                `> Por favor, ingresa el enlace de un grupo o canal de WhatsApp.\n\n` +
                `${SIMBOLO_ALT} *Ejemplos*\n` +
                `> ${usedPrefix}inspect https://chat.whatsapp.com/xxxxx\n` +
                `> ${usedPrefix}inspect https://whatsapp.com/channel/xxxxx`
            )
        }

        try {
            await conn.sendPresenceUpdate(
                'composing',
                from
            )
        } catch {}

        await reaccionar('🔍')

        const channelUrl = text.match(
            /(?:https:\/\/)?(?:www\.)?whatsapp\.com\/channel\/([0-9A-Za-z_-]{10,})/i
        )?.[1]

        const inviteUrl = text.match(
            /(?:https:\/\/)?(?:www\.)?chat\.whatsapp\.com\/(?:invite\/|joinchat\/)?([0-9A-Za-z]{20,30})/i
        )?.[1]

        let id = null
        let tipo = null
        let metadata = null

        if (inviteUrl) {
            tipo = 'Grupo'

            try {
                metadata =
                    await conn.groupGetInviteInfo(
                        inviteUrl
                    )

                if (metadata?.id) {
                    id = metadata.id
                }

            } catch (error) {
                console.error(
                    '[INSPECT] Grupo:',
                    error
                )

                await reaccionar('❌')

                return await responder(
                    `${SIMBOLO} *Grupo no encontrado*\n\n` +
                    `> Verifica que el enlace sea correcto o que todavía esté disponible.`
                )
            }

        } else if (channelUrl) {
            tipo = 'Canal'

            try {
                metadata =
                    await conn.newsletterMetadata(
                        'invite',
                        channelUrl
                    )

                if (metadata?.id) {
                    id = metadata.id
                }

            } catch (error) {
                console.error(
                    '[INSPECT] Canal:',
                    error
                )

                await reaccionar('❌')

                return await responder(
                    `${SIMBOLO} *Canal no encontrado*\n\n` +
                    `> Verifica que el enlace sea correcto o que todavía esté disponible.`
                )
            }

        } else {
            await reaccionar('❌')

            return await responder(
                `${SIMBOLO} *Enlace no válido*\n\n` +
                `> Ingresa un enlace válido de grupo o canal de WhatsApp.`
            )
        }

        if (!id) {
            await reaccionar('❌')

            return await responder(
                `${SIMBOLO} *No se pudo obtener el ID*\n\n` +
                `> WhatsApp no devolvió información válida para este enlace.`
            )
        }

        const nombre =
            metadata?.subject ||
            metadata?.name ||
            metadata?.newsletterName ||
            'Desconocido'

        let caption =
            `${SIMBOLO} *${tipo} encontrado*\n\n`

        caption +=
            `${SIMBOLO_ALT} *Información*\n`

        caption +=
            `> Nombre: ${nombre}\n`

        caption +=
            `> Tipo: ${tipo}\n`

        caption +=
            `> ID: ${id}`

        await conn.sendMessage(
            from,
            {
                text: caption,

                interactiveButtons: [
                    {
                        name: 'cta_copy',

                        buttonParamsJson:
                            JSON.stringify({
                                display_text:
                                    'Copiar ID',

                                copy_code:
                                    id
                            })
                    }
                ],

                contextInfo
            },
            {
                quoted: m
            }
        )

        await reaccionar('✔️')

        console.log(
            `${SIMBOLO_OK} ID obtenido: ${id} por ${m.sender}`
        )

    } catch (error) {
        console.error(
            `${SIMBOLO} Error en inspect:`,
            error
        )

        await reaccionar('❌')

        await responder(
            `${SIMBOLO} *Error*\n\n` +
            `> ${error?.message || 'Error desconocido'}`
        )
    }
}

handler.help = [
    'inspect'
]

handler.tags = [
    'tools'
]

handler.command = [
    'inspect',
    'inspeccionar',
    'inspector'
]

handler.description =
    'Obtiene el ID de grupos, comunidades y canales de WhatsApp'

export default handler