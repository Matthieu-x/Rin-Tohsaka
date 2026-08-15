import { performance } from 'perf_hooks'

const SIMBOLO = 'ꕥ'

const calcularLatenciaMensaje = (m) => {
  if (!m.messageTimestamp) return null
  const timestampMensaje = Number(m.messageTimestamp) * 1000
  const ahora = Date.now()
  const diferencia = ahora - timestampMensaje
  return diferencia >= 0 ? diferencia : null
}

const clasificarVelocidad = (ms) => {
  if (ms < 150) return 'Excelente'
  if (ms < 400) return 'Buena'
  if (ms < 900) return 'Regular'
  return 'Lenta'
}

const medirRendimiento = async () => {
  const inicioCiclo = performance.now()
  await new Promise((resolve) => setImmediate(resolve))
  const finCiclo = performance.now()
  return (finCiclo - inicioCiclo).toFixed(2)
}

const handler = async (m, { conn }) => {
  const inicioProceso = performance.now()

  const latenciaMensaje = calcularLatenciaMensaje(m)
  const ciclosEventLoop = await medirRendimiento()

  const finProceso = performance.now()
  const tiempoRespuesta = (finProceso - inicioProceso).toFixed(2)

  const clasificacion = latenciaMensaje !== null
    ? clasificarVelocidad(latenciaMensaje)
    : 'Sin datos'

  let texto = `${SIMBOLO} *Pong*\n\n`
  texto += `> Velocidad: ${tiempoRespuesta} ms\n`
  if (latenciaMensaje !== null) {
    texto += `> Latencia: ${latenciaMensaje} ms (${clasificacion})\n`
  }
  texto += `> Bucle interno: ${ciclosEventLoop} ms`

  await conn.sendMessage(
    m.chat,
    { text: texto },
    { quoted: m }
  )
}

handler.help = ['ping']
handler.tags = ['main']
handler.command = ['ping', 'p', 'pong']

export default handler
