from odoo import http
from odoo.http import request
import json
import logging

_logger = logging.getLogger(__name__)

class CategoryController(http.Controller):

    @http.route('/category_list', type='http', auth='public', website=True)
    def category_list_page(self, **kw):
        return request.render('kiss_pos.template', {})

    @http.route('/category/new', type='http', auth='user', website=True)
    def category_new(self, **kw):
        return request.render('kiss_pos.template', {})

    @http.route('/api/category_list', type='http', auth='public', csrf=False)
    def api_category_list(self, **kw):
        _logger.info("API request received for category list.")
        try:
            categories = request.env['product.category'].search([])
            all_categories = [{
                "id": c.id,
                "name": c.name,
                "status": "Active",
                "created_by": c.create_uid.name,
                "created_date": c.create_date.strftime('%m/%d/%y') if c.create_date else None,
                "modified_by": c.write_uid.name if c.write_uid else None,
                "modified_date": c.write_date.strftime('%m/%d/%y') if c.write_date else None,
                "parent_id": c.parent_id.id if c.parent_id else None,
                "children": []
            } for c in categories]

            return request.make_response(
                json.dumps({'categories': all_categories}),
                headers=[('Content-Type', 'application/json')]
            )
        except Exception as e:
            _logger.error(f"Error fetching categories: {str(e)}")
            return request.make_response(json.dumps({'error': 'Internal Server Error'}), status=500)

    # @http.route('/api/category_add', type='json', auth='user', methods=['POST'], csrf=False)
    # def category_add(self, **kw):
        try:
            _logger.info(f"Category add API request received with data: {kw}")

            name = kw.get('name')
            parent_id = kw.get('parent_id')

            if not name:
                return {"error": "Category name is required"}

            category = request.env['product.category'].sudo().create({
                'name': name,
                'parent_id': parent_id if parent_id else False,
            })

            _logger.info(f"Category created successfully with ID: {category.id}")

            return {
                "success": True,
                "category_id": category.id,
                "message": f"Category '{name}' created successfully"
            }
        except Exception as e:
            _logger.error(f"Error creating category: {str(e)}")
            return {
                "success": False,
                "error": f"Error creating category: {str(e)}"
            }


    @http.route('/api/category_add', type='json', auth='user', methods=['POST'], csrf=False)
    def category_add(self, **kw):
        try:
            _logger.info(f"Category add API request received with data: {kw}")

            name = kw.get('name')
            parent_id = kw.get('parent_id')
            item_ids = kw.get('item_ids', [])  # Get item IDs from request

            if not name:
                return {"error": "Category name is required"}

            # Create the category
            category = request.env['product.category'].sudo().create({
                'name': name,
                'parent_id': parent_id if parent_id else False,
            })

            # If items were selected, update their categories
            if item_ids and len(item_ids) > 0:
                products = request.env['product.template'].sudo().browse(item_ids)
                if products:
                    products.write({'categ_id': category.id})
                    _logger.info(f"Updated category for {len(products)} products")

            _logger.info(f"Category created successfully with ID: {category.id}")

            return {
                "success": True,
                "category_id": category.id,
                "items_updated": len(item_ids) if item_ids else 0,
                "message": f"Category '{name}' created successfully with {len(item_ids) if item_ids else 0} items"
            }
        except Exception as e:
            _logger.error(f"Error creating category: {str(e)}")
            return {
                "success": False,
                "error": f"Error creating category: {str(e)}"
            }

    # Delete Category - Category Management
    @http.route('/api/category/delete', type='json', auth='user')
    def delete_category(self, category_id):
        """
        Delete a category by ID
        
        :param category_id: ID of the category to delete
        :return: dict with success status and message
        """
        try:
            # Check if the category exists
            category = request.env['product.category'].browse(category_id)
            
            if not category.exists():
                return {
                    'success': False,
                    'message': 'Category not found'
                }
            
            # Check user permissions (optional but recommended)
            if not request.env.user.has_group('base.group_user'):
                return {
                    'success': False,
                    'message': 'Permission denied'
                }
                
            # Delete the category
            category.unlink()
            
            return {
                'success': True,
                'message': 'Category deleted successfully'
            }
            
        except Exception as e:
            return {
                'success': False,
                'message': str(e)
            }

    # Get items for New category:
    @http.route('/api/product_list', type='http', auth='public', csrf=False)
    def api_product_list(self, **kw):
        _logger.info("API request received for product list.")
        try:
            search_term = kw.get('search', '').strip()
            _logger.info(f"Search term: '{search_term}'")
            
            domain = [('sale_ok', '=', True)]
            if search_term:
                domain += ['|', '|',
                        ('barcode', 'ilike', search_term),
                        ('name', 'ilike', search_term),
                        ('categ_id.name', 'ilike', search_term)]
            
            _logger.info(f"Search domain: {domain}")
            products = request.env['product.product'].sudo().search(domain, limit=20)
            _logger.info(f"Found {len(products)} products")
            
            product_list = []
            for p in products:
                try:
                    supplier_name = ''
                    if p.product_tmpl_id.seller_ids:
                        supplier_name = p.product_tmpl_id.seller_ids[0].name.name
                    
                    product_data = {
                        "id": p.id,
                        "barcode": p.barcode,
                        "internal_code": p.default_code,
                        "item_name": p.name,
                        "category": p.categ_id.name if p.categ_id else None,
                        "supplier": supplier_name,
                        "status": "Active",
                        "created_by": p.create_uid.name if p.create_uid else None,
                        "created_date": p.create_date.strftime('%m/%d/%y') if p.create_date else None,
                        "modified_by": p.write_uid.name if p.write_uid else None,
                        "modified_date": p.write_date.strftime('%m/%d/%y') if p.write_date else None
                    }
                    product_list.append(product_data)
                    _logger.debug(f"Added product: {p.name} (ID: {p.id})")
                except Exception as product_error:
                    _logger.error(f"Error processing product ID {p.id}: {str(product_error)}")
            
            response_data = {'products': product_list}
            _logger.info(f"Returning {len(product_list)} products")
            return request.make_response(
                json.dumps(response_data),
                headers=[('Content-Type', 'application/json')]
            )
        
        except Exception as e:
            _logger.error(f"Error fetching products: {str(e)}", exc_info=True)  # Add exc_info for stack trace
            return request.make_response(json.dumps({'error': 'Internal Server Error'}), status=500)