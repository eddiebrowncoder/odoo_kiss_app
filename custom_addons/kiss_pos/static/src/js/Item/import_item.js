/** @odoo-module **/
import { Component, xml, useRef, useState, App } from "@odoo/owl";
import { rpc } from "@web/core/network/rpc";

export class ImportItem extends Component {
    setup() {
        this.dropZone = useRef("dropZone");
        this.state = useState({ activeTab: "update" });
        this.progressValue = useState({ value: 0 });
        this.progressBarClass = useState({ value: "progress-bar bg-blue-500" });
        this.uploadStatus = useRef("uploadStatus");
        this.uploadedData = useState({ data: [] });
        this.progressBar = useRef("progressBar");
        this.errorText = useState({ message: "No file uploaded yet." });
    }

setProgress(value, colorClass = "progress-bar bg-blue-500", statusText = "") {
    this.progressValue.value = value;
    this.progressBarClass.value = colorClass;

    if (this.uploadStatus.el) {
        this.uploadStatus.el.innerText = statusText;
    }

    if (value === 0 && !statusText) {
        this.errorText.message = "No file uploaded yet.";
    } else {
        this.errorText.message = statusText;
    }
}


    onUpdateClick() {
        this.state.activeTab = "update";
    }

    onAddClick() {
        this.state.activeTab = "add";
    }

    onClickUpload(ev) {
    if (ev && (ev.target.closest(".continue-button") || ev.target.closest(".different-file") || ev.target.closest(".tryagain-button"))) {
        return;
    }

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".csv, .xlsx";

    fileInput.onchange = (event) => {
        if (event && event.target) {
            const file = event.target.files[0];
            this.handleFile(file);
        } else {
            console.error("Error: The event target is not defined");
        }
    };

    fileInput.click();
}



