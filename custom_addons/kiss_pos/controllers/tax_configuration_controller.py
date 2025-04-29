from odoo import http
from odoo.http import request
import json
import logging
import traceback
import psycopg2

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
    
    # @http.route('/api/taxes', type='http', auth='user', methods=['GET'], csrf=False)
    # def get_taxes(self, **kwargs):
        try:
            # Get start time for performance logging
            import time
            start_time = time.time()
            
            _logger = logging.getLogger(__name__)
            _logger.info("Tax API request received with parameters: %s", kwargs)
            
            # Get filter parameters if needed
            tax_type = kwargs.get('type')
            active_filter = kwargs.get('active')
            
            # Build domain
            domain = []
            
            # Handle active filter
            if active_filter:
                if active_filter.lower() == 'true':
                    domain.append(('active', '=', True))
                elif active_filter.lower() == 'false':
                    domain.append(('active', '=', False))
            # No active filter means we fetch all taxes (active and inactive)
            
            if tax_type:
                domain.append(('type_tax_use', '=', tax_type))
            
            _logger.debug("Searching taxes with domain: %s", domain)
            
            # Fetch taxes
            taxes = request.env['account.tax'].search_read(
                domain=domain,
                fields=['id', 'name', 'amount', 'type_tax_use', 'amount_type', 'active', 'description'],
                order='name'
            )
            
            _logger.info("Successfully fetched %d taxes", len(taxes))
            _logger.debug("First 5 taxes (or fewer): %s", taxes[:5] if taxes else [])
            
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