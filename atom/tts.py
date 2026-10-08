"""Explicitly configured speech synthesis and cancellable PulseAudio playback."""
import io
import json
import subprocess
import threading
import uuid
import wave
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import Request, build_opener
from urllib.error import HTTPError
from workshop import NoRedirect

VOICES = ('tongtong', 'chuichui', 'xiaochen', 'jam', 'kazi', 'douji', 'luodo')
MAX_AUDIO = 8 * 1024 * 1024


def synthesize(config, text):
    if not isinstance(text, str) or not 1 <= len(text.strip()) <= 1024:
        raise ValueError('朗读内容需为 1–1024 字')
    base = config.get('tts_base_url', '').rstrip('/')
    model, key = config.get('tts_model', ''), config.get('tts_api_key', '')
    voice = config.get('tts_voice', 'tongtong')
    if not (base and model and key): raise ValueError('请先配置语音播报 API、模型和密钥')
    parsed = urlsplit(base)
    if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError('语音播报地址必须为 HTTPS')
    if voice not in VOICES: raise ValueError('音色无效')
    data = dict(model=model, input=text.strip(), voice=voice, response_format='wav', stream=False)
    url = base if base.endswith('/audio/speech') else base + '/audio/speech'
    request = Request(url, data=json.dumps(data, ensure_ascii=False).encode('utf-8'),
                      headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key})
    try:
        with build_opener(NoRedirect()).open(request, timeout=60) as response:
            audio = response.read(MAX_AUDIO + 1)
        if len(audio) > MAX_AUDIO: raise ValueError('音频响应过大')
        with wave.open(io.BytesIO(audio), 'rb') as wav:
            if wav.getnchannels() not in (1, 2) or wav.getsampwidth() != 2 or not 8000 <= wav.getframerate() <= 96000 or wav.getnframes() < 1:
                raise ValueError('语音格式不可播放')
            duration = wav.getnframes() / wav.getframerate()
        return audio, duration
    except HTTPError as exc:
        labels = {401: '密钥无效或失效', 402: '账户余额不足', 403: '服务未开通或拒绝访问', 429: '请求频率或配额受限'}
        raise ValueError('语音生成失败：' + labels.get(exc.code, '服务暂时不可用') + '（HTTP ' + str(exc.code) + '）')
    except (wave.Error, EOFError): raise ValueError('语音服务未返回有效 WAV 音频')
    except ValueError: raise
    except Exception: raise ValueError('语音生成失败，请检查网络和账户配置')


class SpeechPlayer:
    def __init__(self, state_dir):
        self.root = Path(state_dir) / 'speech'
        self.lock = threading.RLock()
        self.process = None
        self.active = None
        self.state = dict(status='idle', speech_id=None, error=None)

    def public_status(self):
        with self.lock: return dict(self.state)

    def stop(self, speech_id=None):
        with self.lock:
            if speech_id and self.state.get('speech_id') != speech_id: return dict(self.state)
            self.active = None
            if self.process:
                self.process.terminate()
                try: self.process.wait(timeout=2)
                except subprocess.TimeoutExpired: self.process.kill(); self.process.wait(timeout=2)
                self.process = None
            self.state = dict(status='idle', speech_id=None, error=None)
            return dict(self.state)

    def start(self, config, text):
        if not isinstance(text, str) or not 1 <= len(text.strip()) <= 1024: raise ValueError('朗读内容需为 1–1024 字')
        if not all(config.get(k) for k in ('tts_base_url', 'tts_model', 'tts_api_key')): raise ValueError('语音播报尚未配置')
        with self.lock:
            self.stop()
            speech_id = uuid.uuid4().hex
            self.active = speech_id
            self.state = dict(status='generating', speech_id=speech_id, error=None)
            threading.Thread(target=self._play, args=(speech_id, dict(config), text), daemon=True).start()
            return dict(self.state)

    def _play(self, speech_id, config, text):
        path = self.root / (speech_id + '.wav')
        try:
            audio, duration = synthesize(config, text)
            with self.lock:
                if self.active != speech_id: return
                self.root.mkdir(parents=True, exist_ok=True); self.root.chmod(0o700)
                with path.open('xb') as file: file.write(audio)
                path.chmod(0o600)
                process = subprocess.Popen(['paplay', str(path)], stdin=subprocess.DEVNULL,
                                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                self.process = process
                self.state = dict(status='speaking', speech_id=speech_id, error=None, duration_seconds=round(duration, 2))
            code = process.wait(timeout=max(10, duration + 10))
            with self.lock:
                if self.active != speech_id: return
                self.process = None
                self.state = dict(status='done' if code == 0 else 'failed', speech_id=speech_id,
                                  error=None if code == 0 else '扬声器播放失败')
        except ValueError as exc:
            with self.lock:
                if self.active == speech_id: self.state = dict(status='failed', speech_id=speech_id, error=str(exc))
        except Exception:
            with self.lock:
                if self.active == speech_id:
                    if self.process:
                        try: self.process.kill()
                        except OSError: pass
                        self.process = None
                    self.state = dict(status='failed', speech_id=speech_id, error='语音播报失败，请检查扬声器')
        finally:
            try: path.unlink()
            except OSError: pass
