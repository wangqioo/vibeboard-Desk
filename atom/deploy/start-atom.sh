#!/bin/sh
set -eu
export DISPLAY="${DISPLAY:-:0}"
export XAUTHORITY="${XAUTHORITY:-$HOME/.Xauthority}"
export XMODIFIERS=@im=none
export GTK_IM_MODULE=none
export QT_IM_MODULE=none
mkdir -p "$HOME/.cache/atom-chromium"
i=0
until curl -fsS http://127.0.0.1:8770/api/health >/dev/null; do
    i=$((i + 1))
    [ "$i" -lt 30 ] || exit 1
    sleep 1
done
xset s off -dpms s noblank 2>/dev/null || true
export LD_LIBRARY_PATH="/usr/lib/chromium:/usr/lib/chromium/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
exec /usr/lib/chromium/chromium-bin \
    --no-sandbox --use-gl=egl --ignore-gpu-blocklist \
    --enable-features=VaapiVideoDecoder --enable-accelerated-video-decode \
    --enable-gpu-rasterization \
    --user-data-dir="$HOME/.cache/atom-chromium" \
    --no-first-run --disable-session-crashed-bubble \
    --force-device-scale-factor=1 --window-position=0,0 \
    --window-size=480,360 "$@" --kiosk http://127.0.0.1:8770/
