import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import stt


class TranscriptionTests(unittest.TestCase):
    def test_missing_config_and_safe_failure(self):
        with self.assertRaisesRegex(ValueError, '配置'):
            stt.transcribe({}, Path('missing.wav'))
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'voice.wav'
            path.write_bytes(b'RIFF' + b'x' * 100)
            config = dict(stt_base_url='https://example.com/v1', stt_model='speech', stt_api_key='test-key')
            with mock.patch.object(stt, 'build_opener', side_effect=RuntimeError('test-key upstream')):
                with self.assertRaises(ValueError) as error: stt.transcribe(config, path)
            self.assertNotIn('test-key', str(error.exception))

    def test_multipart_text(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'voice.wav'
            path.write_bytes(b'RIFF' + b'x' * 100)
            response = mock.MagicMock()
            response.__enter__.return_value.read.return_value = b'{"text":"make a timer"}'
            opener = mock.MagicMock()
            opener.open.return_value = response
            with mock.patch.object(stt, 'build_opener', return_value=opener):
                result = stt.transcribe(dict(stt_base_url='https://example.com/v1',stt_model='speech',stt_api_key='test-key'), path)
            self.assertEqual(result['text'], 'make a timer')
            request = opener.open.call_args[0][0]
            self.assertEqual(request.full_url, 'https://example.com/v1/audio/transcriptions')
            self.assertIn(b'name="file"', request.data)
            with mock.patch.object(stt, 'build_opener', return_value=opener):
                stt.transcribe(dict(stt_base_url='https://open.bigmodel.cn/api/paas/v4',stt_model='glm-asr-2512',stt_api_key='test-key'),path)
            self.assertIn(b'name="stream"',opener.open.call_args[0][0].data)
            self.assertIn(b'false',opener.open.call_args[0][0].data)
