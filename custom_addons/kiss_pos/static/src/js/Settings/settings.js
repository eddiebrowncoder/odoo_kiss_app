/** @odoo-module **/
import { Component, useState, onMounted } from "@odoo/owl";
import { xml } from "@odoo/owl";
import { App } from "@odoo/owl";
import { rpc } from "@web/core/network/rpc";


console.log("Settings ✅ JS Loaded");
console.log("Checking updated code");

export class Settings extends Component {
    setup(){
        this.state = useState({
            data:""
        });
    }

    static template = xml/* xml */ `
    <div class="container-fluid px-4 py-3">
        <!-- Breadcrumb -->
            <nav aria-label="breadcrumb" class="mt-3 mb-4">
                <ol class="breadcrumb">
                    <li class="breadcrumb-item breadcrum-item-light"><a href="/home" class="text-secondary text-decoration-underline">Home</a></li>
                    <li class="breadcrumb-item breadcrum-item-dark" aria-current="page">Settings</li>
                </ol>
            </nav>
        <!-- Header -->
        <div class="mb-4">
            <div class="">
                <h2 class="fw-bold mb-4 page__heading">Settings</h2>
                <div class="settings__container border-top">
                <!-- Store Settings -->
                <div>
                    <div class="section-title">
                    <span><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
</svg>
</span>
                    <div>Store Settings</div></div>
                    <div class="row setting-item__wrapper">
                      <div class="setting-item border-bottom">
                        <div class="setting-title">Store Information</div>
                        <div class="setting-desc">Manage your store's basic details</div>
                      </div>
                      <div class="setting-item border-bottom">
                        <div class="setting-title">Tax Configuration</div>
                        <div class="setting-desc">Set up and customize tax rates</div>
                      </div>
                      <div class="setting-item border-bottom">
                        <div class="setting-title">Warehouse Management</div>
                        <div class="setting-desc">Organize and oversee inventory storage locations</div>
                      </div>
                      <div class="setting-item border-bottom">
                        <div class="setting-title">Item Configuration</div>
                        <div class="setting-desc">Add, edit, and organize your products or services</div>
                      </div>
                    </div>
                  </div>
                <!-- Transaction Settings -->
                <div>
                <div class="section-title">
                    <span><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
</svg>
</span>
                    <div>Transaction Settings</div></div>
                <div class="row setting-item__wrapper">
                  <div class="setting-item border-bottom">
                    <div class="setting-title">
                    Tender Types</div>
                    <div class="setting-desc">Define and manage accepted payment methods</div>
                  </div>
                  <div class="setting-item border-bottom">
                    <div class="setting-title">Cash Drawer</div>
                    <div class="setting-desc">Enable cash drawer to open for specific transaction types</div>
                  </div>
                  <div class="setting-item border-bottom">
                    <div class="setting-title">Store Credit/Gift Card Configuration</div>
                    <div class="setting-desc">Enable and configure store credit/gift card issuance</div>
                  </div>
                  <div class="setting-item border-bottom">
                    <div class="setting-title">Point Loyalty</div>
                    <div class="setting-desc">Review and process daily transaction summaries</div>
                  </div>
                  <div class="setting-item border-bottom">
                    <div class="setting-title">Offline Transactions</div>
                    <div class="setting-desc">Configure how transactions are handled when the POS is offline</div>
                  </div>
                  <div class="setting-item border-bottom">
                    <div class="setting-title">Preset Discounts</div>
                    <div class="setting-desc">Create and manage predefined discount rules</div>
                  </div>
                  <div class="setting-item border-bottom">
                    <div class="setting-title">Transaction Reasons</div>
                    <div class="setting-desc">Set custom reasons for returns, voids, exchanges, or manual price adjustments</div>
                  </div>
                  <div class="setting-item border-bottom">
                    <div class="setting-title">Settlement</div>
                    <div class="setting-desc">Review and process daily transaction summaries</div>
                  </div>
                </div>
              </div>
                <!-- Device and Software -->
                <div>
                <div class="section-title">
                    <span><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
</svg>
</span>
                    <div>Device and Software</div></div>
                <div class="row setting-item__wrapper">
                  <div class="setting-item border-bottom">
                    <div class="setting-title">Devices and Software Management</div>
                    <div class="setting-desc">Register and manage POS terminals and hardware</div>
                  </div>
                  <div class="setting-item border-bottom">
                    <div class="setting-title">Display Settings</div>
                    <div class="setting-desc">Adjust the appearance of the POS interface</div>
                  </div>
                </div>
              </div>
                <!-- Permission Settings -->
                <div>
                <div class="section-title">
                    <span><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
</svg>
</span>
                    <div>Permission Settings</div></div>
                <div class="row setting-item__wrapper">
                  <div class="setting-item border-bottom ">
                    <div class="setting-title">Permission Setup</div>
                    <div class="setting-desc">Define access controls by selecting specific actions users can perform</div>
                  </div>
                  <div class="setting-item border-bottom">
                    <div class="setting-title">Role Setup</div>
                    <div class="setting-desc">Create roles and assign permission groups</div>
                  </div>
                </div>
              </div>
</div>
            </div>
        </div>
    </div>`
}