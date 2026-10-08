"""Explicitly configured OpenAI-compatible file transcription; no key discovery."""
import json
import uuid
from urllib.parse import urlsplit
from urllib.request import Request, build_opener
from urllib.error import HTTPError
from workshop import NoRedirect


def transcribe(config, path):
    base = config.get('stt_base_url', '').rstrip('/')
    model = config.get('stt_model', '')
    key = config.get('stt_api_key', '')
    if not (base and model and key):
        raise ValueError('请先配置语音转写 API、模型和密钥')
    parsed = urlsplit(base)
    if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError('语音转写地址必须为 HTTPS')
    content = path.read_bytes()
    if not 44 < len(content) <= 5 * 1024 * 1024:
        raise ValueError('录音为空或过大，请重新录音')
    boundary = 'atom-' + uuid.uuid4().hex
    body = ('--' + boundary + '\r\nContent-Disposition: form-data; name="model"\r\n\r\n' + model + '\r\n').encode()
    if parsed.hostname == 'open.bigmodel.cn':
        body += ('--' + boundary + '\r\nContent-Disposition: form-data; name="stream"\r\n\r\nfalse\r\n').encode()
    body += ('--' + boundary + '\r\nContent-Disposition: form-data; name="file"; filename="recording.wav"\r\nContent-Type: audio/wav\r\n\r\n').encode()
    body += content + ('\r\n--' + boundary + '--\r\n').encode()
    url = base if base.endswith('/audio/transcriptions') else base + '/audio/transcriptions'
    request = Request(url, data=body, headers={'Authorization': 'Bearer ' + key, 'Content-Type': 'multipart/form-data; boundary=' + boundary})
    try:
        with build_opener(NoRedirect()).open(request, timeout=60) as response:
            raw = response.read(1024 * 1024 + 1)
        if len(raw) > 1024 * 1024:
            raise ValueError('转写响应过大')
        result = json.loads(raw.decode('utf-8'))
        text = result.get('text') if isinstance(result, dict) else None
        if not isinstance(text, str) or not text.strip():
            raise ValueError('转写服务未返回文本')
        return dict(text=text.strip()[:8000])
    except HTTPError as exc:
        labels={401:'密钥无效或失效',402:'账户余额不足',403:'服务未开通或拒绝访问',429:'请求频率或配额受限'}
        raise ValueError('转写失败：'+labels.get(exc.code,'服务暂时不可用')+'（HTTP '+str(exc.code)+'）')
    except ValueError:
        raise
    except Exception:
        raise ValueError('转写请求失败，请检查 API、网络和账户配置')
