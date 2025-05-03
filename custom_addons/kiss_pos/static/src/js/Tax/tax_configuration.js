/** @odoo-module **/
import { Component, useState, onMounted } from "@odoo/owl";
import { xml } from "@odoo/owl";
import { App } from "@odoo/owl";
import { rpc } from "@web/core/network/rpc";

console.log("Tax Configuration ✅ JS Loaded");
console.log("Checking updated code");

export class TaxConfiguration extends Component {
    setup() {
        this.state = useState({
            taxes: [],
            taxName: '',
            taxAmountType: 'percent', // Default to 'sale', could be 'purchase' too
            taxRate: '',
            isActive: true,
    
            isLoading: true,
            error: null,
            showDeleteModal: false,
            taxToDelete: null,
            isDeleting: false,
            showAddModal: false,
            isCreating: false,
            showUpdateModal: false,
            updateTaxId: null,
            isUpdating: false,
        });

        onMounted(async () => {
            await this.loadTaxes();
        });
    }

   
   async loadTaxes() {
     // /api/taxes - Returns all taxes (active and inactive)
    // /api/taxes?active=true - Returns only active taxes
    // /api/taxes?active=false - Returns only inactive taxes
    // /api/taxes?type=sale - Returns all sale taxes (active and inactive)
    // /api/taxes?type=sale&active=true - Returns only active sale taxes

        try {
            const response = await fetch('/api/taxes', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch taxes');
            }
            
            const result = await response.json();
            if (result.success) {
                this.state.taxes = result.data;
                console.log("result.data: ", result.data);
            } else {
                throw new Error(result.error || 'Unknown error occurred');
            }
        } catch (e) {
            console.error("Failed to load taxes:", e);
        }
   }

   openDeleteModal(tax) {
    this.state.taxToDelete = tax;
    this.state.showDeleteModal = true;
   }

    confirmDelete() {
        if (this.state.taxToDelete) {
            this.deleteTax(this.state.taxToDelete.id);
        }
    }

    closeDeleteModal() {
        this.state.showDeleteModal = false;
        this.state.taxToDelete = null;
    }

    openAddModal() {
        // Reset the form for adding a new warehous        
        this.state.showAddModal = true;
    }

    closeAddModal() {
        this.state.showAddModal = false;
    }

    closeUpdateModal() {
        this.state.showUpdateModal = false;
        // Reset the form
    }

    // Handle form input changes for Add modal
    // handleAddInputChange(field, event) {
    //     this.state[field] = event.target.value;
    // }
    handleAddInputChange(field, event) {
        if (field === 'isActive') {
            // For checkbox inputs, use 'checked' property instead of 'value'
            this.state[field] = event.target.checked;
        } else {
            // For other inputs, use 'value' property
            this.state[field] = event.target.value;
        }
    }
    // Handle form input changes for Update modal
    handleUpdateInputChange(field, event) {
        this.state.updateWarehouse[field] = event.target.value;
    }

    async openUpdateModal(tax) {
        console.log("Update Modal === ", tax)
        
           if (!tax) return;
           try {
               // Fetch complete warehouse details
               this.state.taxName = tax?.name,
               this.state.taxAmountType = tax?.amount_type, // Default to 'sale', could be 'purchase' too
               this.state.taxRate = tax?.amount,
               this.state.isActive = tax?.active,
               this.state.updateTaxId = tax?.id;
               this.state.showUpdateModal = true;
           } catch (error) {
               console.error("Error fetching warehouse details:", error);
               alert(`Error loading warehouse details: ${error.message}`);
           }
    }
    
