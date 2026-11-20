import subprocess
import sys
import unittest
from pathlib import Path


class ExportTests(unittest.TestCase):
    def export(self, *names):
        cli = Path(__file__).with_name("export.py")
        return subprocess.check_output([sys.executable, str(cli), *names], text=True)

    def test_empty_selection_has_a_header(self):
        self.assertEqual(self.export(), "name\n")

    def test_exports_selected_names(self):
        self.assertEqual(self.export("A", "B"), "name\nA\nB\n")


if __name__ == "__main__":
    unittest.main()
