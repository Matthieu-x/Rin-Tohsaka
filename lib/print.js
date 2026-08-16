import { WAMessageStubType } from 'baileys'
import chalk from 'chalk'
import { watchFile } from 'fs'

const terminalImage = global.opts?.['img']
  ? require('terminal-image')
  : ''

const urlRegex = (await import('url-regex-safe')).default({
  strict: false
})

export default async function (m, conn = { user: {} }) {

  // Datos seguros del mensaje
  const senderJid = m?.sender || ''
  const chatJid = m?.chat || ''

  let _name = ''

  try {
    if (senderJid && conn?.getName) {
      _name = await conn.getName(senderJid)
    }
  } catch {
    _name = ''
  }

  const senderNumber = senderJid
    ? senderJid.replace('@s.whatsapp.net', '')
    : 'Desconocido'

  const sender =
    '+' + senderNumber +
    (_name ? ' ~ ' + _name : '')

  let chat = ''

  try {
    if (chatJid && conn?.getName) {
      chat = await conn.getName(chatJid)
    }
  } catch {
    chat = ''
  }

  let img

  try {
    if (
      global.opts?.['img'] &&
      m?.mtype &&
      /sticker|image/gi.test(m.mtype) &&
      typeof m.download === 'function'
    ) {
      img = await terminalImage.buffer(
        await m.download()
      )
    }
  } catch (e) {
    console.error(e)
  }

  let filesize = 0

  try {
    filesize =
      m?.msg
        ? (
            m.msg.vcard
              ? m.msg.vcard.length
              : m.msg.fileLength
                ? m.msg.fileLength.low || m.msg.fileLength
                : m.msg.axolotlSenderKeyDistributionMessage
                  ? m.msg.axolotlSenderKeyDistributionMessage.length
                  : m.text
                    ? m.text.length
                    : 0
          )
        : m?.text
          ? m.text.length
          : 0
  } catch {
    filesize = 0
  }

  filesize = Number(filesize) || 0

  const user =
    global.db?.data?.users?.[senderJid]

  const chatName = chat
    ? (m?.isGroup
        ? 'Grupo ~ ' + chat
        : 'Privado ~ ' + chat)
    : ''

  const botJid = conn?.user?.jid || ''

  const me =
    '+' +
    botJid.replace('@s.whatsapp.net', '')

  const userName =
    conn?.user?.name ||
    conn?.user?.verifiedName ||
    'Desconocido'

  // No mostrar mensajes enviados por el propio bot
  if (
    senderJid &&
    botJid &&
    senderJid === botJid
  ) return

  // Tipo de mensaje seguro
  let messageType = 'Desconocido'

  try {
    if (m?.mtype) {
      messageType = m.mtype
        .replace(
          /message$/i,
          ''
        )
        .replace(
          'audio',
          m?.msg?.ptt
            ? 'PTT'
            : 'audio'
        )
        .replace(
          /^./,
          v => v.toUpperCase()
        )
    }
  } catch {
    messageType = 'Desconocido'
  }

  // Tipo de evento
  let eventType = 'Ninguno'

  try {
    eventType =
      m?.messageStubType
        ? (
            WAMessageStubType[
              m.messageStubType
            ] || 'Desconocido'
          )
        : 'Ninguno'
  } catch {
    eventType = 'Desconocido'
  }

  // Tamaño legible
  let sizeUnit = 'B'
  let sizeValue = filesize

  if (filesize > 0) {
    const index = Math.min(
      Math.floor(
        Math.log(filesize) /
        Math.log(1000)
      ),
      4
    )

    sizeUnit =
      ['B', 'KB', 'MB', 'GB', 'TB'][index]

    sizeValue =
      (
        filesize /
        1000 ** index
      ).toFixed(1)
  }

  // Fecha
  let fecha

  try {
    fecha = new Date(
      m?.messageTimestamp
        ? 1000 * (
            m.messageTimestamp.low ||
            m.messageTimestamp
          )
        : Date.now()
    ).toLocaleDateString(
      'es-ES',
      {
        timeZone:
          'America/Mexico_City',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }
    )
  } catch {
    fecha = new Date().toLocaleDateString(
      'es-ES'
    )
  }

  // Determinar si es bot principal o subbot
  let botType = '(Sub-Bot)'

  try {
    if (
      global.conn?.user?.jid &&
      conn?.user?.jid &&
      global.conn.user.jid === conn.user.jid
    ) {
      botType = '(Principal)'
    }
  } catch {
    botType = '(Sub-Bot)'
  }

  console.log(
`${chalk.hex('#FE0041').bold('╭────────────────────────────────···')}
${chalk.hex('#FE0041').bold('│')}${chalk.redBright('Bot:')} ${chalk.greenBright(me)} ~ ${chalk.magentaBright(userName)} ${chalk.cyanBright(botType)}
${chalk.hex('#FE0041').bold('│')}${chalk.yellowBright('Fecha:')} ${chalk.blueBright(fecha)}
${chalk.hex('#FE0041').bold('│')}${chalk.greenBright('Tipo de evento:')} ${chalk.redBright(eventType)}
${chalk.hex('#FE0041').bold('│')}${chalk.magentaBright('Peso del mensaje:')} ${chalk.yellowBright(filesize + ' B')} [${chalk.cyanBright(sizeValue)} ${chalk.greenBright(sizeUnit)}]
${chalk.hex('#FE0041').bold('│')}${chalk.blueBright('Remitente:')} ${chalk.redBright(sender)}
${chalk.hex('#FE0041').bold('│')}${chalk.cyanBright(`Chat ${m?.isGroup ? 'Grupal' : 'Privado'}:`)} ${chalk.greenBright(chat || 'Desconocido')}
${chalk.hex('#FE0041').bold('│')}${chalk.magentaBright('Tipo de mensaje:')} ${chalk.yellowBright(messageType)}
${chalk.hex('#FE0041').bold('╰───────────────────···')}`
  )

  if (img) {
    console.log(img.trimEnd())
  }

  if (
    typeof m?.text === 'string' &&
    m.text
  ) {
    let log = m.text.replace(
      /\u200e+/g,
      ''
    )

    const mdRegex =
      /(?<=(?:^|[\s\n])\S?)(?:([*_~`])(?!`)(.+?)\1|```((?:.|[\n\r])+?)```|`([^`]+?)`)(?=\S?(?:[\s\n]|$))/g

    const mdFormat =
      (depth = 4) =>
      (_, type, text, monospace) => {

        const types = {
          '_': 'italic',
          '*': 'bold',
          '~': 'strikethrough',
          '`': 'bgGray'
        }

        text =
          text ||
          monospace ||
          ''

        const formatted =
          !types[type] ||
          depth < 1
            ? text
            : chalk[types[type]](
                text
                  .replace(/`/g, '')
                  .replace(
                    mdRegex,
                    mdFormat(
                      depth - 1
                    )
                  )
              )

        return formatted
      }

    log = log.replace(
      mdRegex,
      mdFormat(4)
    )

    log = log
      .split('\n')
      .map(line => {

        if (
          line.trim().startsWith('>')
        ) {
          return chalk.bgGray.dim(
            line.replace(
              /^>/,
              '┃'
            )
          )

        } else if (
          /^([1-9]|[1-9][0-9])\./.test(
            line.trim()
          )
        ) {
          return line.replace(
            /^(\d+)\./,
            (match, number) => {
              const padding =
                number.length === 1
                  ? '  '
                  : ' '

              return (
                padding +
                number +
                '.'
              )
            }
          )

        } else if (
          /^[-*]\s/.test(
            line.trim()
          )
        ) {
          return line.replace(
            /^[*-]/,
            '  •'
          )
        }

        return line

      })
      .join('\n')

    if (log.length < 1024) {
      log = log.replace(
        urlRegex,
        (url, i, text) => {

          const end =
            url.length + i

          return (
            i === 0 ||
            end === text.length ||
            (
              /^\s$/.test(
                text[end]
              ) &&
              /^\s$/.test(
                text[i - 1]
              )
            )
          )
            ? chalk.blueBright(url)
            : url
        }
      )
    }

    log = log.replace(
      mdRegex,
      mdFormat(4)
    )

    const testi =
      await m?.mentionedJid

    if (testi) {
      for (
        const user of testi
      ) {
        try {
          const jid =
            user?.split?.('@')?.[0]

          if (!jid) continue

          const name =
            await conn.getName(user)

          log = log.replace(
            '@' + jid,
            chalk.blueBright(
              '@' +
              (name || jid)
            )
          )
        } catch {}
      }
    }

    console.log(
      m?.error != null
        ? chalk.red(log)
        : m?.isCommand
          ? chalk.yellow(log)
          : log
    )
  }

  if (
    m?.messageStubParameters
  ) {
    console.log(
      m.messageStubParameters
        .map(jid => {

          try {
            jid =
              conn.decodeJid
                ? conn.decodeJid(jid)
                : jid

            const name =
              conn.getName
                ? conn.getName(jid)
                : ''

            const number =
              jid?.replace?.(
                '@s.whatsapp.net',
                ''
              ) || 'Desconocido'

            return chalk.gray(
              '+' +
              number +
              (
                name
                  ? ' ~' + name
                  : ''
              )
            )

          } catch {
            return ''
          }

        })
        .filter(Boolean)
        .join(', ')
    )
  }

  // Información adicional de multimedia
  try {

    if (
      /document/i.test(
        m?.mtype || ''
      )
    ) {
      console.log(
        `🝮 ${
          m?.msg?.fileName ||
          m?.msg?.displayName ||
          'Document'
        }`
      )

    } else if (
      /ContactsArray/i.test(
        m?.mtype || ''
      )
    ) {
      console.log('᯼')

    } else if (
      /contact/i.test(
        m?.mtype || ''
      )
    ) {
      console.log(
        `✎ ${
          m?.msg?.displayName || ''
        }`
      )

    } else if (
      /audio/i.test(
        m?.mtype || ''
      )
    ) {

      const duration =
        Number(
          m?.msg?.seconds
        ) || 0

      console.log(
        `${
          m?.msg?.ptt
            ? '☄ (PTT '
            : '𝄞 ('
        }AUDIO) ` +
        `${Math.floor(duration / 60)
          .toString()
          .padStart(2, '0')}:` +
        `${(duration % 60)
          .toString()
          .padStart(2, '0')}`
      )
    }

  } catch (e) {
    console.error(
      'Error mostrando información multimedia:',
      e
    )
  }

  console.log()
}

let file = global.__filename(
  import.meta.url
)

watchFile(
  file,
  () => {
    console.log(
      chalk.redBright(
        "Update 'lib/print.js'"
      )
    )
  }
)