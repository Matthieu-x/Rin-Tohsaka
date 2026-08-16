import { enviarAvisoCanal } from '../lib/canal.js'

const SIMBOLO = 'ꕥ'

const handler = async (m, { conn, isOwner }) => {
  if (!isOwner) {
    await conn.reply(
      m.chat,
      `${SIMBOLO} *Solo los owners pueden usar este comando*`,
      m
    )
    return
  }

  const canal = global.db?.data?.canalGlobal

  if (!canal || !canal.jid) {
    await conn.reply(
      m.chat,
      `${SIMBOLO} *No hay canal configurado*\n\n> Revisa que "Canal global configurado" haya salido en consola al conectar el bot principal`,
      m
    )
    return
  }

  const exito = await enviarAvisoCanal(
    `${SIMBOLO} *Prueba de aviso*\n\n> Si ves esto, el envio al canal funciona correctamente`
  )

  await conn.reply(
    m.chat,
    exito
      ? `${SIMBOLO} *Enviado*\n\n> Revisa el canal: ${canal.nombre}`
      : `${SIMBOLO} *Fallo el envio*\n\n> Revisa la consola del bot para ver el error exacto`,
    m
  )
}

handler.help = ['testcanal']
handler.tags = ['owner']
handler.command = ['testcanal']
handler.owner = true

export default handler
