/** @odoo-module **/
// Nested items:
import { Component, useState, xml } from "@odoo/owl";
import { App } from "@odoo/owl";

console.log("✅ JS Loaded");
console.log("Checking updated code");

export class ItemList extends Component {
  setup() {
    this.state = useState({
      items: [],
      allItems: [],
      notConfirmedItems: [],
      activeTab: "all",
      activeCategory: "brands",
      searchQuery: "",
      selectedBrands: {},
      selectedProducts: {},
      allSelected: false,
      showFilters: false,
    });

    // Sample filter categories
    this.filterCategories = [
      { id: "saved_filters", name: "Saved Filters" },
      { id: "brands", name: "Brands" },
      { id: "price_range", name: "Price Range" },
      { id: "date", name: "Date" },
      { id: "item_type", name: "Item Type" },
      { id: "item_unit", name: "Item Unit" },
      { id: "item_category", name: "Item Category" },
      { id: "supplier", name: "Supplier" },
      { id: "tax_code", name: "Tax Code" },
    ];

    // Sample brands
    this.brands = [
      { id: "brand_vluxe", name: "Vluxe" },
      { id: "brand_ivy", name: "Ivy" },
      { id: "brand_kiss", name: "Kiss" },
      { id: "brand_red", name: "Red" },
    ];

    this.loadItems();
  }

  async loadItems() {
    console.log("📦 Fetching from /api/item_list...");
    try {
      const res = await fetch("/api/item_list");
      const data = await res.json();
      console.log("🔍 Raw item data:", data);
  
      this.state.allItems = [...data.items];
      this.state.items = [...data.items];
      this.state.notConfirmedItems = data.items.filter(
        (item) => item.status === "Not Confirmed"
      );
      
      console.log("✅ Items loaded:", this.items.length);
    } catch (e) {
      console.error("❌ Failed to load items:", e);
    }
  }
  

  getIndentation(level) {
    return `padding-left: ${level * 20}px;`;
  }

  get hasNotConfirmedItems() {
    return this.state.notConfirmedItems && this.state.notConfirmedItems.length > 0;
  }

  // Active menu property to highlight the current section in sidebar
  get activeMenu() {
    return "items"; // This will highlight "Items" in the sidebar
  }

  // Toggle filter panel
  toggleFilters() {
    this.state.showFilters = !this.state.showFilters;
  }

  // Filter functionality methods
  selectCategory(categoryId) {
    this.state.activeCategory = categoryId;
  }

  toggleBrand(brandId) {
    this.state.selectedBrands[brandId] = !this.state.selectedBrands[brandId];
  }

  onSearch(ev) {
    this.state.searchQuery = ev.target.value;
    // Implement search logic here
  }

  saveFilter() {
    // Logic to save current filter configuration
    console.log("Saving filter");
  }

  applyFilters() {
    // Logic to apply all selected filters
    this.state.showFilters = false;
    console.log("Applying all filters");
  }

  applyBrandFilter() {
    // Logic to apply brand filter
    console.log("Applying brand filter", this.state.selectedBrands);
    this.state.showFilters = false;
    // In a real app, you would trigger a search or update products here
  }

