"""scripts/firebase: every script parses (bash -n) and the daily push message is contract-shaped (the one body
both the scheduled jobs and push-test.sh send). Offline: nothing here calls gcloud or Google."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts" / "firebase"
BASH = shutil.which("bash")


@unittest.skipUnless(BASH, "bash not available")
class FirebaseScriptsTest(unittest.TestCase):
    def bash(self, script: str) -> str:
        assert BASH is not None
        env = {**os.environ, "PROJECT_ID": "demo-mythos"}
        out = subprocess.run(
            [BASH, "-c", script], cwd=ROOT, env=env, capture_output=True, text=True, check=True
        )
        return out.stdout

    def test_scripts_parse(self) -> None:
        names = sorted(p.name for p in SCRIPTS.glob("*.sh"))
        self.assertEqual(
            names,
            [
                "android-sha.sh",
                "auth-domains.sh",
                "lib.sh",
                "push-schedule.sh",
                "push-test.sh",
                "web-app.sh",
            ],
        )
        for name in names:
            with self.subTest(script=name):
                assert BASH is not None
                subprocess.run([BASH, "-n", str(SCRIPTS / name)], check=True)
                text = (SCRIPTS / name).read_text(encoding="utf-8")
                if name != "lib.sh":
                    self.assertIn("set -euo pipefail", text)
                    self.assertTrue(os.access(SCRIPTS / name, os.X_OK), f"{name} is not executable")
                # tokens only ever travel in a header file, never argv or stdout
                self.assertNotRegex(text, r"echo[^\n]*\$token")

    def test_daily_message_matches_the_contract(self) -> None:
        expected_text = {
            "ko": ("오늘의 시드가 열렸다", "모두가 같은 판, 같은 적. 오늘의 기록을 남겨라."),
            "en": (
                "Today's seed is live",
                "Same run, same enemies for everyone. Set today's record.",
            ),
        }
        for lang, (title, body) in expected_text.items():
            with self.subTest(lang=lang):
                raw = self.bash(
                    f"source scripts/firebase/lib.sh && push_message_json daily-{lang} {lang}"
                )
                self.assertEqual(
                    json.loads(raw),
                    {
                        "message": {
                            "topic": f"daily-{lang}",
                            "notification": {"title": title, "body": body},
                            "data": {"open": "daily"},
                            "android": {
                                "ttl": "21600s",
                                "collapse_key": "daily",
                                "notification": {
                                    "channel_id": "daily",
                                    "icon": "ic_stat_mythos",
                                    "color": "#3ef0ff",
                                },
                            },
                        }
                    },
                )

    def test_topic_names(self) -> None:
        ok = self.bash(
            "source scripts/firebase/lib.sh; for t in daily-ko daily-en test.me_1~%; do "
            'fb_valid_topic "$t" && echo yes || echo no; done; '
            "for t in '' 'has space' 'a/b'; do fb_valid_topic \"$t\" && echo yes || echo no; done"
        )
        self.assertEqual(ok.split(), ["yes", "yes", "yes", "no", "no", "no"])


if __name__ == "__main__":
    unittest.main()
