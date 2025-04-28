import { Component, useState } from "@odoo/owl";
import { App } from "@odoo/owl";
import { xml } from "@odoo/owl";

export class AddItem extends Component {
    setup() {
        // Initialize a single state object with multiple form fields
        this.data = useState({
            itemName: "", // Item Name
            barcode: "", // Barcode
            sku: "", // SKU
            sellingPrice: "", // Selling Price
            cost: "", // Cost
            msrp: "", // MSRP
            status: "", // Status (active, inactive, discontinued)
            company: "", // Company
            parentCompany: "", // Parent Company
            brand: "", // Brand
            errorMessage: "", // Error message to display
            onHand: "", // On Hand quantity
            lastSold: "", // Last sold date
            lastUpdated: "", // Last updated date
            created: "", // Creation date
            ageRestriction: false, // Age restriction toggle
            useEBT: false, // Use EBT toggle
            activeTab: "basic-information", // Current active tab
            showPreFillModal: false,
            dontShowAgain: false,
        });

        // Bind methods to the context
        this.handleSave = this.handleSave.bind(this);
        this.confirmSave = this.confirmSave.bind(this);
        this.confirmPreFill = this.confirmPreFill.bind(this);
        this.closePreFillModal = this.closePreFillModal.bind(this);
        this.setActiveTab = this.setActiveTab.bind(this);
        this.duplicate = this.duplicate.bind(this);
        this.deleteItem = this.deleteItem.bind(this);
        this.saveDontShowAgainPreference =
            this.saveDontShowAgainPreference.bind(this);
        this.scrollToTab = this.scrollToTab.bind(this);
        this.handleScroll = this.handleScroll.bind(this);
    }

    mounted() {
        // Add scroll event listener when component is mounted
        window.addEventListener("scroll", this.handleScroll);

        // Get all section elements for scroll detection
        this.sections = document.querySelectorAll(".tab-section");
    }

    willUnmount() {
        // Remove scroll event listener when component is unmounted
        window.removeEventListener("scroll", this.handleScroll);
    }

    // Handle scroll event to update active tab
    handleScroll() {
        const scrollPosition = window.scrollY;

        // Find the current section in viewport
        let currentSection = this.sections[0];

        this.sections.forEach((section) => {
            const sectionTop = section.offsetTop - 100; // Offset for header/navigation
            if (scrollPosition >= sectionTop) {
                currentSection = section;
            }
        });

        if (currentSection) {
            // Get tab ID from section and update active tab
            const tabId = currentSection.getAttribute("data-tab");
            if (tabId && this.data.activeTab !== tabId) {
                this.data.activeTab = tabId;
            }
        }
    }

    // Scroll to specific tab section
    scrollToTab(tabId) {
        const section = document.querySelector(`[data-tab="${tabId}"]`);
        if (section) {
            section.scrollIntoView({ behavior: "smooth" });
            this.data.activeTab = tabId;
        }
    }

    confirmPreFill() {
        // Logic to pre-fill item details
        console.log("Pre-filling item details...");

        // Optionally store user preference to not show the modal again
        this.saveDontShowAgainPreference();
        this.confirmSave();

        this.data.showPreFillModal = false; // Close modal after pre-filling
    }

    closePreFillModal() {
        this.data.showPreFillModal = false;
    }

    saveDontShowAgainPreference() {
        // If the user checked the "Don't show this message again" checkbox
        if (this.data.dontShowAgain) {
            localStorage.setItem("dontShowPreFillModal", "true"); // Store in localStorage or sessionStorage
        }
    }

    async handleSave() {
        // Show the pre-fill item details modal before saving
        if (!localStorage.getItem("dontShowPreFillModal")) {
            this.data.showPreFillModal = true;
        } else {
            this.data.showPreFillModal = false;
            this.confirmSave();
        }
    }

    navigateBack() {
        if (this.props.onNavigate) {
            this.props.onNavigate("/item_list");
        } else {
            // Fallback to direct navigation if onNavigate prop is not available
            window.history.pushState({}, "", "/item_list");
            // Trigger a popstate event to update the route in MainLayout
            window.dispatchEvent(new PopStateEvent("popstate"));
        }
    }

