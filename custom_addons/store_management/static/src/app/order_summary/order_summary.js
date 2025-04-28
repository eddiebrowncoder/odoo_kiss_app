/** @odoo-module **/
import { Component, xml } from '@odoo/owl';

export class OrderSummary extends Component {
    setup() {
        this.totals = {
            subtotal: 0,
            discount: 0,
            tax: 0,
            total: 0
        };
    }

    static template = xml`
        <div class="order-summary h-90vh d-flex flex-column bg-ehite">
            <div class="summary-header p-3">
                <h5 class="m-0 text-16">ORDER SUMMARY</h5>
            </div>
            
            <div class="px-3">
                <div class="d-flex justify-content-between mb-3 border-bottom">
                    <span>Subtotal</span>
                    <span class="fw-bold">$0</span>
                </div>
                <div class="d-flex justify-content-between mb-3 border-bottom">
                    <span>Discount</span>
                    <div>
                        <a href="#" class="text-primary me-2 text-12">Add Discount</a>
                        <span class="fw-bold">$0</span>
                    </div>
                </div>
                <div class="d-flex justify-content-between mb-3 border-bottom">
                    <span>Tax</span>
                    <div>
                        <a href="#" class="text-primary me-2 text-12">Remove</a>
                        <span class="fw-bold">$0</span>
                    </div>
                </div>
                <div class="d-flex justify-content-between mb-3 border-bottom">
                    <span>Total</span>
                    <span class="fw-bold fs-4">$0</span>
                </div>
            </div>
            
            <div class="mt-auto p-3">
                <button class="btn btn-primary w-100 mb-3">Card</button>
                <button class="btn btn-primary w-100 mb-3">Cash</button>
                <button class="btn btn-primary w-100 mb-3">Points</button>
                <button class="btn btn-primary w-100 mb-3">Gift Card</button>
                <button class="btn btn-light w-100">Split Payment</button>
            </div>
        </div>
    `;
}
