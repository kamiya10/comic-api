import { load } from 'cheerio';

import type { CheerioAPI } from 'cheerio';

const cache = new Map<string, CheerioAPI>();
const lastFetchTimestamp = new Map<string, number>();

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (typeof id != 'string') {
    throw createError({
      status: 400,
    });
  }

  if (!cache.has(id) || Date.now() - (lastFetchTimestamp.get(id) ?? 0) > 90_000) {
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

  const chapterCategory = $('.chapter > h4')
    .map((_, el) => $(el).text())
    .toArray();

  const chapters = $('.chapter > .chapter-list')
    .map((_, el) => {
      return [
        $(el)
          .children('ul')
          .map((_, el) => {
            const ul = $(el);

            return ul
              .find('li > a')
              .map((_, el) => {
                const a = $(el);
                const name = a.attr('title');
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
              .toArray()
              .reverse();
          }).toArray(),
      ];
    }).toArray();

  setHeader(event, 'Content-Type', 'application/json; charset=utf-8');

  return {
    id,
    name,
    alternativeName,
    intro,
    chapters: Object.fromEntries(zip(chapterCategory, chapters)),
  };
});
