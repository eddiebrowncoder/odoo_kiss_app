/** @odoo-module **/
// In a new file: category_add.js

import { Component, useState } from "@odoo/owl";
import { xml } from "@odoo/owl";
import { App } from "@odoo/owl";
import { rpc } from "@web/core/network/rpc";

console.log("✅ Category Add JS Loaded");

export class CategoryAdd extends Component {   
    setup() {
        this.newCategory = useState({
            name: "",
            parent_id: null
        });
        this.parentCategories = useState([]);
        
         // State for modal visibility
         this.state = useState({
            showItemsModal: false,
            selectedItems: [],
            tempSelectedItems: [],
            searchTerm: "",
            items: [],
            showDeleteModal: false,  // Controls modal visibility
            selectedForDeletion: [], 
        });

         // Set default values for created by and date fields
         const today = new Date();
         this.createdDate = today.toLocaleDateString();
         // This should be dynamically pulled from user session in a real app
         this.createdBy = "System";

         
        this.loadParentCategories();
        this.loadItems()
    }
    
     // Open the Delete Confirmation Modal
     openDeleteModal() {
        // Only open if there are items selected for deletion
        if (this.state.selectedForDeletion.length > 0) {
            this.state.showDeleteModal = true;
        } else {
            alert("Please select items to delete first");
        }
    }

    // Close the Delete Confirmation Modal
    closeDeleteModal() {
        this.state.showDeleteModal = false;
    }

    // Delete selected items from category
    deleteSelectedItems() {
        // Remove selected items from the selectedItems array
        this.state.selectedItems = this.state.selectedItems.filter(
            id => !this.state.selectedForDeletion.includes(id)
        );
        
        // Clear the selectedForDeletion array
        this.state.selectedForDeletion = [];
        
        // Close the modal
        this.closeDeleteModal();
    }

    // Toggle selection for deletion
    toggleDeleteSelection(itemId) {
        const index = this.state.selectedForDeletion.indexOf(itemId);
        if (index === -1) {
            this.state.selectedForDeletion.push(itemId);
        } else {
            this.state.selectedForDeletion.splice(index, 1);
        }
    }


    handleInputChange(event) {
        this.newCategory.name = event.target.value;
    }
    
    handleParentChange(event) {
        const selectedValue = event.target.value;
        this.newCategory.parent_id = selectedValue ? parseInt(selectedValue) : null;
    }
    
    navigateBack() {
        if (this.props.onNavigate) {
            this.props.onNavigate('/category_list');
        } else {
            // Fallback to direct navigation if onNavigate prop is not available
            window.history.pushState({}, '', '/category_list');
            // Trigger a popstate event to update the route in MainLayout
            window.dispatchEvent(new PopStateEvent('popstate'));
        }
    }
    
