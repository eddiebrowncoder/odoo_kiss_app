from odoo import http
from odoo.http import request
import json
import logging

_logger = logging.getLogger(__name__)


class SettingsController(http.Controller):

    @http.route('/settings', type='http', auth='user', website=True)
    def category_new(self, **kw):
        return request.render('kiss_pos.template', {})
