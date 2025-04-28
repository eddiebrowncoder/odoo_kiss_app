/** @odoo-module **/
import { Component, useState } from "@odoo/owl";
import { xml } from "@odoo/owl";
import { ImageIcon } from "./ImageIcon";

// Sidebar Component with toggle functionality
export class Sidebar extends Component {
  setup() {
    // State to track expanded/collapsed state and opened submenus
    this.state = useState({
      expanded: true, // Default to expanded (as shown in screenshot)
      openedMenus: {} // Track which menus are open
    });
    
    // Menu items configuration with improvements to match the screenshot
    this.menuItems = [
      {
        id: "home",
        label: "Home",
        href: "/",
        submenu: []
      },
      {
        id: "items",
        label: "Items",
        href: "/item_list",
        submenu: [
          { id: "item_management", label: "Item Management", href: "/item_list" },
          { id: "category_management", label: "Category Management", href: "/category_list" }
        ]
      },
      {
        id: "inventory",
        label: "Inventory",
        href: "/inventory",
        submenu: []
      },
      {
        id: "purchase",
        label: "Purchase",
        href: "/purchase",
        submenu: []
      },
      {
        id: "sales",
        label: "Sales & Transaction",
        href: "/sales",
        submenu: []
      },
      {
        id: "customer",
        label: "Customer & Loyalty",
        href: "/customers",
        submenu: []
      },
      {
        id: "employee",
        label: "Employee",
        href: "/employees",
        submenu: []
      },
      {
        id: "store",
        label: "Store Credit/Gift Card",
        href: "/store_credit",
        submenu: [],
        hasChevron: true
      },
      {
        id: "settings",
        label: "Settings",
        href: "/warehouse",
        submenu: [
          // { id: "warehouse_management", label: "Warehouse Management", href: "/warehouse" },
        ]
      }
    ];
    
    // Auto-open the active menu
    if (this.props.activeMenu) {
      this.state.openedMenus[this.props.activeMenu] = true;
    }
    
    // Bind the methods to maintain 'this' context
    this.toggleSubmenu = this.toggleSubmenu.bind(this);
    this.handleItemClick = this.handleItemClick.bind(this);
    this.handleSubmenuClick = this.handleSubmenuClick.bind(this);
  }

  // Toggle the sidebar expanded/collapsed state
  toggleSidebar() {
    this.state.expanded = !this.state.expanded;
    
    // Call the passed function to notify the parent about the changed state
    if (this.props.onSidebarToggle) {
      this.props.onSidebarToggle(this.state.expanded);
    }
  }

  // Toggle submenu open/closed state
  toggleSubmenu(menuId, event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!this.state.expanded) {
      return; // Don't toggle when collapsed
    }

