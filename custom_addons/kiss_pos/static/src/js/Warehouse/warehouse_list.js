/** @odoo-module **/
import { Component, useState, onMounted } from "@odoo/owl";
import { xml } from "@odoo/owl";
import { App } from "@odoo/owl";
import { rpc } from "@web/core/network/rpc";


console.log("Warehouse ✅ JS Loaded");
console.log("Checking updated code");

export class WarehouseList extends Component {
    setup() {
        this.state = useState({
            warehouses: [],
            isLoading: true,
            error: null,
            showDeleteModal: false,
            warehouseToDelete: null,
            isDeleting: false,
        });

        onMounted(() => {
            this.loadWarehouses();
        });
    }

   // Open delete confirmation modal
   openDeleteModal(warehouse) {
    this.state.warehouseToDelete = warehouse;
    this.state.showDeleteModal = true;
   }

    // Close delete confirmation modal
    closeDeleteModal() {
        this.state.showDeleteModal = false;
        this.state.warehouseToDelete = null;
    }

    async loadWarehouses() {
        try {
            this.state.isLoading = true;
            this.state.error = null;
            
            const response = await fetch('/api/warehouse_list', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log("Warehouse data ========= ", data.warehouses)
            if (data && data.warehouses) {
                this.state.warehouses = data.warehouses;
            } else {
                console.warn("No warehouses found in response");
                this.state.warehouses = [];
            }
        } catch (e) {
            console.error("❌ Failed to load warehouses:", e);
            this.state.error = `Error loading warehouses: ${e.message}`;
        } finally {
            this.state.isLoading = false;
        }
    }

     // Delete the warehouse
     async deleteWarehouse() {
        if (!this.state.warehouseToDelete) return;
        
        try {
             // Set loading state
            this.state.isDeleting = true;
            const warehouseId = this.state.warehouseToDelete.id;
            
            const response = await fetch(`/api/warehouse_delete/${warehouseId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete warehouse');
            }
            
            // Close the modal
            this.closeDeleteModal();
            
            // Reload the warehouses list
            await this.loadWarehouses();
            
            // Optional: Show success message
            // You could add a success message state variable and display it
        } catch (e) {
            console.error("❌ Failed to delete warehouse:", e);
            alert(`Error deleting warehouse: ${e.message}`);
        } finally {
            // Reset loading state
            this.state.isDeleting = false;
        }
    }
   
    static template = xml/* xml */ `
<div class="container-fluid px-4 py-3">
    <!-- Breadcrumb -->
        <nav aria-label="breadcrumb" class="mt-3 mb-4">
            <ol class="breadcrumb">
                <li class="breadcrumb-item breadcrum-item-light"><a href="/home" class="text-secondary text-decoration-underline">Home</a></li>
                <li class="breadcrumb-item breadcrum-item-light"><a href="/settings" class="text-secondary text-decoration-underline">Settings</a></li>
                <li class="breadcrumb-item breadcrum-item-dark" aria-current="page">Warehouse Management</li>
            </ol>
        </nav>

    <!-- Header -->
    <div class="d-flex justify-content-between align-items-center mb-4">
        <div class="page-heading-wrapper"> 
                <p class="heading">Warehouse Management</p>
        </div>
        <button class="btn btn-primary shadow-sm fw-normal">
            <i class="fa fa-plus me-2 "></i> Add Warehouse
        </button>
    </div>

    <!-- Warehouse List Table -->
<div class="card">
  <div class="card-body p-0">
        <table class="table m-0">
    <thead class="table-header-style">
        <tr>
        <th class="ps-4 text-uppercase" scope="col">
            <div class="d-flex align-items-center table-header-label">
            Warehouse Name
            </div>
        </th>
        <th class="text-uppercase" scope="col">
            <div class="d-flex align-items-center table-header-label">
            Warehouse Address
            </div>
        </th>
        <th scope="col" width="50"></th>
        </tr>
    </thead>
    <tbody>
        <t t-if="state.warehouses.length === 0">
        <tr>
            <td colspan="3" class="text-center py-4">
            <p class="mb-0">No warehouses found</p>
            </td>
        </tr>
        </t>
        <t t-foreach="state.warehouses" t-as="warehouse" t-key="warehouse.id">
        <tr>
            <td class="ps-4 table-td-style" t-esc="warehouse.name"></td>
            <td class="table-td-style" t-esc="warehouse.address"></td>
            <td>
            <button class="btn p-0 border-0 bg-transparent" title="Delete"  t-on-click="() => this.openDeleteModal(warehouse)">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#0d6efd" class="bi bi-trash" viewBox="0 0 16 16">
                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
                </svg>
            </button>
            </td>
        </tr>
        </t>
    </tbody>
    </table>
  </div>
</div>

        <!-- Delete Confirmation Modal -->
        <div t-if="state.showDeleteModal" class="modal fade show"  style="display: block; background-color: rgba(0,0,0,0.5);" 
        tabindex="-1" aria-modal="true" role="dialog">
            <div class="modal-dialog modal-dialog-centered" role="document">
                <div class="modal-content p-4">
                    <div class="d-flex align-items-center mb-3">
                        <button type="button" class="btn btn-link text-primary p-0 me-3" t-on-click="closeDeleteModal" aria-label="Close">
                            <i class="fa fa-times" style="font-size: 24px; color: #0d6efd;"></i>
                        </button>
                        <h5 class="modal-title fs-4 m-0">Delete <t t-esc="state.warehouseToDelete.name"/> Category</h5>
                    </div>

                    <div class="modal-body px-0">
                        <p class="text-secondary mb-3">This action is <span class="text-danger fw-bold">irreversible</span>.</p>
                        <p class="text-secondary mb-3">Are you sure you want to delete "<t t-esc="state.warehouseToDelete.name"></t>"?</p>
                    </div>
                    <div class="modal-footer border-0 px-0 pt-2">
                     <div class="d-flex w-100">
                        <button type="button" class="btn btn-light flex-fill me-2 py-2" style="background-color: #f2f2f2;" t-on-click="closeDeleteModal">Cancel</button>
       
                         <button type="button" class="btn btn-danger flex-fill py-2" 
                                t-on-click="deleteWarehouse" t-att-disabled="state.isDeleting">
                            <span t-if="state.isDeleting" class="spinner-border spinner-border-sm me-2" 
                                role="status" aria-hidden="true"></span>
                            Delete
                        </button>
                     </div>
                    </div>
                </div>
            </div>
        </div>
</div>
`
}

document.addEventListener("DOMContentLoaded", () => {
    const el = document.getElementById("warehouse_list-container");
    console.log("🎯 Mount target:", el);
    if (el) {
        console.log("🚀 Mounting OWL App...");
        const app = new App(WarehouseList);
        app.mount(el);
    }
});