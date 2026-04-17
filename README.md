# NETGUARD:// 〜 電脳防衛戦記 〜

サイバー世界を舞台にしたアクションRPG。電脳ネットワークに侵入したウイルスを駆逐せよ。

🎮 **プレイ**: https://junia2009.github.io/netguard-rpg/

![HTML5](https://img.shields.io/badge/HTML5-Canvas-orange)
![JavaScript](https://img.shields.io/badge/Vanilla-JavaScript-yellow)
![PWA](https://img.shields.io/badge/PWA-対応-blue)

## ゲーム概要

ホームサーバーを拠点に、ネットワーク回線を突破し、感染セクターの奥深くに潜むボスウイルス「ゼロデイ」を倒すリアルタイムアクションRPG。

- **5つのマップ**: ホームサーバー → ネットワーク回線 → 感染セクターA → 感染セクターB → ウイルスコア
- **7種の敵**: バグ、トロイの木馬、ワーム、スパイウェア、ランサムウェア、ルートキット、ゼロデイ（ボス）
- **装備・アイテム**: 武器3段階 + ボスドロップ、防具3段階、回復アイテム
- **ショップ＆回復**: データショップで装備購入、リペアプログラムでHP回復
- **セーブ/ロード**: いつでもセーブ可能、ゲームオーバー時はリペアプログラム前で復活
- **エンディング**: ボス撃破後、マスターAIに報告するとエピローグ＆エンドクレジット

## 操作方法

### モバイル（タッチ）
| 操作 | ボタン |
|------|--------|
| 移動 | 仮想スティック |
| 攻撃 | A |
| 会話/決定 | B |
| アイテム使用 | Y |
| セーブ | SAVE |
| インベントリ | MENU |
| BGM ON/OFF | ♫ |

### PC（キーボード）
| 操作 | キー |
|------|------|
| 移動 | WASD / 矢印キー |
| 攻撃 | Space |
| 会話/決定 | Enter |
| アイテム使用 | X |
| インベントリ | I |
| セーブ | Q |

## 技術スタック

- **HTML5 Canvas 2D** — タイルベース描画（32px）
- **Vanilla JavaScript (ES6+)** — フレームワーク不使用
- **Web Audio API** — チップチューン風BGM（6曲、コード生成）
- **PWA** — Service Worker + manifest.json でオフライン対応
- **GitHub Pages** — GitHub Actions による自動デプロイ

## ファイル構成

```
├── index.html           # メインHTML
├── css/style.css        # スタイルシート
├── js/
│   ├── data.js          # マップ/敵/アイテム/ダイアログ定義
│   ├── engine.js        # 入力/カメラ/描画エンジン
│   ├── entities.js      # プレイヤー/エネミー/NPC
│   ├── combat.js        # 戦闘システム
│   ├── ui.js            # UI/HUD/ダイアログ/ショップ
│   ├── music.js         # BGMシステム（Web Audio API）
│   └── game.js          # ゲーム初期化/セーブロード/ループ
├── icons/               # PWAアイコン
├── manifest.json        # PWAマニフェスト
├── sw.js                # Service Worker
└── .github/workflows/   # GitHub Pages デプロイ
```

## ローカル実行

```bash
# リポジトリをクローン
git clone https://github.com/junia2009/netguard-rpg.git
cd netguard-rpg

# 任意のHTTPサーバーで起動
npx serve .
# または
python -m http.server 8080
```

ブラウザで `http://localhost:8080` を開く。

## クレジット

- **Game Design**: Takauchi Ryohei
- **Programming**: Takauchi Ryohei & AI
- **Art Direction**: Takauchi Ryohei
- **BGM**: Web Audio API Chiptune (procedurally generated)

## ライセンス

MIT
