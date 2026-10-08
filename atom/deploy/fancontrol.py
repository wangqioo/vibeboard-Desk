#!/usr/bin/env python3
import argparse
import signal
import sys
import time
import socket, json, os, pwd
from datetime import datetime
from pathlib import Path

import gpiod


TEMP_START = 47.0
TEMP_STOP = 45.0
TEMP_MAX = 85.0
INTERVAL_SECONDS = 5

# Reference hardware: fan switch on GPIO3 A4.
FAN_CHIP = "3"
FAN_LINE = 4


def read_temp(path):
    try:
        return int(Path(path).read_text().strip()) / 1000.0
    except Exception:
        raise RuntimeError("temperature unavailable")


def read_temperatures():
    cpu = read_temp("/sys/class/thermal/thermal_zone0/temp")
    gpu = read_temp("/sys/class/thermal/thermal_zone1/temp")
    return cpu, gpu


class FanController:
    def __init__(self):
        self.running = True
        self.quiet_until = 0
        self.lease_until = 0
        self.reason = ""
        self.listener = None
        self.fan_on = False
        self.released = False
        self.chip = gpiod.Chip(FAN_CHIP, gpiod.Chip.OPEN_BY_NUMBER)
        self.line = self.chip.get_line(FAN_LINE)
        self.line.request(consumer="taishan-fan", type=gpiod.LINE_REQ_DIR_OUT, default_vals=[0])

    def set_fan(self, on):
        value = 1 if on else 0
        self.line.set_value(value)
        if self.fan_on != on:
            state = "ON" if on else "OFF"
            print(f"{datetime.now().isoformat(timespec='seconds')} fan {state}", flush=True)
        self.fan_on = on

    def update(self):
        try: cpu, gpu = read_temperatures()
        except RuntimeError:
            self.quiet_until=0;self.reason='温度读取失败，恢复散热';self.set_fan(True);return
        hottest = max(cpu, gpu)
        if self.quiet_until:
            if hottest>=60 or time.monotonic()>=min(self.quiet_until,self.lease_until):
                self.quiet_until=0;self.reason='已恢复自动散热';self.set_fan(True)
            else:
                self.set_fan(False);return
        if not self.fan_on and hottest >= TEMP_START:
            self.set_fan(True)
        elif self.fan_on and cpu < TEMP_STOP and gpu < TEMP_STOP:
            self.set_fan(False)
        if hottest >= TEMP_MAX:
            print(f"{datetime.now().isoformat(timespec='seconds')} warning hottest={hottest:.1f}C", flush=True)


    def stop(self):
        if self.released:
            return
        self.running = False
        try:
            self.set_fan(True)
        finally:
            self.line.release()
            self.released = True

    def command(self, action):
        cpu,gpu=read_temperatures()
        if action=='off':
            if max(cpu,gpu)>=60:raise ValueError('温度较高，暂不能停风扇')
            if not self.quiet_until:self.quiet_until=time.monotonic()+120
            self.lease_until=time.monotonic()+5;self.reason='收音对比：风扇暂停'
        elif action=='auto':
            self.quiet_until=0;self.reason='已恢复自动散热';self.set_fan(True)
        elif action=='status':
            if self.quiet_until:self.lease_until=time.monotonic()+5
        else:raise ValueError('invalid action')
        self.update()
        return dict(fan_on=self.fan_on,quiet=bool(self.quiet_until),seconds=max(0,round(self.quiet_until-time.monotonic())) if self.quiet_until else 0,cpu=cpu,gpu=gpu,reason=self.reason)

    def run(self, interval):
        address='/run/atom-fan.sock'
        try:os.unlink(address)
        except FileNotFoundError:pass
        self.listener=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM)
        self.listener.bind(address);os.chown(address,0,pwd.getpwnam('linaro').pw_gid);os.chmod(address,0o660)
        self.listener.listen(4);self.listener.settimeout(.5)
        while self.running:
            try:
                client,_=self.listener.accept()
                try:
                    client.settimeout(1);action=client.recv(32).decode('ascii')
                    try:result=self.command(action)
                    except Exception as e:result={'error':str(e)}
                    client.sendall(json.dumps(result,ensure_ascii=False).encode())
                finally:client.close()
            except socket.timeout:pass
            self.update()


def show_once():
    cpu, gpu = read_temperatures()
    fan_state = "ON" if max(cpu, gpu) >= TEMP_START else "OFF"
    print(f"cpu={cpu:.1f}C gpu={gpu:.1f}C predicted_fan={fan_state}")


def test_gpio(seconds):
    controller = FanController()
    try:
        print(f"fan test ON for {seconds}s", flush=True)
        controller.set_fan(True)
        time.sleep(seconds)
    finally:
        controller.stop()
        print("fan test OFF", flush=True)


def main():
    parser = argparse.ArgumentParser(description="Taishan Macintosh fan controller")
    parser.add_argument("--interval", type=int, default=INTERVAL_SECONDS)
    parser.add_argument("--once", action="store_true", help="Show temperatures and predicted fan state")
    parser.add_argument("--test-gpio", action="store_true", help="Turn fan on briefly, then off")
    parser.add_argument("--test-seconds", type=int, default=3)
    args = parser.parse_args()

    if args.once:
        show_once()
        return
    if args.test_gpio:
        test_gpio(args.test_seconds)
        return

    controller = FanController()

    def handle_signal(signum, _frame):
        print(f"received signal {signum}", flush=True)
        controller.stop()
        sys.exit(0)

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)
    try:
        controller.run(args.interval)
    finally:
        controller.stop()


if __name__ == "__main__":
    main()
