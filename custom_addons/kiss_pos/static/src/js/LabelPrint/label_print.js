/** @odoo-module **/
import { Component, useState, onMounted, xml } from "@odoo/owl";
import { CustomTemplate } from "./custom_template";
import { Toast } from "../Common/toast";

export class LabelPrint extends Component {
    setup() {
        this.state = useState({
            selectedTemplate: null,
            templates: [],
            loading: true,
            showCustomTemplate: false,
            error: null,
            printLoading: false
        });
        
        onMounted(() => {
            this.loadTemplates();
        });
    }

    static props = {
        onClose: Function,
        items: { type: Array, optional: true }
    };
    
    static components = { CustomTemplate };

    async loadTemplates() {
        try {
            this.state.loading = true;
            const response = await fetch('/api/label_templates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({})
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.state.templates = result.data;
                // Set default template if available
                const defaultTemplate = this.state.templates.find(t => t.is_default);
                this.state.selectedTemplate = defaultTemplate ? defaultTemplate.id : 
                    (this.state.templates.length > 0 ? this.state.templates[0].id : null);
            } else {
                this.state.error = result.error || 'Failed to load templates';
            }
        } catch (error) {
            this.state.error = error.message || 'Network error';
        } finally {
            this.state.loading = false;
        }
    }

    closeModal() {
        this.props.onClose();
    }
    
    selectTemplate(templateId) {
        this.state.selectedTemplate = templateId;
    }
    
    getSelectedTemplateData() {
        return this.state.templates.find(t => t.id === this.state.selectedTemplate);
    }
    
    getFieldLabel(fieldName) {
        const fieldLabels = {
            'barcode': 'Barcode',
            'sku': 'SKU',
            'description': 'Description',
            'selling_price': 'Selling Price',
            'category': 'Category',
            'subcategory': 'Subcategory',
            'sub_subcategory': 'Sub-subcategory'
        };
        return fieldLabels[fieldName] || fieldName;
    }
    
    getTemplateFieldsString(template) {
        if (!template || !template.fields) return '';
        
        return template.fields
            .filter(field => field.is_visible)
            .map(field => this.getFieldLabel(field.field_name))
            .join(', ');
    }

    getTemplatePrice(template) {
        if (!template || template.price === undefined) return '';
        return this.formatPrice(template.price);
    }

    formatPrice(price) {
        if (price === undefined || price === null) return '';
        
        const numPrice = typeof price === 'string' ? parseFloat(price) : price;
        
        if (isNaN(numPrice)) return '';
        
        if (Number.isInteger(numPrice)) {
            return `$${numPrice}.00`;
        } else {
            const decimalPart = (numPrice % 1).toFixed(2).substring(2);
            if (decimalPart.endsWith('0')) {
                return `$${numPrice.toFixed(2)}`;
            } else {
                return `$${numPrice.toFixed(2)}`;
            }
        }
    }
    
