import { load } from 'cheerio';
import type { CheerioAPI } from 'cheerio';

export default defineEventHandler(async (event) => {
  const { q } = getQuery<{ q?: string }>(event);

  if (!q) {
    throw createError({
      status: 400,
    });
  }

  const $ = await $fetch<CheerioAPI>(`https://tw.manhuagui.com/s/${encodeURI(q)}_o1.html`, {
    parseResponse: load,
  });

  if (!$) throw createError({
    status: 500,
  });

  const result = $('.book-result>ul>li')
    .map((_, el) => {
      const li = $(el);
      const a = li.find('.bcover');

      const url = a.attr('href');
      const id = url?.split('/').at(-2);

      if (!id) {
        console.error('/v1/mhgui/search id is not defined.');
        throw createError({
          status: 502,
        });
      }

      const status = li.find('.tt').text();
      const title = li.find('dt > a').text();
      
      let intro = li.find('.intro > *').text().trim();
      intro = intro.substring(3, intro.length - 4);

      return { id, title, status, intro };
    }).toArray();

  setHeader(event, 'Content-Type', 'application/json; charset=utf-8');
  setHeader(event, 'Access-Control-Allow-Origin', '*');

  return result;
});
