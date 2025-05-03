/** @odoo-module **/

import { Component, useState, xml } from '@odoo/owl';
import { Toast } from '../alerts/toast';
import { ImageIcon } from '../ImageIcon';

export class AddCustomer extends Component {
    setup() {
        this.state = useState({
            firstName: '',
            lastName: '',
            phoneNumber: '',
            emailAddress: '',
            dateOfBirth: '',
            taxIdLicense: '',
            homeAddress: '',
            city: '',
            state: '',
            zipCode: '',
            country: 'United States',
            notes: '',
            errors: {},
            isSubmitting: false,
            apiError: null,
            apiSuccess: null
        });
        
        this.states = [
            { code: 'AL', name: 'Alabama' },
            { code: 'AK', name: 'Alaska' },
            { code: 'AZ', name: 'Arizona' },
            { code: 'AR', name: 'Arkansas' },
            { code: 'CA', name: 'California' },
            { code: 'CO', name: 'Colorado' },
            { code: 'CT', name: 'Connecticut' },
            // Add all states here
        ];
        
        this.countries = [
            'United States',
            'Canada',
            'Mexico',
            // Add more countries
        ];
    }

    static props = {
        onClose: Function,
        onSuccess: { type: Function, optional: true },
    };

    closeModal() {
        this.props.onClose();
    }

    validateForm() {
        const errors = {};
        
        // Required fields validation
        if (!this.state.firstName) errors.firstName = 'First name is required';
        if (!this.state.lastName) errors.lastName = 'Last name is required';
        if (!this.state.phoneNumber) errors.phoneNumber = 'Phone number is required';
        if (!this.state.emailAddress) errors.emailAddress = 'Email address is required';
        
        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (this.state.emailAddress && !emailRegex.test(this.state.emailAddress)) {
            errors.emailAddress = 'Invalid email format';
        }
        
        this.state.errors = errors;
        return Object.keys(errors).length === 0;
    }

