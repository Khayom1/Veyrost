import importlib.util
import pathlib
import tempfile
import unittest
from unittest import mock

MODULE_PATH = pathlib.Path(__file__).resolve().parents[1] / "generate.py"
SPEC = importlib.util.spec_from_file_location("veyrost_generate", MODULE_PATH)
generator = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(generator)


class GeneratorSafetyTests(unittest.TestCase):
    def test_missing_api_key_fails_before_network_request(self):
        with mock.patch.object(generator, "DEEPSEEK_API_KEY", ""):
            with mock.patch.object(generator.requests, "post") as post:
                with self.assertRaisesRegex(RuntimeError, "DEEPSEEK_API_KEY"):
                    generator.call_deepseek("system", "user")
                post.assert_not_called()

    def test_body_html_is_reduced_to_safe_allowlist(self):
        source = '<p onclick="evil()">Hello <strong>world</strong><script>alert(1)</script><img src=x onerror=evil()></p>'
        cleaned = generator.sanitize_body_html(source)
        self.assertEqual(cleaned, "<p>Hello <strong>world</strong>alert(1)</p>")
        self.assertNotIn("onclick", cleaned)
        self.assertNotIn("<script", cleaned)
        self.assertNotIn("<img", cleaned)

    def test_make_html_escapes_metadata_and_sanitizes_body(self):
        post = {
            "slug": "safe-post",
            "title": '<img src=x onerror=alert(1)>',
            "excerpt": '" onmouseover="alert(1)',
            "body_html": '<p>Safe</p><script>bad()</script>'
        }
        page = generator.make_html("en", post, "banner-safe.jpg", "2026-11-12")
        self.assertIn("&lt;img src=x onerror=alert(1)&gt;", page)
        self.assertNotIn("<script>bad()", page)
        self.assertNotIn('onmouseover="alert(1)', page)
        self.assertIn("<p>Safe</p>", page)

    def test_safe_slug_rejects_empty_and_normalizes_traversal(self):
        self.assertEqual(generator.safe_slug("../../Hello World"), "hello-world")
        with self.assertRaises(ValueError):
            generator.safe_slug("../../")

    def test_publish_stages_only_explicit_files_without_shell(self):
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            (root / "posts").mkdir()
            (root / "posts" / "article.html").write_text("article", encoding="utf-8")
            calls = []
            def fake_run(args, **kwargs):
                calls.append(args)
                if "diff" in args:
                    return mock.Mock(returncode=1, args=args, stdout="", stderr="")
                return mock.Mock(returncode=0, args=args, stdout="", stderr="")
            with mock.patch.object(generator.subprocess, "run", side_effect=fake_run):
                result = generator.publish_generated_files(
                    ["posts/article.html"], root, "message; $(danger)"
                )
            self.assertTrue(result)
            add_call = next(args for args in calls if "add" in args)
            self.assertEqual(add_call[-1], "posts/article.html")
            self.assertNotIn(".", add_call)
            self.assertTrue(all(isinstance(arg, str) for call in calls for arg in call))

    def test_publish_rejects_paths_outside_repository(self):
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            with self.assertRaises(ValueError):
                generator.publish_generated_files(["../outside.txt"], root, "test")

    def test_publish_refuses_preexisting_staged_changes(self):
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            (root / "posts").mkdir()
            (root / "posts" / "article.html").write_text("article", encoding="utf-8")
            def fake_run(args, **kwargs):
                if "diff" in args:
                    return mock.Mock(returncode=1, args=args, stdout="", stderr="")
                return mock.Mock(returncode=0, args=args, stdout="", stderr="")
            with mock.patch.object(generator.subprocess, "run", side_effect=fake_run):
                with self.assertRaisesRegex(RuntimeError, "already staged"):
                    generator.publish_generated_files(["posts/article.html"], root, "test")


if __name__ == "__main__":
    unittest.main()
