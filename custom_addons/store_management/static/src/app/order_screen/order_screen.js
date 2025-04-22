/** @odoo-module **/

import { Component, useState, onMounted, xml } from '@odoo/owl';
import { AddItem } from '../components/modals/add_item';
import { OpenItem } from '../components/modals/open_item';
import { CustomerList } from '../components/modals/customer_list';
import { AddCustomer } from '../components/modals/add_customer';

export class OrderScreen extends Component {
    setup() {
        this.state = useState({
            items: [],
            searchQuery: '',
            totalQuantity: 0,
            currentPage: 1,
            itemsPerPage: 5,
            showOpenItemModal: false,
            showAddItemModal: false,
            showCustomerModal: false,
            showAddCustomerModal: false,
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
            await this.fetchProducts();
        });
    }

    openCustomerModal() {
        this.state.showCustomerModal = true;
        this.state.showAddCustomerModal = false;
    }

    closeCustomerModal() {
        this.state.showCustomerModal = false;
    }

    openAddCustomerModal() {
        this.state.showCustomerModal = false;
    }

    closeAddCustomerModal() {
        this.state.showAddCustomerModal = false;
    }

    handleCustomerAdded() {
        this.state.showAddCustomerModal = false;
        this.state.showCustomerModal = false;
    }

    selectCustomer(customer) {
        console.log('Selected customer:', customer);
        this.state.showCustomerModal = false;
    }

    handleAddNewCustomer() {
        console.log('Add new customer');
        this.state.showCustomerModal = false;
        this.state.showAddCustomerModal = true;
    }

    async fetchProducts() {
        try {
            const response = await fetch('/api/store/products', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            const data = await response.json();
            if (data.status === 'success') {
                this.state.items = data.products.map(product => ({
                    barcode: product.barcode,
                    name: product.name,
                    unitPrice: product.unit_price,
                    quantity: product.quantity,
                    price: product.price
                }));
                
                this.state.totalQuantity = this.state.items.reduce(
                    (total, item) => total + item.quantity, 0
                );
            }
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    }

    handleSearch(event) {
        this.state.searchQuery = event.target.value;
        this.state.currentPage = 1;
    }

    get filteredItems() {
        return this.state.items.filter(item =>
            item.name.toLowerCase().includes(this.state.searchQuery.toLowerCase())
        );
    }

    get paginatedItems() {
        const start = (this.state.currentPage - 1) * this.state.itemsPerPage;
        const end = start + this.state.itemsPerPage;
        return this.filteredItems.slice(start, end);
    }

    get totalPages() {
        return Math.ceil(this.filteredItems.length / this.state.itemsPerPage);
    }

    goToPage(page) {
        if (page < 1 || page > this.totalPages) return;
        this.state.currentPage = page;
    }

    openOpenItemModal() {
        this.state.showOpenItemModal = true;
    }

    openAddItemModal() {
        this.state.showAddItemModal = true;
    }

    closeOpenItemModal() {
        this.state.showOpenItemModal = false;
    }

    closeAddItemModal() {
        this.state.showAddItemModal = false;
        // Reset form
        this.state.newItem = {
            barcode: '',
            name: '',
            sellingPrice: '',
            sku: '',
            company: '',
            category: '',
            note: ''
        };
    }

    async saveOpenItem(itemData) {
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
                this.closeAddItemModal();
                await this.fetchProducts();
            } else {
                console.error('Error saving item:', data.message);
                // You could add a UI error notification here
            }
        } catch (error) {
            console.error('Error saving new item:', error);
        }
    }

    static components = { AddItem, OpenItem, CustomerList, AddCustomer   };

    static template = xml`
        <div class="order-screen h-100 d-flex flex-column bg-white">
            <div class="action-buttons d-flex py-2 align-items-center gap-2">
                <button class="btn btn-light d-flex flex-row align-items-center gap-1">
                    <i class="fa fa-trash me-1"></i> Clear Order
                </button>
                <button class="btn btn-light d-flex flex-row align-items-center gap-1">
                    <i class="fa fa-pause-circle me-1"></i> Hold Order
                </button>
                <button class="btn btn-light d-flex flex-row align-items-center gap-1">
                    <i class="fa fa-redo me-1"></i> Recall Order
                </button>
                <button class="btn btn-light d-flex flex-row align-items-center gap-1">
                    <i class="fa fa-sticky-note me-1"></i> Order Note
                </button>
                <button class="btn text-primary ms-auto" t-on-click="openCustomerModal">
                    <i class="fa fa-address-card me-1"></i> Link Customer
                </button>
            </div>
            
            <div class="d-flex flex-row o_search_bar py-2 gap-2" style="height: 55px;">
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
                    <thead class="table-light sticky-top text-gray-700">
                        <tr>
                            <th>BARCODE</th>
                            <th>ITEM</th>
                            <th>UNIT PRICE</th>
                            <th>QUANTITY</th>
                            <th>PRICE</th>
                        </tr>
                    </thead>
                    <tbody>
                        <t t-foreach="paginatedItems" t-as="item" t-key="item.barcode">
                            <tr>
                                <td><t t-esc="item.barcode"/></td>
                                <td><t t-esc="item.name"/></td>
                                <td><t t-esc="item.unitPrice"/></td>
                                <td><t t-esc="item.quantity"/></td>
                                <td><t t-esc="item.price"/></td>
                            </tr>
                        </t>
                    </tbody>
                </table>
            </div>
            
            <div class="o_order_footer d-flex justify-content-between align-items-center p-2 border-top">
                <div class="text-16">
                    <span><t t-esc="state.currentPage"/> of <t t-esc="totalPages || 1"/></span> ITEMS - <t t-esc="state.totalQuantity"/> TOTAL QUANTITY
                </div>
                <div class="d-flex flex-row gap-2">
                    <button class="btn btn-sm btn-light" t-on-click="() => this.goToPage(state.currentPage - 1)" 
                            t-att-disabled="state.currentPage === 1">
                        <i class="fa fa-arrow-up"></i>
                    </button>
                    <button class="btn btn-sm btn-light" t-on-click="() => this.goToPage(state.currentPage + 1)"
                            t-att-disabled="state.currentPage === totalPages || totalPages === 0">
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
            <t t-if="state.showCustomerModal">
                <CustomerList onClose="closeCustomerModal" onSelect="selectCustomer" onAddNew="handleAddNewCustomer" />
            </t>
            <t t-if="state.showAddCustomerModal">
                <AddCustomer onClose="closeAddCustomerModal" onSuccess="handleCustomerAdded" />
            </t>
        </div>
    `;
}