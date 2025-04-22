export const Toast = {
    show(message, type = 'success', duration = 3000) {
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
        
        let container = document.querySelector('.o_toast_container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'o_toast_container';
            container.style.position = 'fixed';
            container.style.top = '20px';
            container.style.right = '20px';
            container.style.zIndex = '9999';
            document.body.appendChild(container);
        }
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        }, 10);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                toast.remove();
                if (container.children.length === 0) {
                    container.remove();
                }
            }, 300);
        }, duration);
        
        return toast;
    }
};