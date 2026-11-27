"""Loopback HTTP contract tests with a synthetic inference stub."""
import http.client
import json
import threading
import unittest
from unittest.mock import patch
from serve import Server


class ServiceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.token = "synthetic_test_token_" + "x" * 32
        cls.server = Server(("127.0.0.1", 0), cls.token, object(), "a" * 64)
        cls.worker = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.worker.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.worker.join()

    def request(self, method, route, data=None, token=True):
        conn = http.client.HTTPConnection(*self.server.server_address, timeout=3)
        headers = {"Content-Type":"application/json"}
        if token:
            headers["Authorization"] = "Bearer " + self.token
        conn.request(method, route, data, headers)
        response = conn.getresponse()
        value = (response.status, json.loads(response.read()), response.getheader("Cache-Control"))
        conn.close()
        return value

    def test_unauthenticated_cannot_probe_checkpoint(self):
        status, body, cache = self.request("GET", "/health", token=False)
        self.assertEqual(status, 401)
        self.assertNotIn("checkpoint", body)
        self.assertEqual(cache, "no-store")

    def test_malformed_messages_never_reach_inference(self):
        with patch("serve.generate") as generate:
            status, _, _ = self.request("POST", "/generate", json.dumps({"messages":[{"role":"assistant","content":"bad"}]}))
            self.assertEqual(status, 400)
            generate.assert_not_called()

    def test_isolated_inference_identity_and_busy(self):
        data = json.dumps({"messages":[{"role":"user","content":"Synthetic prompt"}]})
        with patch("serve.generate", return_value="Synthetic reply") as generate:
            status, body, _ = self.request("POST", "/generate", data)
            self.assertEqual((status, body["checkpoint"], body["experimental"]), (200, "a"*64, True))
            self.assertEqual(body["text"], "Synthetic reply")
            self.assertEqual(generate.call_count, 1)
            self.server.slot.acquire()
            try:
                self.assertEqual(self.request("POST", "/generate", data)[0], 429)
                self.assertEqual(generate.call_count, 1)
            finally:
                self.server.slot.release()


if __name__ == "__main__":
    unittest.main()
