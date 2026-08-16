export async function enviarAvisoCanal(texto) {
  try {
    const jid = global.db?.data?.canalGlobal?.jid
    if (!jid) {
      console.log('[ ! ] enviarAvisoCanal: no hay canalGlobal.jid configurado')
      return
    }
    if (!global.conn) {
      console.log('[ ! ] enviarAvisoCanal: global.conn no disponible')
      return
    }

    await global.conn.sendMessage(jid, { text: texto })
  } catch (e) {
    console.log('[ ! ] Error enviando aviso al canal:', e?.message || e)
  }
}
