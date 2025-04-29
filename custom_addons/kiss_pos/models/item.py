from odoo import models, fields

class ProductTemplate(models.Model):
    _inherit = 'product.template'
    
    # Price and status fields
    msrp = fields.Float(string='MSRP', help="Manufacturer Suggested Retail Price")
    item_status = fields.Char(string='Item Status', help='Status of the item')
    
    # Company and vendor relationships
    parent_company_id = fields.Many2one('res.company', string='Parent Company',
                                        help="Parent company of the product")
    vendor1_id = fields.Many2one('res.partner', string='Primary Vendor',
                                domain=[('supplier_rank', '>', 0)],
                                help="Primary vendor/supplier for this product")
    vendor2_id = fields.Many2one('res.partner', string='Secondary Vendor',
                                domain=[('supplier_rank', '>', 0)],
                                help="Secondary vendor/supplier for this product")
    
    # Product details
    brand = fields.Char(string='Brand', help="Brand name of the product")
    size = fields.Char(string='Size', help="Size of the product")
    dimension = fields.Char(string='Dimensions', help="Dimensions of the product")
    item_unit = fields.Char(string='Item Unit', help="Unit of measurement for the item")
    packaging_type = fields.Char(string='Packaging Type', help="Type of packaging")
    srs_category = fields.Char(string='SRS Category', help="SRS specific category")
    color_name = fields.Char(string="Color Name")
    
    # Inventory fields
    on_hand = fields.Float(string='On Hand Quantity', default=0.0, 
                           help="Current quantity on hand")
    inventory_tracking = fields.Boolean(string='Inventory Tracking', default=True,
                                       help="Whether to track inventory for this product")
    in_transit = fields.Float(string='In Transit', default=0.0,
                             help="Quantity currently in transit")
    reorder_point = fields.Float(string='Reorder Point', default=0.0,
                                help="Quantity threshold to trigger reordering")
    restock_level = fields.Float(string='Restock Level', default=0.0,
                                help="Target quantity when restocking")
    min_order_qty = fields.Float(string='Minimum Order Quantity', default=0.0,
                                help="Minimum quantity that can be ordered")
    
    # Additional properties
    age_restriction = fields.Boolean(string='Age Restriction', default=False,
                                    help="Whether this product has age restrictions")
    use_ebt = fields.Boolean(string='Use EBT', default=False,
                             help="Whether this product is eligible for EBT")