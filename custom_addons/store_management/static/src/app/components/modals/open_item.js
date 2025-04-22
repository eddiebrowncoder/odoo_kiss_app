/** @odoo-module **/

import { Component, useState, xml } from '@odoo/owl';

export class OpenItem extends Component {
    setup() {
        this.state = useState({
            category: '',
            itemName: '',
            amount: 0.00,
            selectedAmount: 5.00,
            customAmount: '',
            categories: []
        });

        this.fetchCategories();
    }
    
    static props = {
        onClose: Function,
        onConfirm: Function
    };

    selectCategory(category) {
        this.state.category = category;
    }

    selectAmount(amount) {
        console.log('this.state', this.categories);
        this.state.selectedAmount = amount;
        this.state.customAmount = amount.toFixed(2);
    }
    
    updateCustomAmount(event) {
        const value = event.target.value;
        if (!value || /^\d+(\.\d{0,2})?$/.test(value)) {
            this.state.customAmount = value;
            if (value) {
                this.state.selectedAmount = parseFloat(value);
            }
        }
    }
    
    async fetchCategories() {
        try {
            const response = await fetch('/api/category_list');
            const data = await response.json();
            this.state.categories = data.categories;
        } catch (error) {
            console.error("❌ Failed to load categories:", error);
            // Keep the default categories on error
        }
    }

    async saveItem() {
        await this.props.onConfirm(this.state);
        this.closeModal();
    }

    closeModal() {
        this.props.onClose();
    }

    static template = xml`
        <div class="modal fade show d-block" style="background-color: rgba(0, 0, 0, 0.5);">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header border-0 pb-0">
                        <h5 class="modal-title fw-bold">Open item</h5>
                        <button type="button" class="btn-close" t-on-click="closeModal"></button>
                    </div>
                    <div class="modal-body text-start hide-scrollbar p-4">
                        <!-- Category tabs -->
                        <div class="d-flex gap-2 mb-4 overflow-auto hide-scrollbar">
                            <t t-foreach="state.categories" t-as="category" t-key="category.id">
                                <button t-attf-class="btn btn-sm rounded-pill px-3 py-1 fw-semibold #{ state.category === category.name ? 'badge-blue-200' : 'btn-light' }"
                                        t-on-click="() => this.selectCategory(category.name)">
                                    <t t-esc="category.name"/>
                                </button>
                            </t>
                            <button class="btn btn-sm text-primary bg-transparent px-3 py-1" 
                                    style="box-shadow: none;">
                                See All
                            </button>
                        </div>
                        
                        <!-- Item name input -->
                        <div class="mb-3">
                            <label for="itemName" class="form-label small mb-1">Name</label>
                            <input type="text" 
                                   class="form-control bg-light" 
                                   id="itemName" 
                                   t-model="state.itemName"
                                   placeholder="Enter Item Name" />
                        </div>
                        
                        <!-- Total amount -->
                        <div class="mb-3">
                            <label class="form-label small mb-1">Total Amount</label>
                            <input type="text" 
                                   class="form-control bg-white text-end border" 
                                   placeholder="Enter custom amount"
                                   t-model="state.customAmount"
                                   t-on-input="updateCustomAmount" />
                        </div>
                        
                        <!-- Amount selection grid -->
                        <div class="row g-2 mb-3">
                            <div class="col-6">
                                <button t-attf-class="btn {{ state.selectedAmount === 1.00 ? 'btn-primary' : 'btn-light' }} w-100"
                                        t-on-click="() => this.selectAmount(1.00)">
                                    $1.00
                                </button>
                            </div>
                            <div class="col-6">
                                <button t-attf-class="btn {{ state.selectedAmount === 2.00 ? 'btn-primary' : 'btn-light' }} w-100"
                                        t-on-click="() => this.selectAmount(2.00)">
                                    $2.00
                                </button>
                            </div>
                            <div class="col-6">
                                <button t-attf-class="btn {{ state.selectedAmount === 5.00 ? 'btn-primary' : 'btn-light' }} w-100"
                                        t-on-click="() => this.selectAmount(5.00)">
                                    $5.00
                                </button>
                            </div>
                            <div class="col-6">
                                <button t-attf-class="btn {{ state.selectedAmount === 10.00 ? 'btn-primary' : 'btn-light' }} w-100"
                                        t-on-click="() => this.selectAmount(10.00)">
                                    $10.00
                                </button>
                            </div>
                            <div class="col-6">
                                <button t-attf-class="btn {{ state.selectedAmount === 20.00 ? 'btn-primary' : 'btn-light' }} w-100"
                                        t-on-click="() => this.selectAmount(20.00)">
                                    $20.00
                                </button>
                            </div>
                            <div class="col-6">
                                <button t-attf-class="btn {{ state.selectedAmount === 50.00 ? 'btn-primary' : 'btn-light' }} w-100"
                                        t-on-click="() => this.selectAmount(50.00)">
                                    $50.00
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Footer with buttons -->
                    <div class="modal-footer border-0 pt-0">
                        <div class="d-flex gap-2 w-100">
                            <button type="button" class="btn btn-light flex-grow-1" t-on-click="closeModal">Cancel</button>
                            <button type="button" class="btn btn-primary flex-grow-1" t-on-click="saveItem">Confirm</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}