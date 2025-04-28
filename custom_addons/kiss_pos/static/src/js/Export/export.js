/** @odoo-module **/
import { Component, useState, xml } from "@odoo/owl";
import { Toast } from "../Common/toast";

export class Export extends Component {
    setup() {
        this.state = useState({
            searchValue: "",
            draggedItemId: null,
            dragOverItemId: null,
            selectedFields: [
                { id: 1, name: "Barcode", selected: true, order: 1 },
                { id: 2, name: "SKU", selected: true, order: 2 },
                { id: 3, name: "Description", selected: true, order: 3 },
                { id: 4, name: "Selling Price", selected: true, order: 4 },
                { id: 5, name: "Category", selected: false, order: 5 },
                { id: 6, name: "Subcategory", selected: false, order: 6 },
                { id: 7, name: "Sub-subcategory", selected: false, order: 7 },
                { id: 8, name: "Company Code", selected: false, order: 8 },
            ],
            exportFormat: "CSV"
        });
    }

    static props = {
        onClose: Function,
        items: { type: Array, optional: true }
    };

    closeModal() {
        this.props.onClose();
    }

    exportItem() {
        const selectedFields = this.state.selectedFields
            .filter(field => field.selected)
            .sort((a, b) => a.order - b.order);
        
        if (this.props.items && this.props.items.length > 0) {
            if (this.state.exportFormat === 'CSV') {
                this.exportToCSV(selectedFields, this.props.items);
            } else if (this.state.exportFormat === 'Excel') {
                this.exportToExcel(selectedFields, this.props.items);
            }
        }
    }

    exportToCSV(fields, items) {
        const headers = fields.map(field => field.name);
        const csvContent = [headers];
        
        items.forEach(item => {
            const row = fields.map(field => {
                // Get value based on field name (case-insensitive match)
                const fieldKey = Object.keys(item).find(
                    key => key.toLowerCase() === field.name.toLowerCase()
                );
                let value = fieldKey ? item[fieldKey] : '';
                
                // Escape values with quotes if they contain commas or quotes
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    value = `"${value.replace(/"/g, '""')}"`;
                }
                return value ?? '';
            });
            csvContent.push(row);
        });
        
        // Convert to CSV string
        const csvString = csvContent.map(row => row.join(',')).join('\n');
        
        // Create blob and download
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        this.downloadFile(blob, 'export.csv');

