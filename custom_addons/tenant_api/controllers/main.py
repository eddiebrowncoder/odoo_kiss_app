from odoo import http
from odoo.http import request
import json
import requests
import logging

_logger = logging.getLogger(__name__)

class TenantAPIController(http.Controller):

    @http.route('/create_tenant', type='json', auth='none', methods=['POST'], csrf=False)
    def create_tenant(self, **kwargs):
        master_password = "admin"
        db_name = kwargs.get('db_name')
        admin_password = kwargs.get('admin_password')
        admin_email = kwargs.get('admin_email')

        _logger.info("🔥 /create_tenant called")
        _logger.info("📦 kwargs: %s", kwargs)
        _logger.info("🧩 db_name: %s", db_name)
        _logger.info("🔐 admin_password: %s", admin_password)
        _logger.info("📧 admin_email: %s", admin_email)

        if not db_name:
            return {
                "error": "Missing `db_name` in request payload"
            }

        jsonrpc_payload = {
            "jsonrpc": "2.0",
            "method": "call",
            "params": {
                "service": "db",
                "method": "create_database",
                "args": [
                    master_password, 
                    db_name,
                    False,
                    "en_US",
                    admin_password,
                    admin_email
                ]
            },
            "id": None
        }

        try:
            response = requests.post(
                'http://localhost:8069/jsonrpc',
                headers={'Content-Type': 'application/json'},
                data=json.dumps(jsonrpc_payload)
            )
            return response.json()

        except Exception as e:
            _logger.error("❌ Failed to create DB: %s", str(e))
            return {
                "error": str(e)
            }
