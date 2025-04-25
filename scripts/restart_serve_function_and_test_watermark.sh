#!/bin/bash

set -x
cd $(dirname $0)
cd ../

# 再起動
pkill -f "supabase functions serve" ; supabase functions serve > supabase/functions.log 2>&1 & sleep 3

# JWTの取得
USER=user1@kater.jp PASSWORD=password123
ACCESS_TOKEN=$(curl -s -X POST $(supabase status --output json | jq -r '.API_URL')'/auth/v1/token?grant_type=password' \
  -H "apikey: $(supabase status --output json | jq -r '.ANON_KEY')" \
  -H "Content-Type: application/json" \
  -d '{"email":"'${USER}'","password":"'${PASSWORD}'"}' | jq -r '.access_token')

# 関数を叩く
echo $ACCESS_TOKEN; curl -H "Authorization: Bearer $ACCESS_TOKEN" http://localhost:54411/functions/v1/watermark-image/354b4968-a716-414a-a938-ec6ab26500c3