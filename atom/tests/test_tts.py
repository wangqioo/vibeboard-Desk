import io
import json
import tempfile
import unittest
import wave
from pathlib import Path
from unittest import mock
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import tts

class SpeechTests(unittest.TestCase):
    def config(self): return dict(tts_base_url='https://open.bigmodel.cn/api/paas/v4',tts_model='glm-tts',tts_voice='tongtong',tts_api_key='test-voice-key')
    def audio(self):
        out=io.BytesIO()
        with wave.open(out,'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(24000);w.writeframes(b'\x00\x01'*24000)
        return out.getvalue()
    def test_wav_request_and_duration(self):
        response=mock.MagicMock();response.__enter__.return_value.read.return_value=self.audio();opener=mock.MagicMock();opener.open.return_value=response
        with mock.patch.object(tts,'build_opener',return_value=opener):audio,duration=tts.synthesize(self.config(),'你好')
        self.assertEqual(duration,1);self.assertTrue(audio.startswith(b'RIFF'))
        request=opener.open.call_args[0][0];body=json.loads(request.data)
        self.assertEqual(request.full_url,'https://open.bigmodel.cn/api/paas/v4/audio/speech');self.assertEqual(body['model'],'glm-tts');self.assertEqual(body['voice'],'tongtong');self.assertEqual(body['response_format'],'wav');self.assertFalse(body['stream'])
    def test_invalid_input_and_redacted_error(self):
        for text in ['',None,'x'*1025]:
            with self.assertRaises(ValueError):tts.synthesize(self.config(),text)
        with mock.patch.object(tts,'build_opener',side_effect=RuntimeError('test-voice-key')):
            with self.assertRaises(ValueError) as e:tts.synthesize(self.config(),'hello')
        self.assertNotIn('test-voice-key',str(e.exception))
    def test_playback_and_stale_stop(self):
        with tempfile.TemporaryDirectory() as root:
            player=tts.SpeechPlayer(root);player.active='own';player.state=dict(speech_id='own',status='generating');process=mock.Mock();process.wait.return_value=0
            with mock.patch.object(tts,'synthesize',return_value=(self.audio(),1)),mock.patch.object(tts.subprocess,'Popen',return_value=process):player._play('own',self.config(),'hello')
            self.assertEqual(player.public_status()['status'],'done');self.assertFalse(list(player.root.glob('*.wav')))
            player.active='new';player.state=dict(speech_id='new',status='speaking');player.process=process;player.stop('old');process.terminate.assert_not_called();player.stop('new');process.terminate.assert_called_once();self.assertEqual(player.public_status()['status'],'idle')
