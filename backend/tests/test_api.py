import unittest
from app.__main__ import app

class ApiTests(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_health_reports_controller_disconnected(self):
        response = self.client.get('/api/health')
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.get_json()['controller_connected'])

    def test_topology_has_two_paths(self):
        response = self.client.get('/api/topology')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()['mode'], 'demo')
        self.assertGreaterEqual(len(response.get_json()['data']['links']), 5)

    def test_optimize_does_not_claim_success_without_controller(self):
        response = self.client.post('/api/traffic-engineering/optimize', json={'source': 'h1', 'destination': 'h2'})
        self.assertEqual(response.status_code, 503)
        self.assertFalse(response.get_json()['openflow_rules_installed'])

if __name__ == '__main__':
    unittest.main()
