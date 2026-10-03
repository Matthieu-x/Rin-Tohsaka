const handler = async (m, { conn, args, command }) => {
  const query = args.join(' ').trim()

  if (!query) {
    return await conn.sendMessage(
      m.chat,
      { text: `${SIMBOLO} Usa: *${command} <búsqueda>*\nEjemplo: *${command} Nayeon Twice*` },
      { quoted: m }
    )
  }

  try {
    const url = `https://api.delirius.online/search/googlesearch?query=${encodeURIComponent(query)}`
    const response = await fetch(url)
    const json = await response.json()

    if (!json.success || !json.data?.length) {
      return await conn.sendMessage(
        m.chat,
        { text: `${SIMBOLO} No se encontraron resultados para *"${query}"*` },
        { quoted: m }
      )
    }

    let texto = `${SIMBOLO} 🔍 *Resultados para:* "${query}"\n\n`
    json.data.slice(0, 5).forEach((result, i) => {
      texto += `${i + 1}. *${result.title}*\n`
      texto += `   ${result.description}\n`
      texto += `   🔗 ${result.url}\n\n`
    })

    await conn.sendMessage(m.chat, { text: texto.trim() }, { quoted: m })

  } catch (error) {
    await conn.sendMessage(
      m.chat,
      { text: `${SIMBOLO} Error al buscar: ${error.message}` },
      { quoted: m }
    )
  }
}

handler.help = ['google', 'search', 'g']
handler.tags = ['tools']
handler.command = ['google', 'search', 'g']

export default handler