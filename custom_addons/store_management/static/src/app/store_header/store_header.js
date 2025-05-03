import { Component, useState, xml } from "@odoo/owl";
import { ImageIcon } from "../components/ImageIcon";

export class StoreHeader extends Component {
    setup() {
        // Dynamic states for user name and settled time
        this.user = useState({ name: "Hyejin Ryoo" });
        this.settled_time = useState({ value: "3/12/25 12:00 PM" });
    }

    handleDrawerClick() {
        console.log("Drawer button clicked");
        // Add drawer functionality here
    }

    handlePrintReceiptClick() {
        console.log("Print Last Receipt button clicked");
        // Add print receipt functionality here
    }

    handleSyncClick() {
        console.log("Sync Cloud button clicked");
        // Add sync cloud functionality here
    }

    static components = { ImageIcon };

    static template = xml`
        <div class="px-2 pb-2 bg-light">
            <div class="row align-items-center">
                <div class="col-6 d-flex align-items-center">
                    <button t-on-click="handleDrawerClick" class="btn btn-md me-2">
                        <ImageIcon name="'drawer'" class="'me-1'" /> Drawer
                    </button>
                    <button t-on-click="handlePrintReceiptClick" class="btn btn-md me-2">
                        <ImageIcon name="'printer'" class="'me-1'" /> Print Last Receipt
                    </button>
                    <button t-on-click="handleSyncClick" class="btn btn-md">
                        <ImageIcon name="'download'" class="'me-1'" /> Sync Cloud
                    </button>
                </div>
                <div class="col-6 d-flex justify-content-end align-items-center">
                    <div class="d-flex align-items-center">
                        <span class="rounded-pill bg-primary-light text-primary px-2 py-1 text-14-bold">
                            <svg class="me-1" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 20 20" aria-hidden="true" height="20px" width="20px" xmlns="http://www.w3.org/2000/svg">
                                <path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                            </svg>
                            <span class="me-3"><t t-esc="user.name"/></span>
                        </span>
                        
                        <span class="rounded-pill bg-primary-light text-primary px-2 py-1 text-14-bold">
                            <i class="fa fa-database me-1"></i> Cashed In
                        </span>
                        
                        <span class="rounded-pill bg-primary-light text-primary px-2 py-1 text-14-bold">
                            <i class="fa fa-info-circle me-1"></i> Settled: <t t-esc="settled_time.value"/>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    `;
}