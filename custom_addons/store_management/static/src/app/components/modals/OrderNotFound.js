/** @odoo-module **/

import { Component, xml } from '@odoo/owl';

export class OrderNotFound extends Component {
    setup() { }

    static props = {
        onClose: Function,
        onConfirm: Function,
    };

    handleAddItem() {
        this.props.onClose();
        this.props.onConfirm && this.props.onConfirm();
    }

    closeModal() {
        this.props.onClose();
    }

    static template = xml`
        <div class="modal fade show d-block" style="background-color: rgba(0, 0, 0, 0.5);">
            <div class="modal-dialog modal-dialog-centered modal-md">
                <div class="modal-content">
                    <div class="modal-header border-0 pb-0">
                        <button type="button" class="btn btn-link p-0 me-4" t-on-click="closeModal">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20px" height="20px" class="text-primary">
                                <path fill-rule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
                            </svg>
                        </button>
                        <h5 class="modal-title fw-bold">Item Not Found</h5>
                    </div>
                    <div class="modal-body">
                        <p>This item is not in the system. Would you like to register a new item?</p>
                    </div>
                    <div class="modal-footer border-0 pt-0">
                        <div class="d-flex gap-2 w-100">
                            <button type="button" class="btn btn-light flex-grow-1" t-on-click="closeModal">Cancel</button>
                            <button type="button" class="btn btn-primary flex-grow-1" t-on-click="handleAddItem">Register Item</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}