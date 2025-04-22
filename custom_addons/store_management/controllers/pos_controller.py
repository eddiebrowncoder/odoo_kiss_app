from odoo import http
from odoo.http import request
import json

class StoreManagementController(http.Controller):
    
    @http.route('/store', type='http', auth='public', website=True)
    def store_page(self):
        return request.render('store_management.store_page_template', {})
    
    @http.route('/api/store/products', type='http', auth='public', methods=['GET'])
    def get_products(self, **kwargs):
        products = request.env['product.product'].sudo().search([('available_in_pos', '=', True)], order='create_date desc')

        product_data = []
        for product in products:
            product_data.append({
                'barcode': product.barcode,
                'name': product.name,
                'unit_price': product.list_price,
                'quantity': product.qty_available,
                'price': product.list_price * product.qty_available
            })
        
        return json.dumps({
            'status': 'success',
            'products': product_data
        })
    
    @http.route('/api/store/add_item', type='http', auth='public', methods=['POST'], csrf=False)
    def add_item(self, **kwargs):
        try:
            request_data = json.loads(request.httprequest.data)
            name = request_data.get('name')
            list_price = request_data.get('list_price')
            type = request_data.get('type', 'product') 
            barcode = request_data.get('barcode')
            category_id = request_data.get('category_id')

            # Validate required fields
            if not name or not list_price:
                return json.dumps({'status': 'error', 'message': 'Product name and price are required'})

            # Create a new product
            product_vals = {
                'name': name,
                'list_price': list_price,
                'type': type,
                'barcode': barcode,
                'categ_id': category_id if category_id else False,
                'available_in_pos': True,
            }

            # Create the product record
            product = request.env['product.product'].sudo().create(product_vals)

            return json.dumps({
                'status': 'success',
                'message': 'Product created successfully',
                'product_id': product.id
            })

        except Exception as e:
            return json.dumps({
                'status': 'error',
                'message': f'An error occurred: {str(e)}'
            })
   
    @http.route('/store_test', type='http', auth='public', website=True)
    def store_test(self, **kw):
        return "Success"
