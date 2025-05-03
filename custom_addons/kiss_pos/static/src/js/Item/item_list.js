/** @odoo-module **/
// Nested items:
import { Component, useState, xml, onMounted, onPatched } from "@odoo/owl";
import { App } from "@odoo/owl";
import { Export } from "../Export/export";
import { Toast } from "../Common/toast";
import { BulkEdit } from "../BulkEdit/bulk_edit";
import { LabelPrint } from "../LabelPrint/label_print";
import { ImageIcon } from "../Common/ImageIcon";
import { ITEM_TYPES, ITEM_UNITS, TAX_CODES  } from "../constants";
import { rpc } from "@web/core/network/rpc";

console.log("✅ JS Loaded");
console.log("Checking updated code");

export class ItemList extends Component {
  setup() {
    this.state = useState({
      items: [],
      allItems: [],
      notConfirmedItems: [],
      activeTab: "all",
      activeFilter: "brands",
      searchQuery: "",
      allSelected: false,
      showFilters: false,
      showBulkEditModal: false,
      showExportModal: false,
      showLabelModal: false,
      selectedItems: [],
      isBarcodePrinting: false,
      isConfirming: false,
      priceRange: {
        min: '',
        max: ''
      },
      priceRangeMinValue: 0,
      priceRangeMaxValue: 1000,
      rangeConstraints: { min: 0, max: 1000 },
      showMinTooltip: false,
      showMaxTooltip: false,
      selectedBrands: {},
      selectedItemTypes: {},
      selectedItemUnits: {},
      selectedCategories: {},
      selectedSuppliers: {},
      selectedTaxCodes: {},
      appliedFilters: {
        brands: [],
        priceRange: null,
        itemTypes: [],
        itemUnits: [],
        categories: [],
        suppliers: [],
        taxCodes: [],
        // Add other filter types here
      },
      showAddFilterModal: false,
      customFilterName: "",
      isCreating: false,
      isFiltersLoading: false,
      userFilters: [],
      itemTypes: ITEM_TYPES,
      itemUnits: ITEM_UNITS,
      taxCodes: TAX_CODES,
      categories: [],
      suppliers: [],
      brands: [],
    });

    // Sample filter categories
    this.filters = [
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
    
    // References for tooltip positioning
    this.minSliderRef = { el: null };
    this.maxSliderRef = { el: null };
    
    onMounted(() => {
        this.updateTooltipStyles();
    });
    
    onPatched(() => {
        this.updateTooltipStyles();
    });

    this.loadItems();
    this.loadReferenceData();

    this.openExportModal = this.openExportModal.bind(this);
    this.closeExportModal = this.closeExportModal.bind(this);
    this.openPrintModal = this.openPrintModal.bind(this);
    this.closePrintModal = this.closePrintModal.bind(this);
    this.printBarcodes = this.printBarcodes.bind(this);
    this.toggleSelectAll = this.toggleSelectAll.bind(this);
    this.confirmItems = this.confirmItems.bind(this);
    this.openBulkEditModal = this.openBulkEditModal.bind(this);
    this.closeBulkEditModal = this.closeBulkEditModal.bind(this);


    this.toggleItemSelection = (item) => {
      const index = this.state.selectedItems.findIndex(selectedItem => selectedItem.id === item.id);
      
      if (index === -1) {
        this.state.selectedItems.push(item);
      } else {
        this.state.selectedItems.splice(index, 1);
      }
    };
  }

  async loadReferenceData() {
    try {
        const categoriesResult = await rpc("/web/dataset/call_kw", {
            model: "product.category",
            method: "search_read",
            args: [
                [], 
                ["id", "name", "parent_id"],
            ],
            kwargs: {
                context: {},
            },
        });

        if (categoriesResult && categoriesResult.length) {
            this.state.categories = categoriesResult;
        }

        // Fetch vendors (suppliers)
        const vendorsResult = await rpc("/web/dataset/call_kw", {
            model: "res.partner",
            method: "search_read",
            args: [
                [],
                ["id", "name", "supplier_rank"], // Fields to fetch
            ],
            kwargs: {
                context: {},
            },
        });

        if (vendorsResult && vendorsResult.length) {
            console.log("vendors", vendorsResult)
            this.state.suppliers = vendorsResult;
        }

        const brandsResult = await rpc("/web/dataset/call_kw", {
          model: "product.data.feed.brand",
          method: "search_read",
          args: [
              [],
              ["id", "name"], // Fields to fetch
          ],
          kwargs: {
              context: {},
          },
      });

      if (brandsResult && brandsResult.length) {
          console.log("brands", brandsResult)
          this.state.brands = brandsResult;
      }

    } catch (e) {
        console.error("Failed to load reference data:", e);
        this.data.error = `Error loading reference data: ${e.message}`;
    }
}

openBulkEditModal() {
  if (this.state.selectedItems.length === 0) {
    Toast.error("Please select at least one item to Edit.");
    return
  }
  this.state.showBulkEditModal = true;
}
closeBulkEditModal() {
  this.state.showBulkEditModal = false;
}

  openExportModal() {
    if (this.state.selectedItems.length === 0) {
      Toast.error("Please select at least one item to export.");
      return
    }
    this.state.showExportModal = true;
  }
  closeExportModal() {
    this.state.showExportModal = false;
  }

  openPrintModal() {
    if (this.state.selectedItems.length === 0) {
      Toast.error("Please select at least one item to print.");
      return
    }
    this.state.showPrintModal = true;
  }
  closePrintModal() {
    this.state.showPrintModal = false;
  }

  async printBarcodes() {
    if (this.state.selectedItems.length === 0) {
      Toast.error("Please select at least one item to print barcodes for.");
      return;
    }
    
    this.state.isBarcodePrinting = true;
    Toast.info("Generating barcode PDF...");
    
    try {
      const items = this.state.selectedItems.map(item => ({
        id: item.id,
        name: item.name,
        barcode: item.barcode || '',
        sku: item.sku || '',
        price: item.unit_price || 0
      }));
      
      const requestData = {
        items_data: JSON.stringify(items),
        labels_per_row: 3,
        label_width: 60,
        label_height: 40,
        page_size: 'A4',
        barcode_type: 'Code128'
      };
      
      const response = await fetch('/print_barcodes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = 'product_barcodes.pdf';
      document.body.appendChild(a);
      a.click();
      
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.state.isBarcodePrinting = false;
      Toast.success("Barcode PDF generated successfully!");
    } catch (error) {
      console.error("Error generating barcodes:", error);
      Toast.error("Failed to generate barcodes. Please try again.");
      this.state.isBarcodePrinting = false;
    }
  }

  async loadItems(filters = null) {
    console.log("📦 Fetching from /api/item_list...");
    try {
      let url = "/api/item_list";
      
      // Add search query parameter if provided
      if (this.state.searchQuery) {
        url += `?search=${encodeURIComponent(this.state.searchQuery)}`;
      }
        const options = {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            // Include filters in body if provided, otherwise send empty object
            body: JSON.stringify(filters || {})
          };

      const res = await fetch(url, options);
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
  
  async   loadFilters() {
    console.log("📦 Fetching from /api/filters...");
    try {

      const res = await fetch("/api/filters");
      console.log('Fetched filters ->', res);
      const data = await res.json();
      console.log("🔍 Raw filters data:", data);

      return data.filters;
    } catch (e) {
      console.error("❌ Failed to load filters:", e);
    }
  }

  async confirmItems() {
   
    if (this.state.selectedItems.length === 0) {
      Toast.error("Please select at least one item to confirm.");
      return;
    }

    const itemsToConfirm = this.state.selectedItems.filter(item => item.status === 'Not Confirmed');
    if (itemsToConfirm.length === 0) {
      Toast.warning("No 'Not Confirmed' items selected.");
      return;
    }
    
    try {
      this.state.isConfirming = true;
      const requestData = {
        items: itemsToConfirm.map(item => ({
          item_id: item.id,
          item_status: "Active"
        }))
      };
      
      const response = await fetch("/api/update_item_status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.state.activeTab = "all";
        this.loadItems();
        Toast.success(`Selected item(s) confirmed successfully`);
      } else {
        Toast.error(result.error || "Failed to confirm items");
      }
    } catch (error) {
      console.error("Error confirming items:", error);
      Toast.error("Error confirming items. Please try again.");
    } finally {
      this.state.isConfirming = false;
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
    if (this.state.showFilters) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
  }
  
  // Filter functionality methods
  async selectFilter(filterId) {
    this.state.activeFilter = filterId;
    if (filterId === 'saved_filters') {
    try {
      this.state.isFiltersLoading = true;
        const res = await this.loadFilters();
        this.state.userFilters = res;
        console.log('filters res ->', res);
        this.state.isFiltersLoading = false;
      } catch (error) {
        console.log('error in fetching filters ->', error);
        this.state.isFiltersLoading = false;
      }
      finally {
        this.state.isFiltersLoading = false;
      }
    }
  }

  toggleEntitySelection(entityId) {
    if (this.state.activeFilter === 'brands') {
      this.state.selectedBrands[entityId] = !this.state.selectedBrands[entityId];
    }
    else if (this.state.activeFilter === 'item_type') {
      this.state.selectedItemTypes[entityId] = !this.state.selectedItemTypes[entityId];
    }
    else if (this.state.activeFilter === 'item_unit') {
      this.state.selectedItemUnits[entityId] = !this.state.selectedItemUnits[entityId];
    }
    else if (this.state.activeFilter === 'item_category') {
      this.state.selectedCategories[entityId] = !this.state.selectedCategories[entityId];
    }
    else if (this.state.activeFilter === 'supplier') {
      this.state.selectedSuppliers[entityId] = !this.state.selectedSuppliers[entityId];
    }
    else if (this.state.activeFilter === 'tax_code') {
      this.state.selectedTaxCodes[entityId] = !this.state.selectedTaxCodes[entityId];
    }
  }
  
  onSearch(ev) {
    this.state.searchQuery = ev.target.value;
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    
    if (!this.state.searchQuery) {
      this.clearSearch();
      return;
    }
    
    this.searchTimeout = setTimeout(async () => {
      await this.performSearch();
    }, 300);
  }

  clearSearch() {
    this.state.searchQuery = "";
    this.loadItems();
  }
  
  async performSearch() {
    await this.loadItems();
  }

  saveFilter() {
    // Logic to save current filter configuration
    console.log("Saving filter");
  }

  // Get the total number of applied filters
  get totalAppliedFilters() {
    // Count the number of applied filters
    let count = 0;

    // Count brands
    if (this.state.appliedFilters.brands.length > 0) count++;

    // Count price range
    if (this.state.appliedFilters.priceRange) count++;
    
    // Count item type filters
    if (this.state.appliedFilters.itemTypes.length) count++;
    
    // Count item unit filters
    if (this.state.appliedFilters.itemUnits.length) count++;
    
    // Count categories
    if (this.state.appliedFilters.categories.length) count++;
    
    // Count suppliers
    if (this.state.appliedFilters.suppliers.length) count++;

    // Count tax codes
    if (this.state.appliedFilters.taxCodes.length) count++;

    return count;
  }

  // Get selected brands count
  get selectedBrandsCount() {
    return Object.values(this.state.selectedBrands).filter(value => value).length;
  }

  formatFiltersForPayload () {
    const filters = {};
    
    // Only add price range if either min or max is set
    if (this.state.priceRange.min !== '' || this.state.priceRange.max !== '') {
      filters.price_range = {
        min_price: this.state.priceRange.min === "" ? 0 : this.state.priceRange.min, 
        max_price: this.state.priceRange.max === "" ? 1000 : this.state.priceRange.max 
      };
    }
    if (this.state.appliedFilters.itemTypes.length) {
      filters.item_type = this.state.appliedFilters.itemTypes
    }
    if (this.state.appliedFilters.itemUnits.length) {
      filters.item_unit = this.state.appliedFilters.itemUnits
    }
    if (this.state.appliedFilters.categories.length) {
      filters.categories = this.state.appliedFilters.categories
    }
    if (this.state.appliedFilters.suppliers.length) {
      filters.suppliers = this.state.appliedFilters.suppliers
    }
    if (this.state.appliedFilters.taxCodes.length) {
      filters.tax_codes = this.state.appliedFilters.taxCodes
    }
    if (this.state.appliedFilters.brands.length) {
      filters.brands = this.state.appliedFilters.brands
    }
    return filters;
  }

    // Apply all filters
  getFilteredProducts() {
    console.log("Applying all filters");

    // Keep filters open
    console.log("Applied filters:", this.state.appliedFilters);

    const filters = this.formatFiltersForPayload();

    this.state.showFilters = false;

    // Implement filtering logic on the items here
    // Create filters object
  
  // Call loadItems with the filters
  this.loadItems(filters);
  }

  // Apply brand filter
  applyFilters(togglePanel = false) {
    if (this.state.activeFilter === 'brands') {
      const selectedBrands = this.state.brands.filter(brand =>
        this.state.selectedBrands[brand.id]
      );
      this.state.appliedFilters.brands = selectedBrands.map(brand => brand.name);
      console.log("Applied brand filter:", this.state.appliedFilters.brands);
    }
    else if (this.state.activeFilter === 'price_range') {
      this.state.appliedFilters.priceRange = { min: Number.parseFloat(this.state.priceRange.min), max: Number.parseFloat(this.state.priceRange.max) }
    }
    else if (this.state.activeFilter === 'item_type') {
      const selectedItemTypes = this.state.itemTypes.filter(itemType =>
        this.state.selectedItemTypes[itemType.id]
      );
      this.state.appliedFilters.itemTypes = selectedItemTypes.map(itemType => itemType.id);
    }
    else if (this.state.activeFilter === 'item_unit') {
      const selectedItemUnits = this.state.itemUnits.filter(itemUnit =>
        this.state.selectedItemUnits[itemUnit.id]
      );
      this.state.appliedFilters.itemUnits = selectedItemUnits.map(itemUnit => itemUnit.id);
      console.log("Applied item type filter:", this.state.appliedFilters.itemUnits);
    }
    else if (this.state.activeFilter === 'item_category') {
      const selectedCategories = this.state.categories.filter(category =>
        this.state.selectedCategories[category.id]
      );
      this.state.appliedFilters.categories = selectedCategories.map(category => category.id);
      console.log("Applied category filter:", this.state.appliedFilters.categories);
    }
    else if (this.state.activeFilter === 'supplier') {
      const selectedSuppliers = this.state.suppliers.filter(supplier =>
        this.state.selectedSuppliers[supplier.id]
      );
      this.state.appliedFilters.suppliers = selectedSuppliers.map(supplier => supplier.id);
      console.log("Applied supplier filter:", this.state.appliedFilters.suppliers);
    }
    else if (this.state.activeFilter === 'tax_code') {
      const selectedTaxCodes = this.state.taxCodes.filter(tax =>
        this.state.selectedTaxCodes[tax.id]
      );
      this.state.appliedFilters.taxCodes = selectedTaxCodes.map(tax => tax.id);
      console.log("Applied tax filter:", this.state.appliedFilters.taxCodes);
    }

    this.state.activeFilter = "";

    // Close filter panel if requested
    if (togglePanel) {
      this.state.showFilters = false;
    }
  }

  // Get the current min value for calculations
  get minValue() {
    return this.state.priceRange.min !== '' ? Number(this.state.priceRange.min) : this.state.priceRangeMinValue;
}

// Get the current max value for calculations
get maxValue() {
    return this.state.priceRangeMaxValue !== '' ? Number(this.state.priceRange.max) : this.state.priceRangeMaxValue;
}

// Calculate the percentage position for the min thumb
get minPercentage() {
    const min = this.minValue;
    const totalRange = this.state.priceRangeMaxValue - this.state.priceRangeMinValue;
    return ((min - this.state.priceRangeMinValue) / totalRange) * 100;
}

// Calculate the percentage position for the max thumb
get maxPercentage() {
    const max = this.maxValue;
    const totalRange = this.state.priceRangeMaxValue - this.state.priceRangeMinValue;
    return ((max - this.state.priceRangeMinValue) / totalRange) * 100;
}

// Calculate the track width percentage
get trackWidthPercentage() {
    return this.maxPercentage - this.minPercentage;
}

// Update tooltip positions based on slider position
updateTooltipStyles() {
    if (this.minSliderRef.el && this.state.showMinTooltip) {
        const minTooltip = this.minSliderRef.el.parentElement.querySelector('.min-tooltip');
        if (minTooltip) {
            // Use direct percentage calculation for more reliable positioning
            const minPercent = ((this.minValue - this.state.rangeConstraints.min) / 
                               (this.state.rangeConstraints.max - this.state.rangeConstraints.min)) * 100;
            
            minTooltip.style.left = `${minPercent}%`;
        }
    }
}

// Format price range for display
get formattedPriceRange() {
    const { min, max } = this.state.priceRange;
    if (min && max) {
        return `($${min.toLocaleString()} - $${max.toLocaleString()})`;
    } else if (min) {
        return `(Min: $${min})`;
    } else if (max) {
        return `(Max: $${max})`;
    }
    return null;
}

// Update price range min value from number input
updateMinPriceRange(event) {
    const value = event.target.value;
    // Store the raw value as entered by user
    this.state.priceRangeMinValue = value;
}

// Update price range max value from number input
updateMaxPriceRange(event) {
    const value = event.target.value;
    // Store the raw value as entered by user
    this.state.priceRangeMaxValue = value;
}

// Update minimum price from slider
updateMinPrice(ev) {
    const value = Number(ev.target.value);
    
    // Store current max value
    const currentMax = this.state.priceRange.max;
    
    // Update min value
    this.state.priceRange.min = value;
    
    // Only adjust if needed
    if (currentMax !== '' && value > Number(currentMax)) {
        this.state.priceRange.min = currentMax;
    }
}

// Update maximum price from slider
updateMaxPrice(ev) {
    const value = Number(ev.target.value);
    this.state.priceRange.max = value;
    
    // Make sure max isn't less than min if min is set
    if (this.state.priceRange.min !== '' && value < Number(this.state.priceRange.min)) {
        this.state.priceRange.max = this.state.priceRange.min;
    }
}

// Show min tooltip
showMinTooltip() {
    this.state.showMinTooltip = true;
}

// Hide min tooltip
hideMinTooltip() {
    this.state.showMinTooltip = false;
}

// Show max tooltip
showMaxTooltip() {
    this.state.showMaxTooltip = true;
}

// Hide max tooltip
hideMaxTooltip() {
    this.state.showMaxTooltip = false;
}

openAddFilterModal() {
  this.state.showAddFilterModal = true;
}

closeAddFilterModal() {
  this.state.showAddFilterModal = false;
}

handleAddInputChange(event) {
  console.log('value ->', event.target.value)
  this.state.customFilterName = event.target.value;
}

  async addCustomFilter() {
    if (!this.state.appliedFilters.brands.length && this.state.appliedFilters.priceRange === null) {
      Toast.error("Please select filters to save");
      return
    }
    const filters = this.formatFiltersForPayload();
    try {
      const payload = {
        name: this.state.customFilterName,
        filter_parameters: filters,
      }
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Include filters in body if provided, otherwise send empty object
        body: JSON.stringify(payload)
      };

      const res = await fetch("/api/filters/create", options);
      const data = await res.json();
      console.log("✅ Filter created:", data);
      if (data.success) {
        this.closeAddFilterModal();
        const updatedFilters = await this.loadFilters();
        this.state.userFilters = updatedFilters;
      }

    } catch (e) {
      console.error("❌ Failed to create filter:", e);
    }
  }
  
  async deleteCustomFilter(filterId) {
    if (!filterId) {
      Toast.error("Please select filter to delete");
      return
    }
    try {
      const options = {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        // Include filters in body if provided, otherwise send empty object
        body: {}
      };

      const res = await fetch(`/api/filters/${filterId}/delete`, options);
      const data = await res.json();
      console.log("✅ Filter deleted:", data);
      if (data.success) {
        Toast.success(data?.message ?? 'Filter deleted successfully')
        // const updatedFilters = await this.loadFilters();
        // this.state.userFilters = updatedFilters;
      }

    } catch (e) {
      Toast.error(e?.error ?? 'Failed to delete filter')
      console.error("❌ Failed to delete filter:", e);
    }
  }

  // Clear all filters
  clearAllFilters() {
    this.state.appliedFilters = {
      brands: [],
      priceRange: null
    };
    this.state.selectedBrands = {};
    this.state.priceRange = { min: '', max: '' };
    this.state.priceRangeMinValue = 0;
    this.state.priceRangeMaxValue = 1000;
    console.log("Cleared all filters");
  }

  // Clear brand filters
  clearBrandFilters() {
    this.state.appliedFilters.brands = [];
    this.state.selectedBrands = {};
    console.log("Cleared brand filters");
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

  toggleSelectAll() {
    if (this.state.selectedItems.length === this.state.items.length) {
        this.state.selectedItems = [];
    } else {
        this.state.selectedItems = [...this.state.items];
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

  static components = { Export, LabelPrint, ImageIcon, BulkEdit };

  static template = xml/* xml */ `
      <div class="container-fluid px-4 pt-4">
    <!-- Breadcrumb -->
    <div class="text-muted small mb-2">
        Home / <span class="text-primary">Items</span> / <strong>Item Management</strong>
    </div>

        <!-- Title + Actions -->
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h2 class="fs-28 fw-bold mb-0">Item Management</h2>
            <div class="d-flex align-items-center gap-3">
                <span class="text-primary cursor-pointer" t-on-click="openExportModal"><ImageIcon icon="'upload'" /> Export</span>
                <span class="text-primary cursor-pointer" t-on-click="navigateToImportItem"><ImageIcon icon="'download'" /> Import</span>
                <span class="text-primary cursor-pointer" t-on-click="openPrintModal"><ImageIcon icon="'print'" /> Print Label</span>
                <span class="text-primary cursor-pointer" t-on-click="printBarcodes"> 
                  <ImageIcon icon="'print'" />
                 <t t-if="state.isBarcodePrinting"><i class="fa fa-spinner fa-spin"></i> Generating...</t>
                 <t t-else="">Print Barcode</t>
                </span>
                <div class="d-flex gap-2">
                  <button class="btn btn-outline-secondary btn-sm"  t-on-click="openBulkEditModal" ><i class="fa fa-edit me-1"></i> Bulk Edit</button>
                  <button class="btn btn-outline-secondary btn-md py-1" disabled="true"> Delete</button>
                  <button class="btn btn-primary btn-md py-1" t-on-click="navigateToAddItem"> Add Item</button>
                </div>
            </div>
        </div>

    <!-- Filter + Search -->
    <div class="d-flex align-items-center">
        <button class="btn btn-sm bg-200 px-3 py-2 text-1000 fs-5 me-3" t-on-click="toggleFilters">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                    <path d="M18.75 12.75h1.5a.75.75 0 0 0 0-1.5h-1.5a.75.75 0 0 0 0 1.5ZM12 6a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 12 6ZM12 18a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 12 18ZM3.75 6.75h1.5a.75.75 0 1 0 0-1.5h-1.5a.75.75 0 0 0 0 1.5ZM5.25 18.75h-1.5a.75.75 0 0 1 0-1.5h1.5a.75.75 0 0 1 0 1.5ZM3 12a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 3 12ZM9 3.75a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5ZM12.75 12a2.25 2.25 0 1 1 4.5 0 2.25 2.25 0 0 1-4.5 0ZM9 15.75a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5Z" />
                </svg> Filter
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
                    t-model="state.searchQuery"
                    t-on-input="onSearch"
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
        <div class="filter-overlay" t-on-click="toggleFilters" />
        <div class="row filter-content">
            <div class="col-md-4">
                <!-- Left sidebar with filter categories -->
                <div class="filter-sidebar card shadow-sm">
                    <div class="filter-options">
                        <t t-foreach="filters" t-as="filter" t-key="filter.id">
                            <div class="filter-item d-flex justify-content-between align-items-center p-3"
                                t-att-class="{'active': state.activeFilter === filter.id}"
                                t-on-click="selectFilter.bind(this, filter.id)">
                                <div class="d-flex align-items-center">
                                    <span class="text-gray-1000 fw-semibold"><t t-esc="filter.name"/></span>
                                    <t t-if="filter.id === 'brands' &amp;&amp; state.appliedFilters.brands.length > 0">
                                        <span class="ms-1 text-gray-1000 fw-semibold">(<t t-esc="state.appliedFilters.brands.length"/>)</span>
                                    </t>
                                    <t t-if="filter.id === 'price_range' &amp;&amp; formattedPriceRange">
                                    <span class="ms-1 text-gray-1000 fw-semibold"><t t-esc="formattedPriceRange"/></span>
                                    </t>
                                    <t t-if="filter.id === 'item_type' &amp;&amp; state.appliedFilters.itemTypes.length > 0">
                                        <span class="ms-1 text-gray-1000 fw-semibold">(<t t-esc="state.appliedFilters.itemTypes.length"/>)</span>
                                    </t>
                                    <t t-if="filter.id === 'item_unit' &amp;&amp; state.appliedFilters.itemUnits.length > 0">
                                        <span class="ms-1 text-gray-1000 fw-semibold">(<t t-esc="state.appliedFilters.itemUnits.length"/>)</span>
                                    </t>
                                    <t t-if="filter.id === 'item_category' &amp;&amp; state.appliedFilters.categories.length > 0">
                                        <span class="ms-1 text-gray-1000 fw-semibold">(<t t-esc="state.appliedFilters.categories.length"/>)</span>
                                    </t>
                                    <t t-if="filter.id === 'supplier' &amp;&amp; state.appliedFilters.suppliers.length > 0">
                                        <span class="ms-1 text-gray-1000 fw-semibold">(<t t-esc="state.appliedFilters.suppliers.length"/>)</span>
                                    </t>
                                    <t t-if="filter.id === 'tax_code' &amp;&amp; state.appliedFilters.taxCodes.length > 0">
                                        <span class="ms-1 text-gray-1000 fw-semibold">(<t t-esc="state.appliedFilters.taxCodes.length"/>)</span>
                                    </t>
                                </div>
                                <i class="fa fa-chevron-right text-muted"></i>
                            </div>
                        </t>
                    </div>

                    <div class="filter-actions d-flex p-3">
                        <button class="btn btn-outline-secondary flex-grow-1 me-2" t-on-click="saveFilter">Save Filter</button>
                        <button class="btn btn-primary flex-grow-1" t-on-click="getFilteredProducts">
                            Apply Filter<t t-if="totalAppliedFilters > 0">s (<t t-esc="totalAppliedFilters"/>)</t>
                        </button>
                    </div>
                </div>
            </div>

            <div class="col-md-4">
                <!-- Right side with filter options -->
                <div class="options-panel card shadow-sm" t-if="state.activeFilter === 'brands'">
                    <div class="options-list p-3">
                        <t t-foreach="state.brands" t-as="brand" t-key="brand.id">
                            <div class="form-check mb-2">
                                <input class="form-check-input" type="checkbox" t-att-id="brand.id" 
                                    t-att-checked="state.selectedBrands[brand.id]"
                                    t-on-change="toggleEntitySelection.bind(this, brand.id)"/>
                                <label class="form-check-label" t-att-for="brand.id">
                                    <t t-esc="brand.name"/>
                                </label>
                            </div>
                        </t>
                    </div>
                    
                    <div class="p-3">
                        <button class="btn btn-primary w-100" t-on-click="() => this.applyFilters()">Apply</button>
                    </div>
                </div>

                <div class="options-panel card shadow-sm" t-if="state.activeFilter === 'price_range'">
                    <div class="p-3">
                        <div class="d-flex align-items-center mb-3">
                            <input 
                                type="number" 
                                class="form-control" 
                                placeholder="0.00" 
                                t-model="state.priceRangeMinValue"
                                t-on-input="updateMinPriceRange"
                            />
                            <span class="mx-2">-</span>
                            <input 
                                type="number" 
                                class="form-control" 
                                placeholder="1000.00" 
                                t-model="state.priceRangeMaxValue"
                                t-on-input="updateMaxPriceRange"
                            />
                        </div>
                        
                        <div class="p-3">
                            <!-- Slider with two thumbs -->
                            <div class="position-relative mb-4 mt-2 price-slider-container">
                                <!-- Base track -->
                                <div class="price-range-base"></div>
                                  
                                <!-- Active track between thumbs -->
                                <div class="price-range-track" t-att-style="'left: ' + minPercentage + '%; width: ' + trackWidthPercentage + '%'"></div>
                                  
                                <!-- Min Tooltip -->
                                <div t-if="state.showMinTooltip" class="position-absolute min-tooltip bg-dark text-white px-2 py-1 rounded" style="top: -35px;">
                                    $<t t-esc="state.priceRange.min || state.rangeConstraints.min" />
                                </div>
                                  
                                <!-- Max Tooltip -->
                                <div t-if="state.showMaxTooltip" class="position-absolute max-tooltip bg-dark text-white px-2 py-1 rounded" style="top: -35px;">
                                    $<t t-esc="state.priceRange.max || state.rangeConstraints.max" />
                                </div>
                                  
                                <!-- Sliders -->
                                <input 
                                    t-ref="minSlider"
                                    type="range"
                                    class="form-range min-range"
                                    t-att-min="state.priceRangeMinValue ?? state.rangeConstraints.min"
                                    t-att-max="state.priceRangeMaxValue ?? state.rangeConstraints.max"
                                    step="10"
                                    t-att-value="minValue"
                                    t-on-input="updateMinPrice"
                                    t-on-mouseover="showMinTooltip"
                                    t-on-mouseout="hideMinTooltip"
                                    t-on-focus="showMinTooltip"
                                    t-on-blur="hideMinTooltip"
                                />
                                <input 
                                t-ref="maxSlider"
                                    type="range"
                                    class="form-range max-range"
                                    t-att-min="state.priceRangeMinValue ?? state.rangeConstraints.min"
                                    t-att-max="state.priceRangeMaxValue ?? state.rangeConstraints.max"
                                    step="10"
                                    t-att-value="maxValue"
                                    t-on-input="updateMaxPrice"
                                    t-on-mouseover="showMaxTooltip"
                                    t-on-mouseout="hideMaxTooltip"
                                    t-on-focus="showMaxTooltip"
                                    t-on-blur="hideMaxTooltip"
                                />
                            </div>
                        </div>
                    </div>
                    
                    <div class="p-3">
                        <button class="btn btn-primary w-100" t-on-click="() => this.applyFilters()">
                            Apply
                        </button>
                    </div>
                </div>

              <div class="options-panel card shadow-sm" t-if="state.activeFilter === 'saved_filters'">
                   <div t-if="state.userFilters.length &amp;&amp; !state.isFiltersLoading">
                   <button class="btn w-100 text-start px-3 py-2 fs-5 fw-500" t-on-click="openAddFilterModal">Add New Filter</button>
                   <hr class="my-0" />
    <div t-foreach="state.userFilters" t-as="filter" t-key="filter.id" class="d-flex flex-column justify-content-between align-items-center fs-5 fw-500">
        <!-- Add New Filter Button -->
        
        <div class="d-flex justify-content-between align-items-center px-3 py-2 w-100">
        <!-- Display Filter Name -->
        <span t-esc="filter.name"/>
        
        <!-- Remove Filter Button -->
        <button t-att-data-filter-id="filter.id" class="btn btn-link text-dark remove-filter p-0" t-on-click="() => deleteCustomFilter(filter.id)">
            <i class="fa fa-trash"/>
        </button>
</div> 
    </div>
</div>

<!-- No Data State -->
<div t-elif="!state.userFilters.length &amp;&amp; !state.isFiltersLoading">
  <div class="d-flex flex-column align-items-center p-5">
  <p class="text-center fs-5">No filters available. Please add a new filter.</p>
  <button class="btn btn-primary text-start px-3 py-2 fs-5 fw-500" t-on-click="openAddFilterModal">Add New Filter</button>
  </div>
</div>

<!-- Loading State -->
<div t-elif="state.isFiltersLoading">
    <p class="text-center fs-4 text-black">Loading filters...</p>
</div>
    </div>
    <div class="options-panel card shadow-sm" t-if="state.activeFilter === 'item_type'">
            <div class="options-list p-3">
                <t t-foreach="state.itemTypes" t-as="item_type" t-key="item_type.id">
                    <div class="form-check mb-2">
                        <input class="form-check-input" type="checkbox" t-att-id="item_type.id" 
                            t-att-checked="state.selectedItemTypes[item_type.id]"
                            t-on-change="toggleEntitySelection.bind(this, item_type.id)"/>
                        <label class="form-check-label" t-att-for="item_type.id">
                            <t t-esc="item_type.name"/>
                        </label>
                    </div>
                </t>
            </div>
            
            <div class="p-3">
                <button class="btn btn-primary w-100" t-on-click="() => this.applyFilters()">Apply</button>
            </div>
        </div>
    <div class="options-panel card shadow-sm" t-if="state.activeFilter === 'item_unit'">
            <div class="options-list p-3">
                <t t-foreach="state.itemUnits" t-as="item_unit" t-key="item_unit.id">
                    <div class="form-check mb-2">
                        <input class="form-check-input" type="checkbox" t-att-id="item_unit.id" 
                            t-att-checked="state.selectedItemUnits[item_unit.id]"
                            t-on-change="toggleEntitySelection.bind(this, item_unit.id)"/>
                        <label class="form-check-label" t-att-for="item_unit.id">
                            <t t-esc="item_unit.name"/>
                        </label>
                    </div>
                </t>
            </div>
            
            <div class="p-3">
                <button class="btn btn-primary w-100" t-on-click="() => this.applyFilters()">Apply</button>
            </div>
        </div>
    
        <div class="options-panel card shadow-sm" t-if="state.activeFilter === 'item_category'">
            <div class="options-list p-3">
                <t t-foreach="state.categories" t-as="category" t-key="category.id">
                    <div class="form-check mb-2">
                        <input class="form-check-input" type="checkbox" t-att-id="category.id" 
                            t-att-checked="state.selectedCategories[category.id]"
                            t-on-change="toggleEntitySelection.bind(this, category.id)"/>
                        <label class="form-check-label" t-att-for="category.id">
                            <t t-esc="category.name"/>
                        </label>
                    </div>
                </t>
            </div>
            
            <div class="p-3">
                <button class="btn btn-primary w-100" t-on-click="() => this.applyFilters()">Apply</button>
            </div>
        </div>
        
        <div class="options-panel card shadow-sm" t-if="state.activeFilter === 'supplier'">
            <div class="options-list p-3">
                <t t-foreach="state.suppliers" t-as="supplier" t-key="supplier.id">
                    <div class="form-check mb-2">
                        <input class="form-check-input" type="checkbox" t-att-id="supplier.id" 
                            t-att-checked="state.selectedSuppliers[supplier.id]"
                            t-on-change="toggleEntitySelection.bind(this, supplier.id)"/>
                        <label class="form-check-label" t-att-for="supplier.id">
                            <t t-esc="supplier.name"/>
                        </label>
                    </div>
                </t>
            </div>
            
            <div class="options-panel-footer p-3">
                <button class="btn btn-primary w-100" t-on-click="() => this.applyFilters()">Apply</button>
            </div>
        </div>

        <div class="options-panel card shadow-sm" t-if="state.activeFilter === 'tax_code'">
            <div class="options-list p-3">
                <t t-foreach="state.taxCodes" t-as="tax" t-key="tax.id">
                    <div class="form-check mb-2">
                        <input class="form-check-input" type="checkbox" t-att-id="tax.id" 
                            t-att-checked="state.selectedTaxCodes[tax.id]"
                            t-on-change="toggleEntitySelection.bind(this, tax.id)"/>
                        <label class="form-check-label" t-att-for="tax.id">
                            <t t-esc="tax.name"/>
                        </label>
                    </div>
                </t>
            </div>
            
            <div class="options-panel-footer p-3">
                <button class="btn btn-primary w-100" t-on-click="() => this.applyFilters()">Apply</button>
            </div>
        </div>

            </div>




            <!-- Other filter option panels can be added here -->
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
                    <th>
                 <label class="circular-checkbox filled-style">
                    <input 
                        type="checkbox"
                        name="select_all_items"
                        t-att-checked="state.items.length > 0 and state.selectedItems.length === state.items.length"
                        t-on-change="() => this.toggleSelectAll()" />
                   <span class="checkmark"></span>
                 </label>
                </th>
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
                <td>
                  <label class="circular-checkbox filled-style">
                    <input 
                      type="checkbox" 
                      name="select_item"
                      t-att-checked="state.selectedItems.findIndex(i => i.id === item.id) !== -1"
                      t-on-change="() => this.toggleItemSelection(item)" />
                    <span class="checkmark"></span>
                  </label>
                </td>
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
    <t t-if="state.showExportModal">
        <Export onClose="closeExportModal" items="state.selectedItems"/>
    </t>

  <!-- Add Filter Modal -->
    <div t-if="state.showAddFilterModal" class="modal fade show" 
        style="display: block; background-color: rgba(0,0,0,0.5);" 
        tabindex="-1" aria-modal="true" role="dialog">
        <div class="modal-dialog modal-dialog-centered" role="document">
            <div class="modal-content">
                <div class="d-flex align-items-center mb-3 px-4 pt-4">
                    <button type="button" class="btn btn-link text-primary p-0 me-3" t-on-click="closeAddFilterModal" aria-label="Close">
                        <i class="fa fa-times" style="font-size: 24px; color: #0d6efd;"></i>
                    </button>
                    <h5 class="modal-title fs-4 m-0 modal-heading">Save Filter</h5>
                </div>

                <div class="modal-body px-4">
                    <!-- Filter Name - Required field -->
                    <div class="mb-3">
                        <input 
                            type="text" 
                            class="form-control" 
                            id="filterName" 
                            placeholder="Name" 
                            t-att-value="state.customFilterName"
                            t-on-input="(e) => this.handleAddInputChange(e)"
                            required="required"
                        />
                    </div>

                </div>

                <div class="modal-footer border-0 px-4 py-3">
                    <div class="d-flex w-100">
                        <button type="button" class="btn btn-light flex-fill me-2 py-2" 
                            style="background-color: #f2f2f2;" t-on-click="closeAddFilterModal">Cancel</button>
                        <button 
                            type="button" 
                            class="btn btn-primary flex-fill py-2" 
                            t-on-click="addCustomFilter" 
                            t-att-disabled="state.isCreating || !state.customFilterName"
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

    <t t-if="state.showPrintModal">
        <LabelPrint onClose="closePrintModal" items="state.selectedItems"/>
    </t>

  <t t-if="state.showBulkEditModal">
        <BulkEdit onClose="closeBulkEditModal" items="state.selectedItems"/>
    </t>

</div>
  `;
}

// document.head.appendChild(style);

document.addEventListener("DOMContentLoaded", () => {
  const el = document.getElementById("item_list-container");
  console.log("🎯 Mount target:", el);
  if (el) {
    console.log("🚀 Mounting OWL App...");
    const app = new App(ItemList);
    app.mount(el);
  }
});