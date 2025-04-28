/** @odoo-module **/

import { Component, useState, xml } from '@odoo/owl';

export class AddItem extends Component {
    setup() {
        this.state = useState({
            newItem: {
                barcode: '',
                name: '',
                sellingPrice: '',
                sku: '',
                company: '',
                category: '',
                note: ''
            }
        });
    }

    static props = {
        onClose: Function,
        onSave: Function
    };

    async saveItem() {
        // Validate required fields
        if (!this.state.newItem.name || 
            !this.state.newItem.sellingPrice || 
            !this.state.newItem.barcode) {
            console.error('Missing required fields');
            return;
        }

        const itemData = {
            name: this.state.newItem.name,
            list_price: parseFloat(this.state.newItem.sellingPrice),
            barcode: this.state.newItem.barcode,
            category_id: this.state.newItem.category ? parseInt(this.state.newItem.category) : false,
            default_code: this.state.newItem.sku,
            type: 'consu',
            company_id: this.state.newItem.company ? this.state.newItem.company : false,
        };

        this.props.onSave(itemData);
    }

    closeModal() {
        this.state.newItem = {
            barcode: '',
            name: '',
            sellingPrice: '',
            sku: '',
            company: '',
            category: '',
            note: ''
        };
        
        this.props.onClose();
    }

    static template = xml`
        <div class="modal fade show d-block" style="background-color: rgba(0, 0, 0, 0.5);">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header border-0 pb-0">
                        <h5 class="modal-title fw-bold">Add New Item</h5>
                        <button type="button" class="btn-close" t-on-click="closeModal"></button>
                    </div>
                    <div class="modal-body text-start hide-scrollbar p-4">
                        <div class="mb-3 row">
                            <div class="col-md-6">
                                <label class="form-label">Barcode <span class="text-danger">*</span></label>
                                <div class="input-group">
                                    <input type="text" class="form-control bg-light" 
                                           t-model="state.newItem.barcode"
                                           placeholder="ABC-456789"/>
                                    <span class="input-group-text bg-light">
                                        <i class="fa fa-barcode"></i>
                                    </span>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Item Name <span class="text-danger">*</span></label>
                                <input type="text" class="form-control bg-light" 
                                       t-model="state.newItem.name"
                                       placeholder="VLuxe Noir Bougie Eyelashes"/>
                            </div>
                        </div>
                        
                        <div class="mb-3 row">
                            <div class="col-md-6">
                                <label class="form-label">Selling Price <span class="text-danger">*</span></label>
                                <div class="input-group">
                                    <span class="input-group-text">$</span>
                                    <input type="text" class="form-control text-end" 
                                           t-model="state.newItem.sellingPrice"
                                           placeholder="12.00"/>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">SKU <span class="text-danger">*</span></label>
                                <input type="text" class="form-control bg-light" 
                                       t-model="state.newItem.sku"
                                       placeholder="ABC-456789"/>
                            </div>
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label">Company</label>
                            <input type="text" class="form-control bg-light" 
                                   t-model="state.newItem.company"
                                   placeholder="ABC-456789-VLuxe"/>
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label">Category</label>
                            <select class="form-select" t-model="state.newItem.category">
                                <option value="">Select a Category</option>
                                <option value="1">Beauty</option>
                                <option value="2">Cosmetics</option>
                                <option value="3">Eyelashes</option>
                            </select>
                        </div>
                        
                        <div class="mb-3">
                            <input type="text" class="form-control bg-light" 
                                   t-model="state.newItem.note"
                                   placeholder="Add Optional Note"/>
                        </div>
                    </div>
                    <div class="modal-footer border-0 pt-0">
                        <div class="d-flex gap-2 w-100">
                            <button type="button" class="btn btn-light flex-grow-1" t-on-click="closeModal">Cancel</button>
                            <button type="button" class="btn btn-primary flex-grow-1" t-on-click="saveItem">Save</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}