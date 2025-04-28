/** @odoo-module */
import { Component, xml, App } from "@odoo/owl";

/**
 * Toast notification component for Odoo 18 OWL
 * Appears at the bottom of the page and auto-removes after duration
 */
export class Toast extends Component {
    static template = xml`
        <div class="o_notification o_toast"
             t-att-class="props.type ? 'o_toast_' + props.type : 'o_toast_info'">
            <div class="d-flex align-items-center">
                <i t-if="props.icon" class="me-2" t-att-class="props.icon"/>
                <span class="o_notification_content" t-esc="props.message"/>
            </div>
        </div>
    `;

    static props = {
        message: { type: String },
        type: { type: String, optional: true },
        icon: { type: String, optional: true },
        duration: { type: Number, optional: true },
    };

    static defaultProps = {
        type: "info",
        icon: "fa fa-info-circle",
        duration: 3000,
    };

    setup() {
        // Auto-close after specified duration
        if (this.props.duration > 0) {
            setTimeout(() => {
                // Call the static remove method instead of instance method
                if (this.__toastId && Toast.__activeToasts[this.__toastId]) {
                    Toast.__removeToast(this.__toastId);
                }
            }, this.props.duration);
        }
    }

    // Static storage for active toasts
    static __activeToasts = {};
    static __lastId = 0;

    /**
     * Show a toast notification
     * @param {string} message - Message to display
     * @param {string} type - Toast type: 'success', 'info', 'warning', 'error'
     * @param {Object} options - Additional options
     * @returns {number} Toast ID
     */
    static show(message, type = "info", options = {}) {
        // Map type aliases
        const typeMap = {
            success: "success",
            info: "info", 
            warning: "warning",
            error: "danger",
            danger: "danger"
        };

        // Map icons based on type
        const iconMap = {
            success: "fa fa-check-circle",
            info: "fa fa-info-circle",
            warning: "fa fa-exclamation-triangle",
            danger: "fa fa-times-circle"
        };

        // Create toast props
        const props = {
            message,
            type: typeMap[type] || "info",
            icon: options.icon || iconMap[typeMap[type] || "info"],
            duration: options.duration !== undefined ? options.duration : 3000
        };

        // Create container for the toast
        const container = document.createElement("div");
        container.className = "o_toast_container";
        container.style.position = "fixed";
        
        // Default to bottom position
        const position = options.position || "bottom"; 
        container.style.top = position === "top" ? "20px" : "auto";
        container.style.bottom = position === "top" ? "auto" : "0"; 
        container.style.left = "0";
        container.style.right = "0";
        container.style.zIndex = "1050";
        container.style.width = "100%";
        document.body.appendChild(container);

        // Create a new app instance for the toast
        const app = new App(Toast, { 
            props, 
            dev: false,
            templates: true,
            env: {}
        });
        
        // Mount the toast to the container
        const toastId = ++Toast.__lastId;
        const instance = app.mount(container);
        instance.__toastId = toastId;
        
        // Store reference to the active toast
        Toast.__activeToasts[toastId] = {
            app,
            container,
            instance
        };

        // Set a direct timeout for auto-removal
        if (props.duration > 0) {
            setTimeout(() => {
                Toast.__removeToast(toastId);
            }, props.duration);
        }

        return toastId;
    }

    /**
     * Remove a toast by ID
     * @param {number} id - Toast ID to remove
     */
    static __removeToast(id) {
        const toast = Toast.__activeToasts[id];
        if (toast) {
            try {
                // Destroy the app
                toast.app.destroy();
                
                // Remove the container from DOM
                if (toast.container && document.body.contains(toast.container)) {
                    document.body.removeChild(toast.container);
                }
            } catch (e) {
                console.error("Error removing toast:", e);
            }
            
            // Remove from active toasts
            delete Toast.__activeToasts[id];
        }
    }

    /**
     * Show a success toast
     * @param {string} message - Message to display
     * @param {Object} options - Additional options
     * @returns {number} Toast ID
     */
    static success(message, options = {}) {
        return Toast.show(message, "success", options);
    }

    /**
     * Show an info toast
     * @param {string} message - Message to display
     * @param {Object} options - Additional options
     * @returns {number} Toast ID
     */
    static info(message, options = {}) {
        return Toast.show(message, "info", options);
    }

    /**
     * Show a warning toast
     * @param {string} message - Message to display
     * @param {Object} options - Additional options
     * @returns {number} Toast ID
     */
    static warning(message, options = {}) {
        return Toast.show(message, "warning", options);
    }

    /**
     * Show an error toast
     * @param {string} message - Message to display
     * @param {Object} options - Additional options
     * @returns {number} Toast ID
     */
    static error(message, options = {}) {
        return Toast.show(message, "error", options);
    }
}

// Add CSS for the toasts
const style = document.createElement('style');
style.textContent = `
    .o_notification.o_toast {
        padding: 16px 24px;
        color: white;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        width: 100%;
        animation: toast-slide-up 0.3s ease-out;
    }
    
    .o_notification.o_toast .fa {
        color: white;
        font-size: 16px;
        margin-right: 8px;
    }
    
    .o_notification_content {
        font-size: 14px;
        font-weight: 500;
    }
    
    /* Toast types */
    .o_toast_info {
        background-color: #0069D9;
    }
    
    .o_toast_success {
        background-color: #28a745;
    }
    
    .o_toast_warning {
        background-color: #ffc107;
        color: #212529;
    }
    
    .o_toast_danger {
        background-color: #dc3545;
    }

    /* Animation for bottom toast */
    @keyframes toast-slide-up {
        from {
            transform: translateY(100%);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);