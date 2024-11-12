import { load, type CheerioAPI } from 'cheerio';
import LZString from 'lz-string';

const unpack = (p: string, a: number, c: number, k: string[], e: (c: number) => string, d: Record<string, string>): string => {
  e = function (c) {
    return (
      c < a
        ? ''
        : e(c / a)
    )
    + (
      (c = c % a) > 35
        ? String.fromCharCode(c + 29)
        : c.toString(36)
    );
  };

  while (c--) {
    d[e(c)] = k[c] || e(c);
  }

  return p.replace(new RegExp('\\b\\w+\\b', 'g'), (e) => d[e]);
};

interface UnpackedData {
  bid: number;
  bname: string;
  bpic: string;
  cid: number;
  cname: string;
  files: string[];
  finished: boolean;
  len: number;
  path: string;
  status: number;
  block_cc: string;
  nextId: number;
  prevId: number;
  sl: {
    e: number;
    m: string;
  };
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  const chapterId = getRouterParam(event, 'chapterId');

  if (!id || !chapterId) {
    throw createError({
      status: 400,
    });
  }

  const $ = await $fetch<CheerioAPI>(`https://tw.manhuagui.com/comic/${id}/${chapterId}.html`, {
    parseResponse: load,
  });

  const script = $('script:contains("p,a,c,k,e,d")').text();

  const matches = script
    .match(/(?<=return p;}\()(.+)(?=\)\))/);

  if (!matches) {
    throw new Error('variable not exists');
  }

  const variableScript = ''
    + '['
    + matches[1].replace('[\'\\x73\\x70\\x6c\\x69\\x63\'](\'\\x7c\')', '')
    + ']';

  const [p, a, c, k, e, d] = eval(variableScript) as [string, number, number, string, (c: number) => string, Record<string, string>];

  const unpackedData = unpack(p, a, c, LZString.decompressFromBase64(k).split('|'), e, d);

  const parsedData = JSON.parse(unpackedData
    .replace('SMH.imgData(', '')
    .replace(').preInit();', '')) as UnpackedData;

  setHeader(event, 'Content-Type', 'application/json; charset=utf-8');

  return parsedData.files.map((v) => 'https://eu1.hamreus.com' + parsedData.path + v + `?e=${parsedData.sl.e}&m=${parsedData.sl.m}`);
});
