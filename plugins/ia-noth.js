const SIMBOLO = 'ꕥ'
const API_KEY = 'NTH-hLqNuLVBIZIgkuB1Z29B-6FIs_8ALzQn'
const API_URL = 'https://ianoth.hidenplay.net/api/v1/chat/completions'

const handler = async (m, { conn, text }) => {
  const pregunta = text?.trim()

  if (!pregunta) {
    await m.react('✖️')
    return conn.reply(
      m.chat,
      `${SIMBOLO} *Escribe algo para preguntarle a Noth Mini*\n\n> Ejemplo: .nothmini Hola, ¿cómo estás?`,
      m
    )
  }

  try {
    await m.react('⏳')

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify({
        model: 'minimax',
        messages: [
          {
            role: 'user',
            content: pregunta
          }
        ]
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data?.error?.message ||
        data?.error ||
        'Error al conectar con Noth API'
      )
    }

    const respuesta =
      data?.choices?.[0]?.message?.content?.trim()

    if (!respuesta) {
      throw new Error('Noth Mini no devolvió ninguna respuesta')
    }

    await conn.reply(
      m.chat,
      `${SIMBOLO} *Noth Mini*\n\n${respuesta}`,
      m
    )

    await m.react('✔️')

  } catch (error) {
    await m.react('✖️')

    await conn.reply(
      m.chat,
      `${SIMBOLO} *No se pudo consultar Noth Mini*\n\n> ${error.message}`,
      m
    )
  }
}

handler.help = ['nothmini <texto>']
handler.tags = ['ai']
handler.command = ['nothmini', 'nmini']
handler.description = 'Habla con Noth Mini mediante Noth API'

export default handler