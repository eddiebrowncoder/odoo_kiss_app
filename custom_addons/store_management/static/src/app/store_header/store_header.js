import { Component, useState, xml } from "@odoo/owl";

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

    static template = xml`
        <div class="px-2 pb-2 bg-light">
            <div class="row align-items-center">
                <div class="col-6 d-flex align-items-center">
                    <button t-on-click="handleDrawerClick" class="btn btn-md me-2">
                        <i class="fa fa-inbox me-1"></i> Drawer
                    </button>
                    <button t-on-click="handlePrintReceiptClick" class="btn btn-md me-2">
                        <i class="fa fa-print me-1"></i> Print Last Receipt
                    </button>
                    <button t-on-click="handleSyncClick" class="btn btn-md">
                        <i class="fa fa-cloud me-1"></i> Sync Cloud
                    </button>
                </div>
                <div class="col-6 d-flex justify-content-end align-items-center">
                    <div class="d-flex align-items-center">
                        <span class="rounded-pill bg-primary-light text-primary px-2 py-1 text-14-bold">
                            <i class="fa fa-check-circle me-1"></i>
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