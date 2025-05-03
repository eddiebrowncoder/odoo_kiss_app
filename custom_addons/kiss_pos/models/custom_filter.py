from odoo import models, fields

class CustomFilter(models.Model):
    _name = "custom.filter"
    _description = "Custom Filters"
    _rec_name = "name"
    
    user_id = fields.Many2one('res.users', string="User", required=True, 
                             default=lambda self: self.env.user,
                             help="User who created this filter")
    name = fields.Char(string="Filter Name", required=True, 
                      help="Name of the custom filter")
    filter_parameters = fields.Text(string="Filter Parameters", 
                                  help="JSON formatted filter parameters")
    active = fields.Boolean(string="Active", default=True,
                           help="Indicates whether this filter is active")
    