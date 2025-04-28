import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { Buffer } from 'node:buffer'

const STORAGE_DIR = path.join(process.cwd(), '../storage')

// ドキュメント用のSVGテンプレート
function generateDocumentSvg(
  width: number,
  height: number,
  type: string,
  index: number
): string {
  const lineHeight = 30
  const lineCount = 15
  const startY = 100
  const margin = 60

  let lines = ''
  for (let i = 0; i < lineCount; i++) {
    const lineWidth = Math.random() * 0.4 + 0.5 // 50-90%の幅
    lines += `
      <rect x="${margin}" y="${startY + i * lineHeight}" 
        width="${(width - margin * 2) * lineWidth}" height="2" 
        fill="#666" opacity="${Math.random() * 0.3 + 0.2}"/>
    `
  }

  // タイプに応じたヘッダースタイル
  const headerStyle = type === 'handwritten' 
    ? `font-family: 'Comic Sans MS', cursive;`
    : type === 'typewriter'
    ? `font-family: 'Courier New', monospace;`
    : `font-family: Arial, sans-serif;`

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#ffffff"/>
      <rect x="30" y="30" width="${width-60}" height="${height-60}" 
        fill="none" stroke="#ddd" stroke-width="1"/>
      <text x="50%" y="60" font-size="24" fill="#333"
        text-anchor="middle" style="${headerStyle}">
        ${type.charAt(0).toUpperCase() + type.slice(1)} Document #${index}
      </text>
      ${lines}
    </svg>
  `
}

// 写真用のSVGテンプレート
function generatePhotoSvg(
  width: number,
  height: number,
  type: string,
  index: number
): string {
  const elements = {
    landscape: `
      <path d="M0,${height*0.6} C${width*0.2},${height*0.4} ${width*0.4},${height*0.7} ${width},${height*0.5}" 
        fill="#81c784" stroke="none"/>
      <circle cx="${width*0.8}" cy="${height*0.3}" r="40" fill="#fff176"/>
    `,
    portrait: `
      <circle cx="${width/2}" cy="${height*0.3}" r="80" fill="#ef9a9a"/>
      <path d="M${width/2-60},${height*0.6} Q${width/2},${height*0.3} ${width/2+60},${height*0.6} L${width/2+60},${height*0.8} L${width/2-60},${height*0.8} Z" 
        fill="#90a4ae"/>
    `,
    product: `
      <rect x="${width*0.3}" y="${height*0.2}" width="${width*0.4}" height="${height*0.6}" 
        fill="#64b5f6" rx="10"/>
      <rect x="${width*0.35}" y="${height*0.3}" width="${width*0.3}" height="${height*0.4}" 
        fill="#bbdefb" rx="5"/>
    `,
    architecture: `
      <path d="M${width*0.2},${height*0.8} L${width*0.5},${height*0.2} L${width*0.8},${height*0.8} Z" 
        fill="#8d6e63"/>
      <rect x="${width*0.35}" y="${height*0.5}" width="${width*0.3}" height="${height*0.3}" 
        fill="#d7ccc8"/>
    `
  }

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f5f5f5"/>
      ${elements[type as keyof typeof elements]}
      <text x="50%" y="${height-20}" font-size="20" fill="#666"
        text-anchor="middle" font-family="Arial">
        ${type.charAt(0).toUpperCase() + type.slice(1)} #${index}
      </text>
    </svg>
  `
}

