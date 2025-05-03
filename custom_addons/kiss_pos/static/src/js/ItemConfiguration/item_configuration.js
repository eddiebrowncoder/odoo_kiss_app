/** @odoo-module **/
import { Component, useState, onWillDestroy  } from "@odoo/owl";
import { xml } from "@odoo/owl";
import { App } from "@odoo/owl";

console.log("ItemConfiguration ✅ JS Loaded");
console.log("Checking updated code");

export class ItemConfiguration extends Component {
    setup() {
        this.state = useState({
            kissStandardMaterial: true,
            kissItemInfoSync: true,
            costSync: true,
            msrpSync: true,
            moqSync: true,
            srsCategories: true,
            srsItemAttribute: true,
            enable3rdParty: true,
            showTooltip: false,
            showCostDropdown: false,
            selectedCostOption: "Latest Purchase Cost"
        });
        
        this.costOptions = [
            "Latest Purchase Cost",
            "Weight Average",
            "FIFO"
        ];
        this.handleClickOutside = this.handleClickOutside.bind(this);
        
        // Use onWillDestroy for cleanup
        onWillDestroy(() => {
            if (this._listenerAdded) {
                document.removeEventListener('click', this.handleClickOutside);
            }
        });
        
        // Safely add the event listener after DOM is ready
        this._listenerAdded = false;
        setTimeout(() => {
            document.addEventListener('click', this.handleClickOutside);
            this._listenerAdded = true;
        }, 0);
    }

    handleClickOutside(event) {
        // Check if tooltip is open and the click is outside
        if (this.state.showTooltip && 
            event.target.closest('.question-mark') === null &&
            event.target.closest('.tooltip-content') === null) {
            this.state.showTooltip = false;
        }
        
        // Check if dropdown is open and the click is outside
        if (this.state.showCostDropdown && 
            event.target.closest('.dropdown-toggle') === null &&
            event.target.closest('.dropdown-menu') === null) {
            this.state.showCostDropdown = false;
        }
    }
    
    willUnmount() {
        document.removeEventListener('click', this.handleClickOutside);
    }

    toggleSwitch(field) {
        this.state[field] = !this.state[field];
    }
    
    toggleTooltip(event) {
        // Stop propagation to prevent the document click handler from immediately closing the tooltip
        if (event) {
            event.stopPropagation();
        }
        this.state.showTooltip = !this.state.showTooltip;
    }
    
    toggleCostDropdown(event) {
        // Stop propagation to prevent the document click handler from immediately closing the dropdown
        if (event) {
            event.stopPropagation();
        }
        this.state.showCostDropdown = !this.state.showCostDropdown;
    }
    
    selectCostOption(option) {
        this.state.selectedCostOption = option;
        this.state.showCostDropdown = false;
    }

