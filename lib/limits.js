import { verificarExpiracionPremium } from './premium-tokens.js'

const LIMITE_NORMAL = 10
const LIMITE_PREMIUM = 300

const obtenerFechaHoy = () => {
  const ahora = new Date()
  return `${ahora.getFullYear()}-${ahora.getMonth() + 1}-${ahora.getDate()}`
}

const asegurarUsuario = (sender) => {
  if (!global.db.data.users[sender]) {
    global.db.data.users[sender] = {}
  }
  const user = global.db.data.users[sender]
  if (!user.descargas) {
    user.descargas = { fecha: obtenerFechaHoy(), cantidad: 0 }
  }
  if (user.descargas.fecha !== obtenerFechaHoy()) {
    user.descargas.fecha = obtenerFechaHoy()
    user.descargas.cantidad = 0
  }
  return user
}

export const verificarLimiteDescargas = (sender, conn) => {
  verificarExpiracionPremium(sender)
  const user = asegurarUsuario(sender)
  const esPremium = Boolean(user.premium)

  const esBotPrincipal = !(conn && conn.isSubBot)

  if (esBotPrincipal) {
    return {
      permitido: true,
      esPremium,
      ilimitado: true,
      limite: Infinity,
      usadas: user.descargas.cantidad,
      restantes: Infinity
    }
  }

  const limite = esPremium ? LIMITE_PREMIUM : LIMITE_NORMAL
  const usadas = user.descargas.cantidad
  const restantes = limite - usadas

  return {
    permitido: usadas < limite,
    esPremium,
    ilimitado: false,
    limite,
    usadas,
    restantes: Math.max(restantes, 0)
  }
}

export const registrarDescarga = (sender, conn) => {
  const user = asegurarUsuario(sender)

  const esBotPrincipal = !(conn && conn.isSubBot)
  if (esBotPrincipal) {
    return user.descargas.cantidad
  }

  user.descargas.cantidad += 1
  return user.descargas.cantidad
}

export const construirMensajeLimiteAlcanzado = (estado, usedPrefix) => {
  let texto = `ꕥ *Limite diario alcanzado*\n\n`
  texto += `> Tipo de cuenta: ${estado.esPremium ? 'Premium' : 'Normal'}\n`
  texto += `> Descargas usadas: ${estado.usadas} / ${estado.limite}\n\n`
  if (!estado.esPremium) {
    texto += `> Hazte premium para subir tu limite a ${LIMITE_PREMIUM} descargas diarias\n`
  }
  texto += `> El limite se reinicia automaticamente cada dia a medianoche`
  return texto
}
