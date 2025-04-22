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