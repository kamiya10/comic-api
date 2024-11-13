import { load, type CheerioAPI } from 'cheerio';
import type { Text } from 'domhandler';

const cache = new Map<string, CheerioAPI>();
const lastFetchTimestamp = new Map<string, number>();

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (typeof id != 'string') {
    throw createError({
      status: 400,
    });
  }

  if (!cache.has(id) || Date.now() - (lastFetchTimestamp.get(id) ?? 0) > 10_000) {
    cache.set(
      id,
      await $fetch(`https://tw.manhuagui.com/comic/${id}/`, {
        parseResponse: load,
      }),
    );
  }

  const $ = cache.get(id);

  if (!$) {
    throw createError({
      status: 500,
    });
  }

  const name = $('.book-title > h1').text();
  const alternativeName = $('.book-title > h2').text();
  const intro = $('#intro-all').text();

  const chapters = $('.chapter-list > ul > li > a')
    .map((_, el) => {
      const a = $(el);
      const name = (a.find('span').contents()[0] as Text).data;
      const page = Number.parseInt(a.find('i').text(), 10);

      let url = a.attr('href');
      if (url) {
        url = 'https://tw.manhuagui.com' + url;
      }

      const id = url?.split('/').at(-1)?.split('.')[0];

      return {
        id,
        name,
        page,
        url,
      };
    })
    .toArray().reverse();

  setHeader(event, 'Content-Type', 'application/json; charset=utf-8');

  return {
    id,
    name,
    alternativeName,
    intro,
    chapters,
  };
});
