#!/usr/bin/python3
"""Temporary RK809 single-ended MIC1p test. No boot image changes."""
import ctypes,fcntl,os,json,sys
from pathlib import Path
class Msg(ctypes.Structure):
    _fields_=[('addr',ctypes.c_ushort),('flags',ctypes.c_ushort),('length',ctypes.c_ushort),('buf',ctypes.POINTER(ctypes.c_ubyte))]
class Transfer(ctypes.Structure):
    _fields_=[('msgs',ctypes.POINTER(Msg)),('count',ctypes.c_uint)]
if os.geteuid()!=0:raise SystemExit('root required')
if '--serve' in sys.argv:
    import socket, subprocess, pwd
    address='/run/atom-mic-mode.sock'
    try:os.unlink(address)
    except FileNotFoundError:pass
    listener=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM);listener.bind(address)
    os.chown(address,0,pwd.getpwnam('linaro').pw_gid);os.chmod(address,0o660);listener.listen(4)
    while True:
        client,_=listener.accept()
        try:
            client.settimeout(5)
            if client.recv(16)!=b'apply':raise ValueError('invalid operation')
            result=subprocess.check_output([__file__],timeout=5,stderr=subprocess.DEVNULL)
            client.sendall(result)
        except Exception:client.sendall(b'{"error":"codec configuration failed"}')
        finally:client.close()

if b'rockchip,rk809-codec' not in Path('/sys/firmware/devicetree/base/i2c@fdd40000/pmic@20/codec/compatible').read_bytes():raise SystemExit('unexpected codec')
lock=open('/run/atom-mic-mode.lock','w');fcntl.flock(lock,fcntl.LOCK_EX)
fd=os.open('/dev/i2c-0',os.O_RDWR)
def read(reg):
    a=(ctypes.c_ubyte*1)(reg);b=(ctypes.c_ubyte*1)();m=(Msg*2)(Msg(0x20,0,1,a),Msg(0x20,1,1,b));t=Transfer(m,2);fcntl.ioctl(fd,0x0707,t);return b[0]
def write(reg,val):
    a=(ctypes.c_ubyte*2)(reg,val);m=(Msg*1)(Msg(0x20,0,2,a));t=Transfer(m,1);fcntl.ioctl(fd,0x0707,t)
backup=Path('/var/lib/atom/mic-mode-original.json');backup.parent.mkdir(parents=True,exist_ok=True)
regs=(0x27,0x18,0x1b)
before={str(r):read(r) for r in regs}
if len(sys.argv)>1 and sys.argv[1]=='restore':
    original=json.loads(backup.read_text());values={int(k):v for k,v in original.items()}
else:
    if not backup.exists():backup.write_text(json.dumps(before));backup.chmod(0o600)
    values={0x27:(before[str(0x27)]&~0x80)|0x10,0x18:before[str(0x18)]|0x40,0x1b:0xff}
try:
    for r,v in values.items():write(r,v)
    after={str(r):read(r) for r in regs}
    if any(after[str(r)]!=v for r,v in values.items()):raise RuntimeError('readback mismatch')
except Exception:
    for r,v in before.items():write(int(r),v)
    raise
finally:os.close(fd)
print(json.dumps({'before':before,'after':after,'mode':'single-ended' if not after['39']&128 else 'differential'}))