    async handleSubmit() {
        if (this.validateForm()) {
            try {
                this.state.isSubmitting = true;
                this.state.apiError = null;
                this.state.apiSuccess = null;
                
                const customerData = {
                    name: `${this.state.firstName} ${this.state.lastName}`,
                    email: this.state.emailAddress,
                    phone: this.state.phoneNumber,
                    vat: this.state.taxIdLicense || '', 
                    street: this.state.homeAddress || '',
                    city: this.state.city || '',
                    zip: this.state.zipCode || '',
                    country_id: this.getCountryId(this.state.country), // This would need proper country ID mapping
                    comment: this.state.notes || '',
                    state_id: this.getStateId(this.state.state), // This would need proper state ID mapping
                    birthdate: this.state.dateOfBirth || '',
                };
                
                const response = await fetch('/api/customer/add', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(customerData),
                });
                
                const data = await response.json();
                
                if (data.status === 'success') {
                    this.state.apiSuccess = 'Customer added successfully!';
                    
                    // Clear form after successful submission
                    this.resetForm();
                    
                    // Callback to parent component
                    if (this.props.onSuccess) {
                        this.props.onSuccess(data);
                    }
                    
                    this.props.onClose()
                    Toast.show("Customer added successfully!", "success");
                      
                } else {
                    throw new Error(data.message || 'Failed to add customer');
                }
            } catch (error) {
                this.state.apiError = error.message;
                console.error('Error adding customer:', error);
            } finally {
                this.state.isSubmitting = false;
            }
        }
    }
    
    resetForm() {
        this.state.firstName = '';
        this.state.lastName = '';
        this.state.phoneNumber = '';
        this.state.emailAddress = '';
        this.state.dateOfBirth = '';
        this.state.taxIdLicense = '';
        this.state.homeAddress = '';
        this.state.city = '';
        this.state.state = '';
        this.state.zipCode = '';
        this.state.country = 'United States';
        this.state.notes = '';
        this.state.errors = {};
    }
    
    // Helper functions for mapping country and state names to IDs
    // In a real implementation, you would fetch these IDs from Odoo
    getCountryId(countryName) {
        // This is a placeholder. In a real implementation,
        // you would have a mapping of country names to IDs
        const countryMap = {
            'United States': 233,
            'Canada': 38,
            'Mexico': 147,
            // Add more mappings as needed
        };
        return countryMap[countryName] || false;
    }
    
    getStateId(stateName) {
        // This is a placeholder. In a real implementation,
        // you would have a mapping of state names to IDs
        const stateMap = {
            'Alabama': 1,
            'Alaska': 2,
            'Arizona': 3,
            // Add more mappings as needed
        };
        return stateMap[stateName] || false;
    }

    static components = { ImageIcon };

    static template = xml`
        <div class="modal fade show d-block" style="background-color: rgba(0, 0, 0, 0.5);">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header border-0 pb-0">
                        <h5 class="modal-title fw-bold">Add New Customer</h5>
                        <button type="button" class="btn-close" t-on-click="closeModal"></button>
                    </div>
                    <div class="modal-body p-4">
                        <div t-if="state.apiError" class="alert alert-danger alert-dismissible fade show" role="alert">
                            <i class="bi bi-exclamation-triangle-fill me-2"></i>
                            <t t-esc="state.apiError"/>
                            <button type="button" class="btn-close" t-on-click="() => state.apiError = null"></button>
                        </div>
                    
                        <!-- Tabs -->
                        <div class="row mb-4">
                            <div class="col-6">
                                <button class="btn btn-light w-100 py-2 active">Customer Input</button>
                            </div>
                            <div class="col-6">
                                <button 
                                    class="btn btn-primary w-100 py-2" 
                                    t-on-click="handleSubmit"
                                    t-att-disabled="state.isSubmitting"
                                >
                                    <t t-if="state.isSubmitting">
                                        <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                        Saving...
                                    </t>
                                    <t t-else="">
                                        Confirm
                                    </t>
                                </button>
                            </div>
                        </div>
                        
                        <!-- Customer Avatar -->
                        <div class="text-center mb-4">
                            <div class="position-relative d-inline-block">
                                <div class="rounded-circle p-3 dark-gray" style="width: 80px; height: 80px;">
                                    <ImageIcon name="'profile'" class="'text-white'" width="40" height="40" />
                                </div>
                                <span class="position-absolute bottom-0 end-0 bg-primary rounded-circle p-1 edit-profile">
                                    <ImageIcon name="'pencil'" class="'text-white'" width="18" height="18" />
                                </span>
                            </div>
                        </div>
                        
                        <!-- Form -->
                        <form>
                            <div class="row mb-3">
                                <div class="col-6">
                                    <label for="firstName" class="form-label">First Name <span class="text-danger">*</span></label>
                                    <input 
                                        type="text" 
                                        class="form-control" 
                                        id="firstName" 
                                        t-model="state.firstName" 
                                        t-att-class="{'is-invalid': state.errors.firstName}"
                                    />
                                    <div class="invalid-feedback" t-if="state.errors.firstName" t-esc="state.errors.firstName"></div>
                                </div>
                                <div class="col-6">
                                    <label for="lastName" class="form-label">Last Name <span class="text-danger">*</span></label>
                                    <input 
                                        type="text" 
                                        class="form-control" 
                                        id="lastName" 
                                        t-model="state.lastName" 
                                        t-att-class="{'is-invalid': state.errors.lastName}"
                                    />
                                    <div class="invalid-feedback" t-if="state.errors.lastName" t-esc="state.errors.lastName"></div>
                                </div>
                            </div>
                            
                            <div class="row mb-3">
                                <div class="col-6">
                                    <label for="phoneNumber" class="form-label">Phone Number <span class="text-danger">*</span></label>
                                    <input 
                                        type="text" 
                                        class="form-control" 
                                        id="phoneNumber" 
                                        placeholder="123-456-7890"
                                        t-model="state.phoneNumber" 
                                        t-att-class="{'is-invalid': state.errors.phoneNumber}"
                                    />
                                    <div class="invalid-feedback" t-if="state.errors.phoneNumber" t-esc="state.errors.phoneNumber"></div>
                                </div>
                                <div class="col-6">
                                    <label for="emailAddress" class="form-label">Email Address <span class="text-danger">*</span></label>
                                    <input 
                                        type="email" 
                                        class="form-control" 
                                        id="emailAddress" 
                                        placeholder="example@email.com"
                                        t-model="state.emailAddress" 
                                        t-att-class="{'is-invalid': state.errors.emailAddress}"
                                    />
                                    <div class="invalid-feedback" t-if="state.errors.emailAddress" t-esc="state.errors.emailAddress"></div>
                                </div>
                            </div>
                            
                            <div class="row mb-3">
                                <div class="col-6">
                                    <label for="dateOfBirth" class="form-label">Date of Birth</label>
                                    <input 
                                        type="text" 
                                        class="form-control" 
                                        id="dateOfBirth" 
                                        placeholder="MM/DD/YY"
                                        t-model="state.dateOfBirth" 
                                    />
                                </div>
                                <div class="col-6">
                                    <label for="taxIdLicense" class="form-label">Tax ID/License</label>
                                    <input 
                                        type="text" 
                                        class="form-control" 
                                        id="taxIdLicense" 
                                        placeholder="1234-5678-90"
                                        t-model="state.taxIdLicense" 
                                    />
                                </div>
                            </div>
                            
                            <div class="mb-3">
                                <label for="homeAddress" class="form-label">Home Address</label>
                                <input 
                                    type="text" 
                                    class="form-control" 
                                    id="homeAddress" 
                                    placeholder="123 Main Street"
                                    t-model="state.homeAddress" 
                                />
                            </div>
                            
                            <div class="row mb-3">
                                <div class="col-6">
                                    <label for="city" class="form-label">City</label>
                                    <input 
                                        type="text" 
                                        class="form-control" 
                                        id="city" 
                                        placeholder="City"
                                        t-model="state.city" 
                                    />
                                </div>
                                <div class="col-6">
                                    <label for="state" class="form-label">State</label>
                                    <div class="dropdown">
                                        <button 
                                            class="form-select text-start d-flex justify-content-between align-items-center" 
                                            type="button" 
                                            id="stateDropdown" 
                                            data-bs-toggle="dropdown" 
                                            aria-expanded="false"
                                        >
                                            <span t-esc="state.state || 'Select'"></span>
                                            <i class="bi bi-chevron-down"></i>
                                        </button>
                                        <ul class="dropdown-menu w-100" aria-labelledby="stateDropdown">
                                            <t t-foreach="states" t-as="stateOption" t-key="stateOption.code">
                                                <li>
                                                    <a 
                                                        class="dropdown-item" 
                                                        href="#" 
                                                        t-on-click.prevent="() => state.state = stateOption.name"
                                                        t-esc="stateOption.name"
                                                    ></a>
                                                </li>
                                            </t>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="row mb-3">
                                <div class="col-6">
                                    <label for="zipCode" class="form-label">Zip Code</label>
                                    <input 
                                        type="text" 
                                        class="form-control" 
                                        id="zipCode" 
                                        placeholder="12345"
                                        t-model="state.zipCode" 
                                    />
                                </div>
                                <div class="col-6">
                                    <label for="country" class="form-label">Country</label>
                                    <div class="dropdown">
                                        <button 
                                            class="form-select text-start d-flex justify-content-between align-items-center" 
                                            type="button" 
                                            id="countryDropdown" 
                                            data-bs-toggle="dropdown" 
                                            aria-expanded="false"
                                        >
                                            <span t-esc="state.country"></span>
                                            <i class="bi bi-chevron-down"></i>
                                        </button>
                                        <ul class="dropdown-menu w-100" aria-labelledby="countryDropdown">
                                            <t t-foreach="countries" t-as="countryOption" t-key="countryOption">
                                                <li>
                                                    <a 
                                                        class="dropdown-item" 
                                                        href="#" 
                                                        t-on-click.prevent="() => state.country = countryOption"
                                                        t-esc="countryOption"
                                                    ></a>
                                                </li>
                                            </t>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="mb-3">
                                <label for="notes" class="form-label">Notes</label>
                                <textarea 
                                    class="form-control" 
                                    id="notes" 
                                    rows="3" 
                                    placeholder="Additional Comments"
                                    t-model="state.notes"
                                ></textarea>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;
}