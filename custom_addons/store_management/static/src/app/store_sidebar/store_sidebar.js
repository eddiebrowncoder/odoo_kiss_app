/** @odoo-module **/
import { Component, useState, xml } from "@odoo/owl";
import { ImageIcon } from "../components/ImageIcon";

export class StoreSidebar extends Component {
    setup() {
        this.state = useState({
            activeMenu: 'checkout'
        });

        this.menuItems = [
            { id: 'checkout', name: 'Checkout' },
            { id: 'transaction', name: 'Transaction' },
            { id: 'customer', name: 'Customer' },
            { id: 'store_credit', name: 'Store Credit/ Gift Card' },
            { id: 'notification', name: 'Notification' },
            { id: 'profile', name: 'Profile' },
            { id: 'more', name: 'More' },
            { id: 'time_clock', name: 'Time Clock' }
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

    static components = { ImageIcon };

    static template = xml`
        <div class="d-flex flex-column bg-white my-2" style="width: 152px;">

            <div class="d-flex flex-column align-items-center">
                <t t-foreach="menuItems" t-as="item" t-key="item.id">
                    <div class="d-flex flex-column align-items-center">
                        <button 
                            t-on-click="() => this.handleMenuClick(item.id)" 
                            t-attf-class="btn px-2 {{state.activeMenu === item.id ? 'bg-primary text-white' : 'bg-transparent text-secondary'}} d-flex flex-column align-items-center justify-content-center"
                            style="width: 100px;">
                            <ImageIcon name="item.id" />
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