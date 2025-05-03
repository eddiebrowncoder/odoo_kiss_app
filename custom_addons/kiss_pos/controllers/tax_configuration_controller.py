from odoo import http
from odoo.http import request
import json
import logging
import traceback
import psycopg2
import time

_logger = logging.getLogger(__name__)

class TaxController(http.Controller):

    @http.route('/tax_configuration', type='http', auth='public', website=True)
    def warehouse_list_page(self, **kw):
        return request.render('kiss_pos.template', {})
    
    @http.route('/api/taxes', type='http', auth='user', methods=['GET'], csrf=False)
    def get_taxes(self, **kwargs):
        try:
            import time
            start_time = time.time()
            
            _logger = logging.getLogger(__name__)
            _logger.info("Tax API request received with parameters: %s", kwargs)
            
            # Get filter parameters if needed
            tax_type = kwargs.get('type')
            active_filter = kwargs.get('active')
            
            # Create base domain
            domain = []
            
            # Handle active filter - important to use context for inactive records!
            context = dict(request.env.context)
            
            if active_filter:
                if active_filter.lower() == 'true':
                    domain.append(('active', '=', True))
                elif active_filter.lower() == 'false':
                    domain.append(('active', '=', False))
            else:
                # When no active filter is provided, we need to explicitly include inactive records
                # This is done by adding a special context
                context['active_test'] = False
            
            if tax_type:
                domain.append(('type_tax_use', '=', tax_type))
            
            _logger.debug("Searching taxes with domain: %s and active_test: %s", 
                        domain, context.get('active_test', True))
            
            # Fetch taxes with the updated context
            taxes = request.env['account.tax'].with_context(context).search_read(
                domain=domain,
                fields=['id', 'name', 'amount', 'type_tax_use', 'amount_type', 'active', 'description'],
                order='name'
            )
            
            _logger.info("Successfully fetched %d taxes", len(taxes))
            _logger.debug("Taxes active status count: Active=%d, Inactive=%d", 
                        sum(1 for tax in taxes if tax.get('active')),
                        sum(1 for tax in taxes if not tax.get('active')))
            
            # Log performance
            execution_time = time.time() - start_time
            _logger.info("Tax API request completed in %.3f seconds", execution_time)
            
            return request.make_response(
                json.dumps({'success': True, 'data': taxes, 'count': len(taxes)}),
                headers=[('Content-Type', 'application/json')]
            )
        except Exception as e:
            _logger = logging.getLogger(__name__)
            _logger.exception("Error fetching taxes: %s", str(e))
            
            return request.make_response(
                json.dumps({
                    'success': False, 
                    'error': str(e),
                    'error_type': type(e).__name__
                }),
                headers=[('Content-Type', 'application/json')],
                status=500
            )
    
     # Create Tax:
    @http.route('/api/taxes', type='http', auth='user', methods=['POST'], csrf=False)
    def create_taxes(self, **kwargs):
        try:
            import time
            start_time = time.time()
            
            _logger = logging.getLogger(__name__)
            _logger.info("Tax creation API request received")
            
            # Parse JSON data from request body
            data = json.loads(request.httprequest.data)
            _logger.debug("Received data: %s", data)
            
            # Extract fields from the JSON data
            tax_name = data.get('name')
            # tax_type = data.get('type_tax_use')
            amount_type = data.get('amount_type')
            tax_rate = data.get('amount')
            active = data.get('active', True)
            
            # Validate the required fields
            # if not tax_name or not tax_type or tax_rate is None:
            #     return request.make_response(
            #         json.dumps({
            #             'success': False,
            #             'error': 'Missing required fields (name, type_tax_use, amount)'
            #         }),
            #         headers=[('Content-Type', 'application/json')],
            #         status=400
            #     )
            
            # Create the new tax record
            tax = request.env['account.tax'].create({
                'name': tax_name,
                'amount_type': amount_type,
                # 'type_tax_use': tax_type,
                'amount': tax_rate,
                'active': active
            })
            
            _logger.info("Successfully created tax: %s", tax.name)
            
            # Log performance
            execution_time = time.time() - start_time
            _logger.info("Tax creation API request completed in %.3f seconds", execution_time)
            
            # Return response with success and the created tax data
            return request.make_response(
                json.dumps({
                    'success': True,
                    'data': {
                        'id': tax.id,
                        'name': tax.name,
                        'type_tax_use': tax.type_tax_use,
                        'amount': tax.amount,
                        'active': tax.active
                    }
                }),
                headers=[('Content-Type', 'application/json')]
            )
            
        except json.JSONDecodeError as e:
            _logger.exception("Invalid JSON data: %s", str(e))
            return request.make_response(
                json.dumps({
                    'success': False,
                    'error': 'Invalid JSON data',
                    'error_type': 'JSONDecodeError'
                }),
                headers=[('Content-Type', 'application/json')],
                status=400
            )
        except Exception as e:
            _logger = logging.getLogger(__name__)
            _logger.exception("Error creating tax: %s", str(e))
            
            return request.make_response(
                json.dumps({
                    'success': False,
                    'error': str(e),
                    'error_type': type(e).__name__
                }),
                headers=[('Content-Type', 'application/json')],
                status=500
            )

    @http.route('/api/taxes/<int:tax_id>', type='http', auth='user', methods=['DELETE'], csrf=False)
    def delete_tax(self, tax_id, **kwargs):
        try:
            import time
            start_time = time.time()
            
            _logger = logging.getLogger(__name__)
            _logger.info("Delete tax API request received for tax ID: %s", tax_id)
            
            # Get tax record
            tax = request.env['account.tax'].browse(tax_id)
            
            if not tax.exists():
                _logger.warning("Attempted to delete non-existent tax with ID: %s", tax_id)
                return request.make_response(
                    json.dumps({
                        'success': False, 
                        'error': 'Tax not found',
                        'error_type': 'NotFound'
                    }),
                    headers=[('Content-Type', 'application/json')],
                    status=404
                )
            
            # Store tax info before deletion for response
            tax_info = {
                'id': tax.id,
                'name': tax.name,
                'amount': tax.amount,
                'type_tax_use': tax.type_tax_use,
                'amount_type': tax.amount_type,
                'active': tax.active,
            }
            
            # Check if the tax can be deleted (not used in transactions)
            if self._check_tax_in_use(tax):
                _logger.warning("Cannot delete tax ID %s as it's in use", tax_id)
                return request.make_response(
                    json.dumps({
                        'success': False, 
                        'error': 'Cannot delete this tax as it is being used in transactions',
                        'error_type': 'ValidationError'
                    }),
                    headers=[('Content-Type', 'application/json')],
                    status=400
                )
            
            # Perform delete operation
            tax.unlink()
            _logger.info("Successfully deleted tax ID: %s", tax_id)
            
            # Log performance
            execution_time = time.time() - start_time
            _logger.info("Delete tax API request completed in %.3f seconds", execution_time)
            
            return request.make_response(
                json.dumps({
                    'success': True, 
                    'message': f"Tax '{tax_info['name']}' successfully deleted",
                    'deleted_tax': tax_info
                }),
                headers=[('Content-Type', 'application/json')]
            )
            
        except Exception as e:
            _logger = logging.getLogger(__name__)
            _logger.exception("Error deleting tax: %s", str(e))
            
            return request.make_response(
                json.dumps({
                    'success': False, 
                    'error': str(e),
                    'error_type': type(e).__name__
                }),
                headers=[('Content-Type', 'application/json')],
                status=500
            )

    def _check_tax_in_use(self, tax):
        """
        Check if the tax is being used in any transactions
        Returns True if tax is in use, False otherwise
        """
        # In Odoo 18, invoice models are part of account.move
        # Check account move lines for tax usage
        move_lines_with_tax = request.env['account.move.line'].search_count([
            '|',
            ('tax_ids', 'in', tax.id),
            ('tax_line_id', '=', tax.id)
        ])
        if move_lines_with_tax > 0:
            return True
        
        # Check if tax is used in any product templates
        product_templates = request.env['product.template'].search_count([
            '|',
            ('taxes_id', 'in', tax.id),
            ('supplier_taxes_id', 'in', tax.id)
        ])
        if product_templates > 0:
            return True
        
        # Check if tax is used in any fiscal positions
        fiscal_position_tax = request.env['account.fiscal.position.tax'].search_count([
            '|',
            ('tax_src_id', '=', tax.id),
            ('tax_dest_id', '=', tax.id)
        ])
        if fiscal_position_tax > 0:
            return True
        
        # Check if tax is used in any POS orders (if POS module is installed)
        if 'pos.order.line' in request.env:
            pos_order_lines = request.env['pos.order.line'].search_count([
                ('tax_ids', 'in', tax.id)
            ])
            if pos_order_lines > 0:
                return True
        
        return False
    
    @http.route('/api/taxes/<int:tax_id>', type='http', auth='user', methods=['PUT'], csrf=False)
    def update_tax(self, tax_id, **kwargs):
        try:
            import time
            start_time = time.time()
            
            _logger = logging.getLogger(__name__)
            _logger.info("Tax update API request received for tax ID: %s", tax_id)
            
            # Parse JSON data from request body
            data = json.loads(request.httprequest.data)
            _logger.debug("Update data received: %s", data)
            
            # Get tax record
            tax = request.env['account.tax'].browse(tax_id)
            
            if not tax.exists():
                _logger.warning("Attempted to update non-existent tax with ID: %s", tax_id)
                return request.make_response(
                    json.dumps({
                        'success': False, 
                        'error': 'Tax not found',
                        'error_type': 'NotFound'
                    }),
                    headers=[('Content-Type', 'application/json')],
                    status=404
                )
            
            # Prepare update values
            update_vals = {}
            
            # Fields that can be updated
            if 'name' in data:
                update_vals['name'] = data['name']
            
            if 'amount' in data:
                update_vals['amount'] = float(data['amount'])
            
            if 'type_tax_use' in data:
                valid_types = ['sale', 'purchase', 'none']
                if data['type_tax_use'] not in valid_types:
                    return request.make_response(
                        json.dumps({
                            'success': False, 
                            'error': f"Invalid type_tax_use. Must be one of: {valid_types}",
                            'error_type': 'ValidationError'
                        }),
                        headers=[('Content-Type', 'application/json')],
                        status=400
                    )
                update_vals['type_tax_use'] = data['type_tax_use']
            
            if 'amount_type' in data:
                valid_amount_types = ['percent', 'fixed', 'group', 'division']
                if data['amount_type'] not in valid_amount_types:
                    return request.make_response(
                        json.dumps({
                            'success': False, 
                            'error': f"Invalid amount_type. Must be one of: {valid_amount_types}",
                            'error_type': 'ValidationError'
                        }),
                        headers=[('Content-Type', 'application/json')],
                        status=400
                    )
                update_vals['amount_type'] = data['amount_type']
            
            if 'active' in data:
                update_vals['active'] = bool(data['active'])
            
            if 'description' in data:
                update_vals['description'] = data['description']
            
            if 'tax_scope' in data:
                update_vals['tax_scope'] = data['tax_scope']
            
            if 'price_include' in data:
                update_vals['price_include'] = bool(data['price_include'])
            
            if 'include_base_amount' in data:
                update_vals['include_base_amount'] = bool(data['include_base_amount'])
            
            if 'is_base_affected' in data:
                update_vals['is_base_affected'] = bool(data['is_base_affected'])
            
            if 'analytic' in data:
                update_vals['analytic'] = bool(data['analytic'])
            
            if 'sequence' in data:
                update_vals['sequence'] = int(data['sequence'])
            
            # Handle tax group for group taxes
            if 'amount_type' in update_vals and update_vals['amount_type'] == 'group' and 'children_tax_ids' in data:
                update_vals['children_tax_ids'] = [(6, 0, data['children_tax_ids'])]
            
            # Handle repartition lines (if provided)
            if 'invoice_repartition_line_ids' in data:
                update_vals['invoice_repartition_line_ids'] = data['invoice_repartition_line_ids']
            
            if 'refund_repartition_line_ids' in data:
                update_vals['refund_repartition_line_ids'] = data['refund_repartition_line_ids']
            
            # Check if there are any fields to update
            if not update_vals:
                return request.make_response(
                    json.dumps({
                        'success': False, 
                        'error': 'No valid fields provided for update',
                        'error_type': 'ValidationError'
                    }),
                    headers=[('Content-Type', 'application/json')],
                    status=400
                )
            
            # Perform update
            _logger.debug("Updating tax ID %s with values: %s", tax_id, update_vals)
            tax.write(update_vals)
            
            # Fetch updated tax data
            updated_tax = tax.read([
                'id', 'name', 'amount', 'type_tax_use', 'amount_type', 
                'active', 'description', 'tax_scope', 'price_include', 
                'include_base_amount', 'is_base_affected', 'analytic', 'sequence'
            ])[0]
            
            # Log performance
            execution_time = time.time() - start_time
            _logger.info("Tax updated successfully with ID: %d in %.3f seconds", tax.id, execution_time)
            
            return request.make_response(
                json.dumps({
                    'success': True, 
                    'data': updated_tax,
                    'message': f"Tax '{tax.name}' updated successfully"
                }),
                headers=[('Content-Type', 'application/json')]
            )
            
        except json.JSONDecodeError as e:
            _logger.exception("Invalid JSON data: %s", str(e))
            return request.make_response(
                json.dumps({
                    'success': False, 
                    'error': 'Invalid JSON data',
                    'error_type': 'JSONDecodeError'
                }),
                headers=[('Content-Type', 'application/json')],
                status=400
            )
        except ValueError as e:
            _logger.exception("Validation error: %s", str(e))
            return request.make_response(
                json.dumps({
                    'success': False, 
                    'error': str(e),
                    'error_type': 'ValidationError'
                }),
                headers=[('Content-Type', 'application/json')],
                status=400
            )
        except Exception as e:
            _logger.exception("Error updating tax: %s", str(e))
            return request.make_response(
                json.dumps({
                    'success': False, 
                    'error': str(e),
                    'error_type': type(e).__name__
                }),
                headers=[('Content-Type', 'application/json')],
                status=500
            )
    
    