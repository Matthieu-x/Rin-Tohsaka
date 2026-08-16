const generarCodigoToken = () => {
  const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let codigo = ''
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) codigo += '-'
    codigo += caracteres[Math.floor(Math.random() * caracteres.length)]
  }
  return codigo
}

const asegurarTokensDB = () => {
  if (!global.db.data.tokens) {
    global.db.data.tokens = {}
  }
  return global.db.data.tokens
}

export const crearToken = (creadoPor, diasDuracion) => {
  const tokens = asegurarTokensDB()
  let codigo
  do {
    codigo = generarCodigoToken()
  } while (tokens[codigo])

  tokens[codigo] = {
    creadoPor,
    creadoEn: Date.now(),
    diasDuracion: diasDuracion || 30,
    usado: false,
    usadoPor: null,
    usadoEn: null
  }

  return codigo
}

export const redimirToken = (codigo, sender) => {
  const tokens = asegurarTokensDB()
  const codigoNormalizado = codigo.trim().toUpperCase()
  const token = tokens[codigoNormalizado]

  if (!token) {
    return { exito: false, motivo: 'no_existe' }
  }
  if (token.usado) {
    return { exito: false, motivo: 'ya_usado' }
  }

  token.usado = true
  token.usadoPor = sender
  token.usadoEn = Date.now()

  const user = global.db.data.users[sender] || (global.db.data.users[sender] = {})
  const ahora = Date.now()
  const diasEnMs = token.diasDuracion * 24 * 60 * 60 * 1000
  const expiraEnActual = user.premiumExpira && user.premiumExpira > ahora ? user.premiumExpira : ahora

  user.premium = true
  user.premiumExpira = expiraEnActual + diasEnMs

  return {
    exito: true,
    diasDuracion: token.diasDuracion,
    premiumExpira: user.premiumExpira
  }
}

export const verificarExpiracionPremium = (sender) => {
  const user = global.db.data.users[sender]
  if (!user || !user.premium) return
  if (!user.premiumExpira) return
  if (Date.now() > user.premiumExpira) {
    user.premium = false
    user.premiumExpira = null
  }
}

export const listarTokensPendientes = () => {
  const tokens = asegurarTokensDB()
  return Object.entries(tokens)
    .filter(([, t]) => !t.usado)
    .map(([codigo, t]) => ({ codigo, ...t }))
}
