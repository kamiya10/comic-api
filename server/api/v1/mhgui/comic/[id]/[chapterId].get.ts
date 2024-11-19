import { load } from 'cheerio';

import LZString from 'lz-string';

import type { CheerioAPI } from 'cheerio';

const unpack = (p: string, a: number, c: number, k: string[], e: (c: number) => string, d: Record<string, string>): string => {
  e = function (c) {
    return (c < a ? '' : e(~~(c / a)))
      + ((c = c % a) > 35
        ? String.fromCharCode(c + 29)
        : c.toString(36));
  };

  while (c--) {
    d[e(c)] = k[c] || e(c);
  }

  return p.replace(/\b\w+\b/g, (n: string) => d[n]);
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

  const paramMatches
    = matches[1]
      .replace('[\'\\x73\\x70\\x6c\\x69\\x63\'](\'\\x7c\')', '')
      .matchAll(/('(?:[^']*)')|([^,]+)/gi);

  const params: unknown[] = [];

  for (const paramMatch of paramMatches) {
    const json = paramMatch[0]
      .replaceAll('"', '\\"')
      .replaceAll('\'', '"');

    params.push(JSON.parse(json));
  }

  const [p, a, c, k, e, d] = params as [string, number, number, string, (c: number) => string, Record<string, string>];

  const unpackedData = unpack(p, a, c, LZString.decompressFromBase64(k).split('|'), e, d);

  const parsedData = JSON.parse(unpackedData
    .replace('SMH.imgData(', '')
    .replace(').preInit();', '')) as UnpackedData;

  setHeader(event, 'Content-Type', 'application/json; charset=utf-8');
  setHeader(event, 'Access-Control-Allow-Origin', '*');

  return parsedData.files.map((v) => 'https://eu1.hamreus.com' + parsedData.path + v + `?e=${parsedData.sl.e}&m=${parsedData.sl.m}`);
});
