from odoo import http, api, SUPERUSER_ID, registry
from odoo.http import request
import json
import logging
import odoo
from odoo.service.db import exp_create_database, list_dbs, exp_db_exist, exp_drop, db_connect
import odoo.tools as tools
import requests
import time
import string
import random
import psycopg2
import datetime
from odoo.exceptions import AccessDenied, AccessError, UserError
from contextlib import closing

_logger = logging.getLogger(__name__)

CREDENTIAL_PARAMS = ['login', 'password', 'type']

class TenantAPIController(http.Controller):
    
    @http.route('/tenant/create_tenant', type='json', auth='user', methods=['POST'], csrf=False)
    def create_tenant(self, **kwargs):

        if not request.env.user.has_group('base.group_system'):
            return {
                "success": False,
                "error": "Access denied: Only administrators can create new tenants"
            }
            
        db_name = kwargs.get('db_name')
        password = kwargs.get('password')
        login = kwargs.get('login')
        
        _logger.info("Creating tenant database: %s", db_name)
        
        if not db_name or not password or not login:
            return {
                "success": False,
                "error": "Missing required parameters: db_name, login, password"
            }
        
        try:
            # Check if database already exists
            if db_name in list_dbs():
                return {
                    "success": False,
                    "error": f"Database '{db_name}' already exists"
                }
                
            result = exp_create_database(
                db_name,
                False,
                "en_US",
                password,
                login
            )
            
            return {
                "success": True,
                "message": f"Database '{db_name}' created successfully"
            }
            
        except Exception as e:
            _logger.error("Failed to create DB: %s", str(e))
            return {
                "success": False,
                "error": str(e)
            }
            
    @http.route('/tenant/tenant_login', type='json', auth='none', methods=['POST'], csrf=False)
    def tenant_login(self, **kwargs):
        db_name = kwargs.get('db_name')
        
        credential = {
            key: kwargs.get(key) 
            for key in CREDENTIAL_PARAMS 
            if key in kwargs and kwargs.get(key)
        }
        credential.setdefault('type', 'password')
        
        if not db_name or not credential.get('login') or not credential.get('password'):
            return {
                "success": False,
                "error": "Missing required parameters: db_name, login, password"
            }

        try:
            dbs = list_dbs()
            if db_name not in dbs:
                return {
                    "success": False,
                    "error": f"Database '{db_name}' does not exist"
                }

            if request.session.db:
                request.session.logout()
            
            request.session.db = db_name
            
            try:
                auth_info = request.session.authenticate(db_name, credential)
                
                if not auth_info or not auth_info.get('uid'):
                    return {
                        "success": False,
                        "error": "Authentication failed: Invalid username or password"
                    }
                
                uid = auth_info['uid']
                
                db = odoo.sql_db.db_connect(db_name)
                with db.cursor() as cr:
                    env = odoo.api.Environment(cr, uid, {})
                    user = env['res.users'].browse(uid)
                    company = user.company_id
                    partner = user.partner_id
                    
                    allowed_companies = {
                        str(comp.id): comp.name for comp in user.company_ids
                    }
                    
                    result = {
                        'success': True,
                        'uid': uid,
                        'db': db_name,
                        'partner_name': partner.name,
                        'username': user.login,
                        'partner_id': partner.id,
                        'company_id': company.id,
                        'company_name': company.name,
                        'user_companies': {
                            'current_company': company.id,
                            'allowed_companies': allowed_companies
                        },
                        'is_system': not user.share,
                        'session_id': request.session.sid
                    }
                    
                    return result
                
            except odoo.exceptions.AccessDenied as e:
                error_message = "Wrong login/password" if e.args == odoo.exceptions.AccessDenied().args else e.args[0]
                return {
                    "success": False,
                    "error": error_message
                }
            
        except Exception as e:
            _logger.error("Login failed: %s", str(e))
            return {
                "success": False,
                "error": str(e)
            }
        
    @http.route('/tenant/sync_modules', type='json', auth='user', methods=['POST'], csrf=False)
    def sync_modules(self, **kwargs):
        _logger.info("🔄 /sync_modules called")
        _logger.info("📦 kwargs: %s", kwargs)
        
        db_name = kwargs.get('db_name')
        modules = kwargs.get('modules', [])
        
        _logger.info("🧩 db_name: %s", db_name)
        _logger.info("📚 modules: %s", modules)
        
        if not db_name:
            return {
                "error": "Missing `db_name` in request payload"
            }
        
        if not modules:
            return {
                "error": "Missing `modules` in request payload"
            }
        
        try:
            # Get the registry for the tenant DB
            db_registry = registry(db_name)
            with db_registry.cursor() as cr:
                env = api.Environment(cr, SUPERUSER_ID, {})
                
                module_obj = env['ir.module.module']
                
                installed_modules = []
                upgraded_modules = []
                failed_modules = []
                
                for module_name in modules:
                    try:
                        # Search for the module
                        module = module_obj.search([('name', '=', module_name)], limit=1)
                        
                        if not module:
                            failed_modules.append({
                                "name": module_name,
                                "error": "Module not found"
                            })
                            continue
                        
                        # Check if already installed
                        if module.state == 'installed':
                            # Upgrade module
                            module.button_immediate_upgrade()
                            upgraded_modules.append(module_name)
                        else:
                            # Install module
                            module.button_immediate_install()
                            installed_modules.append(module_name)
                            
                        # Commit changes
                        cr.commit()
                        
                    except Exception as module_error:
                        failed_modules.append({
                            "name": module_name,
                            "error": str(module_error)
                        })
                        cr.rollback()
                
                return {
                    "success": True,
                    "installed": installed_modules,
                    "upgraded": upgraded_modules,
                    "failed": failed_modules
                }
        
        except Exception as e:
            _logger.error("❌ Failed to sync modules: %s", str(e))
            return {
                "success": False,
                "error": str(e)
            }

    @http.route('/tenant/status/<string:db_name>', type='http', auth='user', methods=['GET'], csrf=False)
    def check_db_status(self, db_name):
        _logger.info("🔍 /tenant/status/%s called", db_name)
        
        result = {
            "database": db_name,
            "exists": False,
            "status": "unknown",
            "modules": [],
            "version": None
        }
        
        # Check if the database exists
        db_exists = exp_db_exist(db_name)
        result["exists"] = db_exists
        
        if not db_exists:
            result["status"] = "not_found"
            response = request.make_response(json.dumps(result, indent=4))
            response.headers['Content-Type'] = 'application/json'
            return response
        
        try:

            result["status"] = "operational"
            
            # Now get more information using the registry
            try:
                db_registry = registry(db_name)
                with db_registry.cursor() as cr:
                    env = api.Environment(cr, SUPERUSER_ID, {})
                    
                    # Get Odoo version
                    version_info = env['ir.module.module'].sudo().get_module_info('base')
                    if version_info and 'version' in version_info:
                        result["version"] = version_info['version']
                    
                    # Get installed modules
                    modules = env['ir.module.module'].sudo().search([
                        ('state', '=', 'installed')
                    ])
                    
                    result["modules"] = [
                        {
                            "name": module.name,
                            "state": module.state,
                            "latest_version": module.latest_version
                        } for module in modules
                    ]
            except Exception as registry_error:
                _logger.error("⚠️ Error accessing Odoo registry: %s", str(registry_error))
                result["status"] = "database_exists_registry_error"
                result["error"] = str(registry_error)
        
        except Exception as db_error:
            _logger.error("⚠️ Error connecting to database: %s", str(db_error))
            result["status"] = "error"
            result["error"] = str(db_error)
        
        # Return the result as JSON with pretty-printing
        response = request.make_response(json.dumps(result, indent=4))
        response.headers['Content-Type'] = 'application/json'
        return response

    # Get All Tenants API
    @http.route('/tenant/all', type='http', auth='user', methods=['GET'], csrf=False)
    def get_tenants(self):
        _logger.info("🔍 /tenants GET endpoint called")
        
        try:
            # Get list of all databases (tenants)
            databases = list_dbs()

            
            response = {
                "status": "success",
                "count": len(databases),
                "tenants": databases
            }
            
            _logger.info("📊 Found %s tenants", len(databases))
            
            # Return JSON response
            return request.make_response(
                json.dumps(response),
                headers=[('Content-Type', 'application/json')]
            )
        except Exception as e:
            _logger.error("❌ Failed to retrieve tenants: %s", str(e))
            error_response = {
                "status": "error",
                "message": str(e)
            }
            return request.make_response(json.dumps(error_response), status=500)
    
    # Delete Tenant API:
    @http.route('/tenant/<string:db_name>', type='http', auth='user', methods=['DELETE'], csrf=False)
    def delete_tenant_restful(self, db_name):
        _logger.info("🔒 DELETE /tenant/%s endpoint called - disabling access", db_name)
        
        try:
            # Check if database exists
            databases = list_dbs()
            if db_name not in databases:
                error_response = {
                    "status": "error",
                    "message": f"Database '{db_name}' does not exist"
                }
                return request.make_response(
                    json.dumps(error_response),
                    headers=[('Content-Type', 'application/json')],
                    status=404
                )
            
            # Connect to the database
            db = db_connect(db_name)
            with closing(db.cursor()) as cr:
                # 1. Disable all users except admin (id=2 is typically admin)
                cr.execute("""
                    UPDATE res_users 
                    SET active = False, login = login || '_disabled'
                    WHERE id != 2
                """)
                
                # 2. Reset admin password to something random
                import uuid
                random_pwd = str(uuid.uuid4())
                cr.execute("""
                    UPDATE res_users 
                    SET password = %s
                    WHERE id = 2
                """, [random_pwd])
                
                # 3. Make the database invisible in the database selector
                cr.execute("""
                    UPDATE ir_config_parameter
                    SET value = 'False'
                    WHERE key = 'database.is_visible';
                    
                    INSERT INTO ir_config_parameter (key, value)
                    SELECT 'database.is_visible', 'False'
                    WHERE NOT EXISTS (SELECT 1 FROM ir_config_parameter WHERE key = 'database.is_visible');
                """)
                
                # 4. Create a record to mark the database as disabled
                current_date = datetime.datetime.now()
                cr.execute("""
                    CREATE TABLE IF NOT EXISTS database_access_disabled (
                        id SERIAL PRIMARY KEY,
                        disable_date TIMESTAMP NOT NULL,
                        admin_password VARCHAR
                    )
                """)
                
                # Check if already disabled
                cr.execute("SELECT COUNT(*) FROM database_access_disabled")
                count = cr.fetchone()[0]
                
                if count == 0:
                    cr.execute("""
                        INSERT INTO database_access_disabled (disable_date, admin_password)
                        VALUES (%s, %s)
                    """, [current_date, random_pwd])
                
                cr.commit()
            
            _logger.info("✅ Database '%s' access disabled successfully", db_name)
            
            success_response = {
                "status": "success",
                "message": f"Database '{db_name}' access disabled successfully",
                "admin_password": random_pwd
            }
            
            return request.make_response(
                json.dumps(success_response),
                headers=[('Content-Type', 'application/json')],
                status=200
            )
        except Exception as e:
            _logger.error("❌ Failed to disable database access: %s", str(e))
            error_response = {
                "status": "error",
                "message": str(e)
            }
            return request.make_response(
                json.dumps(error_response),
                headers=[('Content-Type', 'application/json')],
                status=500
            )