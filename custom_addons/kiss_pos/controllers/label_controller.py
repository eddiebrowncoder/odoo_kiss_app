from odoo import http
from odoo.http import request, Response
import json
import logging
import tempfile
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import Table, TableStyle
from reportlab.lib.units import inch, cm, mm
from reportlab.pdfgen import canvas
import base64
from io import BytesIO
import math

_logger = logging.getLogger(__name__)

class LabelController(http.Controller):
    
    @http.route('/api/label_templates', type='http', auth='public', methods=['POST'], csrf=False)
    def get_label_templates(self, **post):
        """Get all label templates"""
        try:
            templates = request.env['kiss_pos.label_template'].search([('active', '=', True)])
            result = {
                'success': True,
                'data': [template.to_dict() for template in templates]
            }
            return request.make_response(
                json.dumps(result),
                headers=[('Content-Type', 'application/json')]
            )
        except Exception as e:
            return request.make_response(
                json.dumps({ 'success': False, 'error': str(e) }),
                headers=[('Content-Type', 'application/json')]
            )
    
    @http.route('/api/label_template/<int:template_id>', type='http', auth='public', methods=['GET'], csrf=False)
    def get_label_template(self, template_id, **post):
        """Get specific label template"""
        try:
            template = request.env['kiss_pos.label_template'].browse(template_id)
            if not template.exists():
                result = {'success': False, 'error': 'Template not found'}
            else:
                result = {
                    'success': True,
                    'data': template.to_dict()
                }
            return request.make_response(
                json.dumps(result),
                headers=[('Content-Type', 'application/json')]
            )
        except Exception as e:
            return request.make_response(
                json.dumps({ 'success': False, 'error': str(e) }),
                headers=[('Content-Type', 'application/json')]
            )
    
    @http.route('/api/label_template/create', type='http', auth='public', methods=['POST'], csrf=False)
    def create_label_template(self, **post):
        """Create new label template"""
        try:
            # Parse JSON body data
            body = json.loads(request.httprequest.data.decode('utf-8'))
            
            # Extract basic template data
            template_vals = {
                'name': body.get('name'),
                'width': float(body.get('width')),
                'height': float(body.get('height')),
                'price': float(body.get('price', 0.0)),
                'is_default': body.get('is_default', False),
            }
            
            # Create template
            template = request.env['kiss_pos.label_template'].create(template_vals)
            
            # Create fields
            fields_data = body.get('fields', [])
            for field_data in fields_data:
                field_vals = {
                    'template_id': template.id,
                    'field_name': field_data.get('field_name'),
                    'sequence': field_data.get('sequence', 10),
                    'is_visible': field_data.get('is_visible', True),
                }
                request.env['kiss_pos.label_template_field'].create(field_vals)
            
            result = {
                'success': True,
                'data': template.to_dict()
            }
            return request.make_response(
                json.dumps(result),
                headers=[('Content-Type', 'application/json')]
            )
            
        except Exception as e:
            return request.make_response(
                json.dumps({ 'success': False, 'error': str(e) }),
                headers=[('Content-Type', 'application/json')]
            )
    
    @http.route('/api/label_template/update/<int:template_id>', type='http', auth='public', methods=['POST'], csrf=False)
    def update_label_template(self, template_id, **post):
        """Update existing label template"""
        try:
            template = request.env['kiss_pos.label_template'].browse(template_id)
            if not template.exists():
                result = {'success': False, 'error': 'Template not found'}
                return Response(
                    json.dumps(result),
                    content_type='application/json'
                )
            
            # Parse JSON body data
            body = json.loads(request.httprequest.data.decode('utf-8'))
            
            # Update basic template data
            template_vals = {}
            if 'name' in body:
                template_vals['name'] = body.get('name')
            if 'width' in body:
                template_vals['width'] = float(body.get('width'))
            if 'height' in body:
                template_vals['height'] = float(body.get('height'))
            if 'is_default' in body:
                template_vals['is_default'] = body.get('is_default')
            
            template.write(template_vals)
            
            # Update fields if provided
            if 'fields' in body:
                # Remove existing fields
                template.field_ids.unlink()
                
                # Create new fields
                fields_data = body.get('fields', [])
                for field_data in fields_data:
                    field_vals = {
                        'template_id': template.id,
                        'field_name': field_data.get('field_name'),
                        'sequence': field_data.get('sequence', 10),
                        'is_visible': field_data.get('is_visible', True),
                    }
                    request.env['kiss_pos.label_template_field'].create(field_vals)
            
            result = {
                'success': True,
                'data': template.to_dict()
            }
            return request.make_response(
                json.dumps(result),
                headers=[('Content-Type', 'application/json')]
            )
            
        except Exception as e:
            return request.make_response(
                json.dumps({ 'success': False, 'error': str(e) }),
                headers=[('Content-Type', 'application/json')]
            )
    
    @http.route('/api/label_template/delete/<int:template_id>', type='http', auth='public', methods=['POST'], csrf=False)
    def delete_label_template(self, template_id, **post):
        """Delete label template"""
        try:
            template = request.env['kiss_pos.label_template'].browse(template_id)
            if not template.exists():
                result = {'success': False, 'error': 'Template not found'}
                return Response(
                    json.dumps(result),
                    content_type='application/json'
                )
            
            template.active = False
            result = {'success': True}
            return request.make_response(
                json.dumps(result),
                headers=[('Content-Type', 'application/json')]
            )
        except Exception as e:
            return request.make_response(
                json.dumps({ 'success': False, 'error': str(e) }),
                headers=[('Content-Type', 'application/json')]
            )
            
    @http.route('/api/print_labels', type='http', auth='public', methods=['POST'], csrf=False)
    def print_labels(self, **post):
        try:
            # Parse JSON body data
            body = json.loads(request.httprequest.data.decode('utf-8'))
            
            # Get template and items data
            template_id = body.get('template_id')
            items = body.get('items', [])
            
            if not template_id or not items:
                return request.make_response(
                    json.dumps({
                        'success': False,
                        'error': 'Template ID and items are required'
                    }),
                    headers=[('Content-Type', 'application/json')]
                )
            
            # Get template from database
            template = request.env['kiss_pos.label_template'].browse(template_id)
            if not template:
                return request.make_response(
                    json.dumps({
                        'success': False,
                        'error': 'Template not found'
                    }),
                    headers=[('Content-Type', 'application/json')]
                )
            _logger.info(template)
            # Generate PDF
            pdf_data = self._generate_label_pdf(template, items)
            
            # Return PDF as attachment
            filename = f"product_label_{template.name.replace(' ', '_')}.pdf"
            headers = [
                ('Content-Type', 'application/pdf'),
                ('Content-Disposition', f'attachment; filename="{filename}"')
            ]
            
            return request.make_response(pdf_data, headers=headers)
            
        except Exception as e:
            _logger.exception("Error generating label PDF: %s", str(e))
            return request.make_response(
                json.dumps({
                    'success': False,
                    'error': str(e)
                }),
                headers=[('Content-Type', 'application/json')]
            )
    
    def _generate_label_pdf(self, template, items):
        """Generate a PDF with labels based on template and items"""
        try:
            # Create a buffer for the PDF
            buffer = BytesIO()
            
            # Get template dimensions (in inches)
            label_width_inch = float(template.width)
            label_height_inch = float(template.height)

            template_price = template.price
            
            # Convert inches to points (1 inch = 40 points)
            label_width_pt = label_width_inch * 40
            label_height_pt = label_height_inch * 40
            
            # Use A4 page size
            page_width, page_height = A4
            
            # Add margins (1 cm on each side)
            margin = cm
            usable_width = page_width - (2 * margin)
            usable_height = page_height - (2 * margin)
            
            # Calculate how many labels can fit per row and column
            labels_per_row = math.floor(usable_width / label_width_pt)
            labels_per_col = math.floor(usable_height / label_height_pt)
            
            # If labels are too big, ensure at least one per page
            labels_per_row = max(1, labels_per_row)
            labels_per_col = max(1, labels_per_col)
            
            # Calculate actual spacing between labels
            horizontal_spacing = (usable_width - (labels_per_row * label_width_pt)) / max(1, labels_per_row - 1) if labels_per_row > 1 else 0
            vertical_spacing = (usable_height - (labels_per_col * label_height_pt)) / max(1, labels_per_col - 1) if labels_per_col > 1 else 0
            
            # Get visible fields in order
            visible_fields = request.env['kiss_pos.label_template_field'].search([
                ('template_id', '=', template.id),
                ('is_visible', '=', True)
            ], order='sequence asc')
            
            # Initialize the canvas with A4 page size
            c = canvas.Canvas(buffer, pagesize=A4)
            
            items_per_page = labels_per_row * labels_per_col
            
            for i, item in enumerate(items):
                
                # Create a new page if needed
                if i > 0 and i % items_per_page == 0:
                    c.showPage()
                
                # Calculate position in the grid
                position_on_page = i % items_per_page
                row = position_on_page // labels_per_row
                col = position_on_page % labels_per_row
                
                # Calculate x and y coordinates for this label (origin is bottom-left)
                x = margin + (col * (label_width_pt + horizontal_spacing))
                y = page_height - margin - (row + 1) * label_height_pt - (row * vertical_spacing)
                
                # Save the canvas state
                c.saveState()
                
                # Draw the label border
                c.rect(x, y, label_width_pt, label_height_pt, stroke=1, fill=0)
                
                # Process each visible field for this item
                self._draw_label_content(c, item, visible_fields, x, y, label_width_pt, label_height_pt, template_price)
                
                # Restore the canvas state
                c.restoreState()
            
            # Save the PDF
            c.save()
            
            # Get the PDF data from the buffer
            pdf_data = buffer.getvalue()
            buffer.close()
            
            return pdf_data
            
        except Exception as e:
            _logger.exception("Error generating PDF: %s", str(e))
            raise e
    
    def _draw_label_content(self, canvas, item, visible_fields, x, y, width, height, template_price):
        """Draw the content for a single label"""
        # Padding inside the label
        padding = 10
        
        # Start positions with padding
        content_x = x + padding
        content_y = y + height - (4 + padding)  # Top side
        
        # Maximum width for content
        content_width = width - (2 * padding)
        
        # First pass - identify description and selling_price fields
        for field in visible_fields:
            field_name = field.field_name
            
        # Even if description is not in visible fields, we should show the name/description
        item_name = item.get('description') or item.get('name', '')
        if item_name:
            canvas.setFont("Helvetica-Bold", 14)  # Larger font size for item name
            wrapped_text = self._wrap_text(canvas, item_name, content_width, "Helvetica-Bold", 14)
            
            for line in wrapped_text:
                canvas.drawString(content_x, content_y, line)
                content_y -= 18  # Larger spacing for bigger font
            
            # Add some space after description
            content_y -= 5
        
        # Draw all fields in the middle, including selling_price if present
        canvas.setFont("Helvetica", 10)
        for field in visible_fields:
            field_name = field.field_name
            
            # Skip description as it's already handled
            if field_name == 'description':
                continue
            
            field_value = item.get(field_name, '')
            if field_value:
                if field_name == 'barcode':
                    canvas.drawString(content_x, content_y, f"{field_value}")
                    content_y -= 15
                elif field_name == 'sku':
                    canvas.drawString(content_x, content_y, f"{field_value}")
                    content_y -= 15
                elif field_name == 'selling_price':
                    price_str = self._format_price(field_value)
                    canvas.drawString(content_x, content_y, f"Price: {price_str}")
                    content_y -= 15
                else:
                    # For categories and other fields
                    canvas.drawString(content_x, content_y, f"{field_value}")
                    content_y -= 15
        
        # Draw template price at the bottom if it exists
        if template_price and float(template_price) > 0:
            template_price_str = self._format_price(template_price)
            
            # Determine font size based on price length
            if len(template_price_str) > 8:
                font_size = 14
            elif len(template_price_str) > 5:
                font_size = 18
            else:
                font_size = 24
            
            canvas.setFont("Helvetica-Bold", font_size)
            price_width = canvas.stringWidth(template_price_str, "Helvetica-Bold", font_size)
            
            # Position template price in bottom-right corner with padding
            price_x = x + width - price_width - padding
            price_y = y + padding
            
            canvas.drawString(price_x, price_y, template_price_str)
    
    def _format_price(self, price):
        """Format price with $ sign and appropriate decimal places"""
        if price is None:
            return "$0.00"
        
        try:
            price_float = float(price)
            if price_float.is_integer():
                return f"${int(price_float)}.00"
            else:
                # Check if the decimal part ends in 0
                decimal_part = str(price_float).split('.')[1]
                if len(decimal_part) == 1 or decimal_part.endswith('0'):
                    return f"${price_float:.2f}"
                else:
                    return f"${price_float:.2f}"
        except (ValueError, TypeError):
            return "$0.00"
    
    def _wrap_text(self, canvas, text, max_width, font_name, font_size):
        """Wrap text to fit within max_width"""
        if not text:
            return []
        
        canvas.setFont(font_name, font_size)
        words = text.split()
        lines = []
        current_line = []
        
        for word in words:
            test_line = ' '.join(current_line + [word])
            width = canvas.stringWidth(test_line, font_name, font_size)
            
            if width <= max_width:
                current_line.append(word)
            else:
                if current_line:
                    lines.append(' '.join(current_line))
                    current_line = [word]
                else:
                    # Word is too long, force it on its own line
                    lines.append(word)
                    current_line = []
        
        if current_line:
            lines.append(' '.join(current_line))
        
        return lines