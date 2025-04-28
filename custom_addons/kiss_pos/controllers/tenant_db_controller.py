from odoo import http
from odoo.http import request
import json
import logging
from odoo.service.db import exp_create_database

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
        
        try:
            # Use the correct function name from db.py
            result = exp_create_database(
                db_name,
                False,  # demo data flag
                "en_US",  # language
                admin_password,
                admin_email  # using email as login
            )
            
            if result:
                return {
                    "result": result,
                    "message": f"Database '{db_name}' created successfully"
                }
            else:
                return {"result": result}
            
        except Exception as e:
            _logger.error("❌ Failed to create DB: %s", str(e))
            return {
                "error": str(e)
            }