    static template = xml/* xml */`
<div class="container-fluid px-4 py-3">
    <!-- Breadcrumb -->
    <nav aria-label="breadcrumb" class="mt-3 mb-4">
        <ol class="breadcrumb">
            <li class="breadcrumb-item breadcrum-item-light"><a href="/home" class="text-secondary text-decoration-underline">Home</a></li>
            <li class="breadcrumb-item breadcrum-item-light"><a href="/settings" class="text-secondary text-decoration-underline">Settings</a></li>
            <li class="breadcrumb-item breadcrum-item-dark" aria-current="page">Item Configuration</li>
        </ol>
    </nav>

    <!-- Header -->
    <div class="d-flex justify-content-between align-items-center mb-4">
        <div class="page-heading-wrapper">
            <p class="heading fs-4 fw-bold mb-0">Item Configuration</p>
        </div>
    </div>

    <!-- Configuration Cards -->
    <div class="configuration-cards">
        <!-- KISS Standard Material Master Card -->
        <div class="card border-gray-solid">
            <div class="card-body p-4 d-flex justify-content-between align-items-center" style="background-color: #F2F2F2;">
                <div>
                    <h5 class="card-title fw-bold mb-2">KISS Standard Material Master Database for Item Management</h5>
                    <p class="card-text text-muted mb-0">This option determines whether to use the KISS Standard Material Master Table provided by KISS. When enabled, item management functions will operate based on product data maintained by the KISS Standard Material Master database.</p>
                </div>
                <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" role="switch" id="kissStandardMaterial" 
                        t-att-checked="state.kissStandardMaterial" 
                        t-on-change="() => this.toggleSwitch('kissStandardMaterial')" />
                </div>
            </div>
        </div>

        <!-- Kiss Item Information Sync Card -->
        <div t-if="state.kissStandardMaterial" class="card border-gray-solid">
            <div class="card-body p-4">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center position-relative">
                        <h5 class="card-title fw-bold mb-0 me-2">Kiss Item Information Sync</h5>
                        <span class="badge rounded-circle bg-secondary question-mark" t-on-click="(event) => this.toggleTooltip(event)">?</span>
                        
                        <!-- Tooltip -->
                        <div t-if="state.showTooltip" class="tooltip-content p-3 bg-white border shadow position-absolute">
                            <p class="mb-2">When Sync is turned ON for any item field:</p>
                            <ul class="ps-4 mb-2">
                                <li>The information will be automatically updated whenever the KISS Master data changes.</li>
                                <li>The field will become non-editable (read-only).</li>
                            </ul>
                            <p class="mb-0">When Sync is OFF, the field may be manually edited (if applicable) or hidden depending on the field type.</p>
                        </div>
                    </div>
                    <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" role="switch" id="kissItemInfoSync" 
                            t-att-checked="state.kissItemInfoSync" 
                            t-on-change="() => this.toggleSwitch('kissItemInfoSync')" />
                    </div>
                </div>
                <p class="card-text text-muted mt-2 mb-3">The following settings determine whether specific product information for KISS items only will be synced from the KISS Master database. These settings do not apply to products from other brands or vendors.</p>
                
                <div>
                    <!-- Cost -->
                    <div class="ms-4 mb-3">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <label class="fw-bold mb-1">Cost</label>
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" role="switch" id="costSync" 
                                    t-att-checked="state.costSync" 
                                    t-on-change="() => this.toggleSwitch('costSync')" />
                            </div>
                        </div>
                        <p class="text-muted small mb-2">When Sync is OFF, the Cost field is editable.</p>
                        <div class="ms-4 mb-3">
                            <div class="dropdown position-relative">
                                <div class="dropdown-toggle d-flex align-items-center justify-content-between p-2 border rounded" 
                                    role="button"
                                    t-on-click="(event) => this.toggleCostDropdown(event)"
                                    style="cursor: pointer; width: 250px;">
                                    <span t-esc="state.selectedCostOption"></span>
                                </div>
                                
                                <!-- Dropdown menu -->
                                <div t-if="state.showCostDropdown" class="dropdown-menu show position-absolute mt-1 w-25 bg-white border shadow">
                                    <t t-foreach="costOptions" t-as="option" t-key="option">
                                        <div class="dropdown-item p-2" 
                                            t-on-click="() => this.selectCostOption(option)"
                                            style="cursor: pointer;">
                                            <t t-esc="option" />
                                        </div>
                                    </t>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- MSRP -->
                    <div class="ms-4 mb-3">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <label class="fw-bold mb-1">MSRP (Manufacturer's Suggested Retail Price)</label>
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" role="switch" id="msrpSync" 
                                    t-att-checked="state.msrpSync" 
                                    t-on-change="() => this.toggleSwitch('msrpSync')" />
                            </div>
                        </div>
                        <p class="text-muted small mb-2">When Sync is OFF, the MSRP field is editable.</p>
                    </div>

                    <!-- MOQ -->
                    <div class="ms-4 mb-3">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <label class="fw-bold mb-1">MOQ (Minimum Order Quantity)</label>
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" role="switch" id="moqSync" 
                                    t-att-checked="state.moqSync" 
                                    t-on-change="() => this.toggleSwitch('moqSync')" />
                            </div>
                        </div>
                        <p class="text-muted small mb-2">When Sync is OFF, the MOQ field is editable.</p>
                    </div>

                    <!-- SRS Categories -->
                    <div class="ms-4 mb-3">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <label class="fw-bold mb-1">SRS Categories (SRS Category - SRS Category4)</label>
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" role="switch" id="srsCategories" 
                                    t-att-checked="state.srsCategories" 
                                    t-on-change="() => this.toggleSwitch('srsCategories')" />
                            </div>
                        </div>
                        <p class="text-muted small mb-2">When Sync is OFF, this field will not be displayed.</p>
                    </div>

                    <!-- SRS Item Attribute -->
                    <div class="ms-4 mb-3">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <label class="fw-bold mb-1">SRS Item Attribute (Company, Brand, Color, Size, Dimension, Volume, Weight)</label>
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" role="switch" id="srsItemAttribute" 
                                    t-att-checked="state.srsItemAttribute" 
                                    t-on-change="() => this.toggleSwitch('srsItemAttribute')" />
                            </div>
                        </div>
                        <p class="text-muted small mb-2">When Sync is OFF, these fields will not be displayed.</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Enable 3rd Party Material Master Card -->
        <div class="card border-gray-solid mt-3">
            <div class="card-body p-4 d-flex justify-content-between align-items-center">
                <div>
                    <h5 class="card-title fw-bold mb-2">Enable 3rd Party Material Master Database for Item Management</h5>
                    <p class="card-text text-muted mb-0">This option is for future use to enable integration with an external 3rd Party Material Master Database. While not currently active, it is included at this stage to initiate planning and discussion.</p>
                </div>
                <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" role="switch" id="enable3rdParty" 
                        t-att-checked="state.enable3rdParty" 
                        t-on-change="() => this.toggleSwitch('enable3rdParty')" />
                </div>
            </div>
        </div>
    </div>
</div>
`
}

document.addEventListener("DOMContentLoaded", () => {
    const el = document.getElementById("item_configuration-container");
    console.log("🎯 Mount target:", el);
    if (el) {
        console.log("🚀 Mounting OWL App...");
        const app = new App(ItemConfiguration);
        app.mount(el);
    }
});