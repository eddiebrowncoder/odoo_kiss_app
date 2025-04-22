/** @odoo-module **/
import { Component, xml, useRef, useState, App } from "@odoo/owl";
import { rpc } from "@web/core/network/rpc";

export class ImportItem extends Component {
    setup() {
        this.dropZone = useRef("dropZone");
        this.state = useState({ activeTab: "update" });
        this.uploadedData = [];
    }

    onUpdateClick() {
        this.state.activeTab = "update";
    }

    onAddClick() {
        this.state.activeTab = "add";
    }

    onClickUpload() {
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = ".csv, .xlsx";
        fileInput.onchange = (event) => {
            const file = event.target.files[0];
            this.handleFile(file);
        };
        fileInput.click();
    }

    onDragOver(ev) {
        ev.preventDefault();
        this.dropZone.el.classList.add("border-gray-500", "bg-gray-100");
    }

    onDragLeave(ev) {
        ev.preventDefault();
        this.dropZone.el.classList.remove("border-gray-500", "bg-gray-100");
    }

    onDrop(ev) {
        ev.preventDefault();
        this.dropZone.el.classList.remove("border-gray-500", "bg-gray-100");
        const file = ev.dataTransfer.files[0];
        this.handleFile(file);
    }

    onClickDownloadTemplate() {
        const headers = [
            'item_name', 'barcode', 'sku', 'selling_price','category', 'cost', 'msrp',
            'status', 'company', 'brand', 'on_hand','description',
        ];

        const csvContent = headers.join(',') + '\n';
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'item_template.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

handleFile(file) {
    if (file && file.name.endsWith(".csv")) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const rows = text.trim().split("\n");
            const headers = rows[0].split(",").map(h => h.trim());

            const requiredFields = ['item_name', 'sku', 'description', 'barcode', 'selling_price'];

            // Check if all required fields are present in the CSV header
            const missingFields = requiredFields.filter(field => !headers.includes(field));
            if (missingFields.length > 0) {
                alert(`Missing required columns: ${missingFields.join(", ")}`);
                return;
            }

            const data = rows.slice(1).map((row, index) => {
                const values = row.split(",").map(v => v.trim());
                const entry = {};
                headers.forEach((header, i) => {
                    entry[header] = values[i];
                });
                return entry;
            });

            // Validate required fields in each row
            const invalidRows = data.filter((item, index) => {
                return requiredFields.some(field => !item[field]);
            });

            if (invalidRows.length > 0) {
                alert("Some rows are missing required field values (item_name, sku, description, barcode, selling_price). Please check your file.");
                return;
            }

            this.uploadedData = data;

            console.log("-------- Uploaded Products Data --------");
            data.forEach((item, index) => {
                console.log(`Item ${index + 1}:`);
                headers.forEach(header => {
                    console.log(`  ${header}: ${item[header]}`);
                });
                console.log('----------------------------------------');
            });

            data.forEach(item => this.sendToAPI(item));
        };
        reader.readAsText(file);
    } else {
        alert("Please upload a valid CSV file.");
    }
}



    async sendToAPI(data) {
        try {
            const createProduct = await rpc('/web/dataset/call_kw', {
                model: 'product.template',
                method: 'create',
                args: [{
                    name: data.item_name,
                    default_code: data.sku,
                    barcode: data.barcode,
                    description: data.description,
                    list_price: parseFloat(data["selling_price"]),
                }],
                kwargs: {},
            });
            console.log("Product Template Created:", createProduct);
        } catch (error) {
            console.error("Error sending data to API:", error);
        }
    }

    static template = xml`

<div class="p-10 bg-white font-sans text-gray-800 rounded shadow-md mx-auto" style="width: 97%; height: 950px; border: 1px solid #ddd;">
<div class="text-muted mb-2" style="margin-top: 3rem; margin-left: 1rem; font-size: 15px;">
    Home / Item Management / <strong>Import Items</strong>
</div>



      <div class="mb-3" style="margin-left: 1rem; margin-top: 2rem;">
    <h2 class="text-3xl mb-6" style="font-weight: 900;">Import Items</h2>
</div>


        <!-- Tabs -->
        <ul class="nav nav-underline mb-4" style="margin-left: 1.1rem;margin-top: 2rem;font-size: 15px;">
            <li class="nav-item">
                <a class="nav-link" href="#" t-att-class="{ 'active': state.activeTab === 'update' }" t-on-click="onUpdateClick">Update Existing Item(s)</a>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="#" t-att-class="{ 'active': state.activeTab === 'add' }" t-on-click="onAddClick">Add New Item(s)</a>
            </li>
        </ul>

        <!-- Tab Content -->
        <section class="mb-8" style="margin-left: 1rem;" t-if="state.activeTab === 'update' || state.activeTab === 'add'">
            <h2 class="text-xl font-semibold mb-2" style="font-weight: 900;">Item Management Guidelines</h2>
            <p class="text-md mb-3 font-medium text-gray-900">
                <strong t-if="state.activeTab === 'update'" style="font-size: 16px;">Items with matching barcodes will be updated. If multiple items have the same barcode, all will be updated.</strong>
                <strong t-if="state.activeTab === 'add'" style="font-size: 16px;">New items will be added to the system. Items can have the same barcode if needed.</strong>
            </p>
            <ul class="list-disc list-inside text-black-700 space-y-1 text-sm" style="font-size: 15px;">
                <li>Barcode is used as the key identifier for items</li>
                <li>The system can handle items with the same barcode</li>
                <li>Required fields: Barcode, SKU, Description, Selling Price</li>
                <li>Use the template file above for the correct format</li>
            </ul>
        </section>

<div class="download-button-wrapper">
  <button t-on-click="onClickDownloadTemplate" class="download-button">
    <i class="fa fa-file mr-2"></i>Download Template File
  </button>
</div>



<!-- Dropzone Container -->
<div t-ref="dropZone"
     t-on-dragover="onDragOver"
     t-on-dragleave="onDragLeave"
     t-on-drop="onDrop"
     t-on-click="onClickUpload"
     class="import-dropzone mx-auto p-8 border-2 border-dashed border-gray-400 bg-gray-300 text-center rounded-xl cursor-pointer transition-all shadow-sm hover:bg-blue-100 hover:border-blue-1500" style="margin-left: 1rem; margin-top: 2rem;">
    <div class="flex flex-col items-center justify-center space-y-4">
        <div class="icon text-6xl text-gray-600 hover:text-blue-500 transition-colors">
            <i class="fas fa-cloud-upload-alt"></i>
        </div>
        <div class="icon text-6xl text-gray-600 hover:text-blue-500 transition-colors">
            <i class="fa fa-file mr-2"></i>
        </div>
        <p class="text-sm font-semibold" style="font-size:15px;font-weight:600">Drag and drop, or browse files</p>
        <p class="text-xs text-gray-500">Supports .CSV, .XLSX files</p>
        <p class="text-xs text-black-500">Browse files</p>
    </div>
</div>

        </div>



    `;
}

document.addEventListener("DOMContentLoaded", () => {
    const el = document.getElementById("import_list-container");
    if (el) {
        const app = new App(ImportItem);
        app.mount(el);
    }
});
