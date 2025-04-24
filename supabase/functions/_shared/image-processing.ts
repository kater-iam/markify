/**
 * 画像全体に透過文字列を敷き詰める
 * @param buf ArrayBuffer 形式の元画像
 * @returns Uint8Array (JPEG)
 */
async function processImage(buf: ArrayBuffer): Promise<Uint8Array> {
  // Uint8Array → Base64 データ URL へ変換
  const base64 = base64Encode(new Uint8Array(buf))
  // 形式を判定できなければ jpg としておく
  const img = await loadImage(`data:image/jpeg;base64,${base64}`)

  const w = img.width()
  const h = img.height()
  const canvas = createCanvas(w, h)
  const ctx = canvas.getContext('2d')

  // 元画像をそのまま描画
  ctx.drawImage(img, 0, 0)

  // ウォーターマーク設定
  const watermark = '© YOUR BRAND'
  const fontSize = Math.floor(w / 10)            // 幅の 10%
  const step = fontSize * 3                      // テキスト間隔
  ctx.font = `${fontSize}px sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.25)'       // 25% 透過
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // 斜めに敷き詰めるためにキャンバス全体を回転
  ctx.translate(w / 2, h / 2)
  ctx.rotate(-Math.PI / 4)

  const diag = Math.sqrt(w * w + h * h)
  for (let x = -diag / 2; x < diag / 2; x += step) {
    for (let y = -diag / 2; y < diag / 2; y += step) {
      ctx.fillText(watermark, x, y)
    }
  }

  // JPEG でバッファを返却（PNG にしたい場合は "image/png"）
  return canvas.toBuffer('image/jpeg')
}
