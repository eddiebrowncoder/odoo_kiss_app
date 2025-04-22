from odoo import models, fields

class PosOrder(models.Model):
    _inherit = 'pos.order'

    customer_id = fields.Many2one('res.partner', string='Customer')
    order_note = fields.Text('Order Note')

    def clear_order(self):
        """ Clear all items from the order """
        self.write({'lines': [(5, 0, 0)]})
        self.update_total()

    def hold_order(self):
        """ Hold the order """
        self.write({'state': 'draft'})

    def recall_order(self):
        """ Recall the order """
        self.write({'state': 'paid'})
        self.update_total()

    def update_total(self):
        """ Update order totals after any changes """
        self.amount_untaxed = sum(line.price_subtotal for line in self.lines)
        self.amount_tax = sum(line.price_tax for line in self.lines)
        self.amount_total = self.amount_untaxed + self.amount_tax