    async saveCategory() {
        if (!this.newCategory.name.trim()) {
            alert("Category name is required");
            return;
        }
        
        try {
            const response = await fetch('/api/category_add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    params: {
                        name: this.newCategory.name,
                        parent_id: this.newCategory.parent_id,
                        item_ids: this.state.selectedItems 
                    }
                })
            });
            
            const result = await response.json();
            
            if (result.error) {
                console.error("❌ Error adding category:", result.error);
                alert(`Failed to add category: ${result.error.data?.message || result.error.message}`);
            } else if (result.result?.success) {
                console.log("✅ Category added:", result.result);
                // Navigate back to category list after successful add
                this.navigateBack();
            } else {
                console.error("❌ Unknown error:", result);
                alert("Error: " + result?.result?.message);
            }
        } catch (e) {
            console.error("❌ Error in API call:", e);
            alert(`Error: ${e.message}`);
        }
    }

    async loadParentCategories() {
        try {
            const res = await fetch('/api/category_list');
            const data = await res.json();
            this.parentCategories.splice(0, this.parentCategories.length, ...data.categories);
        } catch (e) {
            console.error("❌ Failed to load parent categories:", e);
        }
    }

    async loadItems(searchTerm = "") {
        console.log("loadItems runs with search:", searchTerm);
        try {
            // Create a URL with query parameters instead of using JSON body
            const url = new URL('/api/product_list', window.location.origin);
            if (searchTerm) {
                url.searchParams.append('search', searchTerm);
            }
            
            const response = await fetch(url, {
                method: 'GET', // Changed to GET since we're using URL parameters
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log("API response data:", data);
            
            if (data && data.products) {
                // Map API response to match template field expectations
                const mappedItems = data.products.map(product => ({
                    id: product.id,
                    barcode: product.barcode || '-',
                    item: product.item_name,
                    category: product.category || '-',
                    supplier: product.supplier || '-'
                }));
                
                // Update the items state
                this.state.items = mappedItems;
                console.log("Mapped items:", this.items);
                return mappedItems;
            } else {
                console.warn("No products found in response");
                this.state.items = [];
                return [];
            }
        } catch (e) {
            console.error("❌ Failed to load products:", e);
            this.state.items = [];
            return [];
        }
    }

    // Add category model - handle search input 
    handleSearchChange(event) {
        this.state.searchTerm = event.target.value;
        console.log("handleSearchChange: ", event.target.value)
        this.loadItems(this.state.searchTerm);
    }

    openItemsModal() {
        // Reset temporary selections when opening the modal
        this.state.tempSelectedItems = [...this.state.selectedItems];
        this.state.showItemsModal = true;

        // Make sure items are loaded
        if (!this.state.items || this.state.items.length === 0) {
            this.loadItems();
        }
    }
    
    closeItemsModal() {
        // Discard temporary selections when closing without adding
        this.state.showItemsModal = false;
    }

    toggleItemSelection(itemId) {
        const index = this.state.tempSelectedItems.indexOf(itemId);
        if (index === -1) {
            this.state.tempSelectedItems.push(itemId);
        } else {
            this.state.tempSelectedItems.splice(index, 1);
        }
    }

    // Item selection functions for the modal
    isItemSelected(itemId) {
        return this.state.selectedItems.includes(itemId);
    }
    
    // Add selected items and close modal
    addSelectedItems() {
        console.log("Selected items:", this.state.tempSelectedItems);
        // Update the actual selected items with the temporary selections
        this.state.selectedItems = [...this.state.tempSelectedItems];
        this.closeItemsModal();
    }

    static template = xml/* xml */ `
    <div class="container mt-4">

        <!-- Breadcrumb -->
        <div class="mb-1">
            <nav aria-label="breadcrumb">
                <ol class="breadcrumb mb-0 px-0">
                    <li class="breadcrumb-item"><a href="#" class="text-decoration-none text-muted">Home</a></li>
                    <li class="breadcrumb-item"><a href="#" class="text-decoration-none text-muted">Items</a></li>
                    <li class="breadcrumb-item">Category Management</li>
                    <li class="breadcrumb-item active">New Category</li>
                </ol>
            </nav>
        </div>
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div class="page-heading-wrapper"> 
                <p class="heading">New Category</p>
            </div>
            <button class="btn btn-primary" t-on-click="saveCategory">
                <i class="fa fa-plus me-1"></i> Add Category
            </button>
        </div>
        <div class="row mb-4">
            <div class="col-md-6">
                <div class="mb-3">
                    <label for="categoryName" class="label-style">Category Name *</label>
                    <input 
                        type="text" 
                        class="form-control" 
                        id="categoryName" 
                        t-on-input="handleInputChange" 
                        t-att-value="newCategory.name"
                        placeholder="New Category"
                    />
                </div>
            </div>
            
            <div class="col-md-6">
                <div class="mb-3">
                    <label for="parentCategory" class="label-style">Parent Category</label>
                    <select 
                        class="form-select" 
                        id="parentCategory" 
                        t-on-change="handleParentChange"
                    >
                        <option value="">Select</option>
                        <t t-foreach="parentCategories" t-as="category" t-key="category.id">
                            <option t-att-value="category.id">
                                <t t-esc="category.name"/>
                            </option>
                        </t>
                    </select>
                </div>
            </div>
        </div>
        
        <div class="row">
            <div class="col-md-3">
                <div class="mb-3">
                    <label class="label-style">Created By</label>
                    <input type="text" class="form-control" disabled="disabled" t-att-value="createdBy" />
                </div>
            </div>
            
            <div class="col-md-3">
                <div class="mb-3">
                    <label class="label-style">Created Date</label>
                    <input type="text" class="form-control" disabled="disabled" t-att-value="createdDate" />
                </div>
            </div>
            
            <div class="col-md-3">
                <div class="mb-3">
                    <label class="label-style">Last Modified By</label>
                    <input type="text" class="form-control" disabled="disabled" />
                </div>
            </div>
            
            <div class="col-md-3">
                <div class="mb-3">
                    <label class="label-style">Last Modified Date</label>
                    <input type="text" class="form-control" disabled="disabled" />
                </div>
            </div>
        </div>
    </div>
     <!-- Items Section -->
    <div class="container">
        <div class="card p-4">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h5 class="mb-0 fw-bold">Items</h5>
                <div class="d-flex gap-2">
                    <button class="btn btn-light btn-sm d-flex align-items-center gap-1" type="button">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square" viewBox="0 0 16 16">
                            <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
                            <path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5z"/>
                        </svg>
                        Bulk Edit
                    </button>
                    <button class="btn btn-light btn-sm d-flex align-items-center gap-1" type="button" t-on-click="openDeleteModal">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                            <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
                        </svg>
                        Delete
                    </button>
                    <button class="btn btn-primary btn-sm d-flex align-items-center gap-1" t-on-click="openItemsModal" type="button">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-plus" viewBox="0 0 16 16">
                            <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"/>
                        </svg>
                        Add Items
                    </button>
                </div>
            </div>
            
            <t t-if="state.selectedItems.length === 0">
                <div class="empty-state text-center py-5">
                    <h4>No Record Yet</h4>
                    <p>Add item to display here</p>
                </div>
            </t>
            <t t-else="">
                <div class="table-responsive">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                 <th width="50">
                                </th>
                                <th>Barcode</th>
                                <th>Item</th>
                                <th>Category</th>
                                <th>Supplier</th>
                            </tr>
                        </thead>
                        <tbody>
                            <t t-foreach="state.items" t-as="item" t-key="item.id">
                                <t t-if="state.selectedItems.includes(item.id)">
                                    <tr>
                                        <td>
                                            <div class="form-check">
                                                <input 
                                                    class="form-check-input" 
                                                    type="checkbox" 
                                                    t-att-id="'delete-item-' + item.id"
                                                    t-att-checked="state.selectedForDeletion.includes(item.id)"
                                                    t-on-click="() => this.toggleDeleteSelection(item.id)"
                                                />
                                            </div>
                                        </td>
                                        <td t-esc="item.barcode"></td>
                                        <td t-esc="item.item"></td>
                                        <td t-esc="item.category"></td>
                                        <td t-esc="item.supplier"></td>
                                    </tr>
                                </t>
                            </t>
                        </tbody>
                    </table>
                </div>
            </t>
        </div>
    </div>

    <!-- Modal for adding items -->
    <div t-if="state.showItemsModal" class="modal fade show" tabindex="-1" role="dialog" style="display: block; background-color: rgba(0,0,0,0.5);">
        <div class="modal-dialog modal-lg" role="document">
            <div class="modal-content">
                <div class="modal-header d-flex align-items-center">
                    <h5 class="modal-title">Add Items to Category</h5>
                    <button type="button" class="btn-close" t-on-click="closeItemsModal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                       <div class="flex-grow-1 me-2">
                            <input 
                                type="text" 
                                class="form-control" 
                                placeholder="Search by Barcode, Item, Category, or Supplier"
                                t-att-value="state.searchTerm"
                                t-on-input="handleSearchChange" 
                            />
                       </div>
                       <button type="button" class="btn btn-primary" t-on-click="addSelectedItems">
                            Add Selected (<t t-esc="state.tempSelectedItems.length"/>)
                       </button>
                    </div>
                    
                    <div class="table-responsive">
                        <table class="table">
                            <thead class="category-table-header category-header-label">
                                <tr>
                                    <th width="50"></th>
                                    <th>BARCODE</th>
                                    <th>ITEM</th>
                                    <th>CATEGORY</th>
                                    <th>SUPPLIER</th>
                                </tr>
                            </thead>
                            <tbody>
                                <t t-foreach="state.items" t-as="item" t-key="item.id">
                                    <tr>
                                        <td>
                                            <div class="form-check">
                                                <input 
                                                    class="form-check-input" 
                                                    type="radio" 
                                                    t-att-id="'item-' + item.id"
                                                    t-att-checked="state.tempSelectedItems.includes(item.id)"
                                                    t-on-click="() => this.toggleItemSelection(item.id)"
                                                />
                                            </div>
                                        </td>
                                        <td class="parent-category-text-style" t-esc="item.barcode"></td>
                                        <td  t-esc="item.item"></td>
                                        <td t-esc="item.category"></td>
                                        <td t-esc="item.supplier"></td>
                                    </tr>
                                </t>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div t-if="state.showDeleteModal" class="modal fade show" 
        style="display: block; background-color: rgba(0,0,0,0.5);" 
        tabindex="-1" aria-modal="true" role="dialog">
            <!-- Centering the modal both horizontally and vertically -->
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content p-4">
                    <div class="d-flex align-items-center mb-3">
                        <button type="button" class="btn btn-link text-primary p-0 me-3" t-on-click="closeDeleteModal" aria-label="Close">
                            <i class="fa fa-times" style="font-size: 24px; color: #0d6efd;"></i>
                        </button>
                        <h5 class="modal-title fs-4 m-0">Delete Item from Category</h5>
                    </div>
                    <div class="modal-body px-0">
                    <p class="mb-4">
                        This action is <span class="text-danger">irreversible</span>.
                    </p>                        
                    <p class="text-secondary mb-3">Are you sure you want to delete the selected category?</p>
                    </div>

                    <div class="modal-footer border-0 px-0 pt-2">
                    <div class="d-flex w-100">
                        <button type="button" class="btn btn-light flex-fill me-2 py-2" 
                                style="background-color: #f2f2f2;" t-on-click="closeDeleteModal">
                            Cancel
                        </button>
                        <button type="button" class="btn btn-danger flex-fill py-2" 
                                t-on-click="deleteSelectedItems">
                            Delete
                        </button>
                    </div>
                </div>
                </div>
            </div>
    </div>
    `
}

document.addEventListener("DOMContentLoaded", () => {
    const el = document.getElementById("category_add-container");
    console.log("🎯 Mount target for Add Category:", el);
    if (el) {
        console.log("🚀 Mounting OWL App for Add Category...");
        const app = new App(CategoryAdd);
        app.mount(el);
    }
});