    async deleteTax(taxId) {
        try {
          // Show loading indicator
          this.state.isDeleting = true;
          
          // Make the DELETE request to your API
          const response = await fetch(`/api/taxes/${taxId}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            // Include credentials if needed for authentication
            credentials: 'same-origin',
          });
          
          const result = await response.json();
          
          // Check if the deletion was successful
          if (result.success) {
            // Remove the tax from the state
            this.state.taxes = this.state.taxes.filter(tax => tax.id !== taxId);
            
            // Show success notification
            console.log(`Tax "${result.deleted_tax.name}" has been successfully deleted.`);
          } else {
            // Handle error case
            throw new Error(result.error || 'Unknown error occurred');
          }
        } catch (error) {
          // Show error notification
          console.log(`Failed to delete tax: ${error.message}`)
          console.error('Error deleting tax:', error);
        } finally {
          // Hide loading indicator
          this.state.isDeleting = false;
          
          // Close the modal if you're using one
          this.state.showDeleteModal = false;
        }
    }

    async handleCreate() {
        const { taxName, taxAmountType, taxRate, isActive, updateTaxId} = this.state;

        if (!taxName || !taxRate) {
            alert("Please fill in all required fields.");
            return;
        }
        
        const taxData = {
            name: taxName,
            amount_type: taxAmountType,
            amount: parseFloat(taxRate),
            active: isActive
        };

        console.log("handleCreate taxData: ", taxData)
        if(updateTaxId) {
            console.log("============= Updating tax =============")
            await this.updateTax({...taxData, updateTaxId});
        } else {
            console.log("============= Adding tax =============")
             await this.createTax(taxData);
        }
    }
 
    async createTax(taxData) {
        console.log("taxData: ", taxData);
        this.state.isCreating = true;
        try {
            const response = await fetch('/api/taxes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify(taxData)
            });

            const result = await response.json();
            if (result.success) {
                // Update the taxes state if successful
                this.state.taxName = '',
                this.state.taxAmountType = 'percent', // Default to 'sale', could be 'purchase' too
                this.state.taxRate = '',
                this.state.isActive = true,

                this.closeAddModal();
                await this.loadTaxes();
            } else {
                alert("Error: " + result.error);
            }
        } catch (e) {
            console.error("Failed to create tax:", e);
            alert("Failed to create tax.");
        } finally {
            // Reset loading state
            this.state.isCreating = false;
        }
    }

    async updateTax(taxData) {
        console.log("taxData: ", taxData);
      
        this.state.isUpdating = true;
        try {
            const response = await fetch(`/api/taxes/${taxData.updateTaxId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify(taxData)
            });

            const result = await response.json();
            if (result.success) {
                // Update the taxes state if successful
                this.state.taxName = '',
                this.state.taxAmountType = 'percent', // Default to 'sale', could be 'purchase' too
                this.state.taxRate = '',
                this.state.isActive = true,
                this.state.updateTaxId = null,
                this.closeUpdateModal();
                await this.loadTaxes();
            } else {
                alert("Error: " + result.error);
            }
        } catch (e) {
            console.error("Failed to update tax:", e);
            alert("Failed to update tax.");
        } finally {
            // Reset loading state
            this.state.isUpdateData = null,
            this.state.isUpdating = false
        }
    }
   
