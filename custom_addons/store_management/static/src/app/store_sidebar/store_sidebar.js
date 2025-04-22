/** @odoo-module **/
import { Component, useState, xml } from "@odoo/owl";

export class StoreSidebar extends Component {
    setup() {
        this.state = useState({
            activeMenu: 'checkout'
        });

        this.menuItems = [
            { id: 'checkout', name: 'Checkout', icon: 'fa-shopping-cart' },
            { id: 'transaction', name: 'Transaction', icon: 'fa-exchange' },
            { id: 'customer', name: 'Customer', icon: 'fa-user' },
            { id: 'store_credit', name: 'Store Credit/Gift Card', icon: 'fa-credit-card' },
            { id: 'notification', name: 'Notification', icon: 'fa-bell' },
            { id: 'profile', name: 'Profile', icon: 'fa-user-circle' },
            { id: 'more', name: 'More', icon: 'fa-ellipsis-h' },
            { id: 'time_clock', name: 'Time Clock', icon: 'fa-clock' }
        ];
    }

    handleMenuClick(menuId) {
        if (this.state) {
            console.log(`Menu clicked: ${menuId}`);
            this.state.activeMenu = menuId;
        } else {
            console.error('State is not initialized');
        }
    }

    static template = xml`
        <div class="d-flex flex-column bg-white my-2" style="width: 152px; height: 100vh;">

            <div class="d-flex flex-column align-items-center">
                <t t-foreach="menuItems" t-as="item" t-key="item.id">
                    <div class="d-flex flex-column align-items-center">
                        <button 
                            t-on-click="() => this.handleMenuClick(item.id)" 
                            t-attf-class="btn {{state.activeMenu === item.id ? 'bg-primary text-white' : 'bg-transparent text-secondary'}} d-flex flex-column align-items-center justify-content-center"
                            style="padding: 10px 20px;">
                            <i t-attf-class="fa {{item.icon}} fs-5"></i>
                            <span class="small mt-1" style="font-size: 0.7rem;"><t t-esc="item.name"/></span>
                        </button>
                    </div>
                </t>
            </div>

            <div class="mt-auto mb-3 d-flex justify-content-center">
                <div class="rounded bg-light d-flex align-items-center justify-content-center" style="width: 60px; height: 60px;">
                    <span class="text-secondary">logo</span>
                </div>
            </div>
        </div>
    `;
}