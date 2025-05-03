from odoo import models, fields, api

class ProductCategoryExtended(models.Model):
    _inherit = "product.category"
    
    # Define the status field
    status = fields.Boolean(string="Status", default=True, 
                           help="Indicates whether this category is active or inactive")