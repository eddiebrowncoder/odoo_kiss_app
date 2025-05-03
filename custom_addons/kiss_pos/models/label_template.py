from odoo import models, fields, api
from odoo.exceptions import ValidationError

class LabelTemplate(models.Model):
    _name = 'kiss_pos.label_template'
    _description = 'Label Template'
    _order = 'name'
    
    name = fields.Char('Template Name', required=True)
    width = fields.Float('Width (inches)', required=True)
    height = fields.Float('Height (inches)', required=True)
    price = fields.Float('Price', default=0.0)
    is_default = fields.Boolean('Default Template')
    active = fields.Boolean(default=True)
    
    # Fields that can be displayed on the label
    field_ids = fields.One2many('kiss_pos.label_template_field', 'template_id', string='Fields')
    
    @api.constrains('is_default')
    def _check_default(self):
        if self.is_default:
            templates = self.search([('is_default', '=', True), ('id', '!=', self.id)])
            if templates:
                templates.write({'is_default': False})
                
    def to_dict(self):
        """Convert template to dictionary format for frontend"""
        return {
            'id': self.id,
            'name': self.name,
            'size': f"{self.width}\" x {self.height}\"",
            'width': self.width,
            'height': self.height,
            'price': self.price,
            'is_default': self.is_default,
            'fields': [field.to_dict() for field in self.field_ids],
        }

class LabelTemplateField(models.Model):
    _name = 'kiss_pos.label_template_field'
    _description = 'Label Template Field'
    _order = 'sequence'
    
    template_id = fields.Many2one('kiss_pos.label_template', string='Template', required=True, ondelete='cascade')
    field_name = fields.Selection([
        ('barcode', 'Barcode'),
        ('sku', 'SKU'),
        ('description', 'Description'),
        ('selling_price', 'Selling Price'),
        ('category', 'Category'),
        ('subcategory', 'Subcategory'),
        ('sub_subcategory', 'Sub-subcategory'),
    ], string='Field', required=True)
    sequence = fields.Integer('Sequence', default=10)
    is_visible = fields.Boolean('Visible', default=True)
    
    def to_dict(self):
        """Convert field to dictionary format for frontend"""
        return {
            'id': self.id,
            'field_name': self.field_name,
            'sequence': self.sequence,
            'is_visible': self.is_visible,
        }