    async confirmSave() {
        try {
            this.data.showPreFillModal = false;
            const formData = {
                item_name: this.data.itemName,
                barcode: this.data.barcode,
                sku: this.data.sku,
                selling_price: this.data.sellingPrice,
                cost: this.data.cost,
                msrp: this.data.msrp,
                status: "Not Confirmed",
                company: this.data.company,
                parent_company: this.data.parentCompany,
                brand: this.data.brand,
                on_hand: this.data.onHand,
                age_restriction: this.data.ageRestriction,
                use_ebt: this.data.useEBT,
            };
    
            console.log("Form Data:", formData); // Log to see if all fields are correct
    
            // Send the form data to the server
            const res = await fetch("/api/add_item", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    params: formData,
                }),
            });
    
            const data = await res.json();
            console.log("Response from server:", data); // Log the response
    
            // Check for success property directly in the result property of the response
            if (data.result && data.result.success) {
                this.navigateBack();
            } else {
                // Handle error
                const errorMsg =
                    (data.result && data.result.error) || "An error occurred";
                this.data.errorMessage = errorMsg;
            }
        } catch (error) {
            console.error("Error occurred:", error);
            this.data.errorMessage = "Failed to save item";
        }
    }

    setActiveTab(tabId) {
        this.data.activeTab = tabId;
        this.scrollToTab(tabId);
    }

    duplicate() {
        // Logic to duplicate the item
        console.log("Duplicating item");
        // Implement the actual duplication logic here
    }

    deleteItem() {
        // Logic to delete the item
        console.log("Deleting item");
        // Implement the actual deletion logic here
    }

    // Main component template
    static template = xml`
         <div class="container-fluid px-4 pt-4">
        <!-- Breadcrumb -->
            <div class="text-muted small mb-0">
                <a href="/" class="text-decoration-none text-muted">Home</a> / 
                <a href="/item_list" class="text-decoration-none text-muted">Item Management</a> / 
                <strong>Add New Item</strong>
            </div>
        
        <!-- Title and Top Bar -->
        <div class="p-4">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2 class="fs-28 fw-bold mb-0">Add New Item</h2>
                <div>
                    <button class="btn btn-primary" t-on-click="handleSave">
                        Save Changes
                    </button>
                </div>
            </div>

            <!-- Error Message -->
            <t t-if="data.errorMessage">
                <div class="alert alert-danger" role="alert">
                    <t t-esc="data.errorMessage"/>
                </div>
            </t>

            <!-- Fixed position tab navigation - This stays visible when scrolling -->
            <div class="sticky-top bg-white pt-2">
                <ul class="nav nav-tabs mb-4">
                    <li class="nav-item">
                        <a class="nav-link" t-att-class="{'active': data.activeTab === 'basic-information'}" 
                           href="#" t-on-click.prevent="() => setActiveTab('basic-information')">
                           Basic Information
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" t-att-class="{'active': data.activeTab === 'product-detail'}" 
                           href="#" t-on-click.prevent="() => setActiveTab('product-detail')">
                           Product Detail
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" t-att-class="{'active': data.activeTab === 'inventory-vendor'}" 
                           href="#" t-on-click.prevent="() => setActiveTab('inventory-vendor')">
                           Inventory &amp; Vendor
                        </a>
                    </li>
                </ul>
            </div>

<!-- Save Changes Confirmation Modal -->
<div t-if="data.showPreFillModal" class="modal fade show" style="display: block; background-color: rgba(0,0,0,0.5);" 
     tabindex="-1" role="dialog" aria-labelledby="preFillModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered" role="document">
    <div class="modal-content">

      <div class="modal-header">
        <h5 class="modal-title" id="preFillModalLabel">Would you like to pre-fill item details?</h5>
        <button type="button" class="btn-close" aria-label="Close" t-on-click="closePreFillModal"></button>
      </div>

      <div class="modal-body">
        <div class="form-check">
          <input class="form-check-input" type="checkbox" id="dontShowAgain" t-model="data.dontShowAgain" />
          <label class="form-check-label" for="dontShowAgain">
            Don't show this message again.
          </label>
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" t-on-click="closePreFillModal">No</button>
        <button type="button" class="btn btn-primary" t-on-click="confirmPreFill">Yes</button>
      </div>

    </div>
  </div>
</div>


            <!-- All tab content sections displayed together -->
            <div class="tab-sections">
                <!-- Basic Information Section -->
                <div class="tab-section mb-5" data-tab="basic-information">
                    <div class="tab-content">
                        <h4 class="mb-3">Basic Information</h4>
                        <div class="card mb-4">
                            <div class="card-body">
                                <h5 class="mb-3">Item Detail</h5>
                                <div class="row">
                                    <div class="col-md-4">
                                        <div class="form-group mb-3">
                                            <label for="barcode" class="form-label">Barcode *</label>
                                            <div class="input-group">
                                                <input type="text" class="form-control" id="barcode" t-model="data.barcode" placeholder="ABCD-1234" t-att-required="true" />
                                                <button class="btn btn-outline-primary" type="button">
                                                    <i class="fa fa-barcode"></i> Generate
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="form-group mb-3">
                                            <label for="sku" class="form-label">SKU *</label>
                                            <input type="text" class="form-control" id="sku" t-model="data.sku" 
                                                   placeholder="123456" t-att-required="true" />
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="form-group mb-3">
                                            <label class="form-label">Item Photo</label>
                                            <div class="border rounded p-3 text-center">
                                                <button class="btn btn-outline-primary">
                                                    <i class="fa fa-camera"></i> Upload Photo
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="form-group mb-3">
                                    <label for="item_name" class="form-label">Item Name *</label>
                                    <input type="text" class="form-control" id="item_name" t-model="data.itemName" 
                                           placeholder="Luxurious Nails" t-att-required="true" />
                                </div>

                                <div class="row mb-3">
                                    <div class="col-md-4">
                                        <div class="form-group">
                                            <label for="company" class="form-label">Company</label>
                                            <select class="form-select" id="company" t-model="data.company">
                                                <option value="">Select Company</option>
                                                <option value="company1">Company 1</option>
                                                <option value="company2">Company 2</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="form-group">
                                            <label for="parent_company" class="form-label">Parent Company</label>
                                            <select class="form-select" id="parent_company" t-model="data.parentCompany">
                                                <option value="">Select Parent Company</option>
                                                <option value="parent1">Parent Company 1</option>
                                                <option value="parent2">Parent Company 2</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="form-group">
                                            <label for="brand" class="form-label">Brand</label>
                                            <select class="form-select" id="brand" t-model="data.brand">
                                                <option value="">Select Brand</option>
                                                <option value="brand1">Brand 1</option>
                                                <option value="brand2">Brand 2</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col-md-4">
                                        <div class="form-group mb-3">
                                            <label for="status" class="form-label">Status</label>
                                            <select class="form-select" id="status" t-model="data.status">
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                                <option value="discontinued">Discontinued</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col-md-8">
                                        <div class="form-group mb-3">
                                            <label class="form-label d-block">Options</label>
                                            <div class="form-check form-check-inline mt-2">
                                                <input class="form-check-input" type="checkbox" id="ageRestriction" 
                                                       t-model="data.ageRestriction" />
                                                <label class="form-check-label" for="ageRestriction">Age Restriction</label>
                                            </div>
                                            <div class="form-check form-check-inline">
                                                <input class="form-check-input" type="checkbox" id="useEBT" 
                                                       t-model="data.useEBT" />
                                                <label class="form-check-label" for="useEBT">Use EBT</label>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <h5 class="mb-3 mt-4">Price</h5>
                                <div class="row">
                                    <div class="col-md-4">
                                        <div class="form-group mb-3">
                                            <label for="selling_price" class="form-label">Selling Price *</label>
                                            <div class="input-group">
                                                <span class="input-group-text">$</span>
                                                <input type="number" class="form-control" id="selling_price" 
                                                       t-model="data.sellingPrice" placeholder="0.00" step="0.01" t-att-required="true" />
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="form-group mb-3">
                                            <label for="cost" class="form-label">Cost</label>
                                            <div class="input-group">
                                                <span class="input-group-text">$</span>
                                                <input type="number" class="form-control" id="cost" 
                                                       t-model="data.cost" placeholder="0.00" step="0.01" />
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="form-group mb-3">
                                            <label for="msrp" class="form-label">MSRP</label>
                                            <div class="input-group">
                                                <span class="input-group-text">$</span>
                                                <input type="number" class="form-control" id="msrp" 
                                                       t-model="data.msrp" placeholder="0.00" step="0.01" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="form-group mb-3">
                                    <label class="form-label">Tax Code</label>
                                    <div>
                                        <div class="form-check form-check-inline">
                                            <input class="form-check-input" type="radio" name="taxCode" id="standard" value="standard" checked="true" />
                                            <label class="form-check-label" for="standard">Standard</label>
                                        </div>
                                        <div class="form-check form-check-inline">
                                            <input class="form-check-input" type="radio" name="taxCode" id="reduced" value="reduced" />
                                            <label class="form-check-label" for="reduced">Reduced</label>
                                        </div>
                                        <div class="form-check form-check-inline">
                                            <input class="form-check-input" type="radio" name="taxCode" id="zero" value="zero" />
                                            <label class="form-check-label" for="zero">Zero</label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Product Detail Section -->
                <div class="tab-section mb-5" data-tab="product-detail">
                    <div class="tab-content">
                        <h4 class="mb-3">Product Detail</h4>
                        <div class="card mb-4">
                            <div class="card-body">
                                <h5 class="mb-3">Item Attribute</h5>
                                <div class="row mb-3">
                                    <div class="col-md-4">
                                        <div class="form-group">
                                            <label for="item_type" class="form-label">Item Type</label>
                                            <select class="form-select" id="item_type">
                                                <option value="">Select Item Type</option>
                                                <option value="type1">Type 1</option>
                                                <option value="type2">Type 2</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="form-group">
                                            <label for="packaging_type" class="form-label">Packaging Type</label>
                                            <select class="form-select" id="packaging_type">
                                                <option value="">Select Packaging Type</option>
                                                <option value="box">Box</option>
                                                <option value="bottle">Bottle</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="form-group">
                                            <label for="item_unit" class="form-label">Item Unit</label>
                                            <select class="form-select" id="item_unit">
                                                <option value="">Select Unit</option>
                                                <option value="each">Each</option>
                                                <option value="case">Case</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col-md-2">
                                        <div class="form-group mb-3">
                                            <label for="color" class="form-label">Color</label>
                                            <input type="text" class="form-control" id="color" placeholder="Enter Color" />
                                        </div>
                                    </div>
                                    <div class="col-md-2">
                                        <div class="form-group mb-3">
                                            <label for="size" class="form-label">Size</label>
                                            <input type="text" class="form-control" id="size" placeholder="Enter Size" />
                                        </div>
                                    </div>
                                    <div class="col-md-2">
                                        <div class="form-group mb-3">
                                            <label for="dimension" class="form-label">Dimension</label>
                                            <input type="text" class="form-control" id="dimension" placeholder="Enter Dimension" />
                                        </div>
                                    </div>
                                    <div class="col-md-2">
                                        <div class="form-group mb-3">
                                            <label for="volume" class="form-label">Volume</label>
                                            <input type="text" class="form-control" id="volume" placeholder="Enter Volume" />
                                        </div>
                                    </div>
                                    <div class="col-md-2">
                                        <div class="form-group mb-3">
                                            <label for="weight" class="form-label">Weight</label>
                                            <input type="text" class="form-control" id="weight" placeholder="Enter Weight" />
                                        </div>
                                    </div>
                                </div>

                                <h5 class="mb-3 mt-4">Category</h5>
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="form-group mb-3">
                                            <label for="category1" class="form-label">Category 1</label>
                                            <select class="form-select" id="category1">
                                                <option value="">Select Category</option>
                                                <option value="cat1">Category 1</option>
                                                <option value="cat2">Category 2</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="form-group mb-3">
                                            <label for="sris_category" class="form-label">SRIS Category (Suggested)</label>
                                            <div class="input-group">
                                                <input type="text" class="form-control" id="sris_category" placeholder="Add Product Barcode" />
                                                <button class="btn btn-outline-secondary" type="button">Help</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Inventory & Vendor Section -->
                <div class="tab-section mb-5" data-tab="inventory-vendor">
                    <div class="tab-content">
                        <h4 class="mb-3">Inventory &amp; Vendor</h4>
                        <div class="card mb-4">
                            <div class="card-body">
                                <h5 class="mb-3">Inventory Information</h5>
                                <div class="row mb-3">
                                    <div class="col-md-4">
                                        <div class="form-group">
                                            <label class="form-label">On Hand</label>
                                            <div>
                                                <div class="form-check form-check-inline">
                                                    <input class="form-check-input" type="radio" name="onHand" id="onhand-standard" value="standard" checked="true" />
                                                    <label class="form-check-label" for="onhand-standard">Standard</label>
                                                </div>
                                                <div class="form-check form-check-inline">
                                                    <input class="form-check-input" type="radio" name="onHand" id="onhand-reduced" value="reduced" />
                                                    <label class="form-check-label" for="onhand-reduced">Reduced</label>
                                                </div>
                                                <div class="form-check form-check-inline">
                                                    <input class="form-check-input" type="radio" name="onHand" id="onhand-zero" value="zero" />
                                                    <label class="form-check-label" for="onhand-zero">Zero</label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="form-group">
                                            <label for="in_transit" class="form-label">In Transit</label>
                                            <input type="number" class="form-control" id="in_transit" placeholder="0" />
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="form-group">
                                            <label for="reorder_point" class="form-label">Reorder Point</label>
                                            <input type="number" class="form-control" id="reorder_point" placeholder="0" />
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="form-group mb-3">
                                            <label for="restock_level" class="form-label">Restock Level</label>
                                            <input type="number" class="form-control" id="restock_level" placeholder="0" />
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="form-group mb-3">
                                            <label for="min_order_qty" class="form-label">Minimum Order Quantity</label>
                                            <input type="number" class="form-control" id="min_order_qty" placeholder="0" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;
}

document.addEventListener("DOMContentLoaded", () => {
    const el = document.getElementById("add_item-container");
    if (el) {
        const app = new App(AddItem);
        app.mount(el);
    }
});
