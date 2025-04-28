/** @odoo-module **/
import { Component, useState, xml } from '@odoo/owl';
import { AddCustomer } from '../components/modals/AddCustomer';

export class StoreFooter extends Component {
    setup() {
        this.state = useState({
            showAddCustomerModal: false
        });

        this.quickFunctions = [
            { id: 'logout', name: 'Log Out', icon: 'fa-sign-out' },
            { id: 'end_day', name: 'End of Day', icon: 'fa-lock' },
            { id: 'settlement', name: 'Settlement', icon: 'fa-balance-scale' },
            { id: 'refund', name: 'Refund Without Receipt', icon: 'fa-file-text-o' },
            { id: 'add_customer', name: 'Add New Customer', icon: 'fa-user-plus' }
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

    static components = { AddCustomer };

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
                                <span class="quick-function-icon p-1 bg-gray">
                                    <i t-attf-class="fa {{func.icon}}"></i>
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