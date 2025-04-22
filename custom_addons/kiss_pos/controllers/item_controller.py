from odoo import http
from odoo.http import request
import json
import logging

_logger = logging.getLogger(__name__)

# Valid status values
VALID_STATUSES = ["Not Confirmed", "Active", "Inactive", "Discontinued"]

class ItemController(http.Controller):

    @http.route('/item_list', type='http', auth='public', website=True)
    def item_list_page(self, **kw):
        return request.render('kiss_pos.template', {})

    @http.route('/add_item', type='http', auth='public', website=True)
    def add_item_page(self, **kw):
        return request.render('kiss_pos.template', {})

    @http.route('/import_item', type='http', auth='public', website=True)
    def import_item_page(self, **kw):
        return request.render('kiss_pos.template', {})

    @http.route('/api/item_list', type='http', auth='public', csrf=False)
    def api_item_list(self, **kw):
        _logger.info("API request received for item list.")
        try:
            items = request.env['product.template'].sudo().search([], order="id asc")
            _logger.info(f"Fetched {len(items)} items from the database.")

            all_items = []
            for item in items:
                all_items.append({
                    "id": item.id,
                    "name": item.name,
                    "barcode": item.barcode or f"INV{item.id}",
                    "sku": item.default_code or f"SKU1234567890{item.id}",
                    "unit_price": f"${item.list_price:.2f}",
                    "category": item.categ_id.name if item.categ_id else "Uncategorized",
                    "company": item.company_id.name if item.company_id else "N/A",
                    "supplier": item.seller_ids[0].partner_id.name if item.seller_ids else "N/A",
                    "status": item.item_status if item.item_status else "Not Confirmed",
                    "created_by": item.create_uid.name if item.create_uid else None,
                    "created_date": item.create_date.strftime('%m/%d/%y') if item.create_date else None,
                    "modified_by": item.write_uid.name if item.write_uid else None,
                    "modified_date": item.write_date.strftime('%m/%d/%y') if item.write_date else None,
                    "parent_id": item.categ_id.id if item.categ_id else None,
                    "children": []
                })

            return request.make_response(
                json.dumps({'items': all_items}),
                headers=[('Content-Type', 'application/json')]
            )

        except Exception as e:
            _logger.error(f"Error occurred while fetching items: {str(e)}")
            return request.make_response(
                json.dumps({'error': 'Internal Server Error'}),
                headers=[('Content-Type', 'application/json')],
                status=500
            )

    @http.route('/api/add_item', type='json', auth='public', methods=['POST'], csrf=False)
    def api_add_item(self, **kw):
        _logger.info(f"API request received with data: {kw}")  # Log the received data

        try:
            # Extract the item details from the request
            item_name = kw.get('item_name')
            barcode = kw.get('barcode')
            sku = kw.get('sku')
            selling_price = kw.get('selling_price')
            cost = kw.get('cost')
            msrp = kw.get('msrp')
            status = kw.get('status')  # Status name
            company = kw.get('company')
            parent_company = kw.get('parent_company')
            brand = kw.get('brand')

            # Log the extracted values for debugging
            _logger.info(f"item_name: {item_name}, barcode: {barcode}, status: {status}")

            # Validate required fields
            if not item_name or not barcode:
                return request.make_response(
                    json.dumps({'error': 'Item Name and Barcode are required fields.'}),
                    headers=[('Content-Type', 'application/json')],
                    status=400
                )

            # Convert values to float and handle empty strings
            selling_price = float(selling_price) if selling_price and selling_price.strip() else 0.0
            cost = float(cost) if cost and cost.strip() else 0.0
            msrp = float(msrp) if msrp and msrp.strip() else 0.0

            # Validate status
            if status and status not in VALID_STATUSES:
                _logger.warning(f"Invalid status '{status}' provided, defaulting to 'Not Confirmed'")
                status = "Not Confirmed"
            elif not status:
                status = "Not Confirmed"  # Default status if none provided
                
            # Create the new product template (item) and map values to their respective columns
            product = request.env['product.template'].sudo().create({
                'name': item_name,                           # Map to the "name" column
                'barcode': barcode,                          # Map to the "barcode" column
                'default_code': sku,                         # Map to the "default_code" (SKU) column
                'list_price': selling_price,                 # Map to the "list_price" column
                'standard_price': cost,                      # Map to the "cost" column
                'item_status': status,                       # Map to the "item_status" column (as a Char field)
                'msrp': msrp,                                # Map to the "msrp" column (custom field)
                'active': True,                              # Map to the "active" column (status)
                'company_id': request.env['res.company'].sudo().search([('name', '=', company)]).id if company else False,  # Map to the "company_id" column
                'parent_company': parent_company,            # Map to the "parent_company" column (custom field)
                'brand': brand,                              # Map to the "brand" column (custom field)
            })

            _logger.info(f"Created new item: {item_name} with Barcode: {barcode}")
            
            return {
                "success": True,
                "item_id": product.id,
                "message": f"Item '{item_name}' created successfully"
            }
        
        except Exception as e:
            _logger.error(f"Error occurred while adding item: {str(e)}")
            return {
                "success": False,
                "error": f"Error creating item: {str(e)}"
            }