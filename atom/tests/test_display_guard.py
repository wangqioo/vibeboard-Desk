import importlib.util,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('display_guard',Path(__file__).resolve().parents[1]/'deploy/display-guard.py');guard=importlib.util.module_from_spec(spec);spec.loader.exec_module(guard)
class DisplayGuardTests(unittest.TestCase):
    def test_missing_plane(self):self.assertTrue(guard.missing_scanout('Video Port1: ACTIVE\n Connector: DSI-1\n'))
    def test_scanout_present(self):self.assertFalse(guard.missing_scanout('Video Port1: ACTIVE\n Connector: DSI-1\n Smart0-win0: ACTIVE\n'))
    def test_inactive_display(self):self.assertFalse(guard.missing_scanout('Video Port1: DISABLED\n Connector: DSI-1\n'))
