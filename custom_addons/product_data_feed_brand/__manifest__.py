# Copyright © 2022 Garazd Creation (https://garazd.biz)
# @author: Yurii Razumovskyi (support@garazd.biz)
# @author: Iryna Razumovska (support@garazd.biz)
# License LGPL-3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.html).

{
    'name': 'Product Brands for Data Feeds',
    'version': '18.0.1.0.1',
    'category': 'eCommerce',
    'author': 'Garazd Creation',
    'website': 'https://garazd.biz/shop',
    'license': 'LGPL-3',
    'summary': 'Manage Product Brands',
    'images': ['static/description/banner.png', 'static/description/icon.png'],
    'live_test_url': 'https://garazd.biz/r/UZe',
    'depends': [
        'product',
    ],
    'data': [
        'security/ir.model.access.csv',
        'data/ir.config_parameter_data.xml',
        'views/product_data_feed_brand_views.xml',
        'views/product_template_views.xml',
    ],
    'demo': [
        'demo/brand_demo.xml',
        'demo/product_demo.xml',
    ],
    'support': 'support@garazd.biz',
    'application': False,
    'installable': True,
    'auto_install': False,
}
