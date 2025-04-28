/** @odoo-module **/
import { Component, useState, xml } from "@odoo/owl";
import { rpc } from "@web/core/network/rpc";


export class BulkEdit extends Component {
    setup() {
        this.selectedField = useState({ value: '' });
        this.newValue = useState({ value: '' });
        this.isPreview = useState({ value: false });
        // Initial modal size
        this.modalSize = useState({ width: '500px', height: '320px' });
    }

    SelectedItem() {
        console.log('Selected Field:', this.selectedField.value, this.props.items);
        console.log('New Value:', this.newValue.value);

        if (this.selectedField.value && this.newValue.value) {
            this.isPreview.value = true;
            this.modalSize.width = '700px';
            this.modalSize.height = '500px';
        } else {
            alert("Please select a field and enter a new value!");
        }
    }

async ConfirmSave() {
    if (!this.selectedField.value || !this.newValue.value) {
        alert("Please select a field and enter a new value!");
        return;
    }

    for (const item of this.props.items) {
        let productId = item.id;

        if (!productId) {
            const products = await rpc('/web/dataset/call_kw', {
                model: 'product.template',
                method: 'search_read',
                args: [[['name', '=', item.name]]],
                kwargs: { fields: ['id'] },
            });

            if (products.length > 0) {
                productId = products[0].id;
            } else {
                console.warn(`Product not found for name: ${item.name}`);
                continue;
            }
        }

        const fieldToUpdate = {};

        if (this.selectedField.value === 'item') {
            fieldToUpdate['name'] = this.newValue.value;
        } else if (this.selectedField.value === 'price') {
            fieldToUpdate['list_price'] = parseFloat(this.newValue.value);
        }

        if (Object.keys(fieldToUpdate).length > 0) {
            await rpc('/web/dataset/call_kw', {
                model: 'product.template',  // <<<<<< Added model here also
                method: 'write',
                args: [[productId], fieldToUpdate],
                kwargs: {},
            });
        }
    }

    alert('Products updated successfully!');
    this.closeModal();
}




    closeModal() {
        this.props.onClose();
    }

    static template = xml`
    <div class="modal fade show d-block" style="background-color: rgba(0, 0, 0, 0.5);">
        <div class="modal-dialog modal-dialog-centered" style="max-width: t-esc='modalSize.width'">
            <div class="modal-content" style="height: t-esc='modalSize.height'">

                <!-- Header -->
                <div class="modal-header d-flex align-items-center px-3 pt-5 pb-2 border-0">
                    <button type="button" class="btn btn-link p-0 me-3" t-on-click="closeModal">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="text-primary" viewBox="0 0 16 16">
                            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                        </svg>
                    </button>
                    <h5 class="modal-title m-0">Bulk Edit</h5>
                </div>

                <!-- Body -->
                <div class="modal-body px-4 py-4">
                    <t t-if="!isPreview.value">
                        <!-- Step 1: Select field and new value -->
                        <div class="d-flex flex-column gap-3">
                            <select t-model="selectedField.value" class="form-select">
                                <option value="">Field to Modify</option>
                                <option value="item">Item</option>
                                <option value="price">Selling Price</option>
                            </select>
                            <input type="text" t-model="newValue.value" class="form-control" placeholder="New Value"/>
                        </div>
                    </t>

                    <t t-else="">
                        <!-- Step 2: Preview Changes -->
                        <div class="alert alert-warning" role="alert">
                            <p class="mb-1"><strong>Please review the changes below before applying them</strong></p>
                            <p class="mb-1">2 Items</p>
                            <p class="mb-1">Field to Change: <strong><t t-esc="selectedField.value"/></strong></p>
                            <p>New Value: <strong><t t-esc="newValue.value"/></strong></p>
                        </div>

                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>Barcode</th>
                                    <th>SKU</th>
                                    <th>Item</th>
                                    <th>Revised Item</th>
                                </tr>
                            </thead>
                            <tbody>
                                <t t-foreach="props.items" t-as="item" t-key="item.id">
                                    <tr>
                                        <td><t t-esc="item.barcode"/></td>
                                        <td><t t-esc="item.sku"/></td>
                                        <td><t t-esc="item.name"/></td>
                                        <td><t t-esc="newValue.value"/></td>
                                    </tr>
                                </t>
                            </tbody>
                        </table>
                    </t>
                </div>

                <!-- Footer -->

                <div class="modal-footer border-0 px-4 py-3">
                <div class="d-flex justify-content-center gap-2 w-100">
                    <button type="button" class="btn btn-light w-25" t-on-click="closeModal">Close</button>

                    <t t-if="!isPreview.value">
                        <button type="button" class="btn btn-primary w-25" t-on-click="SelectedItem">Next</button>
                    </t>

                    <t t-else="">
                        <button type="button" class="btn btn-primary w-25" t-on-click="ConfirmSave">Confirm</button>
                    </t>
                </div>
            </div>

            </div>
        </div>
    </div>
    `;
}