    static template = xml/* xml */ `
<div class="container-fluid px-4 py-3">
    <!-- Breadcrumb -->
        <nav aria-label="breadcrumb" class="mt-3 mb-4">
            <ol class="breadcrumb">
                <li class="breadcrumb-item breadcrum-item-light"><a href="/home" class="text-secondary text-decoration-underline">Home</a></li>
                <li class="breadcrumb-item breadcrum-item-light"><a href="/settings" class="text-secondary text-decoration-underline">Settings</a></li>
                <li class="breadcrumb-item breadcrum-item-dark" aria-current="page">Tax Configuration</li>
            </ol>
        </nav>

    <!-- Header -->
    <div class="d-flex justify-content-between align-items-center mb-4">
        <div class="page-heading-wrapper">
                <p class="heading">Tax Configuration</p>
        </div>
        <button class="btn btn-primary shadow-sm fw-normal" t-on-click="openAddModal">
           Create Sales Tax
        </button>
    </div>

    <!-- Tax List Table -->
    <div class="">
        <div class=" p-0">
            <table class="table m-0">
                <thead class="table-header-style">
                    <tr>
                        <th class="ps-4 text-uppercase" scope="col">
                            <div class="d-flex align-items-center table-header-label">
                                Sales Tax
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6 sort-icon-style">
                                    <path fill-rule="evenodd" d="M6.97 2.47a.75.75 0 0 1 1.06 0l4.5 4.5a.75.75 0 0 1-1.06 1.06L8.25 4.81V16.5a.75.75 0 0 1-1.5 0V4.81L3.53 8.03a.75.75 0 0 1-1.06-1.06l4.5-4.5Zm9.53 4.28a.75.75 0 0 1 .75.75v11.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.22 3.22V7.5a.75.75 0 0 1 .75-.75Z" clip-rule="evenodd" />
                                </svg>
                            </div>
                        </th>
                        <th class="text-uppercase" scope="col">
                            <div class="d-flex align-items-center table-header-label">
                                Tax Type
                                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6 sort-icon-style">
                                    <path fill-rule="evenodd" d="M6.97 2.47a.75.75 0 0 1 1.06 0l4.5 4.5a.75.75 0 0 1-1.06 1.06L8.25 4.81V16.5a.75.75 0 0 1-1.5 0V4.81L3.53 8.03a.75.75 0 0 1-1.06-1.06l4.5-4.5Zm9.53 4.28a.75.75 0 0 1 .75.75v11.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.22 3.22V7.5a.75.75 0 0 1 .75-.75Z" clip-rule="evenodd" />
                                </svg>
                            </div>
                        </th>
                        <th class="text-uppercase" scope="col">
                            <div class="d-flex align-items-center table-header-label">
                                Tax Rate
                                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6 sort-icon-style">
                                    <path fill-rule="evenodd" d="M6.97 2.47a.75.75 0 0 1 1.06 0l4.5 4.5a.75.75 0 0 1-1.06 1.06L8.25 4.81V16.5a.75.75 0 0 1-1.5 0V4.81L3.53 8.03a.75.75 0 0 1-1.06-1.06l4.5-4.5Zm9.53 4.28a.75.75 0 0 1 .75.75v11.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.22 3.22V7.5a.75.75 0 0 1 .75-.75Z" clip-rule="evenodd" />
                                </svg>
                            </div>
                        </th>
                        <th class="text-uppercase" scope="col">
                            <div class="d-flex align-items-center table-header-label">
                                Status
                                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6 sort-icon-style">
                                    <path fill-rule="evenodd" d="M6.97 2.47a.75.75 0 0 1 1.06 0l4.5 4.5a.75.75 0 0 1-1.06 1.06L8.25 4.81V16.5a.75.75 0 0 1-1.5 0V4.81L3.53 8.03a.75.75 0 0 1-1.06-1.06l4.5-4.5Zm9.53 4.28a.75.75 0 0 1 .75.75v11.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.22 3.22V7.5a.75.75 0 0 1 .75-.75Z" clip-rule="evenodd" />
                                </svg>  
                            </div>
                        </th>
                        <th scope="col" width="50"></th>
                    </tr>
                </thead>
                <tbody>
                    <t t-if="state.taxes.length === 0">
                        <tr>
                            <td colspan="3" class="text-center py-4">
                                <p class="mb-0">No taxes found</p>
                            </td>
                        </tr>
                    </t>
                    <t t-foreach="state.taxes" t-as="tax" t-key="tax.id">
                        <tr t-on-click="() => this.openUpdateModal(tax)">
                            <td class="ps-4 table-td-style text-capitalize" t-esc="tax.name"></td>
                            <td class="table-td-style text-capitalize" t-esc="tax.amount_type"></td>
                            <td class="table-td-style" t-esc="tax.amount_type === 'percent' ? tax.amount + '%' : tax.amount"></td>
                            <td>
                                <span t-att-class="tax.active == true ? 'badge text-success bg-success-subtle' : 'badge bg-light'">
                                    <t t-esc="tax.active == true ? 'Active' : 'Inactive'"/>
                                </span>
                            </td>
                            <td>
                                <button class="btn p-0 border-0 bg-transparent" title="Delete" 
                                    t-on-click="(event) => { event.stopPropagation(); this.openDeleteModal(tax); }">
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
    <div t-if="state.showDeleteModal" class="modal fade show"  
        style="display: block; background-color: rgba(0,0,0,0.5);" 
        tabindex="-1" aria-modal="true" role="dialog">
        <div class="modal-dialog modal-dialog-centered" role="document">
            <div class="modal-content p-4">
                <div class="d-flex align-items-center mb-3">
                    <button type="button" class="btn btn-link text-primary p-0 me-3" t-on-click="closeDeleteModal" aria-label="Close">
                        <i class="fa fa-times" style="font-size: 24px; color: #0d6efd;"></i>
                    </button>
                    <h5 class="modal-title fs-4 m-0">Delete <t t-esc="state.taxToDelete.name"/> Tax</h5>
                </div>

                <div class="modal-body px-0">
                    <p class="text-secondary mb-3">This action is <span class="text-danger fw-bold">irreversible</span>.</p>
                    <p class="text-secondary mb-3">Are you sure you want to delete "<t t-esc="state.taxToDelete.name"></t>"?</p>
                </div>
                <div class="modal-footer border-0 px-0 pt-2">
                    <div class="d-flex w-100">
                        <button type="button" class="btn btn-light flex-fill me-2 py-2" 
                            style="background-color: #f2f2f2;" t-on-click="closeDeleteModal">Cancel</button>

                        <button type="button" class="btn btn-danger flex-fill py-2" 
                            t-on-click="confirmDelete" t-att-disabled="state.isDeleting">
                            <span t-if="state.isDeleting" class="spinner-border spinner-border-sm me-2" 
                                role="status" aria-hidden="true"></span>
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Add Tax Modal -->
    <div t-if="state.showAddModal" class="modal fade show" 
        style="display: block; background-color: rgba(0,0,0,0.5);" 
        tabindex="-1" aria-modal="true" role="dialog">
        <div class="modal-dialog modal-dialog-centered" role="document">
            <div class="modal-content">
                <div class="d-flex align-items-center mb-3 px-4 pt-4">
                    <button type="button" class="btn btn-link text-primary p-0 me-3" t-on-click="closeAddModal" aria-label="Close">
                        <i class="fa fa-times" style="font-size: 24px; color: #0d6efd;"></i>
                    </button>
                    <h5 class="modal-title fs-4 m-0 modal-heading">Create Sales Tax</h5>
                </div>
                <div class="modal-body px-4">
                    <!-- Tax Name - Required field -->
                    <div class="mb-3">
                        <label for="taxName" class="form-label label-style">Tax Name <span class="text-danger">*</span></label>
                        <input 
                            type="text" 
                            class="form-control" 
                            id="taxName" 
                            placeholder="Name" 
                            t-att-value="state.taxName"
                            t-on-input="(e) => this.handleAddInputChange('taxName', e)"
                            required="required"
                        />
                    </div>

                    <!-- Tax Type - Updated to match Figma -->
                    <div class="mb-3">
                        <label for="taxAmountType" class="form-label label-style">Tax Type</label>
                        <select 
                            class="form-select" 
                            id="taxAmountType"
                            t-att-value="state.taxAmountType"
                            t-on-change="(e) => this.handleAddInputChange('taxAmountType', e)"
                        >
                            <option value="percent">Percentage</option>
                            <option value="fixed">Fixed</option>
                        </select>
                    </div>

                    <!-- Tax Rate - Required field -->
                    <div class="mb-3">
                        <label for="taxRate" class="form-label label-style">Tax Rate (%) <span class="text-danger">*</span></label>
                        <input 
                            type="text" 
                            class="form-control" 
                            id="taxRate" 
                            placeholder="Tax Rate" 
                            t-att-value="state.taxRate"
                            t-on-input="(e) => this.handleAddInputChange('taxRate', e)"
                            required="required"
                        />
                    </div>

                    <!-- Active Toggle - Updated to match Figma -->
                    <div class="mb-3">
                        <div class="d-flex align-items-center">
                            <label class="form-check-label me-3" for="isActive">Active</label>
                            <div class="form-check form-switch">
                                <input 
                                    class="form-check-input" 
                                    type="checkbox" 
                                    role="switch"
                                    id="isActive" 
                                    t-att-checked="state.isActive"
                                    t-on-change="(e) => this.handleAddInputChange('isActive', e)"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div class="modal-footer border-0 px-4 py-3">
                    <div class="d-flex w-100">
                        <button type="button" class="btn btn-light flex-fill me-2 py-2" 
                            style="background-color: #f2f2f2;" t-on-click="closeAddModal">Cancel</button>
                        <button 
                            type="button" 
                            class="btn btn-primary flex-fill py-2" 
                            t-on-click="handleCreate" 
                            t-att-disabled="state.isCreating || !state.taxName"
                        >
                            <span t-if="state.isCreating" class="spinner-border spinner-border-sm me-2" 
                                role="status" aria-hidden="true"></span>
                            Create
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Update Tax Modal -->
    <div t-if="state.showUpdateModal" class="modal fade show" 
        style="display: block; background-color: rgba(0,0,0,0.5);" 
        tabindex="-1" aria-modal="true" role="dialog">
        <div class="modal-dialog modal-dialog-centered" role="document">
            <div class="modal-content">
                <div class="d-flex align-items-center mb-3 px-4 pt-4">
                    <button type="button" class="btn btn-link text-primary p-0 me-3" t-on-click="closeUpdateModal" aria-label="Close">
                        <i class="fa fa-times" style="font-size: 24px; color: #0d6efd;"></i>
                    </button>
                    <h5 class="modal-title fs-4 m-0 modal-heading">Edit Sales Tax</h5>
                </div>


                <div class="modal-body px-4">
                    <!-- Tax Name - Required field -->
                    <div class="mb-3">
                        <label for="taxName" class="form-label label-style">Tax Name <span class="text-danger">*</span></label>
                        <input 
                            type="text" 
                            class="form-control" 
                            id="taxName" 
                            placeholder="Name" 
                            t-att-value="state.taxName"
                            t-on-input="(e) => this.handleAddInputChange('taxName', e)"
                            required="required"
                        />
                    </div>

                    <!-- Tax Type - Updated to match Figma -->
                    <div class="mb-3">
                        <label for="taxAmountType" class="form-label label-style">Tax Type</label>
                        <select 
                            class="form-select" 
                            id="taxAmountType"
                            t-att-value="state.taxAmountType"
                            t-on-change="(e) => this.handleAddInputChange('taxAmountType', e)"
                        >
                            <option value="percent">Percentage</option>
                            <option value="fixed">Fixed</option>
                        </select>
                    </div>

                    <!-- Tax Rate - Required field -->
                    <div class="mb-3">
                        <label for="taxRate" class="form-label label-style">Tax Rate (%) <span class="text-danger">*</span></label>
                        <input 
                            type="text" 
                            class="form-control" 
                            id="taxRate" 
                            placeholder="Tax Rate" 
                            t-att-value="state.taxRate"
                            t-on-input="(e) => this.handleAddInputChange('taxRate', e)"
                            required="required"
                        />
                    </div>
                </div>

                <div class="modal-footer border-0 px-4 py-3">
                    <div class="d-flex w-100">
                        <button type="button" class="btn btn-light flex-fill me-2 py-2" 
                            style="background-color: #f2f2f2;" t-on-click="closeUpdateModal">Cancel</button>
                        <button 
                            type="button" 
                            class="btn btn-primary flex-fill py-2" 
                            t-on-click="handleCreate" 
                            t-att-disabled="state.isUpdating"
                        >
                            <span t-if="state.isUpdating" class="spinner-border spinner-border-sm me-2" 
                                role="status" aria-hidden="true"></span>
                            Update
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
    const el = document.getElementById("tax_configuration-container");
    console.log("🎯 Mount target:", el);
    if (el) {
        console.log("🚀 Mounting OWL App...");
        const app = new App(TaxConfiguration);
        app.mount(el);
    }
});