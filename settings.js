import { watchFile, unwatchFile } from "fs"
import chalk from "chalk"
import { fileURLToPath } from "url"
import fs from "fs"

global.botNumber = ""

global.owner = [
  // ZONA DE JIDS
  ["584223342535", "Duan </>", true],
  ["", "BrayanRK", true],
  ["", "", true],

  // ZONA DE LIDS
  ["77623648624677", "Duan Edward", true],
  ["204148502954022", "BrayanRK", true],
  ["", "", true]
]

global.mods = []
global.suittag = ["50493732693"]
global.prems = []

global.libreria = "Baileys Multi Device"
global.vs = "^1.0.0"
global.nameqr = "Rin-Tohsaka"
global.sessions = "Sessions/Principal"
global.jadi = "Sessions/SubBot"
global.MichiJadibts = true

global.botname = "Rin-Tohsaka"
global.versionBot = "1.1.1"
global.textbot = "ʀɪɴ-ᴛᴏʜsᴀᴋᴀ ᴠ1"
global.dev = "✎ ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴅᴜᴀɴ & ʙʀᴀʏᴀɴʀᴋ"
global.author = "© ᴍᴀᴅᴇ ᴡɪᴛʜ ᴅᴜᴀɴ & ʙʀᴀʏᴀɴʀᴋ"
global.etiqueta = "ᴅᴜᴀɴ & ʙʀᴀʏᴀɴʀᴋ | 𝟤𝟢𝟤𝟨 ©"
global.currency = "¥ Yenes"

global.michipg = "http://duancdn.onrender.com/cdn/b53607df96ee0ef171064a11.jpg"
global.icono = "http://duancdn.onrender.com/cdn/b53607df96ee0ef171064a11.jpg"
global.catalogo = fs.readFileSync("./lib/catalogo.jpg")

global.group = "https://chat.whatsapp.com/D80dadzwRq4LQqFGUntZfK?mode=ems_copy_t"
global.community = ""
global.channel = "https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O"
global.github = "https://github.com"
global.gmail = "minexdt@gmail.com"

global.ch = {
  ch1: "120363418111976564@newsletter"
}

global.APIs = {
  vreden: {
    url: "https://api.vreden.web.id",
    key: null
  },

  delirius: {
    url: "https://api.delirius.store",
    key: null
  },

  zenzxz: {
    url: "https://api.zenzxz.my.id",
    key: null
  },

  siputzx: {
    url: "https://api.siputzx.my.id",
    key: null
  },

  adonix: {
    url: "https://api-adonix.ultraplus.click",
    key: null
  },

  edward: {
    url: "https://dv-edward.onrender.com",
    key: "edward"
  }
}

let file = fileURLToPath(import.meta.url)

watchFile(file, () => {
  unwatchFile(file)
  console.log(chalk.redBright("Update 'settings.js'"))
  import(`${file}?update=${Date.now()}`)
})