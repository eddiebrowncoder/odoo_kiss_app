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
        this.priceMethod = useState({ value: '' }); // set | increase | decrease
        this.unitType = useState({ value: '%' });   // % | ₹
        this.items = useState([]);

    }

    SelectedItem() {
        console.log('Selected Field:', this.selectedField.value, this.props.items);
        console.log('New Value:', this.newValue.value);

        if (this.selectedField.value && this.newValue.value) {
            this.isPreview.value = true;
            this.modalSize.width = '850px';
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

    const selectedField = this.selectedField.value;
    const isPriceUpdate = selectedField === 'price';
    const isItemNameUpdate = selectedField === 'item';

    const numericFields = ['price', 'cost', 'msrp', 'on_hand', 'in_transit', 'reorder_point', 'restock_level', 'min_order_qty'];
    const many2oneFields = ['vendor1_id', 'vendor2_id', 'categ_id'];

    for (const item of this.props.items) {
        let productId = item.id;
        let product = null;
        const fieldsToRead = ['id'];

        if (isPriceUpdate) fieldsToRead.push('list_price');

        if (!productId) {
            const products = await rpc('/web/dataset/call_kw', {
                model: 'product.template',
                method: 'search_read',
                args: [[['name', '=', item.name]]],
                kwargs: { fields: fieldsToRead },
            });
            if (products.length > 0) {
                product = products[0];
                productId = product.id;
            } else {
                console.warn(`Product not found for name: ${item.name}`);
                continue;
            }
        } else {
            const products = await rpc('/web/dataset/call_kw', {
                model: 'product.template',
                method: 'read',
                args: [[productId]],
                kwargs: { fields: fieldsToRead },
            });
            product = products[0];
        }

        const fieldMap = {
            item: 'name',
            status: 'item_status',
            cost: 'standard_price',
            msrp: 'msrp',
            brand: 'brand',
            size: 'size',
            dimension: 'dimension',
            item_unit: 'item_unit',
            packaging_type: 'packaging_type',
            srs_category: 'srs_category',
            color_name: 'color_name',
            on_hand: 'on_hand',
            inventory_tracking: 'inventory_tracking',
            in_transit: 'in_transit',
            reorder_point: 'reorder_point',
            restock_level: 'restock_level',
            min_order_qty: 'min_order_qty',
            age_restriction: 'age_restriction',
            use_ebt: 'use_ebt',
            vendor1_id: 'vendor1_id',
            vendor2_id: 'vendor2_id',
            categ_id: 'categ_id',
            item_type: 'item_type',
            weight: 'weight',
            volume: 'volume',
        };

        const fieldToUpdate = {};

        if (isPriceUpdate) {
            const inputValue = parseFloat(this.newValue.value);
            const currentPrice = parseFloat(product.list_price || 0);
            if (this.priceMethod.value === 'set') {
                fieldToUpdate['list_price'] = inputValue;
            } else if (this.priceMethod.value === 'increase') {
                fieldToUpdate['list_price'] =
                    this.unitType.value === '%' ?
                        currentPrice + (currentPrice * inputValue / 100) :
                        currentPrice + inputValue;
            } else if (this.priceMethod.value === 'decrease') {
                fieldToUpdate['list_price'] =
                    this.unitType.value === '%' ?
                        currentPrice - (currentPrice * inputValue / 100) :
                        currentPrice - inputValue;
            }
        } else if (isItemNameUpdate) {
            fieldToUpdate['name'] = this.newValue.value;
        } else {
            const fieldName = fieldMap[selectedField];
            if (fieldName) {
                let value;
                if (numericFields.includes(selectedField)) {
                    value = parseFloat(this.newValue.value);
                } else if (many2oneFields.includes(selectedField)) {
                    const inputName = this.newValue.value.trim();

                    if (selectedField === 'categ_id') {
                        const existingCategory = await rpc('/web/dataset/call_kw', {
                            model: 'product.category',
                            method: 'search_read',
                            args: [[['name', '=', inputName]]],
                            kwargs: { fields: ['id'], limit: 1 },
                        });

                        let categoryId;
                        if (existingCategory.length > 0) {
                            categoryId = existingCategory[0].id;
                        } else {
                            categoryId = await rpc('/web/dataset/call_kw', {
                                model: 'product.category',
                                method: 'create',
                                args: [{ name: inputName }],
                                kwargs: {},
                            });
                            console.log(`Created new category "${inputName}" with ID ${categoryId}`);
                        }

                        value = categoryId;
                    } else {
                        const existingVendor = await rpc('/web/dataset/call_kw', {
                            model: 'res.partner',
                            method: 'search_read',
                            args: [[['name', '=', inputName]]],
                            kwargs: { fields: ['id'], limit: 1 },
                        });

                        let vendorId;
                        if (existingVendor.length > 0) {
                            vendorId = existingVendor[0].id;
                        } else {
                            vendorId = await rpc('/web/dataset/call_kw', {
                                model: 'res.partner',
                                method: 'create',
                                args: [{
                                    name: inputName,
                                    supplier_rank: 1,
                                }],
                                kwargs: {},
                            });
                            console.log(` Created new vendor "${inputName}" with ID ${vendorId}`);
                        }

                        value = vendorId;
                    }
                } else {
                    value = this.newValue.value;
                }
                fieldToUpdate[fieldName] = value;
            } else {
                console.warn(` No field mapping found for "${selectedField}"`);
            }
        }

        if (Object.keys(fieldToUpdate).length > 0) {
            console.log(` Updating product ${productId} with:`, fieldToUpdate);
            await rpc('/web/dataset/call_kw', {
                model: 'product.template',
                method: 'write',
                args: [[productId], fieldToUpdate],
                kwargs: {},
            });
        }
    }

    const res = await fetch("/api/item_list");
    const result = await res.json();
    console.log("📦 Fetched updated item list:", result);

    this.closeModal();
}






       closeModal() {
        this.props.onClose?.();
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
                        <select t-model="selectedField.value" class="form-select"   style="font-size: 15px;">

                                <option value="">Field to Modify</option>
                                <option value="item">Item</option>
                                <option value="price">Selling Price</option>
                                <option value="cost">Cost </option>
                                <option value="Sku">SKU </option>
                                <option value="msrp">Msrp </option>
                                <option value="status">Status </option>
                                <option value="company_id">Company </option>
                                <option value="parent_company_id">Parent Company </option>
                                <option value="brand">Brand </option>
                                <option value="age_restriction">Age Restriction </option>
                                <option value="use_ebt">Use Ebt </option>
                                <option value="categ_id">Category </option>
                                <option value="volume">Volume </option>
                                <option value="weight">Weight </option>
                                <option value="vendor1_id">Vendor1 </option>
                                <option value="vendor2_id">Vendor2 </option>
                                <option value="item_type">Item Type </option>
                                <option value="item_unit">Item Unit </option>
                                <option value="packaging_type">Packaging Type </option>
                                <option value="srs_category">Srs Category </option>
                                <option value="in_transit">In Transit </option>
                                <option value="reorder_point">Reorder Point </option>
                                <option value="restock_level">Restock Level </option>
                                <option value="min_order_qty">Min Order Qty </option>
                                <option value="color">Color </option>
                                <option value="size">Size </option>
                                <option value="dimension">Dimension </option>
                                <option value="on_hand">Dimension </option>
                                <option value="inventory_tracking">Inventory Tracking </option>
                            </select>

                            <t t-if="selectedField.value === 'price'">
                              <div class="d-flex flex-column gap-3">
                             <div style="font-size: 15px;">Select Method:</div>

                <div class="method-option" t-att-class="{'active': priceMethod.value === 'set'}">
                    <input class="form-check-input" type="radio" id="set" name="priceMethod"
                           t-model="priceMethod.value" value="set"/>
                    <label class="form-check-label" style="font-size: 15px;" for="set">Set New Value</label>
                </div>

                <div class="method-option" t-att-class="{'active': priceMethod.value === 'increase'}">
                    <input class="form-check-input" type="radio" id="increase" name="priceMethod"
                           t-model="priceMethod.value" value="increase"/>
                    <label class="form-check-label" style="font-size: 15px;" for="increase">Increase By</label>
                </div>

                <div class="method-option" t-att-class="{'active': priceMethod.value === 'decrease'}">
                    <input class="form-check-input" type="radio" id="decrease" name="priceMethod"
                           t-model="priceMethod.value" value="decrease"/>
                    <label class="form-check-label" style="font-size: 15px;" for="decrease">Decrease By</label>
                </div>

                <div class="input-wrapper">
                  <t t-if="priceMethod.value === 'increase' or priceMethod.value === 'decrease'">
                    <select class="form-select" t-model="unitType.value" style="text-align: center;font-size: 15px;">
                      <option value="%">%</option>
                      <option value="$">$</option>
                    </select>
                  </t>

                  <input type="number" style="text-align: right;font-size: 15px;"
                         id="increase_price"
                         t-model="newValue.value"
                         placeholder="0.00"
                         step="0.01"
                         t-attf-class="#{ priceMethod.value === 'set' ? 'form-control full-width' : 'form-control' }" />
                </div>
                              </div>
                            </t>

                            <t t-if="selectedField.value !== 'price'">
                            <input type="text" t-model="newValue.value" class="form-control" placeholder="New Value"/>
                            </t>

                        </div>
                    </t>


                <t t-else="">
             <div class="alert alert-warning d-flex align-items-center gap-3" role="alert">
                <i class="fa fa-exclamation-triangle" style="color: black; font-size: 24px;"></i>
                <div class="d-flex flex-column">
                    <p class="mb-1"><strong>Please review the changes below before applying them</strong></p>
                    <p class="mb-1"><t t-esc="props.items.length"/> Items</p>
                    <p class="mb-1">Field to Change: <strong><t t-esc="selectedField.value"/></strong></p>
                    <p class="mb-0">New Value: <strong><t t-esc="newValue.value"/></strong></p>
                </div>
            </div>

                        <table class="table table-hover">
                            <thead>
                                <tr>
                                <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" rel="stylesheet"/>

                                    <th>BARCODE
                                    <i class="bi bi-arrow-up"></i>
                                    <i class="bi bi-arrow-down"></i>
                                    </th>
                                    <th>SKU
                                     <i class="bi bi-arrow-up"></i>
                                     <i class="bi bi-arrow-down"></i>
                                    </th>
                                    <th>ITEM
                                     <i class="bi bi-arrow-up"></i>
                                     <i class="bi bi-arrow-down"></i>
                                    </th>


                                    <th>REVISED ITEM
                                     <i class="bi bi-arrow-up"></i>
                                    <i class="bi bi-arrow-down"></i>
                                    </th>
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
                <div class="d-flex justify-content-center gap-4 w-100">
                    <button type="button" class="btn btn-light w-25 me-5" t-on-click="closeModal">Close</button>

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


const style = document.createElement("style");
style.textContent = `

.method-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid transparent;
  transition: background-color 0.3s ease, border-color 0.3s ease, font-weight 0.2s ease;
  cursor: pointer;
  user-select: none;
}

.method-option:hover {
  background-color: #f2f7ff;
}

.method-option.active {
  background-color: #e6f0ff;
  font-weight: 500;
  border-color: #007bff;
}

.method-option:hover .form-check-label {
  color: #007bff;
}



  .form-check-label {
    margin: 0;
    cursor: pointer;
  }

.input-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  margin-top: 8px;
}

.form-select {
  flex: 0 0 15%;
  padding: 8px 10px;
  font-size: 14px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
}

.form-control {
  flex: 1;
  padding: 8px 10px;
  font-size: 14px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
}

.form-control.full-width {
  flex: 1 1 100%;
}

.form-select.hide {
  display: none;
}

  select.form-select option {
        padding: 4px 8px;
        font-size: 14px;
        line-height: 1.2;
    }



`;
document.head.appendChild(style);

