import fs from 'fs'
import path from 'path'
import { tmpdir } from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const SIMBOLO = 'ꕥ'
const SIMBOLO_ALT = '〄'

const API_URL = 'https://noth.hidenplay.net/api/herramientas/bratvideo'
const API_KEY = 'nothPniC'

const handler = async (m, { conn, text, args, usedPrefix, command }) => {
  const tmpIn = path.join(tmpdir(), `brat_${Date.now()}.mp4`)
  const tmpOut = path.join(tmpdir(), `brat_${Date.now()}.webp`)

  try {
    const texto = text?.trim() || args.join(' ').trim()

    if (!texto) {
      await m.react('✖️')
      return conn.reply(
        m.chat,
        `${SIMBOLO} *Ingresa un texto para generar el sticker*\n\n` +
        `${SIMBOLO_ALT} *Ejemplo*\n` +
        `> ${usedPrefix + command} Noth API`,
        m
      )
    }

    await m.react('🕒')

    const url = `${API_URL}?text=${encodeURIComponent(texto)}&apikey=${API_KEY}`
    const res = await fetch(url)
    const json = await res.json()

    if (!json?.status || !json?.data?.url) {
      throw new Error('La API no devolvió un video válido')
    }

    const videoUrl = json.data.url

    // Descargar el video
    const videoRes = await fetch(videoUrl)
    if (!videoRes.ok) throw new Error('No se pudo descargar el video')
    const buffer = Buffer.from(await videoRes.arrayBuffer())
    fs.writeFileSync(tmpIn, buffer)

    // Convertir a sticker (webp animado)
    await execAsync(
      `ffmpeg -y -i "${tmpIn}" -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white,fps=15" -c:v libwebp -lossless 0 -q:v 60 -loop 0 -preset default -an -vsync 0 "${tmpOut}"`
    )

    const stickerBuffer = fs.readFileSync(tmpOut)

    await conn.sendMessage(
      m.chat,
      { sticker: stickerBuffer },
      { quoted: m }
    )

    await m.react('✔️')
  } catch (error) {
    await m.react('✖️')
    await conn.reply(
      m.chat,
      `${SIMBOLO} *No se pudo generar el sticker*\n\n> ${error.message}`,
      m
    )
  } finally {
    try { if (fs.existsSync(tmpIn)) fs.unlinkSync(tmpIn) } catch {}
    try { if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut) } catch {}
  }
}

handler.help = ['brat <texto>']
handler.tags = ['sticker']
handler.command = ['brat', 'bratvideo', 'bratsticker']
handler.description = 'Genera un sticker estilo brat con el texto indicado'

export default handler