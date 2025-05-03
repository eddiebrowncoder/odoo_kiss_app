from odoo import http
from odoo.http import request
import json
import logging
import time

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
                "status": "Active" if c.status else "Inactive",  # Use our new status field
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

    @http.route('/api/category_add', type='json', auth='user', methods=['POST'], csrf=False)
    def category_add(self, **kw):
        try:
            _logger.info(f"Category add/update API request received with data: {kw}")

            category_id = kw.get('category_id')  # Check if we are updating an existing category
            name = kw.get('name')
            parent_id = kw.get('parent_id')
            item_ids = kw.get('item_ids', [])  # Get item IDs from request
            status = kw.get('status', True)  # Default to True (active) if not provided

            if not name:
                return {"error": "Category name is required"}

            if category_id:  # If category_id is provided, we are updating an existing category
                category = request.env['product.category'].sudo().browse(int(category_id))
                if not category.exists():
                    return {
                        "success": False,
                        "message": f"Category with ID '{category_id}' not found"
                    }
                # Update the category
                category.write({
                    'name': name,
                    'parent_id': parent_id if parent_id else False,
                    'status': status,
                })
                _logger.info(f"Category updated successfully with ID: {category.id}")
            else:  # If no category_id is provided, we are creating a new category
                # Check if category with the same name already exists
                existing_category = request.env['product.category'].sudo().search([('name', '=', name)], limit=1)
                if existing_category:
                    return {
                        "success": False,
                        "message": f"Category '{name}' already exists with ID: {existing_category.id}"
                    }
                # Create the category
                category = request.env['product.category'].sudo().create({
                    'name': name,
                    'parent_id': parent_id if parent_id else False,
                    'status': status,
                })
                _logger.info(f"Category created successfully with ID: {category.id}")

            # If items were selected, update their categories
            if item_ids and len(item_ids) > 0:
                products = request.env['product.template'].sudo().browse(item_ids)
                if products:
                    products.write({'categ_id': category.id})
                    _logger.info(f"Updated category for {len(products)} products")

            return {
                "success": True,
                "category_id": category.id,
                "status": status,
                "items_updated": len(item_ids) if item_ids else 0,
                "message": f"Category '{name}' {'updated' if category_id else 'created'} successfully with {len(item_ids) if item_ids else 0} items"
            }
        except Exception as e:
            _logger.error(f"Error adding/updating category: {str(e)}")
            return {
                "success": False,
                "error": f"Error adding/updating category: {str(e)}"
            }

    # Delete Category - Category Management
    @http.route('/api/category/delete', type='json', auth='user')
    def delete_category(self, category_id):
        """
        Delete a category by ID
        
        If category has products associated with it:
        1. Reassign all products to default category ("-")
        2. Then delete the category
        
        :param category_id: ID of the category to delete
        :return: dict with success status and message
        """
        try:
            # Check if the category exists
            category = request.env['product.category'].browse(int(category_id))
            
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
            
            # Get the default category ("-")
            default_category = request.env['product.category'].search([('name', '=', '-')], limit=1)
            
            # If default category doesn't exist, create it
            if not default_category:
                default_category = request.env['product.category'].create({
                    'name': '-',
                    'complete_name': '-',
                })
            
            # Find all products associated with this category and its children
            products = request.env['product.template'].search([
                '|',
                ('categ_id', '=', category.id),
                ('categ_id', 'child_of', category.id)
            ])
            
            # Reassign all products to the default category
            if products:
                products.write({'categ_id': default_category.id})
            
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
        
     # Get products by category ID
    
    @http.route('/api/products_by_category', type='http', auth='public', csrf=False)
    def api_products_by_category(self, category_id, **kw):
        """
        API to fetch products by category ID along with category details.
        :param category_id: ID of the category for which products need to be fetched.
        :return: JSON response with the list of products in the specified category, and category details.
        """
        _logger.info(f"API request received for products in category ID: {category_id}")

        try:
            # Ensure category_id is valid
            category = request.env['product.category'].browse(int(category_id))
            if not category.exists():
                return request.make_response(
                    json.dumps({'error': 'Category not found'}),
                    headers=[('Content-Type', 'application/json')],
                    status=404
                )

            # Fetch products in the category (without including subcategories)
            products = request.env['product.product'].sudo().search([
                ('categ_id', '=', category.id)  # Only products in the exact category
            ])

            _logger.info(f"Found {len(products)} products in category ID {category_id}")

            product_list = []
            for p in products:
                try:
                    # Get supplier name if exists
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
                        "status": "Active",  # Assuming all products are active for simplicity
                        "created_by": p.create_uid.name if p.create_uid else None,
                        "created_date": p.create_date.strftime('%m/%d/%y') if p.create_date else None,
                        "modified_by": p.write_uid.name if p.write_uid else None,
                        "modified_date": p.write_date.strftime('%m/%d/%y') if p.write_date else None
                    }
                    product_list.append(product_data)
                    _logger.debug(f"Added product: {p.name} (ID: {p.id})")
                except Exception as product_error:
                    _logger.error(f"Error processing product ID {p.id}: {str(product_error)}")

            # Category details to return with the response
            category_data = {
                "id": category.id,
                "name": category.name,
                "status": category.status,  # Assuming "status" field exists
                "created_by": category.create_uid.name if category.create_uid else None,
                "created_date": category.create_date.strftime('%m/%d/%y') if category.create_date else None,
                "modified_by": category.write_uid.name if category.write_uid else None,
                "modified_date": category.write_date.strftime('%m/%d/%y') if category.write_date else None,
                "parent_id": category.parent_id.id if category.parent_id else None
            }

            # Response with category and products
            response_data = {
                'category': category_data,
                'products': product_list
            }

            _logger.info(f"Returning {len(product_list)} products and category details for category ID {category_id}")

            return request.make_response(
                json.dumps(response_data),
                headers=[('Content-Type', 'application/json')]
            )

        except Exception as e:
            _logger.error(f"Error fetching products by category: {str(e)}", exc_info=True)  # Add exc_info for stack trace
            return request.make_response(
                json.dumps({'error': 'Internal Server Error'}),
                headers=[('Content-Type', 'application/json')],
                status=500
            )
        
    @http.route('/api/category/remove_items', type='json', auth='user')
    def remove_items_from_category(self, category_id, product_ids):
        """
        Remove specific products from a category and assign them to the default category
        
        :param category_id: ID of the category from which to remove products
        :param product_ids: List of product IDs to remove from the category
        :return: dict with success status and message
        """
        try:
            # Check if the category exists
            category = request.env['product.category'].browse(int(category_id))
            
            if not category.exists():
                return {
                    'success': False,
                    'message': 'Category not found'
                }
            
            # Check user permissions
            if not request.env.user.has_group('base.group_user'):
                return {
                    'success': False,
                    'message': 'Permission denied'
                }
            
            # Get the default category ("-")
            default_category = request.env['product.category'].search([('name', '=', '-')], limit=1)
            
            # If default category doesn't exist, create it
            if not default_category:
                default_category = request.env['product.category'].create({
                    'name': '-',
                    'complete_name': '-',
                })
            
            # Convert product_ids to integers if they're strings
            if product_ids and isinstance(product_ids[0], str):
                product_ids = [int(pid) for pid in product_ids]
            
            # Find the specific products to be reassigned
            products = request.env['product.template'].browse(product_ids)
            
            # Filter to only include products that actually belong to the specified category
            products_to_reassign = products.filtered(lambda p: p.categ_id.id == category.id)
            
            # Count how many products were found and will be reassigned
            found_count = len(products_to_reassign)
            
            # Reassign the filtered products to the default category
            if products_to_reassign:
                products_to_reassign.write({'categ_id': default_category.id})
            
            return {
                'success': True,
                'message': f'{found_count} products reassigned to default category',
                'reassigned_count': found_count
            }
            
        except Exception as e:
            return {
                'success': False,
                'message': str(e)
            }
