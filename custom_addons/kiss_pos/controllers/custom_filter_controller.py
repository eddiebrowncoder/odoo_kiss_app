from odoo import http
from odoo.http import request
import json
import logging

_logger = logging.getLogger(__name__)

class FilterController(http.Controller):

    @http.route('/api/filters/create', type='http', auth='public', methods=['POST'], csrf=False)
    def create_filter(self, **kwargs):
        """Create a new custom filter"""
        try:
            data = json.loads(request.httprequest.data)
            _logger.info(f"Creating filter: {data}")
            
            # Validate required fields
            if not data.get('name'):
                return request.make_response(
                    json.dumps({'error': 'Filter name is required'}),
                    headers=[('Content-Type', 'application/json')],
                    status=400
                )
            
            # Validate filter_parameters - ensure it exists and is not empty
            if not data.get('filter_parameters'):
                return request.make_response(
                    json.dumps({'error': 'Filter parameters are required'}),
                    headers=[('Content-Type', 'application/json')],
                    status=400
                )
        
            filter_params = data.get('filter_parameters')
        
        # Check if filter_parameters is an empty object
            if not filter_params or (isinstance(filter_params, dict) and not filter_params):
                return request.make_response(
                    json.dumps({'error': 'Filter parameters cannot be empty'}),
                    headers=[('Content-Type', 'application/json')],
                    status=400
                )
                
            # Get current user
            current_user = request.env.user
            
            # Prepare filter parameters
            filter_params = data.get('filter_parameters', {})
            
            # Create the filter
            new_filter = request.env['custom.filter'].sudo().create({
                'name': data['name'],
                'user_id': current_user.id,
                'filter_parameters': json.dumps(filter_params),
                'active': data.get('active', True)
            })
            
            return request.make_response(
                json.dumps({
                    'success': True,
                    'filter_id': new_filter.id,
                    'message': 'Filter created successfully'
                }),
                headers=[('Content-Type', 'application/json')]
            )
            
        except Exception as e:
            _logger.error(f"Error occurred while creating filter: {str(e)}")
            return request.make_response(
                json.dumps({'error': 'Internal Server Error'}),
                headers=[('Content-Type', 'application/json')],
                status=500
            )
        
    @http.route('/api/filters', type='http', auth='public', methods=['GET'], csrf=False)
    def get_filters(self, **kwargs):
        """Get all filters for the current user"""
        try:
            # Get current user or use the public user for demo/public access
            current_user = request.env.user
            
            # Get filters for the current user
            filters = request.env['custom.filter'].sudo().search([('user_id', '=', current_user.id)])
            _logger.info(f"Fetched {len(filters)} filters for user {current_user.name}")

            result = []
            for filter_record in filters:
                # Parse filter parameters from the stored JSON
                filter_parameters = {}
                if filter_record.filter_parameters:
                    try:
                        filter_parameters = json.loads(filter_record.filter_parameters)
                    except json.JSONDecodeError:
                        _logger.error(f"Invalid JSON in filter parameters for filter ID {filter_record.id}")
                
                result.append({
                    "id": filter_record.id,
                    "name": filter_record.name,
                    "user_id": filter_record.user_id.id,
                    "username": filter_record.user_id.name,
                    "filter_parameters": filter_parameters,
                    "active": filter_record.active,
                    "created_date": filter_record.create_date.strftime('%m/%d/%y') if filter_record.create_date else None,
                    "modified_date": filter_record.write_date.strftime('%m/%d/%y') if filter_record.write_date else None,
                })

            return request.make_response(
                json.dumps({'filters': result}),
                headers=[('Content-Type', 'application/json')]
            )

        except Exception as e:
            _logger.error(f"Error occurred while fetching filters: {str(e)}")
            return request.make_response(
                json.dumps({'error': 'Internal Server Error'}),
                headers=[('Content-Type', 'application/json')],
                status=500
            )
        
    @http.route('/api/filters/<int:filter_id>/delete', type='http', auth='public', methods=['PUT'], csrf=False)
    def soft_delete_filter(self, filter_id, **kwargs):
        """Delete a filter"""
        try:
            current_user = request.env.user

            filter_record = request.env['custom.filter'].sudo().search([
            ('id', '=', filter_id),
            ('user_id', '=', current_user.id)
        ], limit=1)
            
            if not filter_record.exists():
                return request.make_response(
                    json.dumps({'error': 'Filter not found'}),
                    headers=[('Content-Type', 'application/json')],
                    status=404
                )
            
            # Soft delete by setting active to False
            filter_record.write({'active': False})
            
            return request.make_response(
                json.dumps({
                    'success': True,
                    'message': 'Filter deleted successfully'
                }),
                headers=[('Content-Type', 'application/json')]
            )
            
        except Exception as e:
            _logger.error(f"Error occurred while soft deleting filter: {str(e)}")
            return request.make_response(
                json.dumps({'error': 'Internal Server Error'}),
                headers=[('Content-Type', 'application/json')],
                status=500
            )