        this.closeModal()
        Toast.info(`Print job sent successfully. Exported ${this.props.items.length} items as CSV.`)
    }

    exportToExcel(fields, items) {
        
        // Create a workbook with a worksheet
        const worksheet = this.createWorksheet(fields, items);
        
        // Convert worksheet to Excel-like format
        // Note: This is a simple CSV with Excel MIME type - for a full Excel file
        // we typically need to use a library like SheetJS or server-side processing
        const blob = new Blob([worksheet], { 
            type: 'application/vnd.ms-excel;charset=utf-8;' 
        });
        this.downloadFile(blob, 'export.xlsx');

        this.closeModal()
        Toast.info(`Print job sent successfully. Exported ${this.props.items.length} items as EXCEL.`)
    }
    
    createWorksheet(fields, items) {
        const headers = fields.map(field => field.name);
        const rows = [headers];
        
        items.forEach(item => {
            const row = fields.map(field => {
                // Get value based on field name (case-insensitive match)
                const fieldKey = Object.keys(item).find(
                    key => key.toLowerCase() === field.name.toLowerCase()
                );
                let value = fieldKey ? item[fieldKey] : '';
                
                if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                    value = `"${value.replace(/"/g, '""')}"`;
                }
                return value ?? '';
            });
            rows.push(row);
        });
        
        // Join rows with newlines and columns with tabs (Excel-friendly)
        return rows.map(row => row.join('\t')).join('\n');
    }
    
    downloadFile(blob, filename) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    toggleFieldSelection(fieldId) {
        const field = this.state.selectedFields.find(f => f.id === fieldId);
        if (field) {
            field.selected = !field.selected;
            
            // If field is being selected, set its order to be at the end
            if (field.selected) {
                const maxOrder = Math.max(...this.state.selectedFields
                    .filter(f => f.selected)
                    .map(f => f.order), 0);
                field.order = maxOrder + 1;
            }
        }
    }

    removeField(fieldId) {
        const field = this.state.selectedFields.find(f => f.id === fieldId);
        if (field) {
            field.selected = false;
            
            // Reorder remaining selected fields
            this.reorderAfterRemoval(field.order);
        }
    }
    
    reorderAfterRemoval(removedOrder) {
        // Update the order of all fields with order greater than the removed field
        this.state.selectedFields.forEach(field => {
            if (field.selected && field.order > removedOrder) {
                field.order--;
            }
        });
    }

    selectAll() {
        const unselectedFields = this.state.selectedFields.filter(field => !field.selected);
        
        // Find the max order among currently selected fields
        const maxOrder = Math.max(...this.state.selectedFields
            .filter(f => f.selected)
            .map(f => f.order), 0);
        
        // Select all fields and assign new orders to newly selected fields
        let orderCounter = maxOrder;
        unselectedFields.forEach(field => {
            field.selected = true;
            orderCounter++;
            field.order = orderCounter;
        });
    }

    setExportFormat(format) {
        this.state.exportFormat = format;
    }

    get selectedFieldsCount() {
        return this.state.selectedFields.filter(field => field.selected).length;
    }

    get filteredFields() {
        const searchTerm = this.state.searchValue.toLowerCase();
        return this.state.selectedFields.filter(field => 
            !field.selected && field.name.toLowerCase().includes(searchTerm)
        );
    }

    get availableFields() {
        const searchTerm = this.state.searchValue.toLowerCase();
        if (!searchTerm) {
            return this.state.selectedFields.filter(field => !field.selected);
        }
        return this.state.selectedFields.filter(field => 
            !field.selected && field.name.toLowerCase().includes(searchTerm)
        );
    }

    get selectedFieldsList() {
        return this.state.selectedFields
            .filter(field => field.selected)
            .sort((a, b) => a.order - b.order);
    }

    handleSearch(event) {
        this.state.searchValue = event.target.value;
    }

    // Drag and drop functionality
    handleDragStart(event, fieldId) {
        this.state.draggedItemId = fieldId;
        event.dataTransfer.effectAllowed = "move";
        event.currentTarget.classList.add("dragging");
    }

    handleDragOver(event, fieldId) {
        event.preventDefault();
        this.state.dragOverItemId = fieldId;
        // Add visual feedback for drop target
        event.currentTarget.classList.add("drag-over");
    }
    
    handleDragLeave(event) {
        // Remove visual feedback when leaving a potential drop target
        event.currentTarget.classList.remove("drag-over");
    }

    handleDrop(event, fieldId) {
        event.preventDefault();
        
        // Remove visual styling
        const elements = document.querySelectorAll(".drag-over");
        elements.forEach(el => el.classList.remove("drag-over"));
        
        const sourceId = this.state.draggedItemId;
        const targetId = fieldId;
        
        if (sourceId === targetId) return;
        
        const sourceField = this.state.selectedFields.find(f => f.id === sourceId);
        const targetField = this.state.selectedFields.find(f => f.id === targetId);
        
        if (!sourceField || !targetField) return;
        
        const sourceOrder = sourceField.order;
        const targetOrder = targetField.order;
        
        // Reorder the fields
        if (sourceOrder < targetOrder) {
            // Moving down: reduce order of all fields between source and target
            this.state.selectedFields.forEach(field => {
                if (field.order > sourceOrder && field.order <= targetOrder) {
                    field.order--;
                }
            });
        } else {
            // Moving up: increase order of all fields between target and source
            this.state.selectedFields.forEach(field => {
                if (field.order >= targetOrder && field.order < sourceOrder) {
                    field.order++;
                }
            });
        }
        
        // Set the source field to the target order
        sourceField.order = targetOrder;
        
        // Reset drag state
        this.state.draggedItemId = null;
        this.state.dragOverItemId = null;
    }

    handleDragEnd(event) {
        // Clean up any remaining visual effects
        event.currentTarget.classList.remove("dragging");
        const elements = document.querySelectorAll(".drag-over");
        elements.forEach(el => el.classList.remove("drag-over"));
        
        this.state.draggedItemId = null;
        this.state.dragOverItemId = null;
    }

    static template = xml`
        <div class="modal fade show d-block" style="background-color: rgba(0, 0, 0, 0.5);">
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content">
                    <!-- Header with back button and title -->
                    <div class="modal-header d-flex align-items-center px-3 py-2 border-0">
                        <button type="button" class="btn btn-link p-0 me-4" t-on-click="closeModal">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20px" height="20px" class="text-primary">
                                <path fill-rule="evenodd" d="M11.03 3.97a.75.75 0 0 1 0 1.06l-6.22 6.22H21a.75.75 0 0 1 0 1.5H4.81l6.22 6.22a.75.75 0 1 1-1.06 1.06l-7.5-7.5a.75.75 0 0 1 0-1.06l7.5-7.5a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd" />
                            </svg>
                        </button>
                        <h5 class="modal-title m-0">Export</h5>
                        
                        <!-- Export format buttons -->
                        <div class="ms-auto d-flex">
                            <div class="d-flex flex-row gap-2">
                                <button type="button" 
                                    t-att-class="state.exportFormat === 'Excel' ? 'btn btn-primary' : 'btn btn-light'" 
                                    t-on-click="() => this.setExportFormat('Excel')">
                                    Excel
                                </button>
                                <button type="button" 
                                    t-att-class="state.exportFormat === 'CSV' ? 'btn btn-primary' : 'btn btn-light'" 
                                    t-on-click="() => this.setExportFormat('CSV')">
                                    CSV
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-body p-0">
                        <div class="container-fluid">
                            <div class="d-flex flex-row">
                                <!-- Left side: Fields selection -->
                                <div class="col-5 py-3">
                                    <!-- Search field -->
                                    <div class="position-relative mb-3 px-3">
                                        <i class="fa fa-search position-absolute" style="left: 20px; top: 10px;"></i>
                                        <input 
                                            type="text" 
                                            class="form-control ps-4" 
                                            placeholder="Search Field..." 
                                            t-model="state.searchValue"
                                            t-on-input="handleSearch"
                                        />
                                    </div>
                                    
                                    <!-- Select All link -->
                                    <div class="px-3 mb-2 text-end">
                                        <a href="#" class="text-primary" t-on-click.prevent="selectAll">Select All</a>
                                    </div>
                                    
                                    <!-- Available fields list -->
                                    <div class="field-list" style="max-height: 350px; overflow-y: auto;">
                                        <t t-foreach="availableFields" t-as="field" t-key="field.id">
                                            <div class="d-flex align-items-center px-3 py-2 border-bottom" 
                                                t-on-click="() => this.toggleFieldSelection(field.id)">
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20px" height="20px" class="me-2">
                                                    <path fill-rule="evenodd" d="M12 3.75a.75.75 0 0 1 .75.75v6.75h6.75a.75.75 0 0 1 0 1.5h-6.75v6.75a.75.75 0 0 1-1.5 0v-6.75H4.5a.75.75 0 0 1 0-1.5h6.75V4.5a.75.75 0 0 1 .75-.75Z" clip-rule="evenodd" />
                                                </svg>
                                                <span t-esc="field.name"></span>
                                            </div>
                                        </t>
                                    </div>
                                </div>
                                
                                <!-- Right side: Selected fields -->
                                <div class="col-7 py-3">
                                    <!-- Selected fields header -->
                                    <div class="d-flex justify-content-between align-items-center px-3 mb-3">
                                        <span t-esc="selectedFieldsCount + ' FIELDS SELECTED'"></span>
                                        
                                        <!-- Template buttons -->
                                        <div>
                                            <button class="btn btn-light me-2">Saved Template</button>
                                            <button class="btn btn-light">Save as Template</button>
                                        </div>
                                    </div>
                                    
                                    <!-- Selected fields list - with proper drag and drop -->
                                    <div class="selected-fields-list px-3" style="max-height: 350px; overflow-y: auto;">
                                        <t t-foreach="selectedFieldsList" t-as="field" t-key="field.id">
                                            <div class="d-flex justify-content-between align-items-center p-2" 
                                                 style="background-color: #F2F9FF; cursor: move; border: 1px solid #F2F2F2;"
                                                 t-att-data-id="field.id"
                                                 t-att-data-order="field.order"
                                                 draggable="true"
                                                 t-on-dragstart="(ev) => this.handleDragStart(ev, field.id)"
                                                 t-on-dragover="(ev) => this.handleDragOver(ev, field.id)"
                                                 t-on-dragleave="handleDragLeave"
                                                 t-on-drop="(ev) => this.handleDrop(ev, field.id)"
                                                 t-on-dragend="handleDragEnd">
                                                <div class="d-flex align-items-center">
                                                    <button class="btn btn-link text-danger p-1" t-on-click="() => this.removeField(field.id)">
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20px" height="20px">
                                                            <path fill-rule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
                                                        </svg>
                                                    </button>
                                                    <span t-esc="field.name"></span>
                                                </div>
                                                <button class="btn btn-link drag-handle" title="Drag to reorder">
                                                    <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" height="20px" width="20px" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M8.5 7C9.32843 7 10 6.32843 10 5.5C10 4.67157 9.32843 4 8.5 4C7.67157 4 7 4.67157 7 5.5C7 6.32843 7.67157 7 8.5 7ZM8.5 13.5C9.32843 13.5 10 12.8284 10 12C10 11.1716 9.32843 10.5 8.5 10.5C7.67157 10.5 7 11.1716 7 12C7 12.8284 7.67157 13.5 8.5 13.5ZM10 18.5C10 19.3284 9.32843 20 8.5 20C7.67157 20 7 19.3284 7 18.5C7 17.6716 7.67157 17 8.5 17C9.32843 17 10 17.6716 10 18.5ZM15.5 7C16.3284 7 17 6.32843 17 5.5C17 4.67157 16.3284 4 15.5 4C14.6716 4 14 4.67157 14 5.5C14 6.32843 14.6716 7 15.5 7ZM17 12C17 12.8284 16.3284 13.5 15.5 13.5C14.6716 13.5 14 12.8284 14 12C14 11.1716 14.6716 10.5 15.5 10.5C16.3284 10.5 17 11.1716 17 12ZM15.5 20C16.3284 20 17 19.3284 17 18.5C17 17.6716 16.3284 17 15.5 17C14.6716 17 14 17.6716 14 18.5C14 19.3284 14.6716 20 15.5 20Z"></path>
                                                    </svg>
                                                </button>
                                            </div>
                                        </t>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Footer with buttons -->
                    <div class="modal-footer border-0 px-4 py-3">
                        <div class="d-flex justify-content-center gap-2 w-100">
                            <button type="button" class="btn btn-light w-25" t-on-click="closeModal">Cancel</button>
                            <button type="button" class="btn btn-primary w-25" t-on-click="exportItem">Export</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}