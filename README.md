# どうぶつしょうぎ（旧URL用ブランチ）

このブランチは、旧URL https://foggydock.github.io/doubutsu-shogi/ を GitHub Pages で配信するためだけのものです。
アプリ本体は `main` ブランチにあり、https://doubutsu-shogi.pages.dev/ （Cloudflare Pages）で公開しています。

- `index.html` / `404.html`：新しいURLへ移動するページ。移動する前に、この端末に残っているログイン状態や API キーを消し、前の版のオフライン機能を止めます。
- 端末の中にしか無いデータ（対戦記録）が残っている場合は、自動では移動せず、ファイルに書き出してから新しいURLを開けるようにしています。
- `sw.js`：前の版の Service Worker を止めて、キャッシュを片付けるためのものです。
