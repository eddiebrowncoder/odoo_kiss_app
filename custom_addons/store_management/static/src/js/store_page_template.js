/** @odoo-module **/
import { Component, xml, App } from "@odoo/owl";
import { MainScreen } from "../app/main_screen";
import { StoreSidebar } from "../app/store_sidebar/store_sidebar";
import { StoreHeader } from '../app/store_header/store_header.js';

class StorePageTemplate extends Component {
    setup() { }

    static components = { MainScreen, StoreSidebar, StoreHeader };

    static template = xml`
        <div class="store-page-container d-flex">
            <StoreSidebar />
            <div class="main-screen-container flex-grow-1 p-3 pt-2 bg-light">
                <StoreHeader />
                <MainScreen />
            </div>
        </div>
    `;
}

document.addEventListener("DOMContentLoaded", function () {
    const container = document.getElementById('pos-order-screen-container');
    if (container) {
        const app = new App(StorePageTemplate);  // Initializing the OWL App
        app.mount(container);  // Mount the app in the DOM container
    }
});
