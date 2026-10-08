"""Fetch pinned face engines and Fabric1.7.22 into ignored vendor sources."""
from pathlib import Path,PurePosixPath
import urllib.request,tarfile,io,json,hashlib
R=Path(__file__).resolve().parents[1]/'vendor/faces'
PINS={'robo':('FluxGarage/RoboEyes','b42f8e596535234932be3514ac7a813d4ced0046'),'kaia':('kaiaai/kaia-face.js','2d40223581a3cdf1ed31d9aaeb87134f47c26408'),'pixel':('JOhnsonKC201/pixelpets','dac033366d82e66da6965496d1f9aa3bb08a27ec'),'snappy':('BrainsyETH/expressive-face','9e7619e935117ea40bd1d2a800425dfb8c337ec0')}
for name,(repo,sha) in PINS.items():
 p=R/name;p.mkdir(parents=True,exist_ok=True)
 raw=urllib.request.urlopen('https://codeload.github.com/'+repo+'/tar.gz/'+sha,timeout=60).read()
 with tarfile.open(fileobj=io.BytesIO(raw)) as t:
  for m in t.getmembers():
   path=PurePosixPath(m.name);rel=PurePosixPath(*path.parts[1:])
   if m.isfile() and rel.parts and '..' not in rel.parts and not rel.is_absolute():
    f=p/str(rel);f.parent.mkdir(parents=True,exist_ok=True);f.write_bytes(t.extractfile(m).read())
 (p/'PIN.json').write_text(json.dumps({'repo':repo,'sha':sha}));print(name,sha)
p=R/'fabric';p.mkdir(exist_ok=True)
info=json.load(urllib.request.urlopen('https://registry.npmjs.org/fabric/1.7.22',timeout=60));raw=urllib.request.urlopen(info['dist']['tarball'],timeout=60).read()
if hashlib.sha1(raw).hexdigest()!=info['dist']['shasum']:raise ValueError('Fabric npm package integrity mismatch')
with tarfile.open(fileobj=io.BytesIO(raw)) as t:
 for name,out in [('package/dist/fabric.js','fabric.js'),('package/LICENSE','LICENSE')]: (p/out).write_bytes(t.extractfile(name).read())
print('fabric1.7.22 verified')
