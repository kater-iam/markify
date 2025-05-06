/**
 * Base64エンコードされた文字列をUTF-8文字列にデコードする
 * @param base64String Base64エンコードされた文字列
 * @returns デコードされたUTF-8文字列
 */
export function base64ToUTF8(base64String: string): string {
  try {
    console.log(`[Debug] base64ToUTF8: 入力文字列長=${base64String.length}, 先頭部分=${base64String.substring(0, 20)}...`);
    // Webブラウザ環境
    return atob(base64String);
  } catch (e) {
    // 文字化けしている場合は別のデコード方法を試す
    try {
      console.log(`[Debug] base64ToUTF8: 別のデコード方法を試みます`);
      const binaryString = atob(base64String);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return new TextDecoder().decode(bytes);
    } catch (e2) {
      console.error("Base64デコードエラー:", e2);
      throw new Error("Invalid base64 string");
    }
  }
}

/**
 * PEM形式の文字列からbase64エンコードされた部分を抽出する
 * @param pemString PEM形式の文字列
 * @returns Base64エンコードされた部分
 */
export function extractPEMString(pemString: string): string {
  console.log(`[Debug] extractPEMString: 入力文字列長=${pemString.length}, 先頭部分=${pemString.substring(0, 30)}...`);
  
  // 正規表現でマッチング
  const match = pemString.match(/-----BEGIN PRIVATE KEY-----\r?\n?([^-]*)\r?\n?-----END PRIVATE KEY-----/);
  if (!match || match.length < 2) {
    console.error(`[Error] extractPEMString: PEM形式が無効です。マッチしませんでした。`);
    console.log(`[Debug] 入力文字列: ${pemString.substring(0, 100)}...`);
    throw new Error("Invalid PEM format");
  }
  
  // 改行を取り除いてbase64文字列を返す
  const result = match[1].replace(/\r?\n/g, "");
  console.log(`[Debug] extractPEMString: 抽出されたBase64文字列長=${result.length}, 先頭部分=${result.substring(0, 30)}...`);
  return result;
} 