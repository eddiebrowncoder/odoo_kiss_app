import { Component, xml, useState, mount } from '@odoo/owl';
import { Toast } from './toast';

export class ToastManager extends Component {
    static template = xml`
        <div class="o_toast_container">
            <t t-foreach="state.toasts" t-as="toast" t-key="toast.id">
                <Toast 
                    message="toast.message" 
                    type="toast.type" 
                    duration="toast.duration"
                />
            </t>
        </div>
    `;

    static components = { Toast };

    setup() {
        this.state = useState({
            toasts: [],
            nextId: 0,
        });
    }

    addToast(message, type = 'success', duration = 3000) {
        const id = this.state.nextId++;
        this.state.toasts.push({ id, message, type, duration });
        
        if (duration > 0) {
            setTimeout(() => {
                this.state.toasts = this.state.toasts.filter(toast => toast.id !== id);
            }, duration + 300);
        }
        
        return id;
    }

    removeToast(id) {
        this.state.toasts = this.state.toasts.filter(toast => toast.id !== id);
    }
}

let toastManagerInstance = null;
let rootContainer = null;

export function getToastManager() {
    if (!toastManagerInstance) {
        const mountPoint = document.createElement('div');
        mountPoint.className = 'o_toast_manager_mount';
        document.body.appendChild(mountPoint);
        
        mount(ToastManager, mountPoint);
        
        toastManagerInstance = mountPoint.__owl__;
    }
    return toastManagerInstance;
}

export function showToast(message, type = 'success', duration = 3000) {
    try {
        return getToastManager().component.addToast(message, type, duration);
    } catch (error) {
        console.error('Error showing toast with component:', error);
        
        const toast = document.createElement('div');
        toast.className = `o_toast o_toast_${type}`;
        toast.innerHTML = `
            <div class="o_toast_content">
                <i class="fa fa-${type === 'success' ? 'check-circle' : 
                              type === 'warning' ? 'exclamation-circle' : 
                              type === 'danger' ? 'times-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        toast.style.position = 'fixed';
        toast.style.top = '20px';
        toast.style.right = '20px';
        toast.style.zIndex = '9999';
        toast.style.padding = '10px 20px';
        toast.style.backgroundColor = type === 'success' ? '#d4edda' : 
                                     type === 'warning' ? '#fff3cd' :
                                     type === 'danger' ? '#f8d7da' : '#d1ecf1';
        toast.style.color = type === 'success' ? '#155724' :
                           type === 'warning' ? '#856404' :
                           type === 'danger' ? '#721c24' : '#0c5460';
        toast.style.borderRadius = '4px';
        toast.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        toast.style.transition = 'all 0.3s ease';
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        }, 10);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(() => toast.remove(), 300);
        }, duration);
        
        return null;
    }
}