import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

const RUTA_FOTO_DEFAULT = join(process.cwd(), 'media', 'rin.jpeg')

export const enviarAvisoCanal = async (texto) => {
  try {
    const conn = global.conn
    if (!conn) return false

    const canal = global.db?.data?.canalGlobal
    if (!canal || !canal.jid) return false

    let foto = null
    if (existsSync(RUTA_FOTO_DEFAULT)) {
      try {
        foto = readFileSync(RUTA_FOTO_DEFAULT)
      } catch (e) {}
    }

    if (foto) {
      await conn.sendMessage(canal.jid, { image: foto, caption: texto })
    } else {
      await conn.sendMessage(canal.jid, { text: texto })
    }

    return true
  } catch (e) {
    console.error('Error enviando aviso al canal:', e)
    return false
  }
}
