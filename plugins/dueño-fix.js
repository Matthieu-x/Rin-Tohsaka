import { execSync } from 'child_process'

let handler = async (m, { conn, text }) => {
  await m.react('🕒')

  try {
    let stdout = execSync('git pull' + (m.fromMe && text ? ' ' + text : ''))
    let messager = stdout.toString()

    if (messager.includes('Already up to date.')) {
      messager = '❀ Los datos ya están actualizados a la última versión.'
    }

    if (messager.includes('Updating')) {
      messager = '❀ Procesando, espere un momento mientras me actualizo.\n\n' + stdout.toString()
    }

    await m.react('✔️')
    await conn.reply(m.chat, messager, m)

  } catch (error) {
    try {
      let status = execSync('git status --porcelain').toString()

      if (status.trim()) {
        let conflictedFiles = status
          .split('\n')
          .filter(line => line.trim())
          .map(line => {
            if (
              line.includes('.npm/') ||
              line.includes('.cache/') ||
              line.includes('tmp/') ||
              line.includes('database.json') ||
              line.includes('sessions/Principal/') ||
              line.includes('npm-debug.log')
            ) return null

            return '*→ ' + line.slice(3) + '*'
          })
          .filter(Boolean)

        if (conflictedFiles.length) {
          await conn.reply(
            m.chat,
            `\`⚠︎ No se pudo realizar la actualización:\`\n\n> *Se han encontrado cambios locales en los archivos del bot que entran en conflicto con las nuevas actualizaciones del repositorio.*\n\n${conflictedFiles.join('\n')}`,
            m
          )

          await m.react('✖️')
          return
        }
      }

      await conn.reply(
        m.chat,
        `⚠︎ Error al actualizar:\n${error.message}`,
        m
      )

      await m.react('✖️')

    } catch (e) {
      console.error(e)

      await conn.reply(
        m.chat,
        `⚠︎ Ocurrió un error inesperado.\n${e.message}`,
        m
      )

      await m.react('✖️')
    }
  }
}

handler.help = ['update']
handler.tags = ['owner']
handler.command = ['update', 'fix', 'actualizar']
handler.rowner = true

export default handler