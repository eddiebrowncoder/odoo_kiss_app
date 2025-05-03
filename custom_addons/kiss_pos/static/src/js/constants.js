/** @odoo-module **/

export const ITEM_TYPES = [
    {id: 'consu', name: 'Consumable'},
    {id: 'service', name: 'Service'},
    {id: 'product', name: 'Storable Product'}
];

export const ITEM_UNITS = [
    {id:'EA', name:'EA'},
    {id:'Box', name:'Box'},
    {id:'Set', name:'Set'},
    {id:'Kit', name:'Kit'}
  ];

  export const PACKAGING_TYPES = [
    {id:'Box', name:'Box'},
    {id:'General', name:'General'},
    {id:'Kit', name:'Kit(Bundle)'},
    {id:'Set', name:'Set'}
  ];
  
  export const TAX_CODES = [
      {id: 'standard', name: 'Standard'},
      {id: 'reduced', name: 'Reduced'},
      {id: 'zero', name: 'Zero'}
  ];