    // Toggle the menu open/closed state
    this.state.openedMenus[menuId] = !this.state.openedMenus[menuId];
  }

  // Handle item click based on expanded state and menu type
  handleItemClick(item, event) {
    if (!this.state.expanded) {
      if (item.submenu && item.submenu.length > 0) {
        if (item.submenu[0].href) {
          if (this.props.onNavigate) {
            this.props.onNavigate(item.submenu[0].href, event);
          } else {
            window.location.href = item.submenu[0].href;
          }
        }
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (item.href) {
        if (this.props.onNavigate) {
          this.props.onNavigate(item.href, event);
        } else {
          window.location.href = item.href;
        }
        event.preventDefault();
      }
      return;
    } else {
      if (item.submenu && item.submenu.length > 0) {
        this.toggleSubmenu(item.id, event);
      } else if (item.href) {
        if (this.props.onNavigate) {
          this.props.onNavigate(item.href, event);
        } else {
          window.location.href = item.href;
        }
        event.preventDefault();
      }
    }
  }

  handleSubmenuClick(href, event) {
    if (event) {
      event.preventDefault();
    }

    if (href) {
      if (this.props.onNavigate) {
        this.props.onNavigate(href, event);
      } else {
        window.location.href = href;
      }
    }
  }

  isActive(menuId) {
    return this.props.activeMenu === menuId;
  }

  isSubmenuActive(subItemId) {
    return this.props.activeSubmenu === subItemId;
  }

  isMenuOpen(menuId) {
    return !!this.state.openedMenus[menuId];
  }

  showSubmenuChevron(item) {
    return item.submenu.length > 0 && this.state.expanded;
  }

  showRightChevron(item) {
    return item.hasChevron && this.state.expanded;
  }

  showSubmenu(item) {
    return item.submenu.length > 0 && this.isMenuOpen(item.id) && this.state.expanded;
  }

  hasToggleSubmenu(item) {
    return item.submenu && item.submenu.length > 0;
  }

  static props = {
    activeMenu: { type: String, optional: true, default: "home" },
    activeSubmenu: { type: String, optional: true, default: "" },
    onNavigate: { type: Function, optional: true },
    onSidebarToggle: { type: Function, optional: true }
  };

  static components = { ImageIcon };

  static template = xml`
    <div class="sidebar bg-white shadow-sm border-end fixed-top" t-att-style="'width: ' + (state.expanded ? '240px' : '80px') + '; height: 100vh; z-index: 1000; transition: width 0.3s; display: flex; flex-direction: column;'">
      <div class="sidebar-header border-bottom">
        <div class="d-flex align-items-center p-3">
          <div class="bg-secondary rounded d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
            <span class="text-white">S</span>
          </div>
          <div class="ms-3" t-if="state.expanded">
            <div class="fw-bold">Store Name</div>
            <div class="text-muted small">Description</div>
          </div>
          <button class="btn btn-sm text-muted ms-auto" t-on-click="toggleSidebar">
            <i t-att-class="state.expanded ? 'fa fa-chevron-left' : 'fa fa-chevron-right'"></i>
          </button>
        </div>
      </div>
      <div class="sidebar-nav py-2 hide-scrollbar" style="flex: 1; overflow-y: auto;">
        <ul class="nav flex-column">
          <t t-foreach="menuItems" t-as="item" t-key="item.id">
            <li class="nav-item">
              <a t-att-class="'nav-link d-flex mx-2' + (state.expanded ? '' : 'flex-column justify-content-center') + ' align-items-center py-2 ' + (isActive(item.id) ? 'active bg-primary text-white no-hover' : 'text-gray-700')"
                 t-att-href="item.href || '#'" t-on-click="(e) => handleItemClick(item, e)">
                <ImageIcon 
                  icon="item.id"
                  class="state.expanded ? 'me-2' : ''" 
                  style="!state.expanded ? 'font-size: 1.2rem;' : ''" />
                <span t-if="state.expanded" t-esc="item.label"></span>
                <t t-if="showSubmenuChevron(item)">
                  <svg t-if="!isMenuOpen(item.id)" class="ms-auto small" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                    <path fill-rule="evenodd" d="M12.53 16.28a.75.75 0 0 1-1.06 0l-7.5-7.5a.75.75 0 0 1 1.06-1.06L12 14.69l6.97-6.97a.75.75 0 1 1 1.06 1.06l-7.5 7.5Z" clip-rule="evenodd" />
                  </svg>
                  <svg t-else="1" class="ms-auto small" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                    <path fill-rule="evenodd" d="M11.47 7.72a.75.75 0 0 1 1.06 0l7.5 7.5a.75.75 0 1 1-1.06 1.06L12 9.31l-6.97 6.97a.75.75 0 0 1-1.06-1.06l7.5-7.5Z" clip-rule="evenodd" />
                  </svg>
                </t>
                <t t-elif="showRightChevron(item)">
                  <svg class="ms-auto small" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                    <path fill-rule="evenodd" d="M12.53 16.28a.75.75 0 0 1-1.06 0l-7.5-7.5a.75.75 0 0 1 1.06-1.06L12 14.69l6.97-6.97a.75.75 0 1 1 1.06 1.06l-7.5 7.5Z" clip-rule="evenodd" />
                  </svg>
                </t>
              </a>
              <t t-if="showSubmenu(item)">
                <ul class="nav flex-column ms-4 mt-1">
                  <t t-foreach="item.submenu" t-as="subItem" t-key="subItem.id">
                    <li class="nav-item">
                      <a t-att-class="'nav-link py-1 ' + (isSubmenuActive(subItem.id) ? 'text-primary fw-medium no-hover-blue' : 'text-body-secondary')"
                         t-att-href="subItem.href" t-on-click="(e) => handleSubmenuClick(subItem.href, e)">
                        <span t-esc="subItem.label"></span>
                      </a>
                    </li>
                  </t>
                </ul>
              </t>
            </li>
          </t>
        </ul>
      </div>
      <div class="sidebar-footer border-top">
        <div class="d-flex align-items-center p-3">
          <div class="bg-secondary rounded-circle d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
            <span class="text-white">F</span>
          </div>
          <div class="ms-3" t-if="state.expanded">
            <div class="fw-bold">First Last</div>
            <div class="text-muted small">Job Title</div>
          </div>
        </div>
      </div>
    </div>
  `;
}