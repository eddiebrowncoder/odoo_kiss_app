{
    'name': 'Store Management',
    'version': '1.0',
    'category': 'Point of Sale',
    'summary': 'Store Management Module',
    'depends': ['point_of_sale', 'web'],
    'license': 'LGPL-3',
    'data': [
        'views/store_page_template.xml',
    ],
    'assets': {
        'web.assets_frontend': [
            'store_management/static/src/js/store_page_template.js',
            'store_management/static/src/app/**/*.js',
            'store_management/static/src/app/main_screen.js',
            'store_management/static/src/scss/pos_style.scss',
        ],
    },
    'installable': True,
    'application': True,
}
