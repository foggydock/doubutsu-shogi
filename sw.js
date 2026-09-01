/* どうぶつしょうぎ ： オフラインでも あそべるようにする しくみ
 *
 * かんがえかた
 *  - HTML は「ネットワークゆうせん」。つながる ときは かならず さいしんを とりにいき、
 *    とれた ものを キャッシュに いれなおす。だから ふるい バージョンで
 *    かたまる ことが ない。つながらない ときだけ キャッシュを つかう。
 *    このとき cache:'reload' を つけるのが たいせつ。つけないと ブラウザの
 *    HTTPキャッシュが さきに こたえてしまい、ネットワークまで とどかない。
 *  - アイコンなどは「キャッシュゆうせん」。かわらない ファイルなので はやさ ゆうせん。
 */
const VERSION = 'v2';
const CACHE   = 'doubutsu-shogi-' + VERSION;

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
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  const isHTML = req.mode === 'navigate' ||
                 (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    // ネットワークゆうせん。とれたら キャッシュを こうしんして、だめなら まえのを だす。
    e.respondWith(
      // cache:'reload' で ブラウザの HTTPキャッシュを とばして かならず サーバへ
      fetch(req.url, { cache: 'reload', credentials: 'same-origin' })
        .then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(INDEX, copy));
          }
          return res;
        })
        .catch(() => caches.match(INDEX).then(r => r || caches.match(url('./'))))
    );
    return;
  }

  // それ いがいは キャッシュゆうせん
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }))
  );
});
