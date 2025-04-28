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
        if (file && (file.name.endsWith(".csv") || file.name.endsWith(".xlsx")))  {
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
    let skippedItems = 0;

    this.setProgress(0, "progress-bar bg-blue-500", `Uploading item 0 of ${totalItems}`);

    const stripHtml = (html) => (html || '').replace(/<[^>]+>/g, '').trim();

    for (let i = 0; i < totalItems; i++) {
        const item = data[i];
        let shouldUpload = true;

        const existingProduct = await rpc('/web/dataset/call_kw', {
            model: 'product.template',
            method: 'search_read',
            args: [[['barcode', '=', item.barcode]], ['name', 'default_code', 'description', 'list_price']],
            kwargs: {},
        });

        if (existingProduct.length > 0) {
            const ep = existingProduct[0];
            const nameMatch = (ep.name || '').trim() === (item.item_name || '').trim();
            const codeMatch = (ep.default_code || '').trim() === (item.sku || '').trim();
            const descMatch = stripHtml(ep.description) === (item.description || '').trim();
            const priceMatch = parseFloat(ep.list_price).toFixed(2) === parseFloat(item.selling_price).toFixed(2);

            if (nameMatch && codeMatch && descMatch && priceMatch) {
                shouldUpload = false;
                skippedItems++;
            }
        }

        if (shouldUpload) {
            await this.sendToAPI(item);
            uploadedItems++;
        }

        const processedItems = uploadedItems + skippedItems;
        const progress = Math.floor((processedItems / totalItems) * 100);
        const isComplete = processedItems === totalItems;

        let message = '';
        if (shouldUpload) {
            message = `Uploading item ${processedItems} of ${totalItems}`;
        } else {
            message = `All data is already up to date`;
        }

        if (isComplete) {
            if (uploadedItems > 0) {
                message = `${progress}% Complete`;
            } else {
                message = `All data is already up to date`;
            }
        }

        this.setProgress(progress, "progress-bar bg-blue-500", message);
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
if (file && file.kind === "file" && !["text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"].includes(file.type)) {
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
  <div class="text-muted mb-2 d-flex align-items-center" style="margin-top: 3rem; margin-left: 1rem; font-size: 15px;">
    <button type="button" class="btn btn-link p-0 me-2" t-on-click="navigateBack" style="text-decoration: none;">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="black" class="bi bi-arrow-left" viewBox="0 0 16 16">
            <path fill-rule="evenodd" d="M15 8a.5.5 0 0 1-.5.5H2.707l3.147 3.146a.5.5 0 0 1-.708.708l-4-4a.5.5 0 0 1 0-.708l4-4a.5.5 0 1 1 .708.708L2.707 7.5H14.5A.5.5 0 0 1 15 8z"/>
        </svg>
    </button>
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
            <i class="fa fa-file fa-2x mr-2" style="margin-right: 8px;"></i>Download Template File
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


     <div class="flex items-center justify-center" t-if="progressValue.value === 30" style="height: 70px; width: 100%;">
        <button t-on-click="onTryagain" class="download-button tryagain-button">
            Try again
        </button>
    </div>
    <div class="flex items-center justify-center" t-if="progressValue.value === 100" style="height: 70px; width: 100%;">
        <button t-on-click="navigateBack" class="download-button continue-button">
            Continue
        </button>
    </div>

   <p class="text-sm font-semibold different-file" style="font-size:16px; cursor: pointer;color: #2563eb !important; "  t-if="progressValue.value === 100" t-on-click="uploadDifferentFile">
    Upload a different file
    </p>

    </div>
</div>

</div>`;
}


// Add CSS to the document
const style = document.createElement('style');
style.textContent = `

// Import item
.import-container {
    font-family: "Arial", sans-serif;
}

.tabs .tab {
    padding-bottom: 8px;
    font-weight: 500;
    border-bottom: 2px solid transparent;
}

.tabs .tab.active {
    border-color: #000;
    color: #000;
}

.guidelines {
    background: #fff;
    border: 1px solid #e5e7eb;
}

.upload-box {
    transition: background 0.2s ease;
}

  .nav-underline {
    border-bottom: 1px solid #ccc; /* optional: main line under tabs */
  }

 .nav-underline {
    border-bottom: 1px solid #ccc;
    padding-bottom: 0;
  }

  .nav-underline .nav-item {
    margin-right: 20px; /* Optional spacing between items */
  }

  .nav-underline .nav-link {
    color: #999;
    font-weight: 500;
    border: none;
    border-bottom: 2px solid transparent;
    padding: 8px 0;
  }

  .nav-underline .nav-link:hover {
    color: black;
  }

 /* Updated dropzone styling */
.import-dropzone {
    max-width: 1500px;
    margin: 0 auto;
    padding: 3rem;
    border: 4px dashed #cbd5e0;
    background-color: #f3f4f6;
    text-align: center;
    cursor: pointer;
    border-radius: 0.75rem;
    transition: all 0.3s ease-in-out;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    display: flex; /* Use flexbox to center content */
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 250px; /* Fixed height for consistency */
}

/* Hover effect for the dropzone */
.import-dropzone:hover {
    background-color: #ebf8ff;
    border-color: #3182ce;
}

/* Icon styles */
.import-dropzone .icon {
    font-size: 3rem;
    color: #6b7280;
    transition: color 0.3s ease-in-out;
}

/* Hover effect on the icons */
.import-dropzone:hover .icon {
    color: #3b82f6;
}

/* Text styles */
.import-dropzone .text {
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
    transition: color 0.3s ease-in-out;
    margin-top: 1rem; /* Add space between icon and text */
}

/* Hover effect on the text */
.import-dropzone:hover .text {
    color: #3b82f6;
}

/* Progress bar styling */
.progress-bar {
    background-color: #4299e1;
    height: 100%;
    transition: width 0.5s ease-in-out, background-color 0.5s ease-in-out;
}

/* Dynamic color changes for the progress bar */
.progress-bar.bg-blue-500 {
    background-color: #4299e1; /* Blue */
}

.progress-bar.bg-red-500 {
    background-color: #ef4444; /* red */
}

.progress-bar.bg-blue-600 {
    background-color: #3182ce; /* Darker blue */
}
.progress-bar.bg-green-500 {
    background-color: #48bb78; /* Green */
}

/* Add smooth transition effect when progressing */
.progress-bar {
    transition: width 0.5s ease-in-out, background-color 0.5s ease-in-out;
}

.download-button-wrapper {
  display: flex;
  justify-content: flex-end;
  width: 100%;
  margin-top: 1.5rem; /* mt-6 */
  padding: 1.25rem;    /* p-5 */
}

.download-button {
  display: inline-flex;
  align-items: center;
  background-color: #e5e7eb; /* equivalent to bg-gray-200 */
  color: #1f2937;            /* equivalent to text-gray-800 */
  padding: 0.5rem 1rem;      /* px-4 py-2 */
  border-radius: 0.375rem;   /* rounded */
  border: 1px solid #d1d5db; /* border-gray-300 */
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); /* shadow-sm */
  transition: background-color 0.2s ease;
}

.download-button:hover {
  background-color: #f3f4f6; /* hover:bg-gray-100 */
}

`;
document.head.appendChild(style);


document.addEventListener("DOMContentLoaded", () => {
    const el = document.getElementById("import_list-container");
    if (el) {
        const app = new App(ImportItem);
        app.mount(el);
    }
});
