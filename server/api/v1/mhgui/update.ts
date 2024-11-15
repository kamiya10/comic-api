import { load } from 'cheerio';

import type { CheerioAPI } from 'cheerio';

interface APIPartialComicData {
  id: string;
  title: string;
  status: string;
}

interface UpdateRecord<T = unknown> {
  d7: T;
  d15: T;
  d30: T;
}

const cache: UpdateRecord<CheerioAPI | null> = {
  d7: null,
  d15: null,
  d30: null,
};

const lastFetchTimestamp: UpdateRecord<number> = {
  d7: 0,
  d15: 0,
  d30: 0,
};

export default defineEventHandler(async (event) => {
  const { d = 'd7' } = getQuery<{ d: keyof UpdateRecord }>(event);

  if (!['d7', 'd15', 'd30'].includes(d)) {
    throw createError({
      status: 400,
    });
  }

  if (!cache[d] || Date.now() - lastFetchTimestamp[d] > 10_000) {
    cache[d] = await $fetch(`https://tw.manhuagui.com/update/${d}.html`, {
      parseResponse: load,
    });
  }

  const $: CheerioAPI | null = cache[d];

  if (!$) throw createError({
    status: 500,
  });

  const time: string[] = $('.latest-cont > h5')
    .map((_, el) => {
      return $(el)
        .text()
        .substring(0, 10);
    })
    .toArray();

  const data: APIPartialComicData[][] = $('.latest-cont > .latest-list > ul')
    .map((_, ul) => {
      return [
        $(ul)
          .children('li')
          .map((_, child) => {
            const li = $(child);
            const img = li.find('a > img');
            const a = li.find('p > a');
            const tt = li.find('.tt');

            let thumbnail = img.attr('src') ?? img.attr('data-src');
            if (thumbnail) {
              thumbnail = 'https:' + thumbnail;
            }

            let url = a.attr('href');
            if (url) {
              url = 'https://tw.manhuagui.com' + url;
            }

            const id = url?.split('/').at(-2);

            if (!id) {
              console.error('/v1/mhgui/update id is not defined.');
              throw createError({
                status: 502,
              });
            }

            return {
              id: id,
              title: a.text() ?? '',
              status: tt.text() ?? '',
            };
          })
          .toArray(),
      ];
    })
    .toArray();

  setHeader(event, 'Content-Type', 'application/json; charset=utf-8');

  return Object.fromEntries(zip(
    time,
    data,
  ));
});
