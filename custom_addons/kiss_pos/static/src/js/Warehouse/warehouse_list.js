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
            // Add Warehouse modal
            showAddModal: false,
            newWarehouse: {
                name: "",
                address: "",
                city: "",
                state_id: "",
                zipCode: "",
                country_id: ""
            },
            isCreating: false,
            // Update Warehouse modal
            showUpdateModal: false,
            updateWarehouse: {
                id: null,
                name: "",
                address: "",
                city: "",
                state_id: "",
                zipCode: "",
                country_id: ""
            },
            isUpdating: false,
            // Location data
            countries: [],
            states: [],
            countryStatesMap: {}, // To store states for each country
            loadingLocations: false,
        });

        onMounted(async () => {
            await this.loadWarehouses();
            await this.loadCountriesAndStates();
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

    // Open add warehouse modal
    openAddModal() {
        // Reset the form for adding a new warehouse
        this.state.newWarehouse = {
            name: "",
            address: "",
            city: "",
            state_id: "",
            zipCode: "",
            country_id: ""
        };
        
        // Set default country if available
        if (this.state.countries.length > 0) {
            this.state.newWarehouse.country_id = this.state.countries[0].id;
            this.loadStatesForCountry(this.state.countries[0].id);
        }
        
        this.state.showAddModal = true;
    }

    // Close add warehouse modal
    closeAddModal() {
        this.state.showAddModal = false;
    }

    // Open update warehouse modal
    async openUpdateModal(warehouse) {
        if (!warehouse) return;
        
        try {
            // Fetch complete warehouse details
            const warehouseDetails = await this.loadWarehouseById(warehouse.id);
            
            if (warehouseDetails) {
                // Set the warehouse data for update
                this.state.updateWarehouse = {
                    id: warehouseDetails.id,
                    name: warehouseDetails.name,
                    address: warehouseDetails.address,
                    city: warehouseDetails.city,
                    state_id: warehouseDetails.state_id,
                    zipCode: warehouseDetails.zip,
                    country_id: warehouseDetails.country_id
                };
                
                // Load states for the selected country if country_id is set
                if (this.state.updateWarehouse.country_id) {
                    await this.loadStatesForCountry(this.state.updateWarehouse.country_id);
                }
                
                this.state.showUpdateModal = true;
            }
        } catch (error) {
            console.error("Error fetching warehouse details:", error);
            alert(`Error loading warehouse details: ${error.message}`);
        }
    }

    // Close update warehouse modal
    closeUpdateModal() {
        this.state.showUpdateModal = false;
        // Reset the form
        this.state.updateWarehouse = {
            id: null,
            name: "",
            address: "",
            city: "",
            state_id: "",
            zipCode: "",
            country_id: ""
        };
    }

    // Load countries and states from Odoo
    async loadCountriesAndStates() {
        try {
            this.state.loadingLocations = true;
            
            // Fetch countries
            const countriesResult = await rpc('/web/dataset/call_kw', {
                model: 'res.country',
                method: 'search_read',
                args: [
                    [],  // Domain
                    ['id', 'name', 'code']  // Fields to fetch
                ],
                kwargs: {
                    context: {},
                }
            });
            
            if (countriesResult && countriesResult.length) {
                this.state.countries = countriesResult;
                
                // Set default country if available
                if (countriesResult.length > 0) {
                    this.state.newWarehouse.country_id = countriesResult[0].id;
                    
                    // Load states for the default country
                    await this.loadStatesForCountry(countriesResult[0].id);
                }
            }
        } catch (e) {
            console.error("❌ Failed to load countries and states:", e);
            this.state.error = `Error loading location data: ${e.message}`;
        } finally {
            this.state.loadingLocations = false;
        }
    }
    
    // Load states for a specific country
    async loadStatesForCountry(countryId) {
         // Ensure countryId is a number for comparison
         const countryIdNum = parseInt(countryId);

        try {
            // Check if we already loaded states for this country
            if (this.state.countryStatesMap[countryIdNum]) {
                this.state.states = this.state.countryStatesMap[countryIdNum];
                return;
            }
            
            const statesResult = await rpc('/web/dataset/call_kw', {
                model: 'res.country.state',
                method: 'search_read',
                args: [
                    [['country_id', '=', countryIdNum]],  // Domain
                    ['id', 'name', 'code']  // Fields to fetch
                ],
                kwargs: {
                    context: {},
                }
            });
            
            if (statesResult) {
                // Cache the states for this country
                this.state.countryStatesMap[countryIdNum] = statesResult;
                this.state.states = statesResult;
                
                // Set default state if available
                if (statesResult.length > 0) {
                    // Set default state for the appropriate modal
                    if (this.state.showAddModal) {
                        this.state.newWarehouse.state_id = statesResult[0].id;
                    } else if (this.state.showUpdateModal) {
                        this.state.updateWarehouse.state_id = statesResult[0].id;
                    }
                }
            }
        } catch (e) {
            console.error(`❌ Failed to load states for country ${countryIdNum}:`, e);
        }
    }
    
    // Handle country change for Add modal
    async handleAddCountryChange(event) {
        const countryId = parseInt(event.target.value);
        this.state.newWarehouse.country_id = countryId;
        this.state.newWarehouse.state_id = ""; // Reset state when country changes
        await this.loadStatesForCountry(countryId);
    }

    // Handle country change for Update modal
    async handleUpdateCountryChange(event) {
        const countryId = parseInt(event.target.value);
        this.state.updateWarehouse.country_id = countryId;
        this.state.updateWarehouse.state_id = ""; // Reset state when country changes
        await this.loadStatesForCountry(countryId);
    }

    // Handle form input changes for Add modal
    handleAddInputChange(field, event) {
        this.state.newWarehouse[field] = event.target.value;
    }

    // Handle form input changes for Update modal
    handleUpdateInputChange(field, event) {
        this.state.updateWarehouse[field] = event.target.value;
    }

    async loadWarehouseById(warehouseId) {
        try {
            this.state.isLoading = true;
            this.state.error = null;
            
            // Use Odoo RPC to fetch the warehouse by ID
            const warehouseIds = await rpc('/web/dataset/call_kw', {
                model: 'stock.warehouse',
                method: 'search',
                args: [
                    [['id', '=', warehouseId]]
                ],
                kwargs: {
                    context: {},
                }
            });
    
            if (!warehouseIds || warehouseIds.length === 0) {
                console.warn("Warehouse not found");
                return null;
            }
            
            // Fetch the warehouse details
            const warehouses = await rpc('/web/dataset/call_kw', {
                model: 'stock.warehouse',
                method: 'read',
                args: [warehouseIds, ['id', 'name', 'partner_id', 'code']],
                kwargs: {
                    context: {},
                }
            });
    
            if (!warehouses || warehouses.length === 0) {
                console.warn("Warehouse details not found");
                return null;
            }
            
            const warehouse = warehouses[0];
            
            // If no partner_id, return basic warehouse info
            if (!warehouse.partner_id || !warehouse.partner_id[0]) {
                return {
                    id: warehouse.id,
                    name: warehouse.name,
                    code: warehouse.code,
                    address: "",
                    city: "",
                    state_id: "",
                    zip: "",
                    country_id: ""
                };
            }
            
            // Fetch partner details
            const partnerId = warehouse.partner_id[0];
            const partners = await rpc('/web/dataset/call_kw', {
                model: 'res.partner',
                method: 'search_read',
                args: [
                    [['id', '=', partnerId]],
                    ['id', 'street', 'city', 'state_id', 'zip', 'country_id']
                ],
                kwargs: {
                    context: {},
                }
            });
            
            if (!partners || partners.length === 0) {
                console.warn("Partner details not found");
                return {
                    id: warehouse.id,
                    name: warehouse.name,
                    code: warehouse.code,
                    address: "",
                    city: "",
                    state_id: "",
                    zip: "",
                    country_id: ""
                };
            }
            
            const partner = partners[0];
            
            // Format address for display
            const addressParts = [];
            if (partner.street) addressParts.push(partner.street);
            if (partner.city) addressParts.push(partner.city);
            if (partner.state_id && partner.state_id[1]) addressParts.push(partner.state_id[1]);
            if (partner.zip) addressParts.push(partner.zip);
            if (partner.country_id && partner.country_id[1]) addressParts.push(partner.country_id[1]);
            const address = addressParts.join(', ');
            
            // Return complete warehouse data with address components
            return {
                id: warehouse.id,
                name: warehouse.name,
                code: warehouse.code,
                address: partner.street || "",
                city: partner.city || "",
                state_id: partner.state_id ? partner.state_id[0] : "",
                zip: partner.zip || "",
                country_id: partner.country_id ? partner.country_id[0] : "",
                // Include formatted address for display
                formatted_address: address
            };
            
        } catch (e) {
            console.error("❌ Failed to load warehouse:", e);
            this.state.error = `Error loading warehouse: ${e.message}`;
            return null;
        } finally {
            this.state.isLoading = false;
        }
    }
    

    async loadWarehouses() {
        try {
            this.state.isLoading = true;
            this.state.error = null;
            
            // Use Odoo RPC to fetch warehouses
            const warehouses = await rpc('/web/dataset/call_kw', {
                model: 'stock.warehouse',
                method: 'search_read',
                args: [
                    [],  // Domain - empty to get all warehouses
                    ['id', 'name', 'partner_id', 'code']  // Fields to fetch
                ],
                kwargs: {
                    context: {},
                }
            });
            
            if (warehouses && warehouses.length) {
                // Get partner details for addresses
                const partnerIds = warehouses
                    .filter(w => w.partner_id && w.partner_id[0])
                    .map(w => w.partner_id[0]);
                
                if (partnerIds.length > 0) {
                    const partners = await rpc('/web/dataset/call_kw', {
                        model: 'res.partner',
                        method: 'search_read',
                        args: [
                            [['id', 'in', partnerIds]],  // Domain
                            ['id', 'street', 'city', 'state_id', 'zip', 'country_id']  // Fields to fetch
                        ],
                        kwargs: {
                            context: {},
                        }
                    });
                    
                    // Create a map of partner id to partner details
                    const partnerMap = {};
                    partners.forEach(partner => {
                        partnerMap[partner.id] = partner;
                    });
                    
                    // Enhance warehouse objects with address information
                    this.state.warehouses = warehouses.map(warehouse => {
                        const partnerId = warehouse.partner_id && warehouse.partner_id[0];
                        const partner = partnerId && partnerMap[partnerId];
                        let address = '';
                        let stateId = '';
                        let countryId = '';
                        
                        if (partner) {
                            stateId = partner.state_id ? partner.state_id[0] : '';
                            countryId = partner.country_id ? partner.country_id[0] : '';
                            
                            const addressParts = [];
                            if (partner.street) addressParts.push(partner.street);
                            if (partner.city) addressParts.push(partner.city);
                            if (partner.state_id && partner.state_id[1]) addressParts.push(partner.state_id[1]);
                            if (partner.zip) addressParts.push(partner.zip);
                            if (partner.country_id && partner.country_id[1]) addressParts.push(partner.country_id[1]);
                            
                            address = addressParts.join(', ');
                        }
                        
                        return {
                            ...warehouse,
                            state_id: stateId,
                            country_id: countryId,
                            address: address || 'No address specified'
                        };
                    });
                } else {
                    this.state.warehouses = warehouses.map(warehouse => ({
                        ...warehouse,
                        address: 'No address specified'
                    }));
                }
            } else {
                console.warn("No warehouses found");
                this.state.warehouses = [];
            }
        } catch (e) {
            console.error("❌ Failed to load warehouses:", e);
            this.state.error = `Error loading warehouses: ${e.message}`;
        } finally {
            this.state.isLoading = false;
        }
    }

   // Create a new warehouse
    async createWarehouse() {
        try {
            // Set loading state
            this.state.isCreating = true;
            
            // Use fetch to call our API endpoint
            const response = await fetch('/api/warehouse_create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: this.state.newWarehouse.name,
                    address: this.state.newWarehouse.address,
                    city: this.state.newWarehouse.city,
                    state_id: this.state.newWarehouse.state_id || false,
                    zip_code: this.state.newWarehouse.zipCode,
                    country_id: this.state.newWarehouse.country_id || false
                }),
                credentials: 'same-origin',
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create warehouse');
            }
            
            const result = await response.json();
            
            if (result.success) {
                // Close the modal
                this.closeAddModal();
                
                // Reload the warehouses list
                await this.loadWarehouses();
            } else {
                throw new Error(result.error || 'Failed to create warehouse');
            }
        } catch (e) {
            console.error("❌ Failed to create warehouse:", e);
            alert(`Error creating warehouse: ${e.message}`);
        } finally {
            // Reset loading state
            this.state.isCreating = false;
        }
    }

    // Update an existing warehouse
    async updateWarehouse() {
        try {
            // Set loading state
            this.state.isUpdating = true;
            
            // Use fetch to call our API endpoint
            const response = await fetch(`/api/warehouse_update/${this.state.updateWarehouse.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: this.state.updateWarehouse.name,
                    address: this.state.updateWarehouse.address,
                    city: this.state.updateWarehouse.city,
                    state_id: this.state.updateWarehouse.state_id || false,
                    zip_code: this.state.updateWarehouse.zipCode,
                    country_id: this.state.updateWarehouse.country_id || false
                }),
                credentials: 'same-origin',
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update warehouse');
            }
            
            const result = await response.json();
            
            if (result.success) {
                // Close the modal
                this.closeUpdateModal();
                
                // Reload the warehouses list
                await this.loadWarehouses();
            } else {
                throw new Error(result.error || 'Failed to update warehouse');
            }
        } catch (e) {
            console.error("❌ Failed to update warehouse:", e);
            alert(`Error updating warehouse: ${e.message}`);
        } finally {
            // Reset loading state
            this.state.isUpdating = false;
        }
    }

     // Delete the warehouse
    async deleteWarehouse() {
        if (!this.state.warehouseToDelete) return;
        
        try {
            // Set loading state
            this.state.isDeleting = true;
            const warehouseId = this.state.warehouseToDelete.id;
            
            // Use fetch to call the delete API endpoint
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
            
            const result = await response.json();
            console.log("Delete Warehouse Response ================= ", result)
            // Close the modal
            this.closeDeleteModal();
            
            // Reload the warehouses list
            await this.loadWarehouses();
            
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
        <button class="btn btn-primary shadow-sm fw-normal" t-on-click="openAddModal">
            <i class="fa fa-plus me-2"></i> Add Warehouse
        </button>
    </div>

    <!-- Warehouse List Table -->
    <div class="">
        <div class="p-0">
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
                        <tr class="cursor-pointer" t-on-click="() => this.openUpdateModal(warehouse)">
                            <td class="ps-4 table-td-style" t-esc="warehouse.name"></td>
                            <td class="table-td-style" t-esc="warehouse.address"></td>
                            <td>
                                <button class="btn p-0 border-0 bg-transparent" title="Delete" 
                                    t-on-click="(event) => { event.stopPropagation(); this.openDeleteModal(warehouse); }">
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
                    <h5 class="modal-title fs-4 m-0">Delete <t t-esc="state.warehouseToDelete.name"/> Warehouse</h5>
                </div>

                <div class="modal-body px-0">
                    <p class="text-secondary mb-3">This action is <span class="text-danger fw-bold">irreversible</span>.</p>
                    <p class="text-secondary mb-3">Are you sure you want to delete "<t t-esc="state.warehouseToDelete.name"></t>"?</p>
                </div>
                <div class="modal-footer border-0 px-0 pt-2">
                    <div class="d-flex w-100">
                        <button type="button" class="btn btn-light flex-fill me-2 py-2" 
                            style="background-color: #f2f2f2;" t-on-click="closeDeleteModal">Cancel</button>
   
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

    <!-- Add Warehouse Modal -->
    <div t-if="state.showAddModal" class="modal fade show" 
        style="display: block; background-color: rgba(0,0,0,0.5);" 
        tabindex="-1" aria-modal="true" role="dialog">
        <div class="modal-dialog modal-dialog-centered" role="document">
            <div class="modal-content">
                <div class="d-flex align-items-center mb-3 px-4 pt-4">
                    <button type="button" class="btn btn-link text-primary p-0 me-3" t-on-click="closeAddModal" aria-label="Close">
                        <i class="fa fa-times" style="font-size: 24px; color: #0d6efd;"></i>
                    </button>
                    <h5 class="modal-title fs-4 m-0 modal-heading">Add New Warehouse</h5>
                </div>

                <div class="modal-body px-4">
                    <!-- Warehouse Name - Required field -->
                    <div class="mb-3">
                        <label for="warehouseName" class="form-label label-style">Warehouse Name <span class="text-danger">*</span></label>
                        <input 
                            type="text" 
                            class="form-control" 
                            id="warehouseName" 
                            placeholder="Name" 
                            t-att-value="state.newWarehouse.name"
                            t-on-input="(e) => this.handleAddInputChange('name', e)"
                            required="required"
                        />
                    </div>

                    <!-- Warehouse Address -->
                    <div class="mb-3">
                        <label for="warehouseAddress" class="form-label label-style">Warehouse Address</label>
                        <input 
                            type="text" 
                            class="form-control" 
                            id="warehouseAddress" 
                            placeholder="123 Main Street" 
                            t-att-value="state.newWarehouse.address"
                            t-on-input="(e) => this.handleAddInputChange('address', e)"
                        />
                    </div>

                    <!-- City and State on same row -->
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <label for="addCity" class="form-label label-style">City</label>
                            <input 
                                type="text" 
                                class="form-control" 
                                id="addCity" 
                                placeholder="City" 
                                t-att-value="state.newWarehouse.city"
                                t-on-input="(e) => this.handleAddInputChange('city', e)"
                            />
                        </div>
                        <div class="col-md-6">
                            <label for="addState" class="form-label label-style">State</label>
                            <select 
                                class="form-select" 
                                id="addState" 
                                t-on-change="(e) => this.handleAddInputChange('state_id', e)"
                                t-att-disabled="state.loadingLocations || state.states.length === 0">
                                <option value="">Select</option>
                                <t t-foreach="state.states" t-as="stateOption" t-key="stateOption.id">
                                    <option 
                                        t-att-value="stateOption.id" 
                                        t-att-selected="state.newWarehouse.state_id == stateOption.id">
                                        <t t-esc="stateOption.name"/>
                                    </option>
                                </t>
                            </select>
                        </div>
                    </div>

                    <!-- Zip Code and Country on same row -->
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <label for="addZipCode" class="form-label label-style">Zip Code</label>
                            <input 
                                type="text" 
                                class="form-control" 
                                id="addZipCode" 
                                placeholder="12345" 
                                t-att-value="state.newWarehouse.zipCode"
                                t-on-input="(e) => this.handleAddInputChange('zipCode', e)"
                            />
                        </div>
                        <div class="col-md-6">
                            <label for="addCountry" class="form-label label-style">Country</label>
                            <select 
                                class="form-select" 
                                id="addCountry" 
                                t-on-change="handleAddCountryChange"
                                t-att-disabled="state.loadingLocations">
                                <option value="">Select</option>
                                <t t-foreach="state.countries" t-as="countryOption" t-key="countryOption.id">
                                    <option 
                                        t-att-value="countryOption.id" 
                                        t-att-selected="state.newWarehouse.country_id == countryOption.id">
                                        <t t-esc="countryOption.name"/>
                                    </option>
                                </t>
                            </select>
                            <div t-if="state.loadingLocations" class="text-muted small mt-1">
                                <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                Loading...
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
                            t-on-click="createWarehouse" 
                            t-att-disabled="state.isCreating || !state.newWarehouse.name"
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

    <!-- Update Warehouse Modal -->
    <div t-if="state.showUpdateModal" class="modal fade show" 
        style="display: block; background-color: rgba(0,0,0,0.5);" 
        tabindex="-1" aria-modal="true" role="dialog">
        <div class="modal-dialog modal-dialog-centered" role="document">
            <div class="modal-content">
                <div class="d-flex align-items-center mb-3 px-4 pt-4">
                    <button type="button" class="btn btn-link text-primary p-0 me-3" t-on-click="closeUpdateModal" aria-label="Close">
                        <i class="fa fa-times" style="font-size: 24px; color: #0d6efd;"></i>
                    </button>
                    <h5 class="modal-title fs-4 m-0 modal-heading">Update Warehouse</h5>
                </div>

                <div class="modal-body px-4">
                    <!-- Warehouse Name - Required field -->
                    <div class="mb-3">
                        <label for="updateWarehouseName" class="form-label label-style">Warehouse Name <span class="text-danger">*</span></label>
                        <input 
                            type="text" 
                            class="form-control" 
                            id="updateWarehouseName" 
                            placeholder="Name" 
                            t-att-value="state.updateWarehouse.name"
                            t-on-input="(e) => this.handleUpdateInputChange('name', e)"
                            required="required"
                        />
                    </div>

                    <!-- Warehouse Address -->
                    <div class="mb-3">
                        <label for="updateWarehouseAddress" class="form-label label-style">Warehouse Address</label>
                        <input 
                            type="text" 
                            class="form-control" 
                            id="updateWarehouseAddress" 
                            placeholder="123 Main Street" 
                            t-att-value="state.updateWarehouse.address"
                            t-on-input="(e) => this.handleUpdateInputChange('address', e)"
                        />
                    </div>

                    <!-- City and State on same row -->
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <label for="updateCity" class="form-label label-style">City</label>
                            <input 
                                type="text" 
                                class="form-control" 
                                id="updateCity" 
                                placeholder="City" 
                                t-att-value="state.updateWarehouse.city"
                                t-on-input="(e) => this.handleUpdateInputChange('city', e)"
                            />
                        </div>
                        <div class="col-md-6">
                            <label for="updateState" class="form-label label-style">State</label>
                            <select 
                                class="form-select" 
                                id="updateState" 
                                t-on-change="(e) => this.handleUpdateInputChange('state_id', e)"
                                t-att-disabled="state.loadingLocations || state.states.length === 0">
                                <option value="">Select</option>
                                <t t-foreach="state.states" t-as="stateOption" t-key="stateOption.id">
                                    <option 
                                        t-att-value="stateOption.id" 
                                        t-att-selected="state.updateWarehouse.state_id == stateOption.id">
                                        <t t-esc="stateOption.name"/>
                                    </option>
                                </t>
                            </select>
                        </div>
                    </div>

                    <!-- Zip Code and Country on same row -->
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <label for="updateZipCode" class="form-label label-style">Zip Code</label>
                            <input 
                                type="text" 
                                class="form-control" 
                                id="updateZipCode" 
                                placeholder="12345" 
                                t-att-value="state.updateWarehouse.zipCode"
                                t-on-input="(e) => this.handleUpdateInputChange('zipCode', e)"
                            />
                        </div>
                        <div class="col-md-6">
                            <label for="updateCountry" class="form-label label-style">Country</label>
                            <select 
                                class="form-select" 
                                id="updateCountry" 
                                t-on-change="handleUpdateCountryChange"
                                t-att-disabled="state.loadingLocations">
                                <option value="">Select</option>
                                <t t-foreach="state.countries" t-as="countryOption" t-key="countryOption.id">
                                    <option 
                                        t-att-value="countryOption.id" 
                                        t-att-selected="state.updateWarehouse.country_id == countryOption.id">
                                        <t t-esc="countryOption.name"/>
                                    </option>
                                </t>
                            </select>
                            <div t-if="state.loadingLocations" class="text-muted small mt-1">
                                <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                Loading...
                            </div>
                        </div>
                    </div>
                </div>

                <div class="modal-footer border-0 px-4 py-3">
                    <div class="d-flex w-100">
                        <button type="button" class="btn btn-light flex-fill me-2 py-2" 
                            style="background-color: #f2f2f2;" t-on-click="closeUpdateModal">Cancel</button>
                        <button 
                            type="button" 
                            class="btn btn-primary flex-fill py-2" 
                            t-on-click="updateWarehouse" 
                            t-att-disabled="state.isUpdating || !state.updateWarehouse.name"
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
    const el = document.getElementById("warehouse_list-container");
    console.log("🎯 Mount target:", el);
    if (el) {
        console.log("🚀 Mounting OWL App...");
        const app = new App(WarehouseList);
        app.mount(el);
    }
});