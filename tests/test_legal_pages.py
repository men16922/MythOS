"""Store-required policy pages (/privacy, /account-deletion): every slot filled, contact from env, served by the app."""

from __future__ import annotations

import os
import re
import unittest
from unittest import mock

from fastapi.testclient import TestClient

from mythos_api import legal


class RenderTest(unittest.TestCase):
    def test_every_slot_is_filled_with_and_without_a_contact(self) -> None:
        for email in ("dev@example.com", None):
            for page in legal.PAGES:
                with self.subTest(page=page, email=email):
                    out = legal.render(page, email=email)
                    self.assertNotRegex(out, r"\{\{[A-Z_]+\}\}")
                    self.assertIn(
                        legal.EFFECTIVE_DATE if page == "privacy" else "Project Mythos", out
                    )
                    if email:
                        self.assertIn('href="mailto:dev@example.com"', out)
                    else:
                        self.assertNotIn("mailto:", out)
                        self.assertIn("Google Play", out)

    def test_contact_email_is_validated_and_names_escaped(self) -> None:
        self.assertEqual(legal.contact_email(" a@b.co "), "a@b.co")
        for bad in ("", "nope", 'x"@y.com', "<a@b.co>", "a@b"):
            self.assertIsNone(legal.contact_email(bad), bad)
        out = legal.render("account-deletion", developer="<b>Dev & Co</b>")
        self.assertIn("&lt;b&gt;Dev &amp; Co&lt;/b&gt;", out)

    def test_pages_name_the_in_app_path_and_both_languages(self) -> None:
        deletion = legal.render("account-deletion")
        self.assertIn("계정 삭제", deletion)
        self.assertIn("Delete account", deletion)
        privacy = legal.render("privacy")
        for processor in ("Firebase Authentication", "Vertex AI", "Neon", "Crashlytics"):
            self.assertIn(processor, privacy)
        self.assertEqual(len(re.findall(r'href="/account-deletion"', privacy)), 3)


class ServedTest(unittest.TestCase):
    def test_app_serves_both_pages_with_the_env_contact(self) -> None:
        from mythos_api.app import create_app

        env = {
            "MYTHOS_V2_STORE": "memory",
            "MYTHOS_V2_GM": "off",
            "MYTHOS_AUTH": "open",
            "MYTHOS_CONTACT_EMAIL": "ops@example.com",
        }
        with mock.patch.dict(os.environ, env), TestClient(create_app()) as client:
            for path in ("/privacy", "/account-deletion"):
                res = client.get(path)
                self.assertEqual(res.status_code, 200, path)
                self.assertTrue(res.headers["content-type"].startswith("text/html"))
                self.assertIn("ops@example.com", res.text)


if __name__ == "__main__":
    unittest.main()
