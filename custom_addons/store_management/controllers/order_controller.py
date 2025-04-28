from odoo import http, fields
from odoo.http import request
import json
import logging

_logger = logging.getLogger(__name__)

class OrderController(http.Controller):
    
    @http.route('/api/order/list/<int:store_id>', type='http', auth='public', methods=['GET'])
    def get_store_orders(self, store_id, **kwargs):
        """Get all orders in a specific store"""
        try:
            # Check if store exists using direct SQL to avoid ORM issues
            cr = request.env.cr
            cr.execute("SELECT id, name FROM pos_config WHERE id = %s", (store_id,))
            store_result = cr.dictfetchone()
            
            if not store_result:
                return json.dumps({
                    'status': 'error',
                    'message': f'Store with ID {store_id} not found'
                })
            
            store_name = store_result['name']
            
            # Get all order lines directly using SQL join
            cr.execute("""
                SELECT 
                    pol.id, 
                    pol.qty as quantity, 
                    pol.price_unit as unit_price, 
                    pol.price_subtotal as total_price,
                    pp.id as product_id, 
                    po.id as order_id, 
                    pp.barcode as barcode, 
                    jsonb_extract_path_text(pt.name, 'en_US') as item_name
                FROM pos_order_line pol
                JOIN pos_order po ON pol.order_id = po.id
                LEFT JOIN product_product pp ON pol.product_id = pp.id
                LEFT JOIN product_template pt ON pp.product_tmpl_id = pt.id
                WHERE po.config_id = %s
                AND po.state NOT IN ('cancel', 'done')
                AND pt.available_in_pos = true
                ORDER BY po.create_date DESC, pol.id DESC
            """, (store_id,))
            
            order_lines = cr.dictfetchall()
            
            return json.dumps({
                'status': 'success',
                'store_id': store_id,
                'store_name': store_name,
                'order_lines': order_lines
            })
            
        except Exception as e:
            _logger.error("Error in get_store_orders: %s", str(e))
            return json.dumps({
                'status': 'error',
                'message': f'An error occurred: {str(e)}'
            })
    
    @http.route('/api/order/add', type='http', auth='public', methods=['POST'], csrf=False)
    def add_order(self, **kwargs):
        """Add a new order to a specific store"""
        try:
            # Safely parse request data
            try:
                request_data = json.loads(request.httprequest.data)
            except Exception as e:
                return json.dumps({
                    'status': 'error', 
                    'message': f'Invalid JSON data: {str(e)}'
                })
                
            store_id = request_data.get('store_id')
            partner_id = request_data.get('partner_id')
            order_lines = request_data.get('order_lines', [])
            payment_method_id = request_data.get('payment_method_id')
            
            # Validate required fields
            if not store_id:
                return json.dumps({'status': 'error', 'message': 'Store ID is required'})
            
            if not order_lines:
                return json.dumps({'status': 'error', 'message': 'Order lines are required'})
            
            # Check if store exists
            pos_config_model = request.env['pos.config']
            store = pos_config_model.sudo().browse(int(store_id))
            if not store.exists():
                return json.dumps({'status': 'error', 'message': 'Store not found'})
            
            # Get active POS session for the store
            pos_session_model = request.env['pos.session']
            pos_session = pos_session_model.sudo().search([
                ('config_id', '=', int(store_id)),
                ('state', '=', 'opened')
            ], limit=1)
            
            if not pos_session:
                return json.dumps({'status': 'error', 'message': 'No active session found for this store'})
            
            # Prepare order lines
            order_line_vals = []
            product_model = request.env['product.product']
            
            amount_total = 0.0
            amount_tax = 0.0
            
            for line in order_lines:
                product_id = line.get('product_id')
                quantity = line.get('quantity', 1.0)
                price_unit = line.get('price_unit')
                
                if not product_id:
                    return json.dumps({'status': 'error', 'message': 'Product ID is required for each order line'})
                
                # Check if product exists
                product = product_model.sudo().browse(int(product_id))
                if not product.exists():
                    return json.dumps({'status': 'error', 'message': f'Product with ID {product_id} not found'})
                
                # If price not provided, use product's list price
                if not price_unit:
                    price_unit = product.list_price
                else:
                    price_unit = float(price_unit)
                
                quantity = float(quantity)
                discount = float(line.get('discount', 0.0))
                
                # Calculate price after discount
                price_subtotal_incl = price_unit * quantity * (1 - (discount / 100.0))
                
                # Calculate taxes if the product has taxes
                taxes = product.taxes_id
                price_subtotal_excl = price_subtotal_incl
                line_taxes = 0.0
                
                if taxes:
                    fiscal_position = pos_session.config_id.fiscal_position_ids.filtered(lambda fp: fp.auto_apply)
                    if partner_id and fiscal_position:
                        partner = request.env['res.partner'].sudo().browse(int(partner_id))
                        if partner.exists():
                            # Get applicable taxes based on fiscal position
                            taxes = fiscal_position[0].map_tax(taxes, product, partner) if fiscal_position else taxes
                    
                    # Calculate taxes
                    tax_ids = [(6, 0, taxes.ids)]
                    price_subtotal_excl = price_subtotal_incl / (1 + sum(tax.amount / 100 for tax in taxes))
                    line_taxes = price_subtotal_incl - price_subtotal_excl
                else:
                    tax_ids = [(6, 0, [])]
                
                # Create basic line values
                line_vals = {
                    'product_id': int(product_id),
                    'qty': quantity,
                    'price_unit': price_unit,
                    'price_subtotal': price_subtotal_excl,
                    'price_subtotal_incl': price_subtotal_incl,
                    'tax_ids': tax_ids,
                }
                
                # Add discount if available
                if 'discount' in line:
                    line_vals['discount'] = discount
                
                order_line_vals.append((0, 0, line_vals))
                
                # Update totals
                amount_total += price_subtotal_incl
                amount_tax += line_taxes
            
            # Create order values with mandatory fields
            order_vals = {
                'session_id': pos_session.id,
                'date_order': fields.Datetime.now(),
                'lines': order_line_vals,
                'amount_tax': amount_tax,
                'amount_total': amount_total,
                'amount_paid': 0.0,
                'amount_return': 0.0,
                'pricelist_id': pos_session.config_id.pricelist_id.id,
            }
            
            # Safely add other fields based on schema
            if hasattr(request.env['pos.order'], 'config_id'):
                order_vals['config_id'] = int(store_id)
                
            if hasattr(request.env['pos.order'], 'company_id') and hasattr(pos_session, 'config_id') and hasattr(pos_session.config_id, 'company_id'):
                order_vals['company_id'] = pos_session.config_id.company_id.id
            
            # Add partner if provided
            if partner_id:
                partner_model = request.env['res.partner']
                partner = partner_model.sudo().browse(int(partner_id))
                if partner.exists():
                    order_vals['partner_id'] = int(partner_id)
            
            # Create the POS order
            pos_order_model = request.env['pos.order']
            order = pos_order_model.sudo().create(order_vals)
            
            # Process payment if payment method provided
            if payment_method_id:
                # Check if the payment method exists
                payment_method_model = request.env['pos.payment.method']
                payment_method = payment_method_model.sudo().browse(int(payment_method_id))
                if not payment_method.exists():
                    return json.dumps({'status': 'error', 'message': f'Payment method with ID {payment_method_id} not found'})
                
                # Create payment
                payment_model = request.env['pos.payment']
                payment_vals = {
                    'pos_order_id': order.id,
                    'payment_method_id': int(payment_method_id),
                    'amount': amount_total,
                }
                
                payment = payment_model.sudo().create(payment_vals)
                
                # Update the order with payment information
                order.write({
                    'amount_paid': amount_total,
                    'amount_return': 0.0,
                })
                
                # Validate the order if payment is complete
                if hasattr(order, 'action_pos_order_paid'):
                    order.sudo().action_pos_order_paid()
            
            return json.dumps({
                'status': 'success',
                'message': 'Order created successfully',
                'order_id': order.id,
                'order_name': order.name
            })
            
        except Exception as e:
            return json.dumps({
                'status': 'error',
                'message': f'An error occurred: {str(e)}'
            })
    
    @http.route('/api/order/<int:order_id>/line/<int:line_id>', type='http', auth='public', methods=['DELETE'], csrf=False)
    def delete_order_line(self, order_id, line_id, **kwargs):
        """Delete a specific order line from an order"""
        try:
            # Find the order
            pos_order_model = request.env['pos.order']
            order = pos_order_model.sudo().browse(order_id)
            
            if not order.exists():
                return json.dumps({
                    'status': 'error',
                    'message': f'Order with ID {order_id} not found'
                })
            
            # Find the specific order line
            order_line_model = request.env['pos.order.line']
            order_line = order_line_model.sudo().browse(line_id)
            
            if not order_line.exists():
                return json.dumps({
                    'status': 'error',
                    'message': f'Order line with ID {line_id} not found'
                })
            
            # Verify that the line belongs to the specified order
            if order_line.order_id.id != order_id:
                return json.dumps({
                    'status': 'error',
                    'message': f'Order line {line_id} does not belong to order {order_id}'
                })
                
            # Check if order is in a state that allows modification
            if hasattr(order, 'state') and order.state not in ['draft', 'quotation']:
                return json.dumps({
                    'status': 'error',
                    'message': f'Cannot modify order in {order.state} state'
                })
            
            # Store product info before deletion for response
            product_name = order_line.product_id.name if order_line.product_id else 'Unknown Product'
            
            # Delete the order line
            order_line.sudo().unlink()
            
            # Let Odoo handle recalculation automatically through ORM
            # No explicit recalculation needed as it should be handled by Odoo's ORM
            
            return json.dumps({
                'status': 'success',
                'message': f'Product {product_name} removed from order {order.name} successfully',
                'order_id': order_id,
                'removed_line_id': line_id
            })
            
        except Exception as e:
            return json.dumps({
                'status': 'error',
                'message': f'An error occurred: {str(e)}'
            })
    
    @http.route('/api/order/<int:order_id>/line/<int:line_id>/update', type='http', auth='public', methods=['PUT'], csrf=False)
    def update_order_line_quantity(self, order_id, line_id, **kwargs):
        """Update quantity of a specific order line"""
        try:
            # Parse request data safely
            try:
                request_data = json.loads(request.httprequest.data)
            except Exception as e:
                return json.dumps({
                    'status': 'error', 
                    'message': f'Invalid JSON data: {str(e)}'
                })
                
            new_quantity = request_data.get('quantity')
            
            if new_quantity is None:
                return json.dumps({
                    'status': 'error',
                    'message': 'Quantity is required'
                })
            
            # Find the order and line
            pos_order_model = request.env['pos.order']
            pos_line_model = request.env['pos.order.line']
            
            order = pos_order_model.sudo().browse(order_id)
            line = pos_line_model.sudo().browse(line_id)
            
            if not order.exists():
                return json.dumps({
                    'status': 'error',
                    'message': f'Order with ID {order_id} not found'
                })
                
            if not line.exists() or line.order_id.id != order_id:
                return json.dumps({
                    'status': 'error',
                    'message': f'Order line with ID {line_id} not found in order {order_id}'
                })
            
            # Check if order can be modified (only draft state if state field exists)
            if hasattr(order, 'state') and order.state != 'draft':
                return json.dumps({
                    'status': 'error',
                    'message': f'Cannot modify order in {order.state} state'
                })
            
            # Get the old quantity
            old_quantity = line.qty if hasattr(line, 'qty') else 0
            
            # Update the quantity based on available field name (qty or quantity)
            if hasattr(line, 'qty'):
                line.write({'qty': float(new_quantity)})
            elif hasattr(line, 'quantity'):
                line.write({'quantity': float(new_quantity)})
            else:
                return json.dumps({
                    'status': 'error',
                    'message': 'Cannot update quantity: field not found in order line'
                })
            
            # Refresh order to get updated totals
            order.write({})
            
            # Build response with available data
            response = {
                'status': 'success',
                'message': f'Quantity updated from {old_quantity} to {new_quantity}',
                'order_id': order_id,
                'line_id': line_id,
            }
            
            # Add product details if available
            if hasattr(line, 'product_id') and line.product_id:
                response['product_id'] = line.product_id.id
                response['product_name'] = line.product_id.name
            
            # Add quantity field
            if hasattr(line, 'qty'):
                response['new_quantity'] = line.qty
            elif hasattr(line, 'quantity'):
                response['new_quantity'] = line.quantity
                
            # Add pricing fields if available
            if hasattr(line, 'price_unit'):
                response['price_unit'] = line.price_unit
            if hasattr(line, 'price_subtotal'):
                response['price_subtotal'] = line.price_subtotal
            if hasattr(line, 'price_subtotal_incl'):
                response['price_subtotal_incl'] = line.price_subtotal_incl
            if hasattr(order, 'amount_total'):
                response['order_amount_total'] = order.amount_total
                
            return json.dumps(response)
            
        except Exception as e:
            return json.dumps({
                'status': 'error',
                'message': f'An error occurred: {str(e)}'
            })
    
    @http.route('/api/stores', type='http', auth='public', methods=['GET'])
    def get_stores(self, **kwargs):
        """Get list of all POS stores"""
        try:
            # Fetch all POS configurations (stores)
            pos_config_model = request.env['pos.config']
            store_ids = pos_config_model.sudo().search([])
            
            store_data = []
            for store in store_ids:
                # Get active session if exists
                session_model = request.env['pos.session']
                active_session = session_model.sudo().search([
                    ('config_id', '=', store.id),
                    ('state', '=', 'opened')
                ], limit=1)
                
                store_info = {
                    'id': store.id,
                    'name': store.name,
                    'has_active_session': bool(active_session),
                }
                
                # Safely add optional fields
                if active_session:
                    store_info['session_id'] = active_session.id
                
                if hasattr(store, 'company_id') and store.company_id:
                    store_info['company_id'] = store.company_id.id
                    store_info['company_name'] = store.company_id.name
                
                store_data.append(store_info)
            
            return json.dumps({
                'status': 'success',
                'stores': store_data
            })
            
        except Exception as e:
            return json.dumps({
                'status': 'error',
                'message': f'An error occurred: {str(e)}'
            })