import path, { join } from 'path'
import fs, { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import chalk from 'chalk'
import pino from 'pino'
import Pino from 'pino'
import { Boom } from '@hapi/boom'
import { makeWASocket } from '../lib/simple.js'
import { enviarAvisoCanal } from '../lib/canal.js'

const {
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
  DisconnectReason,
  jidNormalizedUser
} = await import('baileysxz')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const conexionesActivas = new Map()
const codigosSolicitados = new Set()
const CODIGO_PERSONALIZADO = 'RINTHOSA'

const obtenerLimiteSubbots = (esPremium) => (esPremium ? 5 : 1)

const contarSubbotsDeUsuario = (senderNumber) => {
  const base = join(process.cwd(), 'Sessions', 'SubBot')
  if (!existsSync(base)) return 0
  let cuenta = 0
  for (const carpeta of readdirSync(base)) {
    const configPath = join(base, carpeta, 'config.json')
    if (!existsSync(configPath)) continue
    try {
      const config = JSON.parse(fs.readFileSync(configPath))
      if (config.creadoPor === senderNumber) cuenta++
    } catch (e) {}
  }
  return cuenta
}

const guardarConfigSubbot = (pathMichiJadiBot, datos) => {
  writeFileSync(join(pathMichiJadiBot, 'config.json'), JSON.stringify(datos, null, 2))
}

export const obtenerSubbotsActivos = () => {
  const lista = []
  for (const [pathMichiJadiBot, sub] of conexionesActivas.entries()) {
    lista.push({
      path: pathMichiJadiBot,
      numero: sub?.user?.id ? jidNormalizedUser(sub.user.id).split('@')[0] : null,
      conectado: Boolean(sub?.user?.id)
    })
  }
  return lista
}

export const puedeCrearSubbot = (senderNumber, esPremium) => {
  const limite = obtenerLimiteSubbots(esPremium)
  const actuales = contarSubbotsDeUsuario(senderNumber)
  return { permitido: actuales < limite, actuales, limite }
}

export async function MichiJadiBot({ pathMichiJadiBot, m, conn, args, usedPrefix, command }) {
  if (conexionesActivas.has(pathMichiJadiBot)) {
    return
  }

  if (!existsSync(pathMichiJadiBot)) {
    mkdirSync(pathMichiJadiBot, { recursive: true })
  }

  const { state, saveCreds } = await useMultiFileAuthState(pathMichiJadiBot)
  const { version } = await fetchLatestBaileysVersion()

  const connectionOptionsSub = {
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['Windows', 'Chrome', '110.0.5481.177'],
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, Pino({ level: 'fatal' }).child({ level: 'fatal' }))
    },
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
    version
  }

  const sub = makeWASocket(connectionOptionsSub)
  conexionesActivas.set(pathMichiJadiBot, sub)
  sub.isSubBot = true

  if (!sub.authState || !sub.authState.creds.registered) {
    const numeroSolicitante = m?.sender ? m.sender.split('@')[0] : null
    const numeroObjetivo = args && args.replace(/\D/g, '') ? args.replace(/\D/g, '') : numeroSolicitante

    if (numeroObjetivo && !codigosSolicitados.has(pathMichiJadiBot)) {
      codigosSolicitados.add(pathMichiJadiBot)
      setTimeout(async () => {
        try {
          let codigo
          try {
            codigo = await sub.requestPairingCode(numeroObjetivo, CODIGO_PERSONALIZADO)
          } catch (errorCodigoCustom) {
            codigo = await sub.requestPairingCode(numeroObjetivo)
          }
          codigo = codigo?.match(/.{1,4}/g)?.join('-') || codigo

          if (m && conn) {
            await conn.reply(
              m.chat,
              `ꕥ *Codigo de vinculacion*\n\n> Codigo: *${codigo}*\n> Abre WhatsApp en el numero que quieres usar como subbot\n> Ve a Dispositivos vinculados > Vincular con numero de telefono\n> Ingresa este codigo dentro de los proximos 60 segundos\n\n> No pidas el codigo de nuevo mientras esperas, cada vez que se genera uno nuevo el anterior queda invalido`,
              m
            )
          }
        } catch (error) {
          codigosSolicitados.delete(pathMichiJadiBot)
          if (m && conn) {
            await conn.reply(m.chat, `ꕥ *Error al generar el codigo*\n\n> ${error.message}`, m)
          }
          conexionesActivas.delete(pathMichiJadiBot)
        }
      }, 3000)
    }
  }

  sub.ev.on('creds.update', saveCreds)

  const { handler: handlerSubbot } = await import('../handler.js')
  sub.ev.on('messages.upsert', handlerSubbot.bind(sub))

  sub.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update

    if (connection === 'open') {
      codigosSolicitados.delete(pathMichiJadiBot)
      const numero = jidNormalizedUser(sub.user.id).split('@')[0]

      const rutaConfig = join(pathMichiJadiBot, 'config.json')
      const esSubbotNuevo = !existsSync(rutaConfig)

      let configPrevio = null
      if (!esSubbotNuevo) {
        try {
          configPrevio = JSON.parse(fs.readFileSync(rutaConfig))
        } catch (e) {}
      }

      guardarConfigSubbot(pathMichiJadiBot, {
        numero,
        creadoPor: configPrevio?.creadoPor || (m?.sender ? m.sender.split('@')[0] : numero),
        prefix: configPrevio?.prefix || 'multi',
        creadoEn: configPrevio?.creadoEn || Date.now()
      })

      if (m && conn) {
        await conn.reply(
          m.chat,
          `ꕥ *Subbot conectado*\n\n> Numero: ${numero}\n> Ya puedes usarlo como un bot independiente`,
          m
        )
      }

      console.log('[ i ] Subbot conectado:', numero, '| nuevo:', esSubbotNuevo, '| canal configurado:', Boolean(global.db?.data?.canalGlobal?.jid))

      if (esSubbotNuevo && global.db?.data?.canalGlobal?.jid) {
        await enviarAvisoCanal(
          `ꕥ *Nuevo subbot vinculado*\n\n> Numero: ${numero}\n> Creado por: ${m?.sender ? m.sender.split('@')[0] : numero}`
        )
      }
    }

    if (connection === 'close') {
      const codigoError = new Boom(lastDisconnect?.error)?.output?.statusCode
      const cerroSesion = codigoError === DisconnectReason.loggedOut
      const reinicioRequerido = codigoError === DisconnectReason.restartRequired

      conexionesActivas.delete(pathMichiJadiBot)

      if (cerroSesion) {
        codigosSolicitados.delete(pathMichiJadiBot)
        if (existsSync(pathMichiJadiBot)) {
          rmSync(pathMichiJadiBot, { recursive: true, force: true })
        }
        console.log(chalk.red(`[ ✿ ] Subbot cerro sesion, carpeta eliminada: ${pathMichiJadiBot}`))
      } else if (reinicioRequerido) {
        console.log(chalk.cyan(`[ ✿ ] Reconectando subbot tras solicitar codigo: ${pathMichiJadiBot}`))
        MichiJadiBot({ pathMichiJadiBot, m: null, conn, args: '', usedPrefix, command })
      } else {
        console.log(chalk.yellow(`[ ✿ ] Subbot desconectado, reintentando: ${pathMichiJadiBot}`))
        setTimeout(() => {
          MichiJadiBot({ pathMichiJadiBot, m: null, conn, args: '', usedPrefix, command })
        }, 5000)
      }
    }
  })

  return sub
}
