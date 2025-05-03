from odoo import http
from odoo.http import request
import json
import logging
import traceback
import psycopg2

_logger = logging.getLogger(__name__)

class WarehouseController(http.Controller):

    @http.route('/warehouse', type='http', auth='public', website=True)
    def warehouse_list_page(self, **kw):
        return request.render('kiss_pos.template', {})

    @http.route('/api/warehouse_list', type='http', auth='public', csrf=False)
    def api_warehouse_list(self, **kw):
        _logger.info("API request received for warehouse list.")
        try:
            # Search for warehouses in the stock.warehouse model
            warehouses = request.env['stock.warehouse'].search([])
            
            all_warehouses = [{
                "id": w.id,
                "name": w.name,
                "code": w.code,
                "address": self._format_address(w.partner_id) if w.partner_id else "",
                "company_id": w.company_id.id if w.company_id else None,
                "company_name": w.company_id.name if w.company_id else None,
                "status": "Active" if w.active else "Inactive",
                "created_by": w.create_uid.name,
                "created_date": w.create_date.strftime('%m/%d/%y') if w.create_date else None,
                "modified_by": w.write_uid.name if w.write_uid else None,
                "modified_date": w.write_date.strftime('%m/%d/%y') if w.write_date else None
            } for w in warehouses]

            return request.make_response(
                json.dumps({'warehouses': all_warehouses}),
                headers=[('Content-Type', 'application/json')]
            )
        except Exception as e:
            _logger.error(f"Error fetching warehouses: {str(e)}")
            return request.make_response(
                json.dumps({'error': 'Internal Server Error'}),
                status=500
            )
    
    def _format_address(self, partner):
        """Format the partner address into a single string"""
        if not partner:
            return ""
        
        components = []
        if partner.street:
            components.append(partner.street)
        if partner.street2:
            components.append(partner.street2)
        
        city_state_zip = []
        if partner.city:
            city_state_zip.append(partner.city)
        if partner.state_id:
            city_state_zip.append(partner.state_id.name)
        if partner.zip:
            city_state_zip.append(partner.zip)
        
        if city_state_zip:
            components.append(", ".join(city_state_zip))
        
        if partner.country_id:
            components.append(partner.country_id.name)
        
        return ", ".join(components)

    @http.route('/api/warehouse_create', type='http', auth='public', methods=['POST'], csrf=False)
    def api_warehouse_create(self, **kw):
        _logger.info("API request received to create a warehouse")
        try:
            # Get request data from JSON body
            data = json.loads(request.httprequest.data.decode('utf-8'))
            
            # Validate required fields
            if not data.get('name'):
                return request.make_response(
                    json.dumps({'success': False, 'error': 'Warehouse name is required'}),
                    headers=[('Content-Type', 'application/json')],
                    status=400
                )
            
            # Generate short code from name (first 5 characters uppercase)
            code = data.get('name', '')[:5].upper()
            if 'code' in data and data['code']:
                code = data['code']
            
            # Create partner for warehouse address if address details are provided
            partner_id = False
            if any([data.get('address'), data.get('city'), data.get('state_id'), 
                    data.get('zip_code'), data.get('country_id')]):
                
                partner_values = {
                    'name': data.get('name'),
                    'street': data.get('address', False),
                    'city': data.get('city', False),
                    'zip': data.get('zip_code', False),
                    'company_id': request.env.user.company_id.id,
                    'type': 'delivery',  # Address type
                }
                
                # Add state and country if provided
                if data.get('state_id'):
                    try:
                        state_id = int(data.get('state_id'))
                        partner_values['state_id'] = state_id
                    except (ValueError, TypeError):
                        _logger.warning(f"Invalid state_id format: {data.get('state_id')}")
                
                if data.get('country_id'):
                    try:
                        country_id = int(data.get('country_id'))
                        partner_values['country_id'] = country_id
                    except (ValueError, TypeError):
                        _logger.warning(f"Invalid country_id format: {data.get('country_id')}")
                
                # Create partner
                _logger.info(f"Creating partner with values: {partner_values}")
                partner = request.env['res.partner'].sudo().create(partner_values)
                partner_id = partner.id
                _logger.info(f"Partner created with ID: {partner_id}")
            
            # Create warehouse
            warehouse_values = {
                'name': data.get('name'),
                'code': code,
                'company_id': request.env.user.company_id.id,
            }
            
            # Link partner if created
            if partner_id:
                warehouse_values['partner_id'] = partner_id
            
            # Create warehouse
            _logger.info(f"Creating warehouse with values: {warehouse_values}")
            warehouse = request.env['stock.warehouse'].sudo().create(warehouse_values)
            _logger.info(f"Warehouse created with ID: {warehouse.id}")
            
            return request.make_response(
                json.dumps({
                    'success': True, 
                    'warehouse_id': warehouse.id,
                    'warehouse_name': warehouse.name,
                    'warehouse_code': warehouse.code,
                    'message': f"Warehouse '{data.get('name')}' created successfully"
                }),
                headers=[('Content-Type', 'application/json')]
            )
            
        except Exception as e:
            _logger.error(f"Error creating warehouse: {str(e)}")
            _logger.error(traceback.format_exc())
            return request.make_response(
                json.dumps({
                    'success': False, 
                    'error': str(e)
                }),
                headers=[('Content-Type', 'application/json')],
                status=500
            )

    @http.route('/api/warehouse_delete/<int:warehouse_id>', type='http', auth='public', methods=['DELETE'], csrf=False)
    def api_warehouse_delete(self, warehouse_id, **kw):
        _logger.info(f"API request received to delete warehouse ID: {warehouse_id}")
        
        try:
            # Get the warehouse record
            warehouse = request.env['stock.warehouse'].with_context(active_test=False).browse(warehouse_id)
            
            if not warehouse.exists():
                return request.make_response(
                    json.dumps({'error': f'Warehouse with ID {warehouse_id} not found'}),
                    status=404,
                    headers=[('Content-Type', 'application/json')]
                )
            
            # Store the name for logging
            warehouse_name = warehouse.name
            _logger.info(f"Deleting warehouse: {warehouse_name} (ID: {warehouse_id})")
            
            # Use direct database access for efficient handling
            cr = request.env.cr
            
            # 1. Find and delete stock rules referencing this warehouse's picking types
            cr.execute("""
                SELECT id FROM stock_picking_type 
                WHERE warehouse_id = %s
            """, (warehouse_id,))
            all_picking_type_ids = [r[0] for r in cr.fetchall()]
            
            if all_picking_type_ids:
                cr.execute("""
                    SELECT id FROM stock_rule 
                    WHERE picking_type_id IN %s
                """, (tuple(all_picking_type_ids),))
                all_stock_rule_ids = [r[0] for r in cr.fetchall()]
                
                if all_stock_rule_ids:
                    _logger.info(f"Deleting {len(all_stock_rule_ids)} stock rules")
                    cr.execute("""
                        DELETE FROM stock_rule 
                        WHERE id IN %s
                    """, (tuple(all_stock_rule_ids),))
            
            # 2. Delete route-warehouse references (corrected query)
            cr.execute("""
                DELETE FROM stock_route_warehouse
                WHERE warehouse_id = %s
            """, (warehouse_id,))
            
            # 3. Try ORM deletion first
            try:
                warehouse.unlink()
                _logger.info(f"Successfully deleted warehouse: {warehouse_name}")
            except Exception as inner_e:
                _logger.warning(f"ORM deletion failed, trying direct SQL deletion")
                
                # Delete dependencies in correct order
                cr.execute("DELETE FROM stock_putaway_rule WHERE warehouse_id = %s", (warehouse_id,))
                cr.execute("DELETE FROM stock_warehouse_orderpoint WHERE warehouse_id = %s", (warehouse_id,))
                cr.execute("DELETE FROM stock_picking_type WHERE warehouse_id = %s", (warehouse_id,))
                cr.execute("DELETE FROM stock_location WHERE warehouse_id = %s", (warehouse_id,))
                cr.execute("DELETE FROM stock_warehouse WHERE id = %s", (warehouse_id,))
                _logger.info(f"Successfully deleted warehouse: {warehouse_name} via SQL")
            
            return request.make_response(
                json.dumps({
                    'success': True,
                    'message': f'Warehouse {warehouse_name} successfully deleted'
                }),
                headers=[('Content-Type', 'application/json')]
            )
        except Exception as e:
            _logger.error(f"Error deleting warehouse ID {warehouse_id}: {str(e)}")
            
            if isinstance(e, psycopg2.Error):
                _logger.error(f"Database error: {e.pgerror if hasattr(e, 'pgerror') else str(e)}")
                
            return request.make_response(
                json.dumps({'error': 'Internal Server Error', 'details': str(e)}),
                status=500,
                headers=[('Content-Type', 'application/json')]
            )
        

    @http.route('/api/warehouse/<int:warehouse_id>', type='http', auth='public', csrf=False)
    def api_warehouse_by_id(self, warehouse_id, **kw):
        _logger.info(f"API request received for warehouse ID: {warehouse_id}")
        try:
            # Search for specific warehouse by ID
            warehouse = request.env['stock.warehouse'].browse(warehouse_id)
            
            # Check if warehouse exists
            if not warehouse.exists():
                return request.make_response(
                    json.dumps({'error': f'Warehouse with ID {warehouse_id} not found'}),
                    status=404,
                    headers=[('Content-Type', 'application/json')]
                )
            
            # Format warehouse data
            warehouse_data = {
                "id": warehouse.id,
                "name": warehouse.name,
                "code": warehouse.code,
                "address": self._format_address(warehouse.partner_id) if warehouse.partner_id else "",
                "company_id": warehouse.company_id.id if warehouse.company_id else None,
                "company_name": warehouse.company_id.name if warehouse.company_id else None,
                "status": "Active" if warehouse.active else "Inactive",
                "created_by": warehouse.create_uid.name,
                "created_date": warehouse.create_date.strftime('%m/%d/%y') if warehouse.create_date else None,
                "modified_by": warehouse.write_uid.name if warehouse.write_uid else None,
                "modified_date": warehouse.write_date.strftime('%m/%d/%y') if warehouse.write_date else None
            }

            return request.make_response(
                json.dumps({'warehouse': warehouse_data}),
                headers=[('Content-Type', 'application/json')]
            )
        except Exception as e:
            _logger.error(f"Error fetching warehouse ID {warehouse_id}: {str(e)}")
            _logger.error(traceback.format_exc())
            return request.make_response(
                json.dumps({'error': 'Internal Server Error'}),
                status=500,
                headers=[('Content-Type', 'application/json')]
            )
        

    @http.route('/api/warehouse_update/<int:warehouse_id>', type='http', auth='public', methods=['PUT'], csrf=False)
    def api_warehouse_update(self, warehouse_id, **kw):
        _logger.info(f"API request received to update warehouse ID: {warehouse_id}")
        try:
            # Get request data from JSON body
            data = json.loads(request.httprequest.data.decode('utf-8'))
            
            # Find the warehouse
            warehouse = request.env['stock.warehouse'].sudo().browse(warehouse_id)
            if not warehouse.exists():
                return request.make_response(
                    json.dumps({'success': False, 'error': f'Warehouse with ID {warehouse_id} not found'}),
                    headers=[('Content-Type', 'application/json')],
                    status=404
                )
            
            # Validate required fields
            if not data.get('name'):
                return request.make_response(
                    json.dumps({'success': False, 'error': 'Warehouse name is required'}),
                    headers=[('Content-Type', 'application/json')],
                    status=400
                )
            
            # Update warehouse name
            warehouse_values = {
                'name': data.get('name'),
            }
            
            # Handle partner/address updates
            if warehouse.partner_id:
                # Update existing partner
                partner_values = {
                    'name': data.get('name'),  # Update partner name to match warehouse
                }
                
                # Update address fields if provided
                if 'address' in data:
                    partner_values['street'] = data.get('address', False)
                if 'city' in data:
                    partner_values['city'] = data.get('city', False)
                if 'zip_code' in data:
                    partner_values['zip'] = data.get('zip_code', False)
                
                # Update state if provided
                if data.get('state_id'):
                    try:
                        state_id = int(data.get('state_id'))
                        partner_values['state_id'] = state_id
                    except (ValueError, TypeError):
                        _logger.warning(f"Invalid state_id format: {data.get('state_id')}")
                
                # Update country if provided
                if data.get('country_id'):
                    try:
                        country_id = int(data.get('country_id'))
                        partner_values['country_id'] = country_id
                    except (ValueError, TypeError):
                        _logger.warning(f"Invalid country_id format: {data.get('country_id')}")
                
                # Update partner
                warehouse.partner_id.sudo().write(partner_values)
            
            elif any([data.get('address'), data.get('city'), data.get('state_id'), 
                    data.get('zip_code'), data.get('country_id')]):
                # Create new partner if address details are provided but no partner exists
                partner_values = {
                    'name': data.get('name'),
                    'street': data.get('address', False),
                    'city': data.get('city', False),
                    'zip': data.get('zip_code', False),
                    'company_id': request.env.user.company_id.id,
                    'type': 'delivery',  # Address type
                }
                
                # Add state and country if provided
                if data.get('state_id'):
                    try:
                        state_id = int(data.get('state_id'))
                        partner_values['state_id'] = state_id
                    except (ValueError, TypeError):
                        _logger.warning(f"Invalid state_id format: {data.get('state_id')}")
                
                if data.get('country_id'):
                    try:
                        country_id = int(data.get('country_id'))
                        partner_values['country_id'] = country_id
                    except (ValueError, TypeError):
                        _logger.warning(f"Invalid country_id format: {data.get('country_id')}")
                
                # Create partner
                partner = request.env['res.partner'].sudo().create(partner_values)
                warehouse_values['partner_id'] = partner.id
            
            # Update warehouse
            warehouse.sudo().write(warehouse_values)
            
            return request.make_response(
                json.dumps({
                    'success': True, 
                    'warehouse_id': warehouse.id,
                    'warehouse_name': warehouse.name,
                    'warehouse_code': warehouse.code,
                    'message': f"Warehouse '{data.get('name')}' updated successfully"
                }),
                headers=[('Content-Type', 'application/json')]
            )
            
        except Exception as e:
            _logger.error(f"Error updating warehouse: {str(e)}")
            _logger.error(traceback.format_exc())
            return request.make_response(
                json.dumps({
                    'success': False, 
                    'error': str(e)
                }),
                headers=[('Content-Type', 'application/json')],
                status=500
            )