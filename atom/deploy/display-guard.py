#!/usr/bin/env python3
"""RK3566 prototype: recover an active DSI controller with no scanout plane."""
import os,subprocess,time
from pathlib import Path
SUMMARY=Path('/sys/kernel/debug/dri/0/summary')
def missing_scanout(text):
    return 'Video Port1: ACTIVE' in text and 'DSI-1' in text and not any('win' in line.lower() and ': ACTIVE' in line for line in text.splitlines())
def run(args,env=None):
    return subprocess.run(args,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=12).returncode

def main():
    failures=0;last_recovery=0
    while True:
        time.sleep(3)
        try:
            if run(['pgrep','-f','^/bin/sh /home/linaro/atom/deploy/atom-session.sh'])!=0:
                failures=0;continue
            if not SUMMARY.exists():continue
            bad=missing_scanout(SUMMARY.read_text())
            failures=failures+1 if bad else 0
            if failures<2 or time.monotonic()-last_recovery<60:continue
            last_recovery=time.monotonic();failures=0
            print('Active DSI has no scanout plane; restoring output',flush=True)
            env=dict(os.environ,DISPLAY=':0',XAUTHORITY='/home/linaro/.Xauthority')
            # Force a modeset; --auto alone does not rebind a lost framebuffer.
            run(['xrandr','--output','DSI-1','--off'],env)
            run(['xrandr','--output','DSI-1','--mode','480x360'],env)
            time.sleep(2)
            if missing_scanout(SUMMARY.read_text()):
                print('Modeset did not recover scanout; restarting LightDM',flush=True)
                run(['systemctl','restart','lightdm'])
        except (OSError,subprocess.SubprocessError) as exc:
            print('Display recovery check failed: '+type(exc).__name__,flush=True)
if __name__=='__main__':main()
