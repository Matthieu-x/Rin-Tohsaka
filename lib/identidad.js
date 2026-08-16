import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

const CARPETA_IDENTIDAD = join(process.cwd(), 'media', 'identidad')

const asegurarCarpeta = () => {
  if (!existsSync(CARPETA_IDENTIDAD)) {
    mkdirSync(CARPETA_IDENTIDAD, { recursive: true })
  }
}

const claveJid = (jid) =>
  (jid || 'desconocido').replace(/[^0-9a-zA-Z.]/g, '_')

export const obtenerSettingsConn = (conn) => {
  const jid = conn && conn.user && conn.user.jid

  if (!jid || !global.db || !global.db.data || !global.db.data.settings) {
    return {}
  }

  if (!global.db.data.settings[jid]) {
    global.db.data.settings[jid] = {
      self: false,
      restrict: true,
      jadibotmd: true,
      antiPrivate: false,
      gponly: false
    }
  }

  return global.db.data.settings[jid]
}

export const guardarNombreIdentidad = (conn, nombre) => {
  const settings = obtenerSettingsConn(conn)
  settings.nombrePersonalizado = nombre
}

export const obtenerNombreIdentidad = (conn) => {
  const settings = obtenerSettingsConn(conn)
  return settings.nombrePersonalizado || null
}

export const guardarFotoIdentidad = (conn, buffer) => {
  const jid = conn && conn.user && conn.user.jid
  if (!jid) return

  asegurarCarpeta()

  const ruta = join(CARPETA_IDENTIDAD, `${claveJid(jid)}.jpg`)
  writeFileSync(ruta, buffer)

  const settings = obtenerSettingsConn(conn)
  settings.fotoPersonalizada = true
}

export const obtenerRutaFotoIdentidad = (conn) => {
  const settings = obtenerSettingsConn(conn)
  if (!settings.fotoPersonalizada) return null

  const jid = conn && conn.user && conn.user.jid
  if (!jid) return null

  const ruta = join(CARPETA_IDENTIDAD, `${claveJid(jid)}.jpg`)
  return existsSync(ruta) ? ruta : null
}
