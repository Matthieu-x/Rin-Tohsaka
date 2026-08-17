import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Ajustá esta ruta si tu bot corre desde otro directorio raíz
const RUTA_DB = path.join(__dirname, 'economia-db.json')

export const SALDO_INICIAL = 500

export const COOLDOWNS = {
    daily: 24 * 60,
    trabajar: 3,
    robar: 20,
    pescar: 20,
    minar: 25,
    cazar: 5,
    crimen: 5,
    loteria: 12 * 60
}

// ═══════════════════════════════════════
// DB
// ═══════════════════════════════════════

const leerDB = () => {
    try {
        if (!fs.existsSync(RUTA_DB)) {
            fs.writeFileSync(RUTA_DB, JSON.stringify({}, null, 2))
        }

        const contenido = fs.readFileSync(RUTA_DB, 'utf-8')

        return JSON.parse(contenido || '{}')
    } catch {
        return {}
    }
}

const guardarDB = data => {
    fs.writeFileSync(RUTA_DB, JSON.stringify(data, null, 2))
}

const usuarioBase = () => ({
    saldo: SALDO_INICIAL,
    banco: 0,
    limiteBanco: 10000000,
    ultimoDaily: 0,
    ultimoTrabajo: 0,
    ultimoRobo: 0,
    ultimoPescar: 0,
    ultimoMinar: 0,
    ultimoCazar: 0,
    ultimoCrimen: 0,
    ultimaLoteria: 0
})

export const obtenerUsuario = jid => {
    const db = leerDB()

    if (!db[jid]) {
        db[jid] = usuarioBase()
        guardarDB(db)
    }

    db[jid] = { ...usuarioBase(), ...db[jid] }

    return db[jid]
}

export const guardarUsuario = (jid, datos) => {
    const db = leerDB()

    db[jid] = { ...usuarioBase(), ...db[jid], ...datos }

    guardarDB(db)

    return db[jid]
}

export const modificarSaldo = (jid, delta) => {
    const usuario = obtenerUsuario(jid)
    const nuevoSaldo = Math.max(0, (usuario.saldo || 0) + delta)

    return guardarUsuario(jid, { saldo: nuevoSaldo })
}

