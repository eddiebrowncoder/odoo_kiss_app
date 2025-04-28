/** @odoo-module **/

import { Component, useState, onMounted, xml } from '@odoo/owl';
import { AddItem } from '../components/modals/AddItem';
import { OpenItem } from '../components/modals/OpenItem';
import { CustomerList } from '../components/modals/CustomerList';
import { AddCustomer } from '../components/modals/AddCustomer';
import { Toast } from '../components/alerts/toast';

export class OrderScreen extends Component {
    setup() {
        this.state = useState({
            orders: [],
            currentOrder: null,
            searchQuery: '',
            totalQuantity: 0,
            totalItems: 0,
            currentPage: 1,
            itemsPerPage: 4,
            showOpenItemModal: false,
            showAddItemModal: false,
            showCustomerListModal: false,
            showAddCustomerModal: false,
            storeId: 1,
        });

        this.openOpenItemModal = this.openOpenItemModal.bind(this);
        this.openAddItemModal = this.openAddItemModal.bind(this);
        this.closeOpenItemModal = this.closeOpenItemModal.bind(this);
        this.closeAddItemModal = this.closeAddItemModal.bind(this);
        this.saveOpenItem = this.saveOpenItem.bind(this);
        this.saveNewItem = this.saveNewItem.bind(this);
        this.openCustomerModal = this.openCustomerModal.bind(this);
        this.closeCustomerModal = this.closeCustomerModal.bind(this);
        this.selectCustomer = this.selectCustomer.bind(this);
        this.handleAddNewCustomer = this.handleAddNewCustomer.bind(this);
        this.openAddCustomerModal = this.openAddCustomerModal.bind(this);
        this.closeAddCustomerModal = this.closeAddCustomerModal.bind(this);
        this.handleCustomerAdded = this.handleCustomerAdded.bind(this);

        onMounted(async () => {
            await this.fetchOrders();
        });
    }

    openCustomerModal() {
        this.state.showCustomerListModal = true;
        this.state.showAddCustomerModal = false;
    }

    closeCustomerModal() {
        this.state.showCustomerListModal = false;
    }

    openAddCustomerModal() {
        this.state.showCustomerListModal = false;
    }

    closeAddCustomerModal() {
        this.state.showAddCustomerModal = false;
    }

    handleCustomerAdded() {
        this.state.showAddCustomerModal = false;
        this.state.showCustomerListModal = false;
    }

    selectCustomer(customer) {
        console.log('Selected customer:', customer);
        this.state.showCustomerListModal = false;
    }

    handleAddNewCustomer() {
        console.log('Add new customer');
        this.state.showCustomerListModal = false;
        this.state.showAddCustomerModal = true;
    }

    openOpenItemModal() {
        this.state.showOpenItemModal = true;
    }

    closeOpenItemModal() {
        this.state.showOpenItemModal = false;
    }

    openAddItemModal() {
        this.state.showAddItemModal = true;
    }

    closeAddItemModal() {
        this.state.showAddItemModal = false;
    }