    handleFile(file) {
        if (file && file.name.endsWith(".csv")) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target.result;
                const rows = text.trim().split("\n");
                const headers = rows[0].split(",").map(h => h.trim());

                const requiredFields = ['item_name', 'sku', 'description', 'barcode', 'selling_price'];
                const missingFields = requiredFields.filter(field => !headers.includes(field));
                if (missingFields.length > 0) {
                    this.setProgress(30, "progress-bar bg-red-500", `Upload Failed (Missing columns: ${missingFields.join(", ")})`);
                    return;
                }

                const data = rows.slice(1).map((row) => {
                    const values = row.split(",").map(v => v.trim());
                    const entry = {};
                    headers.forEach((header, i) => {
                        entry[header] = values[i];
                    });
                    return entry;
                });

                const invalidRows = data.filter(item =>
                    requiredFields.some(field => !item[field])
                );

                if (invalidRows.length > 0) {
                    this.setProgress(30, "progress-bar bg-red-500", "Upload Failed (Missing required data in rows)");
                    return;
                }

                this.uploadedData.data = data;
                this.uploadDataWithProgress(data);
            };
            reader.readAsText(file);
        } else {
            this.setProgress(30, "progress-bar bg-red-500", "Upload Failed (File Format Incorrect)");
        }
    }

    async uploadDataWithProgress(data) {
        const totalItems = data.length;
        let uploadedItems = 0;

        this.setProgress(0, "progress-bar bg-blue-500", `Uploading item 0 of ${totalItems}`);

        for (let i = 0; i < totalItems; i++) {
            const item = data[i];
            await this.sendToAPI(item);

            uploadedItems++;
            const progress = Math.floor((uploadedItems / totalItems) * 100);
            const isComplete = uploadedItems === totalItems;

            this.setProgress(
                progress,
                isComplete ? "progress-bar bg-green-500" : "progress-bar bg-blue-500",
                isComplete
                ? `${progress}%  Complete`
                : `Uploading item ${uploadedItems} of ${totalItems}`
            );
        }
    }

    async sendToAPI(data) {
        try {
            const existingProduct = await rpc('/web/dataset/call_kw', {
                model: 'product.template',
                method: 'search_read',
                args: [[['barcode', '=', data.barcode]], ['id']],
                kwargs: {},
            });

            if (existingProduct.length > 0) {
                const productId = existingProduct[0].id;
                await rpc('/web/dataset/call_kw', {
                    model: 'product.template',
                    method: 'write',
                    args: [[productId], {
                        name: data.item_name,
                        default_code: data.sku,
                        barcode: data.barcode,
                        description: data.description,
                        list_price: parseFloat(data["selling_price"]),
                    }],
                    kwargs: {},
                });
            } else {
                await rpc('/web/dataset/call_kw', {
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
            }
        } catch (error) {
            console.error("Error sending data to API:", error);
        }
    }

    onDrop(ev) {
        ev.preventDefault();
        this.dropZone.el.classList.remove("border-gray-500", "bg-gray-100");
        const file = ev.dataTransfer.files[0];
        this.handleFile(file);
    }

    onDragOver(ev) {
        ev.preventDefault();
        const file = ev.dataTransfer.items[0];
        if (file && file.kind === "file" && file.type !== "text/csv") {
            this.dropZone.el.classList.add("border-red-500", "bg-red-100");
            this.setProgress(100, "progress-bar bg-red-500", "Invalid file type! Only CSV allowed.");
        } else {
            this.dropZone.el.classList.remove("border-red-500", "bg-red-100");
        }
    }

    onDragLeave(ev) {
        ev.preventDefault();
        this.dropZone.el.classList.remove("border-red-500", "bg-red-100");
    }

    onClickDownloadTemplate() {
        const headers = [
            'item_name', 'barcode', 'sku', 'selling_price', 'category', 'cost', 'msrp',
            'status', 'company', 'brand', 'on_hand', 'description',
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

        navigateBack() {
        if (this.props.onNavigate) {
            this.props.onNavigate("/item_list");
        } else {
            window.history.pushState({}, "", "/item_list");
            window.dispatchEvent(new PopStateEvent("popstate"));
        }
    }

    onTryagain() {
        this.setProgress(0, "progress-bar bg-blue-500", "Uploading item 0 of 0");
        this.errorText.message = "";
        this.uploadedData.data = [];
        this.onClickUpload();
    }

     uploadDifferentFile() {
        this.setProgress(0, "progress-bar bg-blue-500", "Uploading item 0 of 0");
        this.errorText.message = "";
        this.uploadedData.data = [];
        this.onClickUpload();
    }

    static template = xml`
<div class="p-10 bg-white font-sans text-gray-800 rounded shadow-md mx-auto" style="width: 97%; height: 950px; border: 1px solid #ddd;">
    <div class="text-muted mb-2" style="margin-top: 3rem; margin-left: 1rem; font-size: 15px;">
        Home / Item Management / <strong>Import Items</strong>
    </div>

    <div class="mb-3" style="margin-left: 1rem; margin-top: 2rem;">
        <h2 class="text-3xl mb-6" style="font-weight: 900;">Import Items</h2>
    </div>

    <ul class="nav nav-underline mb-4" style="margin-left: 1.1rem;margin-top: 2rem;font-size: 15px;">
        <li class="nav-item">
            <a class="nav-link" href="#" t-att-class="{ 'active': state.activeTab === 'update' }" t-on-click="onUpdateClick">Update Existing Item(s)</a>
        </li>
        <li class="nav-item">
            <a class="nav-link" href="#" t-att-class="{ 'active': state.activeTab === 'add' }" t-on-click="onAddClick">Add New Item(s)</a>
        </li>
    </ul>

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

   <div t-ref="dropZone"
     t-on-click="onClickUpload"
     t-on-dragover="onDragOver"
     t-on-dragleave="onDragLeave"
     t-on-drop="onDrop"
     class="import-dropzone mx-auto p-8 border-2 border-dashed border-gray-400 bg-gray-300 text-center rounded-xl cursor-pointer transition-all shadow-sm hover:bg-blue-100 hover:border-blue-1500"
     style="margin-left: 1rem; margin-top: 2rem;">
    <div class="flex flex-col items-center justify-center space-y-4">
        <i class="fas fa-cloud-upload-alt text-6xl text-gray-600 hover:text-blue-500 transition-colors"></i>
        <i class="fa fa-file text-gray-600 hover:text-blue-500 transition-colors" style="font-size: 35px;"></i>

<div class="progress w-full bg-gray-200 rounded-full mt-4 overflow-hidden" style="height: 5px; width: 1400px;"  t-if="progressValue.value !== 0">
            <div t-ref="progressBar" t-att-class="progressBarClass.value"
                 t-att-style="'width: ' + progressValue.value + '%;'">
            </div>
                </div>
        <p class="text-sm font-semibold" style="font-size:15px;" t-esc="errorText.message" t-if="progressValue.value !== 0 "></p>
        <p class="text-sm font-semibold" style="font-size:16px;font-weight:600" t-if="progressValue.value === 0">Drag and drop, or browse files</p>
        <p class="text-sm font-semibold" style="font-size:15px;" t-if="progressValue.value === 0">Supports .CSV, .XLSX files</p>
        <p class="text-sm font-semibold" style="font-size:15px;" t-if="progressValue.value === 0">Browse files</p>

       <div class="flex items-center justify-center" t-if="progressValue.value === 100" style="height: 70px; width: 100%;">
        <button t-on-click="navigateBack" class="download-button continue-button">
            Continue
        </button>
    </div>

     <div class="flex items-center justify-center" t-if="progressValue.value === 30" style="height: 70px; width: 100%;">
        <button t-on-click="onTryagain" class="download-button tryagain-button">
            Try again
        </button>
    </div>
   <p class="text-sm font-semibold different-file" style="font-size:16px; cursor: pointer;"  t-if="progressValue.value === 100" t-on-click="uploadDifferentFile">
    Upload a different file
    </p>

    </div>
</div>

</div>`;
}

document.addEventListener("DOMContentLoaded", () => {
    const el = document.getElementById("import_list-container");
    if (el) {
        const app = new App(ImportItem);
        app.mount(el);
    }
});
