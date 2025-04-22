{
    'name': 'Kiss POS',
    'version': '1.0',
    'category': 'Website',
   'depends': ['base', 'product', 'web'],
    'data': [
        'views/template.xml',
    ],
    'assets': {
        'web.assets_frontend': [
            ('include', 'web.assets_common'),
            ('include', 'web.assets_webclient'),
            'kiss_pos/static/src/js/Category/*.js',
            'kiss_pos/static/src/js/Item/*.js',  
            'kiss_pos/static/src/js/Warehouse/*.js',  
            'kiss_pos/static/src/js/Common/*.js', 
            'kiss_pos/static/src/css/*.scss',  
            'kiss_pos/static/src/css/Category/*.css',     
            'kiss_pos/static/src/css/Item/*.css',    
            'kiss_pos/static/src/css/Warehouse/*.css',    
        ],
    },
    'application': True,
}