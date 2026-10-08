import unittest, tempfile, wave, struct, sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from voice import VoiceRecorder
class MeterTests(unittest.TestCase):
    def test_pcm_levels_and_clipping(self):
        with tempfile.TemporaryDirectory() as root:
            r=VoiceRecorder(root);r.root.mkdir();r.recording_id='a'*32
            with wave.open(str(r.root/(r.recording_id+'.wav')),'wb') as w:
                w.setparams((1,2,16000,0,'NONE','not compressed'))
                w.writeframes(struct.pack('<16000h',*([32767,-32768]*8000)))
            m=r.meter(r.recording_id)
            self.assertEqual(m['seconds'],1);self.assertEqual(m['clipping'],100)
            self.assertAlmostEqual(m['rms_db'],0,places=1)
            self.assertFalse(m['recording']);self.assertFalse(m['playing'])
            with self.assertRaises(ValueError):r.meter('b'*32)