    async fetchOrders() {
        try {
            const response = await fetch(`/api/order/list/${this.state.storeId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            const data = await response.json();
            if (data.order_lines && Array.isArray(data.order_lines)) {
                this.state.orders = data.order_lines;
            } else {
                console.error('Invalid orders data:', data);
            }
        } catch (error) {
            console.error('Error fetching active orders:', error);
        }
    }

    handleSearch(event) {
        this.state.searchQuery = event.target.value;
        this.state.currentPage = 1;
    }

    get filteredItems() {
        if (!this.state.searchQuery) {
            return this.state.orders;
        }
        
        return this.state.orders.filter(item =>
            item.item_name && item.item_name.toLowerCase().includes(this.state.searchQuery.toLowerCase())
        );
    }

    get paginatedItems() {
        const start = (this.state.currentPage - 1) * this.state.itemsPerPage;
        const end = start + this.state.itemsPerPage;
        return this.filteredItems.slice(start, end);
    }

    get totalPages() {
        return Math.max(1, Math.ceil(this.filteredItems.length / this.state.itemsPerPage));
    }

    goToPage(page) {
        if (page < 1 || page > this.totalPages) return;
        this.state.currentPage = page;
    }

    async saveOpenItem() {
        try {
           console.log('Success');
        } catch (error) {
            console.error('Error saving new item:', error);
        }
    }

    async saveNewItem(itemData) {
        try {
            const response = await fetch('/api/store/add_item', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(itemData)
            });
    
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
    
            const data = await response.json();
            
            if (data.status === 'success') {
                await this.addItemToOrder(data.data)
            } else {
                console.log('Error saving item:', data.message);
                Toast.show(data.message, "danger");
            }
        } catch (error) {
            console.error('Error saving new item:', error);
        }
    }

    async addItemToOrder(product) {
        try {
            const response = await fetch('/api/order/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    store_id: this.state.storeId,
                    order_id: 1,
                    order_lines: [{
                        product_id: product.product_id,
                        quantity: 1,
                        price_unit: product.price
                    }]
                })
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                await this.fetchOrders();
                Toast.show("Item Added Successfully!", "success");
                this.closeAddItemModal();
            } else {
                console.error('Error adding item to order:', data.message);
            }
        } catch (error) {
            console.error('Error adding item to order:', error);
        }
    }

    async updateItemQuantity(orderId, lineId, quantity) {
        if (quantity <= 0) {
            await this.removeItem(lineId);
            return;
        }

        try {
            const response = await fetch(`/api/order/${orderId}/line/${lineId}/update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    quantity: quantity
                })
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                await this.fetchOrders();
                Toast.show("Quantity updated successfully!", "success");
            } else {
                console.error('Error updating item quantity:', data.message);
            }
        } catch (error) {
            console.error('Error updating item quantity:', error);
        }
    }

    async removeItem(orderId, lineId) {
        try {
            const response = await fetch(`/api/order/${orderId}/line/${lineId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.status === 'success') {
                await this.fetchOrders();
                Toast.show(data.message, "success");
            } else {
                console.error('Error removing item:', data.message);
            }
        } catch (error) {
            console.error('Error removing item:', error);
        }
    }

    async clearOrder() {
        if (!this.state.currentOrder) return;
        
        try {
            const promises = this.state.orders.map(item => 
                this.removeItem(item.id)
            );
            
            await Promise.all(promises);
            
            // Refresh data
            await this.fetchOrders();
        } catch (error) {
            console.error('Error clearing order:', error);
        }
    }

    incrementQuantity(item) {
        this.updateItemQuantity(item.order_id, item.id, item.quantity + 1);
    }

    decrementQuantity(item) {
        if (item.quantity > 1) {
            this.updateItemQuantity(item.order_id, item.id, item.quantity - 1);
        }
    }

    static components = { AddItem, OpenItem, CustomerList, AddCustomer   };

    static template = xml`
        <div class="order-screen h-100 d-flex flex-column bg-white">
            <div class="action-buttons d-flex pb-2 align-items-center gap-2">
                <button class="btn btn-light d-flex flex-row align-items-center gap-1" t-on-click="clearOrder">
                    <i class="fa fa-trash me-1"></i> Clear Order
                </button>
                <button class="btn btn-light d-flex flex-row align-items-center gap-1">
                    <i class="fa fa-pause-circle me-1"></i> Hold Order
                </button>
                <button class="btn btn-light d-flex flex-row align-items-center gap-1">
                    <svg stroke="currentColor" fill="currentColor" stroke-width="0.5" viewBox="0 0 24 24" aria-hidden="true" height="20px" width="20px" xmlns="http://www.w3.org/2000/svg">
                        <path fill-rule="evenodd" d="M21.53 9.53a.75.75 0 0 1-1.06 0l-4.72-4.72V15a6.75 6.75 0 0 1-13.5 0v-3a.75.75 0 0 1 1.5 0v3a5.25 5.25 0 1 0 10.5 0V4.81L9.53 9.53a.75.75 0 0 1-1.06-1.06l6-6a.75.75 0 0 1 1.06 0l6 6a.75.75 0 0 1 0 1.06Z" clip-rule="evenodd"></path>
                    </svg>
                    Recall Order
                </button>
                <button class="btn btn-light d-flex flex-row align-items-center gap-1">
                    <i class="fa fa-sticky-note me-1"></i> Order Note
                </button>
                <button class="btn text-primary ms-auto" t-on-click="openCustomerModal">
                    <i class="fa fa-address-card me-1"></i> Link Customer
                </button>
            </div>
            
            <div class="d-flex flex-row o_search_bar py-2 gap-2" style="height: 52px;">
                <div class="input-group">
                    <span class="input-group-text bg-white">
                        <i class="fa fa-search"></i>
                    </span>
                    <input type="text" class="form-control" placeholder="Search Item by Name" 
                           t-model="state.searchQuery" t-on-input="handleSearch"/>
                </div>
                <button class="btn btn-primary text-nowrap" t-on-click="openOpenItemModal">Open Price</button>
                <button class="btn btn-primary ms-2 text-nowrap" t-on-click="openAddItemModal">Add Item</button>
            </div>
            
            <div class="item-table flex-grow-1 overflow-auto">
                <table class="table table-hover mb-0">
                    <thead class="table-light sticky-top">
                        <tr>
                            <th></th>
                            <th>BARCODE</th>
                            <th>ITEM</th>
                            <th>UNIT PRICE</th>
                            <th>QUANTITY</th>
                            <th>PRICE</th>
                        </tr>
                    </thead>
                    <tbody>
                        <t t-foreach="paginatedItems" t-as="item" t-key="item.id">
                            <tr>
                                <td>
                                    <button class="btn btn-sm text-danger" t-on-click="() => this.removeItem(item.order_id, item.id)">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#0070FF" class="size-6" height="20px" width="20px">
                                            <path fill-rule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
                                        </svg>
                                    </button>
                                </td>
                                <td class="fw-semibold"><t t-esc="(item.barcode || 'ITEM_0' + item.product_id)"/></td>
                                <td><t t-esc="item.item_name"/></td>
                                <td>$ <t t-esc="(item.unit_price || 0).toFixed(2)"/></td>
                                <td class="d-flex align-items-center">
                                    <button class="btn btn-sm btn-light" 
                                            t-on-click="() => this.decrementQuantity(item)">
                                        <i class="fa fa-minus"></i>
                                    </button>
                                    <span class="px-2"><t t-esc="item.quantity"/></span>
                                    <button class="btn btn-sm btn-light" 
                                            t-on-click="() => this.incrementQuantity(item)">
                                        <i class="fa fa-plus"></i>
                                    </button>
                                </td>
                                <td class="text-primary">$ <t t-esc="item.total_price.toFixed(2)"/></td>
                            </tr>
                        </t>
                    </tbody>
                </table>
            </div>
            
            <div class="o_order_footer d-flex justify-content-between align-items-center p-2 border-top">
                <div class="text-14">
                    <span><t t-esc="state.currentPage"/> of <t t-esc="totalPages"/></span> 
                    ITEMS - <t t-esc="filteredItems.length"/> TOTAL QUANTITY
                </div>
                <div class="d-flex flex-row gap-2">
                    <button class="btn btn-sm btn-light" t-on-click="() => this.goToPage(state.currentPage - 1)" 
                            t-att-disabled="state.currentPage === 1">
                        <i class="fa fa-arrow-up"></i>
                    </button>
                    <button class="btn btn-sm btn-light" t-on-click="() => this.goToPage(state.currentPage + 1)"
                            t-att-disabled="state.currentPage === totalPages">
                        <i class="fa fa-arrow-down"></i>
                    </button>
                </div>
            </div>

            <t t-if="state.showOpenItemModal">
                <OpenItem onClose="closeOpenItemModal" onSave="saveOpenItem" />
            </t>
            <t t-if="state.showAddItemModal">
                <AddItem onClose="closeAddItemModal" onSave="saveNewItem" />
            </t>
            <t t-if="state.showCustomerListModal">
                <CustomerList onClose="closeCustomerModal" onSelect="selectCustomer" onAddNew="handleAddNewCustomer" />
            </t>
            <t t-if="state.showAddCustomerModal">
                <AddCustomer onClose="closeAddCustomerModal" onSuccess="handleCustomerAdded" />
            </t>
        </div>
    `;
}