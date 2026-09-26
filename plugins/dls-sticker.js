// Dentro de handler.before, en la parte donde se procesan los stickers:

import { Sticker, StickerTypes } from 'wa-sticker-formatter'

// ... (código anterior de búsqueda y descarga)

for (const url of data.download) {
    if (enviados >= maxEnviar) break
    try {
        const res = await fetchConTimeout(url, { method: 'GET', headers: { 'User-Agent': 'Rin-Tohsaka/1.0' } }, 30000)
        if (!res.ok) continue
        const buffer = Buffer.from(await res.arrayBuffer())

        // Usar wa-sticker-formatter directamente para asegurar los metadatos
        const stickerBuffer = await new Sticker(buffer, {
            pack: packname,  // Nombre del paquete
            author: author,  // Autor del paquete
            type: StickerTypes.FULL, // Ajusta según necesidad
            categories: ['🎨'] // Categoría opcional
        }).toBuffer()

        await conn.sendMessage(m.chat, { sticker: stickerBuffer }, { quoted: m })
        enviados++
        await esperar(350)
    } catch (e) {
        console.error('[STICKERLY] Error enviando sticker:', e.message)
    }
}