    async printLabel() {
        if (!this.state.selectedTemplate) {
            Toast.error('Please select a template first');
            return;
        }
        
        const items = this.props.items || [];
        if (items.length === 0) {
            Toast.error('No items selected for printing');
            return;
        }
        
        try {
            this.state.printLoading = true;
            
            // Get the selected template data
            const templateData = this.getSelectedTemplateData();
            if (!templateData) {
                Toast.error('Template data not found');
                return;
            }
            
            const printData = {
                template_id: this.state.selectedTemplate,
                template: templateData,
                items: this.props.items
            };
            
            const response = await fetch('/api/print_labels', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(printData)
            });
            
            // Check if the response is a PDF
            const contentType = response.headers.get('Content-Type');
            
            if (contentType && contentType.includes('application/pdf')) {
                // It's a PDF, download it
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                
                // Create a link and click it to download
                const a = document.createElement('a');
                a.href = url;
                a.download = 'Product Labels.pdf';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                
                Toast.success('Labels generated successfully');
                this.closeModal();
            } else {
                // It's not a PDF, check for error
                const result = await response.json();
                if (result.success) {
                    Toast.success('Labels printed successfully');
                    this.closeModal();
                } else {
                    Toast.error(result.error || 'Failed to print labels');
                }
            }
        } catch (error) {
            console.error('Error printing labels:', error);
            Toast.error(error.message || 'Network error when printing labels');
        } finally {
            this.state.printLoading = false;
        }
    }
    
    showAddCustomTemplate() {
        this.state.showCustomTemplate = true;
    }
    
    hideCustomTemplate() {
        this.state.showCustomTemplate = false;
    }
    
    async saveCustomTemplate(templateData) {
        console.log('templateData', templateData);
        console.log('templateData id', templateData?.id);
        await this.loadTemplates();
        // if (templateData.id) {
        //     this.state.selectedTemplate = templateData.id;
        // }
        this.state.showCustomTemplate = false;
    }

    static template = xml`
        <div class="modal fade show d-block" style="background-color: rgba(0, 0, 0, 0.5);">
            <div class="modal-dialog modal-dialog-centered modal-lg-small">
                <div class="modal-content">
                    <t t-if="state.showCustomTemplate">
                        <CustomTemplate 
                            onClose="() => this.hideCustomTemplate()" 
                            onSave="(data) => this.saveCustomTemplate(data)" 
                        />
                    </t>
                    <t t-else="">
                        <!-- Header with back button and title -->
                        <div class="modal-header d-flex align-items-center px-3 py-3 border-0">
                            <button type="button" class="btn btn-link p-0 me-4" t-on-click="closeModal">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20px" height="20px">
                                    <path fill-rule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
                                </svg>
                            </button>
                            <h5 class="modal-title m-0">Select Label Template</h5>
                        </div>
                        
                        <div class="modal-body p-3 hide-scrollbar">
                            <t t-if="state.loading">
                                <div class="d-flex justify-content-center p-5">
                                    <div class="spinner-border" role="status">
                                        <span class="visually-hidden">Loading...</span>
                                    </div>
                                </div>
                            </t>
                            <t t-elif="state.error">
                                <div class="alert alert-danger" role="alert">
                                    <t t-esc="state.error"/>
                                </div>
                            </t>
                            <t t-elif="state.templates.length === 0">
                                <div class="col-6">
                                    <div t-on-click="showAddCustomTemplate" style="cursor: pointer; height: 107px;">
                                        <div class="card h-100 rounded shadow-sm border-0 bg-light">
                                            <div class="card-body p-3 d-flex align-items-center justify-content-center">
                                                <div class="d-flex align-items-center">
                                                    <span class="me-2 fs-4">+</span>
                                                    <span>Add Custom Template</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </t>
                            <t t-else="">
                                <div class="row g-3">
                                    <!-- Template Cards -->
                                    <t t-foreach="state.templates" t-as="template" t-key="template.id">
                                        <div class="col-6">
                                            <div t-on-click="() => this.selectTemplate(template.id)" style="cursor: pointer; height: 107px;" t-attf-class="rounded shadow-sm border-0 {{ state.selectedTemplate === template.id ? 'bg-primary text-white' : 'bg-light' }}">
                                                <div class="card-body p-3">
                                                    <h6 class="mb-2 fw-semibold">Size: <t t-esc="template.name"/></h6>
                                                    <p class="small mb-0">
                                                        <t t-esc="this.getTemplateFieldsString(template)"/>
                                                    </p>
                                                    <p class="small mb-0"><t t-esc="this.getTemplatePrice(template) || '$0.00'"/></p>
                                                </div>
                                            </div>
                                        </div>
                                    </t>
                                    
                                    <!-- Add Custom Template -->
                                    <div class="col-6">
                                        <div t-on-click="showAddCustomTemplate" style="cursor: pointer; height: 107px;">
                                            <div class="card h-100 rounded shadow-sm border-0 bg-light">
                                                <div class="card-body p-3 d-flex align-items-center justify-content-center">
                                                    <div class="d-flex align-items-center">
                                                        <span class="me-2 fs-4">+</span>
                                                        <span>Add Custom Template</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </t>
                        </div>
                        
                        <!-- Footer with buttons -->
                        <div class="modal-footer border-0 px-4 py-3">
                            <div class="d-flex justify-content-center gap-2 w-100">
                                <button type="button" class="btn btn-light w-25" t-on-click="closeModal">Cancel</button>
                                <button type="button" class="btn btn-primary w-25" 
                                        t-on-click="printLabel"
                                        t-att-disabled="!state.selectedTemplate || state.loading || state.printLoading">
                                    <t t-if="state.printLoading">
                                        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                        <span class="visually-hidden">Loading...</span>
                                    </t>
                                    <t t-else=""> Print </t>
                                </button>
                            </div>
                        </div>
                    </t>
                </div>
            </div>
        </div>
    `;
}