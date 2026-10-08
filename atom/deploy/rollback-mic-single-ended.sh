#!/bin/sh
set -eu
sudo rm -f /etc/atom/mic-single-ended.enabled
sudo systemctl disable --now atom-mic-mode.service
sudo /usr/local/sbin/atom-mic-single-ended restore
