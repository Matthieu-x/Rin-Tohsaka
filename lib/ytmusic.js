const BASE = 'https://music.youtube.com';
const API = BASE + '/youtubei/v1';
const API_KEY = 'AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30';
const CLIENT_VERSION = '1.20260804.16.00';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36';

const FILTERS = {
  songs: 'EgWKAQIIAWoMEA4QChADEAQQCRAF',
  videos: 'EgWKAQIQAWoMEA4QChADEAQQCRAF',
  albums: 'EgWKAQIYAWoMEA4QChADEAQQCRAF',
  artists: 'EgWKAQIgAWoMEA4QChADEAQQCRAF',
  playlists: 'Eg-KAQwIABAAGAAgACgBMABqChAEEAMQCRAFEAo%3D'
};

const TYPE_BY_LABEL = {
  Song: 'song',
  Video: 'video',
  Album: 'album',
  EP: 'album',
  Single: 'album',
  Artist: 'artist',
  Playlist: 'playlist',
  Profile: 'profile',
  Podcast: 'podcast',
  Episode: 'episode'
};

async function post(endpoint, body) {
  const payload = {
    context: {
      client: {
        clientName: 'WEB_REMIX',
        clientVersion: CLIENT_VERSION,
        hl: 'en',
        gl: 'US',
        userAgent: USER_AGENT
      }
    },
    ...body
  };
  const res = await fetch(`${API}/${endpoint}?key=${API_KEY}&prettyPrint=false`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': USER_AGENT,
      'X-Youtube-Client-Name': '67',
      'X-Youtube-Client-Version': CLIENT_VERSION,
      Origin: BASE,
      Referer: BASE + '/'
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

function runsToText(runs) {
  return (runs || []).map((r) => r.text || '').join('');
}

function getThumbnails(renderer) {
  const thumbs =
    renderer?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
    renderer?.thumbnail?.thumbnails ||
    renderer?.thumbnails ||
    [];
  return thumbs.map((t) => t.url);
}

function getVideoId(item) {
  const flex0 = item?.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0];
  const watchId = flex0?.navigationEndpoint?.watchEndpoint?.videoId;
  if (watchId) return watchId;
  const items = item?.menu?.menuRenderer?.items || [];
  for (const mi of items) {
    const id = mi.menuServiceItemRenderer?.serviceEndpoint?.queueAddEndpoint?.queueTarget?.videoId;
    if (id) return id;
  }
  return item?.navigationEndpoint?.watchEndpoint?.videoId || null;
}

function getArtists(item) {
  const runs = item?.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
  return runs
    .filter((r) => r.navigationEndpoint?.browseEndpoint?.browseId?.startsWith('UC'))
    .map((r) => ({
      name: r.text,
      id: r.navigationEndpoint.browseEndpoint.browseId
    }));
}

function getPlays(flex) {
  const text = runsToText(flex?.[2]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs);
  return /plays|views/i.test(text) ? text : null;
}

function parseSearchItem(item, shelfType) {
  if (!item) return null;
  const flex = item.flexColumns || [];
  const title = runsToText(flex[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs);
  const subtitle = runsToText(flex[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs);
  const resultType = shelfType || TYPE_BY_LABEL[subtitle.split(' • ')[0]] || null;
  const duration =
    runsToText(item.fixedColumns?.[0]?.musicResponsiveListItemFixedColumnRenderer?.text?.runs) ||
    (resultType === 'song' && /\d+:\d+$/.test(subtitle)
      ? subtitle.split(' • ').pop()
      : null);

  return {
    resultType,
    title,
    subtitle,
    videoId: resultType === 'song' || resultType === 'video' ? getVideoId(item) : null,
    artists: resultType === 'song' ? getArtists(item) : [],
    plays: getPlays(flex),
    duration,
    thumbnails: getThumbnails(item.thumbnail)
  };
}

function parseTopResult(card) {
  const subtitle = runsToText(card?.subtitle?.runs);
  const parts = subtitle.split(' • ');
  const onTap = card?.onTap || card?.title?.runs?.[0]?.navigationEndpoint || {};
  return {
    category: 'Top result',
    resultType: TYPE_BY_LABEL[parts[0]] || null,
    title: runsToText(card?.title?.runs),
    subtitle,
    videoId: onTap?.watchEndpoint?.videoId || null,
    thumbnails: getThumbnails(card?.thumbnail)
  };
}

export async function search(query, filter) {
  const body = { query };
  if (filter && FILTERS[filter]) body.params = FILTERS[filter];
  const json = await post('search', body);
  const sections =
    json.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content
      ?.sectionListRenderer?.contents || [];
  const results = [];

  for (const section of sections) {
    if (section.musicCardShelfRenderer) {
      results.push(parseTopResult(section.musicCardShelfRenderer));
      continue;
    }
    const shelf = section.musicShelfRenderer;
    const items = shelf?.contents || section.itemSectionRenderer?.contents || [];
    for (const item of items) {
      const parsed = parseSearchItem(item.musicResponsiveListItemRenderer);
      if (!parsed) continue;
      results.push(parsed);
    }
  }

  return { query, filter: filter && FILTERS[filter] ? filter : 'all', count: results.length, results };
}

async function findSongVideoId(videoId) {
  const json = await post('next', { videoId, isAudioOnly: true });
  const queue =
    json.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer
      ?.watchNextTabbedResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.musicQueueRenderer
      ?.content?.playlistPanelRenderer;
  const track =
    queue?.contents?.find((c) => c.playlistPanelVideoRenderer?.selected)
      ?.playlistPanelVideoRenderer ||
    queue?.contents?.[0]?.playlistPanelVideoRenderer;
  const title = runsToText(track?.title?.runs).replace(/\s*\([^)]*\)\s*$/g, '');
  const artist = runsToText(track?.shortBylineText?.runs);
  const query = `${title} ${artist}`.trim();
  if (!query) return null;

  const res = await search(query, 'songs');
  const song = res.results.find((r) => r.resultType === 'song' && r.videoId && r.videoId !== videoId);
  return song?.videoId || null;
}

let cachedPlayerJs;
let cachedSignatureTimestamp;

async function getPlayerJs() {
  if (cachedPlayerJs) return cachedPlayerJs;
  const html = await fetch(BASE + '/', { headers: { 'User-Agent': USER_AGENT } }).then((r) => r.text());
  const playerJs = html.match(/\/s\/player\/[^"']*base\.js/)?.[0];
  if (!playerJs) throw new Error('Unable to locate player script');
  cachedPlayerJs = await fetch(BASE + playerJs, { headers: { 'User-Agent': USER_AGENT } }).then((r) => r.text());
  return cachedPlayerJs;
}

async function getSignatureTimestamp() {
  if (cachedSignatureTimestamp) return cachedSignatureTimestamp;
  const js = await getPlayerJs();
  cachedSignatureTimestamp = Number(js.match(/signatureTimestamp:(\d+)/)?.[1] || 0);
  return cachedSignatureTimestamp;
}

let cachedDecipherOps;

function extractDecipherOps(playerJs) {
  if (cachedDecipherOps) return cachedDecipherOps;

  const funcNameMatch =
    playerJs.match(/\b([a-zA-Z0-9$]{2,4})\s*=\s*function\(\s*a\s*\)\s*\{\s*a\s*=\s*a\.split\(\s*""\s*\)/) ||
    playerJs.match(/([a-zA-Z0-9$]{2,4})=function\(a\){a=a\.split\(""\)/);
  if (!funcNameMatch) throw new Error('No se pudo localizar la funcion de descifrado');
  const funcName = funcNameMatch[1];

  const funcBodyMatch = new RegExp(
    funcName.replace(/[$]/g, '\\$') + '=function\\(a\\)\\{(.*?)\\};',
    's'
  ).exec(playerJs);
  if (!funcBodyMatch) throw new Error('No se pudo extraer el cuerpo de la funcion de descifrado');
  const funcBody = funcBodyMatch[1];

  const helperNameMatch = funcBody.match(/;([a-zA-Z0-9$]{2,4})\.[a-zA-Z0-9$]{2,4}\(a,\d+\)/);
  if (!helperNameMatch) throw new Error('No se pudo localizar el objeto auxiliar de descifrado');
  const helperName = helperNameMatch[1];

  const helperBodyMatch = new RegExp(
    'var\\s+' + helperName.replace(/[$]/g, '\\$') + '=\\{(.*?)\\};',
    's'
  ).exec(playerJs);
  if (!helperBodyMatch) throw new Error('No se pudo extraer el objeto auxiliar de descifrado');
  const helperBody = helperBodyMatch[1];

  const metodos = {};
  const regexMetodo = /([a-zA-Z0-9$]{2,4}):function\(([^)]*)\)\{([^}]*)\}/g;
  let coincidenciaMetodo;
  while ((coincidenciaMetodo = regexMetodo.exec(helperBody)) !== null) {
    const [, nombre, , cuerpo] = coincidenciaMetodo;
    if (cuerpo.includes('reverse')) metodos[nombre] = 'reverse';
    else if (cuerpo.includes('splice')) metodos[nombre] = 'splice';
    else if (cuerpo.includes('var c=a[0]') || cuerpo.includes('%a.length')) metodos[nombre] = 'swap';
  }

  const pasos = [];
  const regexLlamada = new RegExp(helperName.replace(/[$]/g, '\\$') + '\\.([a-zA-Z0-9$]{2,4})\\(a,(\\d+)\\)', 'g');
  let coincidenciaLlamada;
  while ((coincidenciaLlamada = regexLlamada.exec(funcBody)) !== null) {
    const [, metodo, argumento] = coincidenciaLlamada;
    const tipo = metodos[metodo];
    if (tipo) pasos.push({ tipo, argumento: Number(argumento) });
  }

  if (pasos.length === 0) throw new Error('No se pudieron determinar los pasos de descifrado');
  cachedDecipherOps = pasos;
  return pasos;
}

function aplicarDecipher(firma, pasos) {
  let arreglo = firma.split('');
  for (const paso of pasos) {
    if (paso.tipo === 'reverse') {
      arreglo.reverse();
    } else if (paso.tipo === 'splice') {
      arreglo.splice(0, paso.argumento);
    } else if (paso.tipo === 'swap') {
      const indice = paso.argumento % arreglo.length;
      const temp = arreglo[0];
      arreglo[0] = arreglo[indice];
      arreglo[indice] = temp;
    }
  }
  return arreglo.join('');
}

let cachedNTransformFuncName;
let cachedNTransformBody;

function extractNTransform(playerJs) {
  if (cachedNTransformBody) return { nombre: cachedNTransformFuncName, cuerpo: cachedNTransformBody };

  const nFuncMatch =
    playerJs.match(/([a-zA-Z0-9$]{2,4})=function\(a\)\{var b=a\.split\(""\)[^}]*?\}return[^}]*?\.join\(""\)\};/s) ||
    playerJs.match(/function\(a\)\{var b=a\.split\(""\)[\s\S]*?\.join\(""\)\}/);
  if (!nFuncMatch) return null;

  cachedNTransformFuncName = 'nTransform';
  cachedNTransformBody = nFuncMatch[0];
  return { nombre: cachedNTransformFuncName, cuerpo: cachedNTransformBody };
}

async function descifrarUrlFormato(formato) {
  const cipherStr = formato.signatureCipher || formato.cipher;
  if (formato.url && !cipherStr) return formato.url;
  if (!cipherStr) return null;

  const qs = new URLSearchParams(cipherStr);
  const urlBase = qs.get('url');
  const s = qs.get('s');
  const sp = qs.get('sp') || 'signature';
  if (!urlBase || !s) return null;

  const playerJs = await getPlayerJs();
  const pasos = extractDecipherOps(playerJs);
  const firmaDescifrada = aplicarDecipher(s, pasos);

  const urlFinal = new URL(urlBase);
  urlFinal.searchParams.set(sp, firmaDescifrada);
  return urlFinal.toString();
}

export async function download(videoId, depth = 0) {
  const signatureTimestamp = await getSignatureTimestamp();
  const json = await post('player', {
    videoId,
    contentCheckOk: true,
    racyCheckOk: true,
    playbackContext: { contentPlaybackContext: { signatureTimestamp } }
  });

  const status = json.playabilityStatus?.status;
  if (status !== 'OK') {
    if (depth === 0) {
      const songVideoId = await findSongVideoId(videoId);
      if (songVideoId) {
        const resolved = await download(songVideoId, 1);
        if (resolved.status === 'OK') return { ...resolved, videoId };
      }
    }
    return {
      videoId,
      status,
      reason:
        json.playabilityStatus?.reason ||
        runsToText(json.playabilityStatus?.errorScreen?.playerErrorMessageRenderer?.reason?.runs) ||
        null
    };
  }

  const formats = [
    ...(json.streamingData?.formats || []),
    ...(json.streamingData?.adaptiveFormats || [])
  ];
  const parseFormat = async (f) => ({
    itag: f.itag,
    mimeType: f.mimeType?.split(';')[0] || null,
    bitrate: f.bitrate || f.averageBitrate || null,
    audioQuality: f.audioQuality || null,
    contentLength: f.contentLength ? Number(f.contentLength) : null,
    url: await descifrarUrlFormato(f).catch(() => null)
  });

  const audioFormatsCrudos = formats.filter((f) => f.mimeType?.startsWith('audio'));
  const audioFormats = await Promise.all(audioFormatsCrudos.map(parseFormat));

  return {
    videoId,
    status: 'OK',
    title: json.videoDetails?.title,
    artist: json.videoDetails?.author || null,
    lengthSeconds: Number(json.videoDetails?.lengthSeconds || 0),
    thumbnail: json.videoDetails?.thumbnail?.thumbnails?.slice(-1)?.[0]?.url || null,
    audioFormats
  };
}
