#!/bin/bash
# 関数の再起動とウォーターマーク関数のテスト実行

set +x
cd $(dirname $0)
cd ../../

# 出力ディレクトリの作成
mkdir -p tmp

# 再起動
pkill -f "supabase functions serve" ; supabase functions serve > supabase/functions.log 2>&1 &

sleep 2

# JWTの取得
USER=user1@kater.jp PASSWORD=password123
ACCESS_TOKEN=$(curl -s -X POST $(supabase status --output json | jq -r '.API_URL')'/auth/v1/token?grant_type=password' \
  -H "apikey: $(supabase status --output json | jq -r '.ANON_KEY')" \
  -H "Content-Type: application/json" \
  -d '{"email":"'${USER}'","password":"'${PASSWORD}'"}' | jq -r '.access_token')

# 関数を叩く
echo "画像処理を実行中..."
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
  http://localhost:54411/functions/v1/watermark-image/00ab5a1e-5209-4872-9ad7-eaee57db0f7c \
  --output tmp/watermarked_image.jpg

# 結果の確認
if [ -f tmp/watermarked_image.jpg ]; then
  echo "画像が正常に生成されました: tmp/watermarked_image.jpg"
  echo "ファイルサイズ: $(ls -lh tmp/watermarked_image.jpg | awk '{print $5}')"
else
  echo "エラー: 画像の生成に失敗しました"
  exit 1
fi