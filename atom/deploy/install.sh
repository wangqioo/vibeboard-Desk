#!/bin/sh
# Run on the device after copying the source to /home/linaro/atom.
set -eu
test "$(id -un)" = linaro || { echo 'Run as linaro'; exit 1; }
test -f /home/linaro/atom/server.py
chmod +x /home/linaro/atom/deploy/*.sh
sudo install -m 644 /home/linaro/atom/deploy/atom.service /etc/systemd/system/atom.service
sudo install -m 644 /home/linaro/atom/deploy/atom.desktop /usr/share/xsessions/atom.desktop
sudo mkdir -p /etc/lightdm/lightdm.conf.d
sudo install -m 644 /home/linaro/atom/deploy/50-atom-session.conf /etc/lightdm/lightdm.conf.d/50-atom-session.conf
sudo install -m 644 /home/linaro/atom/deploy/99-atom-backlight.rules /etc/udev/rules.d/99-atom-backlight.rules
sudo udevadm control --reload-rules
for node in /sys/class/backlight/*/brightness; do
    [ -f "$node" ] || continue
    sudo chgrp video "$node"
    sudo chmod 0664 "$node"
done
sudo systemctl daemon-reload
sudo systemctl enable atom.service
sudo systemctl restart atom.service
echo 'ATOM installed. Select ATOM at graphical login or run deploy/start-atom.sh.'