  // Method to navigate to Add Item page using SPA navigation
  navigateToAddItem() {
    if (this.props.onNavigate) {
      this.props.onNavigate("/add_item");
    } else {
      // Fallback to direct navigation if onNavigate prop is not available
      window.history.pushState({}, "", "/add_item");
      // Trigger a popstate event to update the route in MainLayout
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  }

      navigateToImportItem() {
    if (this.props.onNavigate) {
      this.props.onNavigate('/import_item');
    } else {
      // Fallback to direct navigation if onNavigate prop is not available
      window.history.pushState({}, '', '/import_item');
      // Trigger a popstate event to update the route in MainLayout
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }



  switchTab(tabName) {
    console.log(`Switching to tab: ${tabName}`);
    this.state.activeTab = tabName;
    
    // Use direct assignment instead of splice for better reliability
    if (tabName === "not_confirmed") {
      this.state.items = [...this.state.notConfirmedItems];
    } else {
      this.state.items = [...this.state.allItems];
    }
    
    console.log(`Tab switched to ${tabName}, items count: ${this.state.items.length}`);
  }

  static props = {
    onNavigate: { type: Function, optional: true },
  };

  static template = xml/* xml */ `
      <div class="container-fluid px-4 pt-4">
        <!-- Breadcrumb -->
        <div class="text-muted small mb-2">
            Home / <span class="text-primary">Items</span> / <strong>Item Management</strong>
        </div>

        <!-- Title + Actions -->
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h2 class="fw-bold mb-0">Item Management</h2>
            <div class="d-flex gap-2">
                <span class="text-primary"><i class="fa fa-upload me-1"></i> Export</span>
                <span class="text-primary" t-on-click="navigateToImportItem"><i class="fa fa-download me-1"></i> Import</span>
                <span class="text-primary"><i class="fa fa-tag me-1"></i> Print Label</span>
                <span class="text-primary"><i class="fa fa-barcode me-1"></i> Print Barcode</span>
                <button class="btn btn-outline-secondary btn-sm" disabled="true"><i class="fa fa-edit me-1"></i> Bulk Edit</button>
                <button class="btn btn-outline-secondary btn-sm" disabled="true"><i class="fa fa-trash me-1"></i> Delete</button>
                <button class="btn btn-primary btn-sm" t-on-click="navigateToAddItem"><i class="fa fa-plus me-1"></i> Add Item</button>
            </div>
        </div>

        <!-- Filter + Search -->
        <div class="d-flex align-items-center">
            <button class="btn btn-sm bg-200 px-3 py-2 text-1000 fs-5 me-3" t-on-click="toggleFilters">
                <i class="fa fa-filter me-1"></i> Filter
            </button>

            <div class="flex-grow-1">
                <div class="input-group w-100">
                    <span class="input-group-text border border-end-0 rounded-start-2 bg-white">
                        <i class="fa fa-search text-muted"></i>
                    </span>
                    <input
                        type="text"
                        class="form-control border border-start-0 rounded-end-2"
                        placeholder="Search Item..."
                    />
                </div>
            </div>
        </div>

        <!-- Review Required Alert - Only show if there are Not Confirmed items -->
        <div t-if="hasNotConfirmedItems" class="alert alert-warning d-flex align-items-center my-3" role="alert">
          <i class="fa fa-exclamation-triangle me-2"></i>
          <div>
            <strong>Review Required</strong>
            <p class="mb-0">You have <t t-esc="state.notConfirmedItems.length"/> items with "Not Confirmed" status that needs to be reviewed and properly categorized.</p>
          </div>
          <button class="btn btn-warning ms-auto" t-on-click="switchTab.bind(this, 'not_confirmed')">
            Review "Not Confirmed" Items
          </button>
        </div>

        <!-- Filter Panel (Shown/Hidden based on state) -->
        <div class="mb-4" t-if="state.showFilters">
        <div class="filter-overlay" />
            <div class="row filter-content">
                <div class="col-md-4">
                    <!-- Left sidebar with filter categories -->
                    <div class="filter-sidebar card shadow-sm">


                        <div class="filter-options">
                            <t t-foreach="filterCategories" t-as="category" t-key="category.id">
                                <div class="filter-item d-flex justify-content-between align-items-center p-3"
                                     t-att-class="{'active': state.activeCategory === category.id}"
                                     t-on-click="() => this.selectCategory(category.id)">
                                    <span><t t-esc="category.name"/></span>
                                    <i class="fa fa-chevron-right text-muted"></i>
                                </div>
                            </t>
                        </div>

                        <div class="filter-actions d-flex p-3">
                            <button class="btn btn-outline-secondary flex-grow-1 me-2" t-on-click="saveFilter">Save Filter</button>
                            <button class="btn btn-primary flex-grow-1" t-on-click="applyFilters">Apply Filter(s)</button>
                        </div>
                    </div>
                </div>

                <div class="col-md-4">
                    <!-- Right side with filter options -->
                    <div class="options-panel card shadow-sm" t-if="state.activeCategory === 'brands'">
                        <div class="p-3 border-bottom bg-light">
                            <h6 class="mb-0">Choose Brands</h6>
                        </div>

                        <div class="options-list p-3">
                            <t t-foreach="brands" t-as="brand" t-key="brand.id">
                                <div class="form-check mb-2">
                                    <input class="form-check-input" type="checkbox" t-att-id="brand.id"
                                           t-att-checked="state.selectedBrands[brand.id]"
                                           t-on-change="() => this.toggleBrand(brand.id)"/>
                                    <label class="form-check-label" t-att-for="brand.id">
                                        <t t-esc="brand.name"/>
                                    </label>
                                </div>
                            </t>
                        </div>

                        <div class="p-3 border-top">
                            <button class="btn btn-primary w-100" t-on-click="applyBrandFilter">Apply</button>
                        </div>
                    </div>

                    <div class="options-panel card shadow-sm" t-elif="state.activeCategory === 'price_range'">
                        <!-- Price range options would go here -->
                        <div class="p-3 border-bottom bg-light">
                            <h6 class="mb-0">Select Price Range</h6>
                        </div>
                        <!-- Content for price range -->
                        <div class="p-3">
                            <div class="mb-3">
                                <label class="form-label">Minimum Price</label>
                                <input type="number" class="form-control" placeholder="0.00" />
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Maximum Price</label>
                                <input type="number" class="form-control" placeholder="1000.00" />
                            </div>
                            <div class="p-3 border-top">
                                <button class="btn btn-primary w-100">Apply</button>
                            </div>
                        </div>
                    </div>

                    <!-- Other filter option panels can be added here -->
                </div>
            </div>
        </div>
        <!-- Tabs -->
<ul class="nav nav-tabs mt-3 mb-2">
  <li class="nav-item">
<a class="nav-link fw-semibold"
   t-att-class="{'active text-black border-3 border-bottom': state.activeTab === 'all', 'text-muted': state.activeTab !== 'all'}"
   role="button"
  t-on-click="switchTab.bind(this, 'all')"
   data-tab="all">
  All Items
</a>
  </li>
  <li class="nav-item">
<a class="nav-link fw-semibold"
   t-att-class="{'active text-black border-3 border-bottom': state.activeTab === 'not_confirmed', 'text-muted': state.activeTab !== 'not_confirmed'}"
   role="button"
   t-on-click="switchTab.bind(this, 'not_confirmed')">
  Not Confirmed
  <span t-if="hasNotConfirmedItems" class="badge bg-primary rounded-pill small"><t t-esc="state.notConfirmedItems.length"/></span>
</a>
  </li>
</ul>



<!-- Table -->
<div class="table-responsive border rounded shadow-sm">
    <table class="table align-middle mb-0">
        <thead class="bg-gray-200 text-uppercase small text-muted border-bottom">
            <tr>
               <th><input type="radio" name="select_item" /></th>
                <th>Barcode</th>
                <th>SKU</th>
                <th>Item</th>
                <th>Unit Price</th>
                <th>Category</th>
                <th>Company</th>
                <th>Supplier</th>
                <th class="text-center">Status</th>
            </tr>
        </thead>
        <tbody>
          <t t-foreach="state.items" t-as="item" t-key="item.id">
            <tr t-att-class="'border-bottom' + (item.status === 'Not Confirmed' ? ' bg-yellow-100' : '')">
               <td><input type="radio" name="select_item" /></td>
                <td class="fw-semibold text-black"><t t-esc="item.barcode"/></td>
                <td class="text-muted"><t t-esc="item.sku"/></td>
                <td><t t-esc="item.name"/></td>
                <td class="text-muted"><t t-esc="item.unit_price"/></td>
                <td>
                    <span class="text-primary" role="button">
                        <t t-esc="item.category"/>
                    </span>
                </td>
                <td><t t-esc="item.company"/></td>
                <td><t t-esc="item.supplier"/></td>
<td class="text-center">
    <t t-if="item.status == 'Active'">
        <span class="badge rounded-sm bg-success-subtle text-success px-3 py-1">Active</span>
    </t>
    <t t-elif="item.status == 'Inactive'">
        <span class="badge rounded-sm bg-secondary-subtle text-dark px-3 py-1">Inactive</span>
    </t>
    <t t-elif="item.status == 'Discontinued'">
        <span class="badge rounded-sm bg-danger-subtle text-danger px-3 py-1">Discontinued</span>
    </t>
    <t t-elif="item.status == 'Not Confirmed'">
        <span class="badge rounded-sm bg-warning-subtle text-warning px-3 py-1">Not Confirmed</span>
    </t>
</td>

            </tr>
          </t>
        </tbody>
    </table>
</div>
      </div>
  `;
}

// Add CSS to the document
const style = document.createElement('style');
style.textContent = `
.filter-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0,0,0,0.5);
    z-index: 1000;
}

.filter-content {
    z-index: 1001;
    position:absolute;
    width: 100%;
}

.filter-sidebar {
    border-radius: 8px;
}

.filter-options {
    width: -webkit-fill-available
}

.filter-options .filter-item {
    cursor: pointer;
    transition: background-color 0.2s;
}

.filter-options .filter-item {
    color: #1A1A1A
}

.filter-options .filter-item:hover {
    background-color: #E5F0FF;
    color: #1A1A1A
}

.filter-options .filter-item.active {
    background-color: #E5F0FF;
    color: #1A1A1A;
}

.options-panel {
    border-radius: 8px;
}

.form-check-input:checked {
    background-color: #0d6efd;
    border-color: #0d6efd;
}
`;
document.head.appendChild(style);

document.addEventListener("DOMContentLoaded", () => {
    const el = document.getElementById("item_list-container");
    console.log("🎯 Mount target:", el);
    if (el) {
        console.log("🚀 Mounting OWL App...");
        const app = new App(ItemList);
        app.mount(el);
    }
});