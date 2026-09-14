/* どうぶつしょうぎ ： オフラインでも あそべるようにする しくみ
 *
 * かんがえかた
 *  - HTML は「ネットワークゆうせん」。つながる ときは かならず さいしんを とりにいき、
 *    とれた ものを キャッシュに いれなおす。だから ふるい バージョンで
 *    かたまる ことが ない。つながらない ときだけ キャッシュを つかう。
 *    このとき cache:'reload' を つけるのが たいせつ。つけないと ブラウザの
 *    HTTPキャッシュが さきに こたえてしまい、ネットワークまで とどかない。
 *    でんぱが よわくて NET_TIMEOUT_MS たっても こたえが ない ときは、まえの キャッシュで さきに ひらく。
 *  - アイコンなどは キャッシュから すぐ だしつつ、うらで とりなおして いれかえる。
 *    だから ファイルを かえて VERSION を あげわすれても、ずっと ふるいまま には ならない
 *    （つぎに ひらいた ときに あたらしく なる）。
 */
const VERSION = 'v3';
// おなじ ドメイン（foggydock.github.io）の ほかの アプリと キャッシュの おきばが きょうつう なので、
// けすのは この なまえで はじまる ふるい キャッシュだけに する
const CACHE_PREFIX = 'doubutsu-shogi-';
const CACHE   = CACHE_PREFIX + VERSION;
const NET_TIMEOUT_MS = 3000;

// スコープ（/doubutsu-shogi/ など）を きじゅんに した ぜったいURL
const url   = path => new URL(path, self.location).toString();
const INDEX = url('index.html');
const ASSETS = ['./', 'index.html', 'manifest.json',
                'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'].map(url);

self.addEventListener('install', e => {
  // 1つ こけても ぜんぶ 失敗しないように 1件ずつ いれる
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(ASSETS.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const cachedIndex = () => caches.match(INDEX).then(r => r || caches.match(url('./')));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  const isHTML = req.mode === 'navigate' ||
                 (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    // cache:'reload' で ブラウザの HTTPキャッシュを とばして かならず サーバへ
    const network = fetch(req.url, { cache: 'reload', credentials: 'same-origin' });

    // とれたら キャッシュを こうしん。ページへの へんじが さきに おわっても さいごまで やりきる。
    // clone は ページが よみはじめる まえに する ひつようが あるので、この then を さきに つなぐ。
    e.waitUntil(network.then(res => {
      if (res.ok) {
        const copy = res.clone();
        return caches.open(CACHE).then(c => c.put(INDEX, copy));
      }
    }).catch(() => {}));

    e.respondWith(new Promise(resolve => {
      let answered = false;
      const answer = r => { if (!answered) { answered = true; resolve(r); } };
      // なかなか こたえが こない ときは キャッシュで さきに ひらく（キャッシュが なければ まちつづける）
      const timer = setTimeout(() => cachedIndex().then(r => { if (r) answer(r); }), NET_TIMEOUT_MS);
      network
        .then(res => { clearTimeout(timer); answer(res); })
        .catch(() => { clearTimeout(timer); cachedIndex().then(r => answer(r || Response.error())); });
    }));
    return;
  }

  // それ いがいは キャッシュから すぐ だして、うらで とりなおして いれかえる
  e.respondWith(caches.open(CACHE).then(c => c.match(req).then(hit => {
    const update = fetch(req).then(res => {
      if (!res.ok) return res;
      return c.put(req, res.clone()).catch(() => {}).then(() => res);
    });
    if (hit) {
      e.waitUntil(update.catch(() => {}));
      return hit;
    }
    return update;
  })));
});
