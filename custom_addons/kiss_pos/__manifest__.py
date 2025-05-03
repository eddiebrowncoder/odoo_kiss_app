{
    'name': 'Kiss POS',
    'version': '1.0',
    'category': 'Website',
    'depends': ['base', 'product', 'web', 'point_of_sale'],
    'license': 'LGPL-3',
    'data': [
        'views/template.xml',
        'security/ir.model.access.csv',
    ],
    'assets': {
        'web.assets_frontend': [
            ('include', 'web.assets_common'),
            ('include', 'web.assets_webclient'),
            'kiss_pos/static/src/js/**/*.js',
            'kiss_pos/static/src/css/**/*.css',  
            'kiss_pos/static/src/css/**/*.scss',   
            'kiss_pos/static/src/scss/**/*.scss',  
            'kiss_pos/static/src/css/*.css',  
            'kiss_pos/static/src/scss/*.scss',    
            'kiss_pos/static/src/css/*.scss',    
        ],
    },
    'application': True,
}