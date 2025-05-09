/** @odoo-module **/
import { Component, useState, onMounted } from "@odoo/owl";
import { xml } from "@odoo/owl";
import { App } from "@odoo/owl";
import { Sidebar } from "./sidebar";
import { ItemList } from "../Item/item_list";
import { CategoryList } from "../Category/category_list";
import { AddItem } from "../Item/add_item";
import { ImportItem } from "../Item/import_item";
import { CategoryAdd } from "../Category/category_add";
import { WarehouseList } from "../Warehouse/warehouse_list";
import { Settings } from "../Settings/settings";
import { TaxConfiguration } from "../Tax/tax_configuration";
import { ItemConfiguration } from "../ItemConfiguration/item_configuration";

console.log("✅ Main Layout JS Loaded");

export class MainLayout extends Component {
  setup() {
    this.state = useState({
      currentRoute: window.location.pathname,
      params: new URLSearchParams(window.location.search),
      sidebarExpanded: true,
    });

    this.navigateTo = this.navigateTo.bind(this);
    this.handleSidebarToggle = this.handleSidebarToggle.bind(this);

    onMounted(() => {
      window.addEventListener("popstate", () => {
        this.updateRoute();
      });
    });
  }

  updateRoute() {
    this.state.currentRoute = window.location.pathname;
    this.state.params = new URLSearchParams(window.location.search);
  }

  navigateTo(path, event) {
    if (event) {
      event.preventDefault();
    }
    window.history.pushState({}, "", path);
    this.updateRoute();
  }

  handleSidebarToggle(expanded) {
    // This now receives the expanded state directly
    this.state.sidebarExpanded = expanded;
  }

  get currentView() {
    const route = this.state.currentRoute;
    if (route.includes("/add_item")) {
      return "add_item";
    } else if (route.includes("/category/new")) {
      return "category_add";
    } else if (route.includes("/category_list")) {
      return "category";
    } else if (route.includes("/warehouse")) {
      return "warehouse";
    } else if (route.includes("/settings")) {
      return "settings";
    } else if (route.includes("/tax_configuration")) {
      return "tax_configuration";
    } else if (route.includes("/item_configuration")) {
      return "item_configuration";
    } else if (route.includes("/item_list") || route === "/") {
      return "item";
    } else if (route.includes("/import_item")) {
      return "import_item";
    }
    return "item";
  }

  get activeMenu() {
    const route = this.state.currentRoute;
    if (
      route.includes("/item_list") ||
      route.includes("/add_item") ||
      route.includes("/import_item")
    ) {
      return "items";
    } else if (
      route.includes("/category_list") ||
      route.includes("/category/new")
    ) {
      return "items";
    } else if (route.includes("/inventory")) {
      return "inventory";
    } else if (
      route.includes("/warehouse") ||
      route.includes("/tax_configuration") ||
      route.includes("/item_configuration") ||
      route.includes("/settings")
    ) {
      return "settings";
    }
    return "home";
  }

  get activeSubmenu() {
    const route = this.state.currentRoute;
    if (route.includes("/category_list") || route.includes("/category/new")) {
      return "category_management";
    } else if (
      route.includes("/item_list") ||
      route.includes("/add_item") ||
      route.includes("/import_item")
    ) {
      return "item_management";
    } else if (route.includes("/warehouse")) {
      return "warehouse_management";
    } else if (route.includes("/tax_configuration")) {
      return "tax_configuration";
    } else if (route.includes('/item_configuration')) {
      return 'item_configuration';
    }
    return "";
  }

  static components = {
    Sidebar,
    ItemList,
    CategoryList,
    AddItem,
    ImportItem,
    CategoryAdd,
    WarehouseList,
    Settings,
    TaxConfiguration,
    ItemConfiguration
  };

  static template = xml`
    <div class="d-flex">
      <Sidebar 
        activeMenu="activeMenu"
        activeSubmenu="activeSubmenu"
        onNavigate="navigateTo"
        onSidebarToggle="handleSidebarToggle"
      />
      <div class="flex-grow-1" style="transition: margin-left 0.3s;" t-att-style="'margin-left: ' + (state.sidebarExpanded ? '240px' : '80px') + ';'">
        <ItemList t-if="currentView === 'item'" onNavigate="navigateTo" />
        <CategoryList t-if="currentView === 'category'" onNavigate="navigateTo" />
        <AddItem t-if="currentView === 'add_item'" onNavigate="navigateTo" />
        <ImportItem t-if="currentView === 'import_item'" onNavigate="navigateTo" />
        <CategoryAdd t-if="currentView === 'category_add'" onNavigate="navigateTo" />
        <WarehouseList t-if="currentView === 'warehouse'" onNavigate="navigateTo" />
        <Settings t-if="currentView === 'settings'" onNavigate="navigateTo" />
        <TaxConfiguration t-if="currentView === 'tax_configuration'" onNavigate="navigateTo" />
        <ItemConfiguration t-if="currentView === 'item_configuration'" onNavigate="navigateTo" />
      </div>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", async () => {
  const el = document.getElementById("app-container");
  
  if (!el) return;
  
  try {
    const app = new App(MainLayout);
    await app.mount(el);
    
    const mainLayoutInstance = app.__owl__?.root?.component;
    if (!mainLayoutInstance) return;
    
    document.addEventListener("click", (event) => {
      const anchor = event.target.closest("a");
      if (!anchor || !anchor.href) return;
      
      if (anchor.href.startsWith(window.location.origin)) {
        event.preventDefault();
        
        if (typeof mainLayoutInstance.navigateTo === "function") {
          mainLayoutInstance.navigateTo(
            anchor.pathname + anchor.search + anchor.hash,
            event
          );
        } else {
          window.location.href = anchor.href;
        }
      }
    });
  } catch (error) {
    console.error("Init failed:", error);
  }
});
