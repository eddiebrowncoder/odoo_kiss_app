/** @odoo-module **/
import { Component, useState, xml } from '@odoo/owl';
import { AddCustomer } from '../components/modals/AddCustomer';
import { ImageIcon } from '../components/ImageIcon';

export class StoreFooter extends Component {
    setup() {
        this.state = useState({
            showAddCustomerModal: false
        });

        this.quickFunctions = [
            { id: 'logout', name: 'Log Out', icon: 'logout' },
            { id: 'end_day', name: 'End of Day', icon: 'lock' },
            { id: 'settlement', name: 'Settlement', icon: 'settlement' },
            { id: 'refund', name: 'Refund Without Receipt', icon: 'receipt' },
            { id: 'add_customer', name: 'Add New Customer', icon: 'user' }
        ];
    }

    handleFunctionClick(functionId) {
        if (functionId === 'add_customer') {
            this.state.showAddCustomerModal = true;
        }
        // Implement other specific functionality based on the clicked function
    }

    handleEditClick() {
        console.log("Edit button clicked");
    }
    
    closeAddCustomerModal() {
        this.state.showAddCustomerModal = false;
    }
    
    handleNewCustomerAdded(customerData) {
        this.state.showAddCustomerModal = false;
        this.env.bus.trigger('customer-added', customerData);
    }

    static components = { AddCustomer, ImageIcon };

    static template = xml`
        <div class="container-fluid border-top py-3 bg-white">
            <div class="row align-items-center">
                <div class="col-12 d-flex justify-content-between mb-2">
                    <div class="col-4">
                        <span class="fw-bold text-uppercase">QUICK FUNCTIONS</span>
                    </div>
                    <div class="col-2 text-end">
                        <a href="#" class="text-primary" t-on-click.prevent="handleEditClick">Edit</a>
                    </div>
                </div>
                <div class="col-12 d-flex">
                    <t t-foreach="quickFunctions" t-as="func" t-key="func.id">
                        <div class="quick-function-item me-4" t-on-click="() => this.handleFunctionClick(func.id)">
                            <div class="d-flex flex-row align-items-center gap-2 cursor-pointer">
                                <span class="quick-function-icon py-1 px-2 rounded bg-gray">
                                    <ImageIcon name="func.icon" width="18" height="18" />
                                </span>
                                <span class="quick-function-name small">
                                    <t t-esc="func.name"/>
                                </span>
                            </div>
                        </div>
                    </t>
                </div>
            </div>

            <!-- Add Customer Modal -->
            <t t-if="state.showAddCustomerModal">
                <AddCustomer 
                    onClose="() => this.closeAddCustomerModal()"
                    onConfirm="(customerData) => this.handleNewCustomerAdded(customerData)"
                />
            </t>
        </div>
    `;
}