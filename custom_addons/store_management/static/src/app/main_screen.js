/** @odoo-module **/
import { Component, xml } from '@odoo/owl';
import { OrderScreen } from './order_screen/order_screen';
import { OrderSummary } from './order_summary/order_summary';
import { StoreFooter } from './store_footer/store_footer';

export class MainScreen extends Component {
    setup() {
        this.currentScreen = 'orderScreen';
    }

    switchScreen(screenName) {
        this.currentScreen = screenName;
    }

    static components = {
        OrderScreen,
        OrderSummary,
        StoreFooter
    }

    static template = xml`
        <div class="pos-main-container d-flex flex-row align-items-start gap-3">
            <div class="order-section h-90vh d-flex flex-column gap-3">
                <OrderScreen />
                <StoreFooter />
            </div>
            <div class="summary-section bg-white" style="width: 320px;">
                <OrderSummary />
            </div>
        </div>
    `;
}