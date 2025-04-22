/** @odoo-module **/

import { Component, useState, xml, onMounted } from '@odoo/owl';

export class CustomerList extends Component {
    setup() {
        this.state = useState({
            searchQuery: '',
            customers: [],
            isLoading: true,
            error: null
        });

        onMounted(() => this.fetchCustomers());
    }

    static props = {
        onClose: Function,
        onSelect: { type: Function, optional: true },
        onAddNew: { type: Function, optional: true },
    };

    async fetchCustomers() {
        try {
            this.state.isLoading = true;
            const response = await fetch('/api/customer/list');
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.status === 'success') {
                this.state.customers = data.customers.map(customer => ({
                    id: customer.id,
                    name: customer.name,
                    phone: customer.phone || customer.mobile || 'N/A',
                    email: customer.email || 'N/A',
                    points: 0,
                    lastPurchased: 'N/A',
                    group: 'Regular'
                }));
            } else {
                throw new Error(data.message || 'Failed to fetch customers');
            }
        } catch (error) {
            this.state.error = error.message;
            console.error('Error fetching customers:', error);
        } finally {
            this.state.isLoading = false;
        }
    }

    closeModal() {
        this.props.onClose();
    }

    selectCustomer(customer) {
        if (this.props.onSelect) {
            this.props.onSelect(customer);
        }
    }

    addNewCustomer() {
        if (this.props.onAddNew) {
            this.props.onAddNew();
        }
    }

    updateSearch(ev) {
        this.state.searchQuery = ev.target.value;
    }

    get filteredCustomers() {
        const query = this.state.searchQuery.toLowerCase();
        if (!query) return this.state.customers;
        
        return this.state.customers.filter(customer => 
            customer.name.toLowerCase().includes(query) || 
            customer.phone.includes(query) || 
            customer.email.toLowerCase().includes(query)
        );
    }

    static template = xml`
        <div class="modal fade show d-block" style="background-color: rgba(0, 0, 0, 0.5);">
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content">
                    <div class="modal-header border-0 pb-0 px-4 pt-3">
                        <h5 class="modal-title fw-bold">Customer</h5>
                        <button type="button" class="btn-close" t-on-click="closeModal"></button>
                    </div>
                    <div class="modal-body p-4">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <div class="position-relative flex-grow-1 me-3">
                                <i class="bi bi-search position-absolute start-3 top-50 translate-middle-y text-muted"></i>
                                <input 
                                    type="text" 
                                    class="form-control ps-5" 
                                    placeholder="Search by Customer Name, Phone Number, or Email"
                                    t-model="state.searchQuery"
                                    t-on-input="updateSearch"
                                />
                            </div>
                            <button 
                                class="btn btn-primary d-flex align-items-center" 
                                t-on-click="addNewCustomer"
                            >
                                <i class="bi bi-plus me-1"></i> Add New Customer
                            </button>
                        </div>
                        
                        <t t-if="state.isLoading">
                            <div class="text-center py-4">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Loading...</span>
                                </div>
                                <p class="mt-2">Loading customers...</p>
                            </div>
                        </t>
                        
                        <t t-elif="state.error">
                            <div class="alert alert-danger" role="alert">
                                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                                Error: <t t-esc="state.error"/>
                                <button class="btn btn-sm btn-outline-danger ms-2" t-on-click="fetchCustomers">
                                    Retry
                                </button>
                            </div>
                        </t>
                        
                        <t t-elif="filteredCustomers.length === 0">
                            <div class="text-center py-4">
                                <i class="bi bi-search fs-1 text-muted"></i>
                                <p class="mt-2">No customers found. Try a different search or add a new customer.</p>
                            </div>
                        </t>
                        
                        <t t-else="">
                            <div class="customer-table-container" style="max-height: 500px; overflow-y: auto;">
                                <table class="table">
                                    <thead class="sticky-top bg-white">
                                        <tr class="text-uppercase small">
                                            <th scope="col">CUSTOMER</th>
                                            <th scope="col">EMAIL ADDRESS</th>
                                            <th scope="col">POINTS</th>
                                            <th scope="col">LAST PURCHASED</th>
                                            <th scope="col">CUSTOMER GROUP</th>
                                            <th scope="col"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <t t-foreach="filteredCustomers" t-as="customer" t-key="customer.id">
                                            <tr class="align-middle">
                                                <td>
                                                    <div>
                                                        <span class="fw-medium d-block" t-esc="customer.name"></span>
                                                        <small class="text-muted" t-esc="customer.phone"></small>
                                                    </div>
                                                </td>
                                                <td t-esc="customer.email"></td>
                                                <td t-esc="customer.points"></td>
                                                <td t-esc="customer.lastPurchased"></td>
                                                <td>
                                                    <span class="badge bg-primary rounded-pill px-3 py-2 fw-normal">
                                                        <t t-esc="customer.group" />
                                                    </span>
                                                </td>
                                                <td>
                                                    <button 
                                                        class="btn btn-link text-primary p-1"
                                                        t-on-click="() => this.selectCustomer(customer)"
                                                    >
                                                        <i class="bi bi-pencil-fill"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        </t>
                                    </tbody>
                                </table>
                            </div>
                        </t>
                    </div>
                </div>
            </div>
        </div>
    `;
}