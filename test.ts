import { readFileSync } from 'fs';
import { load } from 'cheerio';
import { decompressFromBase64 } from 'lz-string';

const $ = load(readFileSync('./a.html'));

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

const unpackedData = unpack(p, a, c, decompressFromBase64(k).split('|'), e, d);

console.log(
  JSON.parse(unpackedData
    .replace('SMH.imgData(', '')
    .replace(').preInit();', '')),
);
