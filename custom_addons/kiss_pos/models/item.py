from odoo import models, fields

class ProductTemplate(models.Model):
    _inherit = 'product.template'  # Inherit the existing product.template model

    # Adding a custom field for MSRP
    msrp = fields.Float(string='MSRP', help="Manufacturer Suggested Retail Price")
    parent_company = fields.Char(string='Parent Company', help="Parent company of the product")
    brand = fields.Char(string='Brand') 
    item_status = fields.Char('item_status', help='Item Status')