// チャート用のSVGテンプレート
function generateChartSvg(
  width: number,
  height: number,
  type: string,
  index: number
): string {
  const elements = {
    chart: `
      <circle cx="${width/2}" cy="${height/2}" r="100" fill="none" stroke="#f44336" stroke-width="30" stroke-dasharray="502"/>
      <circle cx="${width/2}" cy="${height/2}" r="100" fill="none" stroke="#2196f3" stroke-width="30" stroke-dasharray="251"/>
      <circle cx="${width/2}" cy="${height/2}" r="100" fill="none" stroke="#4caf50" stroke-width="30" stroke-dasharray="126"/>
    `,
    graph: `
      <path d="M50,${height-50} L${width-50},${height-50}" stroke="#666" stroke-width="2"/>
      <path d="M50,${height-50} L50,50" stroke="#666" stroke-width="2"/>
      <path d="M50,${height-150} C${width*0.3},${height-250} ${width*0.7},${height-100} ${width-50},${height-200}" 
        fill="none" stroke="#2196f3" stroke-width="3"/>
    `,
    diagram: `
      <rect x="${width*0.2}" y="${height*0.2}" width="150" height="80" rx="10" fill="#64b5f6"/>
      <rect x="${width*0.6}" y="${height*0.2}" width="150" height="80" rx="10" fill="#81c784"/>
      <rect x="${width*0.4}" y="${height*0.6}" width="150" height="80" rx="10" fill="#ffb74d"/>
      <path d="M${width*0.35},${height*0.3} L${width*0.6},${height*0.3}" stroke="#666" stroke-width="2"/>
      <path d="M${width*0.5},${height*0.4} L${width*0.5},${height*0.6}" stroke="#666" stroke-width="2"/>
    `,
    table: `
      <rect x="50" y="50" width="${width-100}" height="${height-100}" fill="none" stroke="#666"/>
      ${Array.from({length: 5}, (_, i) => `
        <line x1="50" y1="${50 + (height-100)/5*i}" x2="${width-50}" y2="${50 + (height-100)/5*i}" 
          stroke="#666" stroke-width="${i === 0 ? 2 : 1}"/>
        <line x1="${50 + (width-100)/4*i}" y1="50" x2="${50 + (width-100)/4*i}" y2="${height-50}" 
          stroke="#666" stroke-width="${i === 0 ? 2 : 1}"/>
      `).join('')}
    `
  }

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#ffffff"/>
      ${elements[type as keyof typeof elements]}
      <text x="50%" y="${height-20}" font-size="20" fill="#666"
        text-anchor="middle" font-family="Arial">
        ${type.charAt(0).toUpperCase() + type.slice(1)} #${index}
      </text>
    </svg>
  `
}

// 画像生成関数
async function generateImage(
  type: string,
  category: string,
  index: number,
  outputPath: string
): Promise<void> {
  const width = category === 'documents' ? 800 : 800
  const height = category === 'documents' ? 1200 : 600

  const svg = category === 'documents' 
    ? generateDocumentSvg(width, height, type, index)
    : category === 'photos'
    ? generatePhotoSvg(width, height, type, index)
    : generateChartSvg(width, height, type, index)

  await sharp(Buffer.from(svg))
    .jpeg({ quality: 90 })
    .toFile(outputPath)
}

async function main() {
  // ストレージディレクトリの作成（サブディレクトリなし）
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true })
  }

  let globalIndex = 1;

  // ドキュメント画像の生成
  const documentTypes = ['handwritten', 'typewriter', 'printed', 'mixed']
  for (let i = 1; i <= 80; i++) {
    const type = documentTypes[(i - 1) % 4]
    const filename = `${String(globalIndex).padStart(3, '0')}_${type}.jpg`
    await generateImage(type, 'documents', i, path.join(STORAGE_DIR, filename))
    console.log(`Generated image: ${filename}`)
    globalIndex++;
  }

  // 写真の生成
  const photoTypes = ['landscape', 'portrait', 'product', 'architecture']
  for (let i = 1; i <= 80; i++) {
    const type = photoTypes[(i - 1) % 4]
    const filename = `${String(globalIndex).padStart(3, '0')}_${type}.jpg`
    await generateImage(type, 'photos', i, path.join(STORAGE_DIR, filename))
    console.log(`Generated image: ${filename}`)
    globalIndex++;
  }

  // チャート画像の生成
  const chartTypes = ['chart', 'graph', 'diagram', 'table']
  for (let i = 1; i <= 40; i++) {
    const type = chartTypes[(i - 1) % 4]
    const filename = `${String(globalIndex).padStart(3, '0')}_${type}.jpg`
    await generateImage(type, 'charts', i, path.join(STORAGE_DIR, filename))
    console.log(`Generated image: ${filename}`)
    globalIndex++;
  }
}

main().catch(console.error) 