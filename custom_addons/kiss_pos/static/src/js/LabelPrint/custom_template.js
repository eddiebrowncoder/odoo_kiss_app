/** @odoo-module **/
import { Component, useState, xml } from "@odoo/owl";
import { Toast } from "../Common/toast";

export class CustomTemplate extends Component {
    setup() {
        this.state = useState({
            width: '',
            height: '',
            price: '',
            selectedFields: [
                { id: 'barcode', name: 'Barcode', selected: true, order: 1 },
                { id: 'sku', name: 'SKU', selected: true, order: 2 },
                { id: 'description', name: 'Description', selected: true, order: 3 },
                { id: 'selling_price', name: 'Selling Price', selected: true, order: 4 },
                { id: 'category', name: 'Category', selected: false, order: 5 },
                { id: 'subcategory', name: 'Subcategory', selected: false, order: 6 },
                { id: 'sub_subcategory', name: 'Sub-subcategory', selected: false, order: 7 },
            ],
            searchInput: "",
            draggedItemId: null,
            dragOverItemId: null,
        });
    }

    static props = {
        onClose: Function,
        onSave: Function
    };

    closeModal() {
        this.props.onClose();
    }
    
    toggleField(fieldId) {
        const field = this.state.selectedFields.find(f => f.id === fieldId);
        if (field) {
            field.selected = !field.selected;
            
            // If field is being selected, set its order to be at the end
            if (field.selected) {
                const maxOrder = Math.max(...this.state.selectedFields
                    .filter(f => f.selected)
                    .map(f => f.order), 0);
                field.order = maxOrder + 1;
            } else {
                // If field is being deselected, reorder remaining selected fields
                this.reorderAfterRemoval(field.order);
            }
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
    
    async saveTemplate() {
        if (!this.state.width || !this.state.height) {
            Toast.error("Width and height are required")
            return;
        }
        
        const selectedFields = this.state.selectedFields
            .filter(field => field.selected)
            .sort((a, b) => a.order - b.order)
            .map((field, index) => ({
                field_name: field.id,
                sequence: index + 1,
                is_visible: true,
            }));
        
        if (selectedFields.length === 0) {
            Toast.error("Please select at least one field")
            return;
        }
        
        const templateData = {
            name: `${this.state.width}" x ${this.state.height}"`,
            width: this.state.width,
            height: this.state.height,
            price: this.state.price || 0,
            fields: selectedFields,
            is_default: false
        };
        
        try {
            const response = await fetch('/api/label_template/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(templateData)
            });
            
            const result = await response.json();
            if (result.success) {
                this.props.onSave(result);
            } else {
                Toast.error(result.error || 'Failed to save template')
            }
        } catch (error) {
            console.error('Error saving template:', error);
            Toast.error("Failed to save template. Please try again.")
        } finally {
            this.closeModal();
        }
    }
    
    getSelectedFieldsCount() {
        return this.state.selectedFields.filter(field => field.selected).length;
    }
    
    get filteredFields() {
        const searchTerm = this.state.searchInput.toLowerCase();
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
        this.state.searchInput = event.target.value;
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
                    <div class="modal-header d-flex align-items-center px-3 py-3 border-0">
                        <button type="button" class="btn btn-link text-primary p-0 me-2" t-on-click="closeModal">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20px" height="20px" class="text-primary">
                                <path fill-rule="evenodd" d="M11.03 3.97a.75.75 0 0 1 0 1.06l-6.22 6.22H21a.75.75 0 0 1 0 1.5H4.81l6.22 6.22a.75.75 0 1 1-1.06 1.06l-7.5-7.5a.75.75 0 0 1 0-1.06l7.5-7.5a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd" />
                            </svg>
                        </button>
                        <h5 class="modal-title fw-bold m-0">Add Custom Template</h5>
                    </div>
                    
                    <div class="modal-body px-3 py-0">
                        <div class="d-flex flex-row mb-4 gap-2">
                            <div class="d-flex flex-column col-7">
                                <label class="mb-2 fw-normal">Size (inches)</label>
                                <div class="d-flex gap-3">
                                    <div class="text-center w-50">
                                        <input type="number" class="form-control text-end" id="width"
                                            placeholder="0" t-model="state.width"
                                        />
                                        <span class="text-secondary">Width</span>
                                    </div>
                                    <div class="text-center w-50">
                                        <input type="number" class="form-control text-end" id="height"
                                            placeholder="0" t-model="state.height"
                                        />
                                        <span class="text-secondary">Height</span>
                                    </div>
                                </div>
                            </div>
                            <div class="d-flex flex-column col-5">
                                <label class="mb-2 fw-normal">Price</label>
                                <div class="input-group">
                                    <input type="number" class="form-control text-end" id="price"
                                        t-model="state.price"
                                        placeholder="0.00" />
                                    <span class="input-group-text bg-white">$</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Field Selection -->
                        <div class="mb-3">
                            <div class="row g-3 mb-2">
                            <!-- Available Fields -->
                            <div class="col-md-5">
                                    <div class="position-relative mb-3">
                                        <input type="text" class="form-control ps-5" placeholder="Search Field..." 
                                            t-model="state.searchInput" 
                                            t-on-input="handleSearch" />
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16px" height="16px" 
                                            class="position-absolute" style="left: 16px; top: 50%; transform: translateY(-50%); color: #adb5bd;">
                                            <path fill-rule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clip-rule="evenodd" />
                                        </svg>
                                    </div>
                                    
                                    <!-- Select All link -->
                                    <div class="px-2 mb-2 text-end">
                                        <a href="#" class="text-primary" t-on-click.prevent="selectAll">Select All</a>
                                    </div>
                                    
                                    <t t-foreach="filteredFields" t-as="field" t-key="field.id">
                                        <div class="d-flex align-items-center py-2 border-bottom" t-on-click="() => this.toggleField(field.id)" style="cursor: pointer;">
                                            <button class="btn btn-sm p-0 me-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24px" height="24px" style="color: #aaa;">
                                                    <path fill-rule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clip-rule="evenodd" />
                                                </svg>
                                            </button>
                                            <div t-esc="field.name" class="fw-normal" style="font-size: 1rem;" />
                                        </div>
                                    </t>
                                </div>
                                
                                <!-- Selected Fields -->
                                <div class="col-md-7">
                                    <div class="d-flex justify-content-between align-items-center mb-3 ps-3">
                                        <span class="text-uppercase fw-bold" style="font-size: 0.875rem;"><t t-esc="getSelectedFieldsCount()"/> FILTERS SELECTED</span>
                                        <button class="btn btn-sm btn-light rounded-1 px-3 py-2">Save Current Selection</button>
                                    </div>
                                    <div class="py-3 ps-3">
                                        <t t-foreach="selectedFieldsList" t-as="field" t-key="field.id">
                                            <div class="d-flex align-items-center justify-content-between px-2 py-1 border-bottom"
                                                 draggable="true"
                                                 t-on-dragstart="(ev) => this.handleDragStart(ev, field.id)"
                                                 t-on-dragover="(ev) => this.handleDragOver(ev, field.id)"
                                                 t-on-dragleave="handleDragLeave"
                                                 t-on-drop="(ev) => this.handleDrop(ev, field.id)"
                                                 t-on-dragend="handleDragEnd"
                                                 style="cursor: move; background-color: #F2F9FF;">
                                                <div class="d-flex align-items-center">
                                                    <button class="btn btn-sm text-primary p-0 me-2" t-on-click="() => this.toggleField(field.id)">
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16px" height="16px">
                                                            <path fill-rule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clip-rule="evenodd" />
                                                        </svg>
                                                    </button>    
                                                    <div t-esc="field.name" class="fw-normal" style="font-size: 1rem;" />
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
                    <div class="modal-footer border-0 px-3 py-3">
                        <div class="d-flex justify-content-center gap-2 w-100">
                            <button type="button" class="btn btn-light w-25" t-on-click="closeModal">Cancel</button>
                            <button type="button" class="btn btn-primary w-25" t-on-click="saveTemplate">Save</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}