export const obtenerTopUsuarios = (cantidad = 10) => {
    const db = leerDB()

    return Object.entries(db)
        .map(([jid, datos]) => ({
            jid,
            saldo: datos.saldo || 0,
            banco: datos.banco || 0,
            total: (datos.saldo || 0) + (datos.banco || 0)
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, cantidad)
}

// ═══════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════

export const formatearDinero = cantidad =>
    `$${Number(cantidad || 0).toLocaleString('es-ES')}`

export const elegirAleatorio = lista =>
    lista[Math.floor(Math.random() * lista.length)]

export const numeroEntreRango = (min, max) =>
    Math.floor(Math.random() * (max - min + 1)) + min

export const enCooldown = (ultimaVez, minutosEspera) => {
    const ahora = Date.now()
    const esperaMs = minutosEspera * 60 * 1000
    const restante = (ultimaVez + esperaMs) - ahora

    return restante > 0 ? restante : 0
}

export const formatearTiempo = ms => {
    const totalSegundos = Math.ceil(ms / 1000)
    const h = Math.floor(totalSegundos / 3600)
    const m = Math.floor((totalSegundos % 3600) / 60)
    const s = totalSegundos % 60

    const partes = []

    if (h) partes.push(`${h}h`)
    if (m) partes.push(`${m}m`)
    if (s || !partes.length) partes.push(`${s}s`)

    return partes.join(' ')
}

export const extraerJidMencionado = m => {
    const contexto = m?.message?.extendedTextMessage?.contextInfo

    if (contexto?.mentionedJid?.length) {
        return contexto.mentionedJid[0]
    }

    if (m.quoted?.sender) {
        return m.quoted.sender
    }

    return null
}

// ═══════════════════════════════════════
// TEXTOS — DAILY
// ═══════════════════════════════════════

const TEXTOS_DAILY = [
    'Encontraste unas monedas olvidadas debajo del sofá',
    'Un desconocido te pagó por hacerle un favor random',
    'Vendiste tus vueltas de cambio en el mercado negro',
    'Ganaste una rifa que ni sabías que habías comprado',
    'Alguien te devolvió una plata que te debía hace tiempo',
    'Hiciste unos trámites y te pagaron el día completo',
    'Reciclaste botellas todo el día y juntaste una buena moneda',
    'Un familiar te mandó plata "para que comas algo"',
    'Ganaste una apuesta menor sin siquiera intentarlo',
    'El banco te acreditó intereses que ni sabías que tenías',
    'Ayudaste a mudar unos muebles y te tiraron una propina',
    'Encontraste un billete perdido en el bolsillo de una campera vieja',
    'Vendiste ropa vieja que ya no usabas',
    'Te devolvieron un préstamo que habías olvidado que existía',
    'Ganaste un sorteo del kiosco de la esquina',
    'Cobraste un reembolso que llevaba meses pendiente',
    'Un vecino te pagó por regar sus plantas el fin de semana',
    'Empeñaste algo que no necesitabas y sacaste una buena plata',
    'Te pagaron por ser testigo de un trámite',
    'Hiciste dedo y el que te llevó te tiró unos billetes por la charla',
    'Devolviste un carrito de supermercado y te dieron la moneda de depósito',
    'Ganaste en un juego de trivia del bar',
    'Te pagaron por prestar tu auto un rato',
    'Vendiste entradas que ya no ibas a usar',
    'Encontraste billetes sueltos lavando un pantalón viejo',
    'Un cliente antiguo te debía y hoy te pagó todo junto',
    'Te tocó un descuento tan grande que fue casi como ganar plata',
    'Alquilaste tu bici por el día',
    'Cobraste por cuidar la casa de un vecino de viaje',
    'Ganaste una apuesta de fútbol con los amigos',
    'Te devolvieron el depósito de un alquiler',
    'Vendiste tus juegos viejos de consola',
    'Hiciste de fotógrafo en un cumpleaños improvisado',
    'Ganaste un concurso de memes en un grupo',
    'Te pagaron por armar un mueble',
    'Un amigo te devolvió lo que le prestaste hace un año',
    'Ganaste un torneo amateur de algún juego',
    'Vendiste un objeto raro que tenías guardado',
    'Cobraste comisión por recomendar un servicio',
    'Encontraste plata en una campera que no usabas hace meses'
]

// ═══════════════════════════════════════
// TRABAJAR
// ═══════════════════════════════════════

const TRABAJOS = [
    { nombre: 'repartidor', texto: 'Repartiste pedidos toda la tarde' },
    { nombre: 'programador', texto: 'Arreglaste un bug crítico en producción' },
    { nombre: 'streamer', texto: 'Hiciste un directo y te donaron unos bits' },
    { nombre: 'mecánico', texto: 'Arreglaste el auto de un cliente' },
    { nombre: 'cocinero', texto: 'Cocinaste en un restaurante toda la noche' },
    { nombre: 'taxista', texto: 'Hiciste varios viajes por la ciudad' },
    { nombre: 'community manager', texto: 'Manejaste las redes de una marca' },
    { nombre: 'pescador', texto: 'Saliste a pescar y vendiste lo que sacaste' },
    { nombre: 'jardinero', texto: 'Podaste el jardín de todo el barrio' },
    { nombre: 'músico', texto: 'Tocaste en un bar y te pagaron con la gorra' },
    { nombre: 'niñero', texto: 'Cuidaste a los pibes de los vecinos' },
    { nombre: 'vendedor', texto: 'Vendiste hasta el último producto del día' },
    { nombre: 'albañil', texto: 'Levantaste una pared entera vos solo' },
    { nombre: 'electricista', texto: 'Solucionaste un cortocircuito peligroso' },
    { nombre: 'profesor particular', texto: 'Diste clases de apoyo toda la tarde' },
    { nombre: 'fotógrafo', texto: 'Cubriste un evento con tu cámara' },
    { nombre: 'barista', texto: 'Preparaste café en la cafetería del centro' },
    { nombre: 'diseñador gráfico', texto: 'Entregaste un logo a un cliente exigente' },
    { nombre: 'guía turístico', texto: 'Mostraste la ciudad a un grupo de turistas' },
    { nombre: 'moderador', texto: 'Moderaste un servidor toda la noche' },
    { nombre: 'plomero', texto: 'Arreglaste una cañería que perdía agua' },
    { nombre: 'peluquero', texto: 'Cortaste pelo todo el sábado' },
    { nombre: 'traductor', texto: 'Tradujiste documentos para una empresa' },
    { nombre: 'entrenador personal', texto: 'Diste clases de entrenamiento en el parque' },
    { nombre: 'panadero', texto: 'Horneaste pan desde temprano' },
    { nombre: 'veterinario', texto: 'Atendiste mascotas todo el día' },
    { nombre: 'ilustrador', texto: 'Terminaste un encargo de arte digital' },
    { nombre: 'delivery en bici', texto: 'Pedaleaste toda la ciudad haciendo entregas' },
    { nombre: 'chofer de aplicación', texto: 'Manejaste pasajeros toda la noche' },
    { nombre: 'youtuber', texto: 'Subiste un video que pegó bien' },
    { nombre: 'pintor', texto: 'Pintaste una casa entera' },
    { nombre: 'costurero', texto: 'Arreglaste ropa para medio barrio' },
    { nombre: 'mudanzas', texto: 'Ayudaste a mudar una casa completa' },
    { nombre: 'catador', texto: 'Probaste productos nuevos para una marca' },
    { nombre: 'ghostwriter', texto: 'Escribiste contenido para otra persona' },
    { nombre: 'freelancer', texto: 'Terminaste un proyecto entregado a tiempo' },
    { nombre: 'seguridad', texto: 'Cubriste un turno de seguridad nocturno' },
    { nombre: 'call center', texto: 'Atendiste llamadas toda la tarde' },
    { nombre: 'artesano', texto: 'Vendiste tus artesanías en la feria' },
    { nombre: 'organizador de eventos', texto: 'Armaste un evento de principio a fin' }
]

const BONUS_TRABAJO = [
    '¡Y encima te dieron una propina extra!',
    'El jefe quedó tan contento que te subió el pago de hoy',
    'Un cliente te dejó una propina generosa',
    'Terminaste antes de tiempo y te pagaron igual completo',
    'Te ofrecieron horas extra y las aceptaste',
    'Te dieron un bono por buen desempeño',
    'Un compañero te cedió parte de su comisión',
    'Cerraste un trato extra sin planearlo',
    null,
    null,
    null,
    null,
    null
]

// ═══════════════════════════════════════
// ROBAR
// ═══════════════════════════════════════

const TEXTOS_ROBO_EXITO = [
    'Te metiste en su bolsillo sin que se diera cuenta',
    'Aprovechaste que estaba distraído y le afanaste la billetera',
    'Un movimiento rápido y ya tenías su plata en tu bolsillo',
    'Le hiciste el cuento del tío y cayó redondo',
    'Se durmió y le vaciaste la billetera',
    'Lo distrajiste con una pregunta y listo',
    'Fingiste ser repartidor y te dejó pasar sin sospechar',
    'Le clonaste la tarjeta sin que lo notara',
    'Aprovechaste el apagón para hacer de las tuyas',
    'Se confió demasiado y vos no perdonás',
    'Hackeaste su billetera virtual en segundos',
    'Le cambiaste el vuelto sin que se diera cuenta',
    'Te disfrazaste de técnico y entraste sin problema',
    'Le vendiste algo falso y te quedaste con el vuelto de más',
    'Aprovechaste la fila del banco para acercarte de más',
    'Le tocaste bocina, se distrajo, y ya estaba hecho',
    'Simulaste una caída para que se acercara y ahí actuaste',
    'Encontraste la clave de su caja fuerte anotada en un papel',
    'Te ganaste su confianza rapidísimo y aprovechaste',
    'La cámara de seguridad justo no estaba grabando'
]

const TEXTOS_ROBO_FALLO = [
    'Te agarró con las manos en la masa y tuviste que pagarle',
    'Se dio cuenta a tiempo y salió corriendo detrás tuyo',
    'La policía te vio y tuviste que sobornarla',
    'Resbalaste justo cuando ibas a afanar y armaste un escándalo',
    'Tenía un perro guardián que no te dejó ni acercarte',
    'Gritó tan fuerte que todo el barrio te vio la cara',
    'Se te cayó todo al piso justo frente a él',
    'Activó la alarma de su casa antes de que pudieras entrar',
    'Te reconoció al toque y ya sabe dónde vivís',
    'Un testigo te sacó fotos y las subió a la cuadra',
    'Te trabaste con la cerradura y perdiste tiempo clave',
    'Terminaste peleando con la mascota de la víctima',
    'Resultó ser cinturón negro y no llegaste ni a tocarle el bolsillo',
    'Se te rompió la bolsa y quedó todo tirado en la calle',
    'Justo pasaba un patrullero en el peor momento',
    'Confundiste la billetera con un paquete de pañuelos',
    'La víctima tenía cámara corporal y quedó todo grabado',
    'Te vio un familiar tuyo y ya sabe lo que hiciste',
    'Te trabaste explicando qué hacías ahí',
    'Resultó que la billetera era de juguete'
]

// ═══════════════════════════════════════
// APOSTAR (cara/cruz)
// ═══════════════════════════════════════

const TEXTOS_APUESTA_GANA = [
    'La moneda cayó justo como querías',
    'Tuviste suerte esta vez',
    'La suerte estuvo de tu lado',
    'Adivinaste al toque',
    'Ganaste limpio, sin vueltas',
    'La moneda giró y te sonrió',
    'Justo lo que necesitabas',
    'No fallaste ni por casualidad',
    'La moneda quedó de canto y al final cayó a tu favor',
    'Ni lo dudaste y acertaste',
    'Se ve que tenés algo de bruja/o',
    'Rebotó dos veces y aun así salió como pediste'
]

const TEXTOS_APUESTA_PIERDE = [
    'La moneda no te acompañó esta vez',
    'Estuviste cerca, pero no',
    'Se fue para el otro lado, mala suerte',
    'No hubo caso, perdiste la apuesta',
    'La próxima capaz sale mejor',
    'La moneda tenía otros planes',
    'Fallaste por poco, pero fallaste',
    'Esta vez no se dio',
    'Justo cambió en el aire y te la jugó',
    'No fue tu día de suerte',
    'La moneda te traicionó',
    'Cayó al revés de lo que pensabas'
]

// ═══════════════════════════════════════
// DADOS
// ═══════════════════════════════════════

const TEXTOS_DADOS_GANA = [
    'Los dados rodaron a tu favor',
    'Justo lo que necesitabas',
    'Tiro perfecto',
    'La mesa fue tuya esta ronda',
    'Los dados te sonrieron',
    'Salió exactamente como pediste',
    'Tirada de manual, no fallaste',
    'Los dados no podían fallarte hoy',
    'Rodaron justo a tu número',
    'La mesa entera te miró con envidia'
]

const TEXTOS_DADOS_PIERDE = [
    'Los dados no te acompañaron',
    'Casi, pero no',
    'La casa gana esta vez',
    'Mala tirada, probá de nuevo',
    'Los dados no estaban de tu lado hoy',
    'Se te escapó por poco',
    'Rodaron para cualquier lado menos el tuyo',
    'La mesa se quedó con tu apuesta',
    'No hubo forma de ganar esta ronda',
    'Los dados tenían otros planes'
]

// ═══════════════════════════════════════
// TRAGAMONEDAS
// ═══════════════════════════════════════

const TEXTOS_SLOTS_TRIPLE = [
    '¡JACKPOT! Los tres símbolos alinearon perfecto',
    '¡Tres iguales! La máquina explotó de monedas',
    '¡Increíble tirada, pegaste el triple!',
    '¡La máquina no lo podía creer, jackpot limpio!',
    '¡Sonaron todas las luces, triple asegurado!',
    '¡La suerte estuvo completamente de tu lado!'
]

const TEXTOS_SLOTS_DOBLE = [
    'Casi el triple, pero dos iguales también pagan',
    'Par de símbolos, algo es algo',
    'No fue el jackpot pero recuperaste con creces',
    'Un par alcanzó para salir ganando',
    'La máquina te dio una manito',
    'No estuvo mal para no ser el jackpot'
]

const TEXTOS_SLOTS_PIERDE = [
    'La máquina se quedó con todo esta vez',
    'Ni cerca, mejor suerte la próxima',
    'Nada que hacer, la casa ganó',
    'Los símbolos no quisieron alinearse hoy',
    'La máquina fue implacable',
    'Ni un par salió a tu favor'
]

// ═══════════════════════════════════════
// PESCAR
// ═══════════════════════════════════════

const CAPTURAS_PESCAR = [
    { nombre: 'una sardina', valor: [50, 150] },
    { nombre: 'un pez payaso', valor: [80, 200] },
    { nombre: 'una trucha', valor: [150, 350] },
    { nombre: 'un salmón', valor: [250, 500] },
    { nombre: 'un atún', valor: [400, 800] },
    { nombre: 'un pulpo', valor: [300, 600] },
    { nombre: 'una langosta', valor: [500, 900] },
    { nombre: 'un pez espada', valor: [600, 1100] },
    { nombre: 'un tiburón pequeño', valor: [800, 1500] },
    { nombre: 'un cofre hundido con monedas', valor: [1000, 2000] }
]

const TEXTOS_PESCAR_FALLO = [
    'Se te escapó justo cuando ibas a sacarlo',
    'Se rompió la caña en el peor momento',
    'Pescaste solo una bota vieja',
    'Esperaste horas y no picó nada',
    'Se te enredó el hilo y perdiste el anzuelo',
    'Un pájaro te robó la carnada'
]

// ═══════════════════════════════════════
// MINAR
// ═══════════════════════════════════════

const MINERALES = [
    { nombre: 'carbón', valor: [40, 120] },
    { nombre: 'hierro', valor: [100, 250] },
    { nombre: 'cobre', valor: [150, 300] },
    { nombre: 'plata', valor: [300, 600] },
    { nombre: 'oro', valor: [500, 900] },
    { nombre: 'esmeralda', valor: [700, 1200] },
    { nombre: 'rubí', valor: [800, 1400] },
    { nombre: 'diamante', valor: [1000, 2000] }
]

const TEXTOS_MINAR_FALLO = [
    'Se derrumbó parte del túnel y tuviste que salir corriendo',
    'Se te rompió el pico a mitad de la excavación',
    'Cavaste horas y no encontraste nada de valor',
    'Te topaste con agua subterránea y tuviste que abandonar',
    'Se apagó tu linterna y no pudiste seguir',
    'Encontraste solo piedras sin valor'
]

// ═══════════════════════════════════════
// CAZAR
// ═══════════════════════════════════════

const PRESAS_CAZAR = [
    { nombre: 'un conejo', valor: [60, 150] },
    { nombre: 'un pato', valor: [100, 220] },
    { nombre: 'un jabalí', valor: [250, 500] },
    { nombre: 'un ciervo', valor: [400, 750] },
    { nombre: 'un zorro', valor: [300, 600] },
    { nombre: 'un faisán', valor: [150, 320] },
    { nombre: 'un oso pequeño', valor: [700, 1300] }
]

const TEXTOS_CAZAR_FALLO = [
    'Se te escapó antes de poder acercarte',
    'Pisaste una rama y espantaste a todo el bosque',
    'Te perdiste siguiendo un rastro falso',
    'Se largó a llover y tuviste que volver con las manos vacías',
    'Un cazador furtivo se te adelantó',
    'Te quedaste sin municiones justo a tiempo'
]

// ═══════════════════════════════════════
// CRIMEN (alto riesgo, alta recompensa)
// ═══════════════════════════════════════

const TEXTOS_CRIMEN_EXITO = [
    'Asaltaste un camión de caudales a plena luz del día',
    'Hackeaste el sistema de un banco local',
    'Vaciaste una caja fuerte sin dejar rastro',
    'Estafaste a una empresa entera con un esquema piramidal',
    'Organizaste un golpe perfecto con tu banda',
    'Falsificaste documentos y cobraste una fortuna',
    'Le robaste a un narco y nadie se dio cuenta',
    'Desviaste fondos de una cuenta corporativa'
]

const TEXTOS_CRIMEN_FALLO = [
    'Te agarró la policía en el acto y pagaste una fianza altísima',
    'Tu cómplice te delató y terminaste pagando todo vos',
    'Saltó la alarma silenciosa y tuviste que huir sin nada',
    'El plan se filtró y te estaban esperando',
    'Terminaste pagando abogados carísimos',
    'La cámara oculta te grabó de frente'
]

// ═══════════════════════════════════════
// LOTERÍA
// ═══════════════════════════════════════

const TEXTOS_LOTERIA_GANA = [
    '¡Tu número salió sorteado!',
    '¡Pegaste el número ganador!',
    '¡Increíble, ganaste la lotería de hoy!'
]

const TEXTOS_LOTERIA_PIERDE = [
    'Tu número no fue el elegido',
    'Casi, pero no tocó esta vez',
    'El pozo se lo llevó otra persona',
    'No hubo suerte hoy con la lotería'
]

// ═══════════════════════════════════════
// FUNCIONES DE JUEGO — devuelven el resultado, vos armás el mensaje final
// ═══════════════════════════════════════

const ejecutarRecoleccion = (jid, campoUltimo, minutos, lista, textosF, probFallo = 0.25) => {
    const usuario = obtenerUsuario(jid)
    const restante = enCooldown(usuario[campoUltimo], minutos)

    if (restante > 0) {
        return { ok: false, restante }
    }

    guardarUsuario(jid, { [campoUltimo]: Date.now() })

    if (Math.random() < probFallo) {
        return {
            ok: true,
            exito: false,
            texto: elegirAleatorio(textosF)
        }
    }

    const item = elegirAleatorio(lista)
    const monto = numeroEntreRango(item.valor[0], item.valor[1])

    modificarSaldo(jid, monto)

    return {
        ok: true,
        exito: true,
        item: item.nombre,
        monto
    }
}

export const ejecutarDaily = jid => {
    const usuario = obtenerUsuario(jid)
    const restante = enCooldown(usuario.ultimoDaily, COOLDOWNS.daily)

    if (restante > 0) {
        return { ok: false, restante }
    }

    const monto = numeroEntreRango(300, 1200)

    modificarSaldo(jid, monto)
    guardarUsuario(jid, { ultimoDaily: Date.now() })

    return {
        ok: true,
        monto,
        texto: elegirAleatorio(TEXTOS_DAILY)
    }
}

export const ejecutarTrabajo = jid => {
    const usuario = obtenerUsuario(jid)
    const restante = enCooldown(usuario.ultimoTrabajo, COOLDOWNS.trabajar)

    if (restante > 0) {
        return { ok: false, restante }
    }

    const trabajo = elegirAleatorio(TRABAJOS)
    const monto = numeroEntreRango(150, 600)
    const bonusTexto = elegirAleatorio(BONUS_TRABAJO)
    const montoBonus = bonusTexto ? numeroEntreRango(50, 200) : 0

    modificarSaldo(jid, monto + montoBonus)
    guardarUsuario(jid, { ultimoTrabajo: Date.now() })

    return {
        ok: true,
        trabajo: trabajo.nombre,
        texto: trabajo.texto,
        monto,
        bonusTexto,
        montoBonus
    }
}

export const ejecutarRobo = (jid, jidVictima, opciones = {}) => {
    const {
        probabilidadExito = 0.45,
        montoMinimoVictima = 200,
        porcentajeMin = 0.10,
        porcentajeMax = 0.35,
        multaMin = 100,
        multaMax = 400
    } = opciones

    const usuario = obtenerUsuario(jid)
    const restante = enCooldown(usuario.ultimoRobo, COOLDOWNS.robar)

    if (restante > 0) {
        return { ok: false, motivo: 'cooldown', restante }
    }

    const victima = obtenerUsuario(jidVictima)

    if ((victima.saldo || 0) < montoMinimoVictima) {
        return { ok: false, motivo: 'sin_fondos' }
    }

    guardarUsuario(jid, { ultimoRobo: Date.now() })

    const exito = Math.random() < probabilidadExito

    if (exito) {
        const porcentaje = porcentajeMin + Math.random() * (porcentajeMax - porcentajeMin)
        const monto = Math.floor((victima.saldo || 0) * porcentaje)

        modificarSaldo(jidVictima, -monto)
        modificarSaldo(jid, monto)

        return {
            ok: true,
            exito: true,
            monto,
            texto: elegirAleatorio(TEXTOS_ROBO_EXITO)
        }
    }

    const multa = numeroEntreRango(multaMin, multaMax)

    modificarSaldo(jid, -multa)

    return {
        ok: true,
        exito: false,
        multa,
        texto: elegirAleatorio(TEXTOS_ROBO_FALLO)
    }
}

export const ejecutarApuesta = (jid, eleccion, monto) => {
    const resultado = elegirAleatorio(['cara', 'cruz'])
    const gano = resultado === eleccion

    modificarSaldo(jid, gano ? monto : -monto)

    return {
        resultado,
        gano,
        monto,
        texto: elegirAleatorio(gano ? TEXTOS_APUESTA_GANA : TEXTOS_APUESTA_PIERDE)
    }
}

export const ejecutarDados = (jid, eleccion, monto, multiplicadorSiete = 3) => {
    const dado1 = numeroEntreRango(1, 6)
    const dado2 = numeroEntreRango(1, 6)
    const suma = dado1 + dado2

    let gano = false
    let ganancia = 0

    if (eleccion === 'siete' && suma === 7) {
        gano = true
        ganancia = monto * multiplicadorSiete
    } else if (eleccion === 'mayor' && suma > 7) {
        gano = true
        ganancia = monto
    } else if (eleccion === 'menor' && suma < 7) {
        gano = true
        ganancia = monto
    }

    modificarSaldo(jid, gano ? ganancia : -monto)

    return {
        dado1,
        dado2,
        suma,
        gano,
        ganancia,
        monto,
        texto: elegirAleatorio(gano ? TEXTOS_DADOS_GANA : TEXTOS_DADOS_PIERDE)
    }
}

const SIMBOLOS_SLOTS = ['🍒', '🍋', '🍇', '🔔', '⭐', '💎']

const MULTIPLICADOR_TRIPLE_SLOTS = {
    '🍒': 3, '🍋': 4, '🍇': 5, '🔔': 7, '⭐': 10, '💎': 20
}

export const ejecutarSlots = (jid, monto) => {
    const tirada = [
        elegirAleatorio(SIMBOLOS_SLOTS),
        elegirAleatorio(SIMBOLOS_SLOTS),
        elegirAleatorio(SIMBOLOS_SLOTS)
    ]

    const esTriple = tirada[0] === tirada[1] && tirada[1] === tirada[2]
    const esDoble =
        !esTriple &&
        (tirada[0] === tirada[1] || tirada[1] === tirada[2] || tirada[0] === tirada[2])

    let ganancia = 0
    let texto

    if (esTriple) {
        const multiplicador = MULTIPLICADOR_TRIPLE_SLOTS[tirada[0]] || 3
        ganancia = Math.floor(monto * multiplicador)
        texto = elegirAleatorio(TEXTOS_SLOTS_TRIPLE)
        modificarSaldo(jid, ganancia)
    } else if (esDoble) {
        ganancia = Math.floor(monto * 1.5)
        texto = elegirAleatorio(TEXTOS_SLOTS_DOBLE)
        modificarSaldo(jid, ganancia)
    } else {
        texto = elegirAleatorio(TEXTOS_SLOTS_PIERDE)
        modificarSaldo(jid, -monto)
    }

    return { tirada, esTriple, esDoble, ganancia, monto, texto }
}

export const ejecutarPescar = jid =>
    ejecutarRecoleccion(jid, 'ultimoPescar', COOLDOWNS.pescar, CAPTURAS_PESCAR, TEXTOS_PESCAR_FALLO, 0.25)

export const ejecutarMinar = jid =>
    ejecutarRecoleccion(jid, 'ultimoMinar', COOLDOWNS.minar, MINERALES, TEXTOS_MINAR_FALLO, 0.30)

export const ejecutarCazar = jid =>
    ejecutarRecoleccion(jid, 'ultimoCazar', COOLDOWNS.cazar, PRESAS_CAZAR, TEXTOS_CAZAR_FALLO, 0.35)

export const ejecutarCrimen = (jid, opciones = {}) => {
    const {
        probabilidadExito = 0.35,
        gananciaMin = 800,
        gananciaMax = 3000,
        multaMin = 500,
        multaMax = 2000
    } = opciones

    const usuario = obtenerUsuario(jid)
    const restante = enCooldown(usuario.ultimoCrimen, COOLDOWNS.crimen)

    if (restante > 0) {
        return { ok: false, restante }
    }

    guardarUsuario(jid, { ultimoCrimen: Date.now() })

    const exito = Math.random() < probabilidadExito

    if (exito) {
        const monto = numeroEntreRango(gananciaMin, gananciaMax)

        modificarSaldo(jid, monto)

        return {
            ok: true,
            exito: true,
            monto,
            texto: elegirAleatorio(TEXTOS_CRIMEN_EXITO)
        }
    }

    const multa = numeroEntreRango(multaMin, multaMax)

    modificarSaldo(jid, -multa)

    return {
        ok: true,
        exito: false,
        multa,
        texto: elegirAleatorio(TEXTOS_CRIMEN_FALLO)
    }
}

export const ejecutarLoteria = (jid, monto, probabilidadGana = 0.15, multiplicador = 8) => {
    const usuario = obtenerUsuario(jid)
    const restante = enCooldown(usuario.ultimaLoteria, COOLDOWNS.loteria)

    if (restante > 0) {
        return { ok: false, restante }
    }

    guardarUsuario(jid, { ultimaLoteria: Date.now() })

    const gana = Math.random() < probabilidadGana

    if (gana) {
        const premio = Math.floor(monto * multiplicador)

        modificarSaldo(jid, premio)

        return {
            ok: true,
            gano: true,
            premio,
            texto: elegirAleatorio(TEXTOS_LOTERIA_GANA)
        }
    }

    modificarSaldo(jid, -monto)

    return {
        ok: true,
        gano: false,
        monto,
        texto: elegirAleatorio(TEXTOS_LOTERIA_PIERDE)
    }
}
