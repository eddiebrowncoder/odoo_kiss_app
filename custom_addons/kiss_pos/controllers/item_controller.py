from odoo import http
from odoo.http import request
import json
import logging
import time

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
    
    @http.route('/item_configuration', type='http', auth='public', website=True)
    def item_configuration_page(self, **kw):
        return request.render('kiss_pos.template', {})
    
    @http.route('/api/item_list', type='http', auth='public', csrf=False)
    def api_item_list(self, **kw):
        _logger.info("API request received for item list.")
        
        search_query = kw.get('search', '')
        _logger.info(f"Search Query: {search_query} (type: {type(search_query)})")
        
        filters = json.loads(request.httprequest.data)
        _logger.info(f"Filters -> {filters}")
        
        try:
            domain = []
            
            # Filter by name search query
            if search_query and search_query.strip():
                _logger.info(f"Entered If Search query: {search_query.strip()}")
                domain.append(('name', 'ilike', search_query.strip()))
            
            # Filter by price range
            price_range = filters.get('price_range')
            if price_range:
                if 'min_price' in price_range:
                    domain.append(('list_price', '>=', float(price_range['min_price'])))
                if 'max_price' in price_range:
                    domain.append(('list_price', '<=', float(price_range['max_price'])))

            # Filter by brands
            brands = filters.get('brands')
            if brands:
                domain.append(('feed_brand_id', 'in', brands))
            
            # Filter by item type
            item_types = filters.get('item_type')
            if item_types:
                domain.append(('type', 'in', item_types))
            
            # Filter by item unit
            item_units = filters.get('item_unit')
            if item_units:
                domain.append(('item_unit', 'in', item_units))
            
            # Filter by category
            categories = filters.get('categories')
            if categories:
                domain.append(('categ_id', 'in', categories))
            
            # Filter by suppliers
            suppliers = filters.get('suppliers')
            if suppliers:
                domain.append(('vendor1_id', 'in', suppliers))
                domain.append(('vendor2_id', 'in', suppliers))
            
            # Filter by tax code
            tax_codes = filters.get('tax_codes')
            if tax_codes:
                domain.append(('tax_code', 'in', tax_codes))
                
            items = request.env['product.template'].sudo().search(domain, order="id desc")
                
            _logger.info(f"Fetched {len(items)} items from the database.")

            all_items = []
            for item in items:
                # Generate image URLs for all available resolutions, but first check if images exist
                timestamp = int(item.write_date.timestamp() * 1000) if item.write_date else int(time.time() * 1000)
                
                # Check if any image attachments exist for this product
                attachments = request.env['ir.attachment'].sudo().search([
                    ('res_model', '=', 'product.template'),
                    ('res_id', '=', item.id),
                    ('res_field', 'like', 'image_%')
                ])
                
                # Create dictionary of available resolutions
                image_urls = {}
                if attachments:
                    image_urls = {
                        "image_1920": f'/web/image/product.template/{item.id}/image_1920?unique={timestamp}',
                        "image_1024": f'/web/image/product.template/{item.id}/image_1024?unique={timestamp}',
                        "image_512": f'/web/image/product.template/{item.id}/image_512?unique={timestamp}',
                        "image_256": f'/web/image/product.template/{item.id}/image_256?unique={timestamp}',
                        "image_128": f'/web/image/product.template/{item.id}/image_128?unique={timestamp}'
                    }
                
                item_data = {
                    "id": item.id,
                    "name": item.name,
                    "barcode": item.barcode or f"INV{item.id}",
                    "sku": item.default_code or f"SKU1234567890{item.id}",
                    "unit_price": f"${item.list_price:.2f}",
                    "category": item.categ_id.name if item.categ_id else "Uncategorized",
                    "company": item.company_id.name if item.company_id else "N/A",
                    "supplier": item.vendor1_id.name if item.vendor1_id else "N/A",
                    "status": item.item_status if item.item_status else "Not Confirmed",
                    "created_by": item.create_uid.name if item.create_uid else None,
                    "created_date": item.create_date.strftime('%m/%d/%y') if item.create_date else None,
                    "modified_by": item.write_uid.name if item.write_uid else None,
                    "modified_date": item.write_date.strftime('%m/%d/%y') if item.write_date else None,
                    "parent_id": item.categ_id.id if item.categ_id else None,
                    "cost": item.standard_price,
                    "tax_code": item.tax_code if hasattr(item, 'tax_code') else None,
                    "msrp": item.msrp if hasattr(item, 'msrp') else None,
                    "parent_company": item.parent_company_id.name if hasattr(item, 'parent_company_id') and item.parent_company_id else None,
                    "parent_company_id": item.parent_company_id.id if hasattr(item, 'parent_company_id') and item.parent_company_id else None,
                    "brand": item.feed_brand_id.name if item.feed_brand_id else "N/A",
                    "feed_brand_id": item.feed_brand_id.id if hasattr(item, 'feed_brand_id') and item.feed_brand_id else None,
                    "on_hand": item.on_hand if hasattr(item, 'on_hand') else 0,
                    "age_restriction": item.age_restriction if hasattr(item, 'age_restriction') else False,
                    "use_ebt": item.use_ebt if hasattr(item, 'use_ebt') else False,
                    "volume": item.volume,
                    "weight": item.weight,
                    "vendor1_id": item.vendor1_id.id if hasattr(item, 'vendor1_id') and item.vendor1_id else None,
                    "vendor2_id": item.vendor2_id.id if hasattr(item, 'vendor2_id') and item.vendor2_id else None,
                    "secondary_supplier": item.vendor2_id.name if hasattr(item, 'vendor2_id') and item.vendor2_id else None,
                    "item_type": item.type,
                    "item_unit": item.item_unit if hasattr(item, 'item_unit') else None,
                    "packaging_type": item.packaging_type if hasattr(item, 'packaging_type') else None,
                    "srs_category": item.srs_category if hasattr(item, 'srs_category') else None,
                    "inventory_tracking": item.inventory_tracking if hasattr(item, 'inventory_tracking') else True,
                    "in_transit": item.in_transit if hasattr(item, 'in_transit') else 0,
                    "reorder_point": item.reorder_point if hasattr(item, 'reorder_point') else 0,
                    "restock_level": item.restock_level if hasattr(item, 'restock_level') else 0,
                    "min_order_qty": item.min_order_qty if hasattr(item, 'min_order_qty') else 0,
                    "color": item.color_name,
                    "size": item.size if hasattr(item, 'size') else None,
                    "dimension": item.dimension if hasattr(item, 'dimension') else None,
                    "image_urls": image_urls
                }
                all_items.append(item_data)

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
            status = kw.get('status')
            company_id = kw.get('company_id')
            parent_company_id = kw.get('parent_company_id')
            brand = kw.get('brand')
            categ_id = kw.get('categ_id')
            on_hand = kw.get('on_hand')
            age_restriction = kw.get('age_restriction')
            use_ebt = kw.get('use_ebt')
            volume = kw.get('volume')
            weight = kw.get('weight')
            vendor1_id = kw.get('vendor1_id')
            vendor2_id = kw.get('vendor2_id')
            item_type = kw.get('item_type')
            item_unit = kw.get('item_unit')
            packaging_type = kw.get('packaging_type')
            srs_category = kw.get('srs_category')
            inventory_tracking = kw.get('inventory_tracking')
            in_transit = kw.get('in_transit')
            reorder_point = kw.get('reorder_point')
            restock_level = kw.get('restock_level')
            min_order_qty = kw.get('min_order_qty')
            color = kw.get('color')
            size = kw.get('size')
            dimension = kw.get('dimension')
            tax_code = kw.get('tax_code')
            
            # Log the extracted values for debugging
            _logger.info(f"item_name: {item_name}, barcode: {barcode}, status: {status}")
            
            # Validate required fields
            if not item_name or not barcode or not categ_id:
                return {
                    'success': False,
                    'error': 'Item Name, Barcode and Category are required fields.'
                }
                
            # Convert numeric values and handle empty strings
            selling_price = float(selling_price) if selling_price and str(selling_price).strip() else 0.0
            cost = float(cost) if cost and str(cost).strip() else 0.0
            msrp = float(msrp) if msrp and str(msrp).strip() else 0.0
            volume = float(volume) if volume and str(volume).strip() else 0.0
            weight = float(weight) if weight and str(weight).strip() else 0.0
            reorder_point = float(reorder_point) if reorder_point and str(reorder_point).strip() else 0.0
            restock_level = float(restock_level) if restock_level and str(restock_level).strip() else 0.0
            min_order_qty = float(min_order_qty) if min_order_qty and str(min_order_qty).strip() else 0.0
            on_hand = float(on_hand) if on_hand and str(on_hand).strip() else 0.0
            in_transit = float(in_transit) if in_transit and str(in_transit).strip() else 0.0
            
            # Convert boolean fields properly
            age_restriction = bool(age_restriction) if age_restriction is not None else False
            use_ebt = bool(use_ebt) if use_ebt is not None else False
            inventory_tracking = bool(inventory_tracking) if inventory_tracking is not None else True
            
            # Validate status
            if status and status not in VALID_STATUSES:
                _logger.warning(f"Invalid status '{status}' provided, defaulting to 'Not Confirmed'")
                status = "Not Confirmed"
            elif not status:
                status = "Not Confirmed"  # Default status if none provided
                
            # Prepare product data
            product_vals = {
                'name': item_name,                           
                'barcode': barcode,                          
                'default_code': sku,                         
                'list_price': selling_price,                
                'standard_price': cost,                      
                'item_status': status,                       
                'msrp': msrp,                                
                'active': True,  
                'volume': volume,
                'weight': weight,
                'color_name': color,
                'feed_brand_id': int(brand) if brand else False,
                'on_hand': on_hand,
                'age_restriction': age_restriction,
                'use_ebt': use_ebt,
                'item_unit': item_unit,
                'item_type': item_type,
                'tax_code':tax_code,
                'packaging_type': packaging_type, 
                'srs_category': srs_category,
                'inventory_tracking': inventory_tracking,
                'in_transit': in_transit,
                'reorder_point': reorder_point,
                'restock_level': restock_level,
                'min_order_qty': min_order_qty,
                'size': size,
                'dimension': dimension,
                'company_id': int(company_id) if company_id else False,
                'parent_company_id': int(parent_company_id) if parent_company_id else False,
                'categ_id': int(categ_id) if categ_id else False,
                'vendor1_id': int(vendor1_id) if vendor1_id else False,
                'vendor2_id': int(vendor2_id) if vendor2_id else False,
            }
            
            
            # Remove None values to avoid errors
            product_vals = {k: v for k, v in product_vals.items() if v is not None}
            
            # Get the fields of the product.template model
            model_fields = request.env['product.template']._fields
            
            # Keep only fields that exist in the model
            product_vals = {k: v for k, v in product_vals.items() if k in model_fields}
               
            # Create the new product template (item)
            product = request.env['product.template'].sudo().create(product_vals)
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
        
    @http.route('/api/update_item_status', type='http', auth='public', methods=['POST'], csrf=False)
    def api_update_item_status(self, **kw):

        try:
            data = json.loads(request.httprequest.data.decode('utf-8'))
            items = data.get('items', [])
            
            # Validate that items is a list
            if not isinstance(items, list):
                
                return request.make_response(
                    json.dumps({
                        'success': False,
                        'error': 'Items must be provided as a list.'
                    }),
                    headers=[('Content-Type', 'application/json')]
                )
            
            if not items:
            
                return request.make_response(
                    json.dumps({
                        'success': False,
                        'error': 'No items provided for update.'
                    }),
                    headers=[('Content-Type', 'application/json')]
                )
            
            _logger.info(f"Processing bulk update for {len(items)} items")
            
            results = {
                'success': True,
                'processed': 0,
                'failed': 0,
                'results': []
            }
            
            for item in items:
                item_id = item.get('item_id')
                item_status = item.get('item_status')
                
                # Skip items without required fields
                if not item_id or not item_status:
                    results['results'].append({
                        'item_id': item_id,
                        'success': False,
                        'error': 'Both item_id and item_status are required.'
                    })
                    results['failed'] += 1
                    continue
                    
                if item_status not in VALID_STATUSES:
                    results['results'].append({
                        'item_id': item_id,
                        'success': False,
                        'error': f"Invalid status '{item_status}'."
                    })
                    results['failed'] += 1
                    continue
                
                try:
                    # Find the product by ID
                    product = request.env['product.template'].sudo().browse(int(item_id))
                    
                    if not product.exists():
                        results['results'].append({
                            'item_id': item_id,
                            'success': False,
                            'error': f"Item not found."
                        })
                        results['failed'] += 1
                        continue
                        
                    # Update the item status
                    product.write({
                        'item_status': item_status
                    })
                    
                    results['results'].append({
                        'item_id': item_id,
                        'name': product.name,
                        'success': True,
                        'message': f"Status updated to '{item_status}' successfully"
                    })
                    results['processed'] += 1
                    
                except Exception as e:
                    _logger.error(f"Error updating item {item_id}: {str(e)}")
                    results['results'].append({
                        'item_id': item_id,
                        'success': False,
                        'error': str(e)
                    })
                    results['failed'] += 1
            
            # If all items failed, mark the overall request as failed
            if results['processed'] == 0 and results['failed'] > 0:
                results['success'] = False
            
            return request.make_response(
                json.dumps(results),
                headers=[('Content-Type', 'application/json')]
            )
        
        except Exception as e:
            _logger.error(f"Error occurred while updating item status: {str(e)}")
            results = {
                "success": False,
                "error": f"Error updating item status: {str(e)}"
            }
            return request.make_response(
                json.dumps(results),
                headers=[('Content-Type', 'application/json')]
            )