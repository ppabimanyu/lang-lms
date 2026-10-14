#!/bin/sh
set -e

echo "=========================================="
echo "🚀 Memulai Lingua LMS Backend Service..."
echo "=========================================="

# Extract DB Host & Port
if [ -n "$DATABASE_URL" ]; then
  PARSED=$(node -e 'try { const u = new URL(process.env.DATABASE_URL); console.log(u.hostname + " " + (u.port || "5432")); } catch (e) { console.log("127.0.0.1 5432"); }')
  TARGET_HOST=${DB_HOST:-$(echo "$PARSED" | cut -d' ' -f1)}
  TARGET_PORT=${DB_PORT:-$(echo "$PARSED" | cut -d' ' -f2)}
else
  TARGET_HOST=${DB_HOST:-"127.0.0.1"}
  TARGET_PORT=${DB_PORT:-"5432"}
fi

echo "⏳ Menunggu database PostgreSQL siap di ${TARGET_HOST}:${TARGET_PORT}..."
MAX_RETRIES=30
COUNT=0

until pg_isready -h "$TARGET_HOST" -p "$TARGET_PORT" -q; do
  COUNT=$((COUNT + 1))
  if [ "$COUNT" -gt "$MAX_RETRIES" ]; then
    echo "❌ Database tidak dapat dihubungi setelah 30 detik. Keluar..."
    exit 1
  fi
  echo "   [${COUNT}/${MAX_RETRIES}] Database belum siap, mencoba lagi dalam 1 detik..."
  sleep 1
done

echo "✅ Database PostgreSQL terhubung dan siap!"

echo "🔄 Menjalankan sinkronisasi skema database (Drizzle ORM)..."
npm run db:push || echo "⚠️ Peringatan: drizzle-kit push selesai dengan catatan."

echo "🎉 Database siap. Menjalankan aplikasi backend Lingua..."
exec "$@"
