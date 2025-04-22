from odoo import http
from odoo.http import request
import json

class CustomerController(http.Controller):
    
    @http.route('/api/customer/list', type='http', auth='public', methods=['GET'])
    def get_customers(self, **kwargs):
        customers = request.env['res.partner'].sudo().search([('customer_rank', '>', 0)], order='create_date desc')

        customer_data = []
        for customer in customers:
            customer_data.append({
                'id': customer.id,
                'name': customer.name,
                'email': customer.email,
                'phone': customer.phone,
                'mobile': customer.mobile,
                'street': customer.street,
                'city': customer.city,
                'country': customer.country_id.name if customer.country_id else None,
                'vat': customer.vat,
                'company': customer.parent_id.name if customer.parent_id else None
            })
        
        return json.dumps({
            'status': 'success',
            'customers': customer_data
        })
    
    @http.route('/api/customer/add', type='http', auth='public', methods=['POST'], csrf=False)
    def add_customer(self, **kwargs):
        try:
            request_data = json.loads(request.httprequest.data)
            name = request_data.get('name')
            email = request_data.get('email')
            phone = request_data.get('phone')
            mobile = request_data.get('mobile')
            street = request_data.get('street')
            city = request_data.get('city')
            country_id = request_data.get('country_id')
            vat = request_data.get('vat')
            parent_id = request_data.get('parent_id')  # For company relationship

            # Validate required fields
            if not name:
                return json.dumps({'status': 'error', 'message': 'Customer name is required'})

            # Create a new customer
            customer_vals = {
                'name': name,
                'email': email,
                'phone': phone,
                'mobile': mobile,
                'street': street,
                'city': city,
                'country_id': country_id if country_id else False,
                'vat': vat,
                'parent_id': parent_id if parent_id else False,
                'customer_rank': 1,  # Mark as a customer
            }

            # Create the customer record
            customer = request.env['res.partner'].sudo().create(customer_vals)

            return json.dumps({
                'status': 'success',
                'message': 'Customer created successfully',
                'customer_id': customer.id
            })

        except Exception as e:
            return json.dumps({
                'status': 'error',
                'message': f'An error occurred: {str(e)}'
            })