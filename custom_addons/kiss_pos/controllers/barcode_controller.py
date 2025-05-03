from odoo import http
from odoo.http import request, Response
import json
from io import BytesIO
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.units import mm
from reportlab.graphics.barcode import createBarcodeDrawing
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

class BarcodeController(http.Controller):
    @http.route('/print_barcodes', type='http', auth='user', methods=['POST'], csrf=False)
    def print_barcodes(self, **kw):
        """Controller for barcode PDF generation via fetch API"""
        try:
            # Get data from request body
            data = json.loads(request.httprequest.data.decode('utf-8'))
            
            # Parse items data
            if 'items_data' in data:
                if isinstance(data['items_data'], str):
                    items_data = json.loads(data['items_data'])
                else:
                    items_data = data['items_data']
            else:
                return Response("No items data provided", content_type='text/plain', status=400)
            
            # Get layout options
            labels_per_row = int(data.get('labels_per_row', 3))
            label_width = float(data.get('label_width', 60))
            label_height = float(data.get('label_height', 40))
            page_size_name = data.get('page_size', 'A4')
            barcode_type = data.get('barcode_type', 'Code128')
            
            # Set page size
            page_size = A4 if page_size_name == 'A4' else letter
            
            # Convert dimensions to mm
            label_width = label_width * mm
            label_height = label_height * mm
            
            # Generate PDF
            pdf_data = self._generate_barcode_pdf(
                items_data, 
                labels_per_row, 
                label_width, 
                label_height, 
                page_size, 
                barcode_type
            )
            
            # Return PDF as direct download
            headers = [
                ('Content-Type', 'application/pdf'),
                ('Content-Disposition', 'attachment; filename="product_barcodes.pdf"'),
                ('Content-Length', str(len(pdf_data))),
            ]
            
            return request.make_response(pdf_data, headers=headers)
            
        except Exception as e:
            return Response(
                f"Error generating barcodes: {str(e)}", 
                content_type='text/plain', 
                status=500
            )
    
    def _generate_barcode_pdf(self, items_data, labels_per_row, label_width, label_height, page_size, barcode_type):
        """Generate PDF with product barcodes using item data directly
        
        Args:
            items_data: List of dictionaries with item information
            labels_per_row: Number of labels per row
            label_width: Width of each label in mm
            label_height: Height of each label in mm
            page_size: Page size (A4 or letter)
            barcode_type: Type of barcode to generate
            
        Returns:
            PDF binary data
        """
        # Set up PDF document
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=page_size, 
                                leftMargin=10*mm, rightMargin=10*mm,
                                topMargin=10*mm, bottomMargin=10*mm)
        
        # Create styles for text
        styles = getSampleStyleSheet()
        style_name = ParagraphStyle(
            'ProductName',
            parent=styles['Normal'],
            fontSize=10,
            alignment=1,  # Center alignment
        )
        style_price = ParagraphStyle(
            'ProductPrice',
            parent=styles['Normal'],
            fontSize=10,
            alignment=1,  # Center alignment
            fontName='Helvetica-Bold'
        )
        style_code = ParagraphStyle(
            'ProductCode',
            parent=styles['Normal'],
            fontSize=8,
            alignment=1,  # Center alignment
        )
        
        # Calculate available width and adjust label width if needed
        avail_width = page_size[0] - 20*mm  # Available width (page width minus margins)
        label_width = min(label_width, avail_width / labels_per_row)
        
        # Create data for table
        data = []
        current_row = []
        
        for i, item in enumerate(items_data):
            if i > 0 and i % labels_per_row == 0:
                data.append(current_row)
                current_row = []
            
            # Get barcode value (use barcode, sku, or item ID)
            barcode_value = item.get('barcode') or item.get('sku') or f"PROD{item.get('id')}"
            
            try:
                # Create barcode drawing
                barcode = createBarcodeDrawing(
                    barcode_type,
                    value=barcode_value,
                    width=label_width * 0.8,
                    height=label_height * 0.4,
                    humanReadable=True
                )
                
                # Create cell content
                content = []
                
                # Product name (truncate if too long)
                name = item.get('name', '')
                if len(name) > 20:  
                    name = name[:18] + '...'
                content.append(Paragraph(name, style_name))
                
                # Barcode
                content.append(barcode)
                
                # Product code/SKU
                if item.get('sku'):
                    content.append(Paragraph(item.get('sku'), style_code))
                
                # Price handling with proper validation
                if item.get('price') is not None:
                    try:
                        # Try to convert to float, handling different formats
                        price_value = item.get('price')
                        if isinstance(price_value, str):
                            # Remove currency symbols or commas if present
                            price_value = price_value.replace('$', '').replace(',', '').strip()
                        
                        price_float = float(price_value)
                        price_str = f"${price_float:.2f}"
                        content.append(Paragraph(price_str, style_price))
                    except (ValueError, TypeError):
                        # If conversion fails, just display the price as-is
                        price_str = str(item.get('price'))
                        content.append(Paragraph(price_str, style_price))
                
                current_row.append(content)
            
            except Exception as e:
                current_row.append(Paragraph(f"Error: {str(e)}", styles['Normal']))
        
        # Add the last row if not empty
        if current_row:
            # Fill remaining cells in the last row with empty cells
            while len(current_row) < labels_per_row:
                current_row.append("")
            data.append(current_row)
        
        # Create the table and apply styles
        col_widths = [label_width] * labels_per_row
        table = Table(data, colWidths=col_widths)
        
        # Apply table style
        style = TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('INNERGRID', (0, 0), (-1, -1), 0.25, colors.white),
            ('BOX', (0, 0), (-1, -1), 0.25, colors.white),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ])
        table.setStyle(style)
        
        # Build PDF
        elements = [table]
        doc.build(elements)
        
        # Get binary data
        pdf_data = buffer.getvalue()
        buffer.close()
        
        return pdf_data