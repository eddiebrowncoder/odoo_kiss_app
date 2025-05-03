/** @odoo-module **/
import { Component, useState, onMounted } from "@odoo/owl";
import { xml } from "@odoo/owl";
import { App } from "@odoo/owl";
import { rpc } from "@web/core/network/rpc";


console.log("✅ JS Loaded");
console.log("Checking updated code");

export class CategoryList extends Component {
    setup() {
        this.categories = useState([]);
        this.searchTerm = useState({ value: "" });
        this.state = useState({
            categoryToDelete: "",
            selectedCategoryId: null,
            showDeleteModal: false,
            isLoading: false,
            errorMessage: null
        });
        this.allCategories = []; // Store all categories for filtering
        this.expandedCategories = useState({});
        // this.loadCategories();

        onMounted(async () => {
            console.log("========== onMounted ==========")
            await this.loadCategories();
        });
    }

    toggleExpand(categoryId) {
        if (this.expandedCategories[categoryId]) {
            delete this.expandedCategories[categoryId];
        } else {
            this.expandedCategories[categoryId] = true;
        }
    }

    isExpanded(categoryId) {
        return !!this.expandedCategories[categoryId];
    }

    getIndentation(level) {
        return `padding-left: ${level * 20}px;`;  
    }

    handleSearchInput(event) {
        this.searchTerm.value = event.target.value;
        this.applySearch();
    }

    // Replace openModal with navigation to new page
    navigateToAddCategory(categoryId = null) {
        console.log("categoryId: ", categoryId)
        const url = categoryId ? `/category/new?category_id=${categoryId}` : '/category/new';

        if (this.props.onNavigate) {
            this.props.onNavigate(url);
        } else {
            // Fallback to direct navigation if onNavigate prop is not available
            // window.history.pushState({}, '', '/category/new');
            window.history.pushState({}, '', url);

            // Trigger a popstate event to update the route in MainLayout
            window.dispatchEvent(new PopStateEvent('popstate'));
        }
    }

    // New method to filter categories based on search term
    applySearch() {
        const searchText = this.searchTerm.value.trim();
        console.log("🔍 Searching for:", searchText);
        
        if (!searchText) {
            console.log("🔄 Resetting to all categories");
            this.categories.splice(0, this.categories.length, ...this.allCategories);
            console.log("✅ Displayed categories after reset:", this.categories.length);
            return;
        }
        
        const term = searchText.toLowerCase();
        // Filter categories that match the search term
        const filtered = this.allCategories.filter(category => 
            category.name.toLowerCase().includes(term)
        );
        
        console.log(`🔍 Found ${filtered.length} matching categories`);
        this.categories.splice(0, this.categories.length, ...filtered);
        console.log("✅ Updated displayed categories");
    }

    async loadCategories() {
        console.log("📦 Fetching from /api/category_list...");
        try {
            const res = await fetch('/api/category_list');
            const data = await res.json();
            console.log("🔍 loadCategories Raw category data:", data);
            
            // Process the data to create a hierarchical structure
            const categoriesMap = new Map();
            const rootCategories = [];
            
            // First, create a map of all categories by ID
            data.categories.forEach(category => {
                categoriesMap.set(category.id, {...category, level: 0, children: []});
            });
            
            // Then, build the hierarchy
            data.categories.forEach(category => {
                const processedCategory = categoriesMap.get(category.id);
                
                if (category.parent_id) {
                    const parent = categoriesMap.get(category.parent_id);
                    if (parent) {
                        // Set the indent level based on parent
                        processedCategory.level = parent.level + 1;
                        parent.children.push(processedCategory);
                    } else {
                        rootCategories.push(processedCategory);
                    }
                } else {
                    rootCategories.push(processedCategory);
                }
            });
            
            // Create a flat list with proper indentation levels
            const flatList = [];
            
            // Helper function to flatten the hierarchy
            const flattenCategories = (categories, level = 0) => {
                categories.forEach(category => {
                    const displayCategory = {...category, level};
                    flatList.push(displayCategory);
                    
                    if (category.children && category.children.length > 0) {
                        flattenCategories(category.children, level + 1);
                    }
                });
            };
            
            flattenCategories(rootCategories);

            // Store all categories for filtering
            this.allCategories = [...flatList];
            console.log("✅ All categories stored for filtering:", this.allCategories.length);
            
            // Update the UI with all categories initially
            this.categories.splice(0, this.categories.length, ...flatList);
            console.log("✅ Categories:", this.categories);
        } catch (e) {
            console.error("❌ Failed to load:", e);
        }
    }

    openDeleteModal(categoryId, categoryName) {
        this.state.categoryToDelete = categoryName;
        console.log("Delete Category Name ================== ", categoryName)
        this.state.selectedCategoryId = categoryId;
        this.state.showDeleteModal = true;
    }

    closeDeleteModal() {
        this.state.showDeleteModal = false;
        this.state.selectedCategoryId = null;
        this.state.categoryToDelete = "";
        this.state.errorMessage = null;
    }

     // Add this helper method to get child count for a category
     getChildCount(category) {
        if (category.children && category.children.length > 0) {
            return category.children.length;
        }
        return 0;
    }

    async confirmDelete() {
        if (!this.state.selectedCategoryId) return;
        
        this.state.isLoading = true;
        this.state.errorMessage = null;
        
        try {
            const result = await rpc('/api/category/delete', {
                category_id: this.state.selectedCategoryId
            });
            
            console.log("Delete API response:", result);
            
            if (result.success) {
                // Close the modal
                this.closeDeleteModal();
                
                // Refresh the categories list
                await this.loadCategories();
                
                // Show success message (optional)
                // You could use Odoo's notification system here
            } else {
                // Show error in the modal
                this.state.errorMessage = result.message || "Failed to delete category";
            }
        } catch (error) {
            console.error("Error deleting category:", error);
            this.state.errorMessage = "Network error occurred";
        } finally {
            this.state.isLoading = false;
        }
    }

    static template = xml/* xml */ `
<div class="container-fluid px-4 py-3">
    <!-- Breadcrumb -->
    <div class="mb-1">
        <nav aria-label="breadcrumb">
            <ol class="breadcrumb mb-0 px-0">
                <li class="breadcrumb-item"><a href="#" class="text-decoration-none text-muted">Home</a></li>
                <li class="breadcrumb-item"><a href="#" class="text-decoration-none text-muted">Items</a></li>
                <li class="breadcrumb-item active">Category Management</li>
            </ol>
        </nav>
    </div>

    <!-- Header -->
    <div class="d-flex justify-content-between align-items-center mb-4">
        <div class="page-heading-wrapper"> 
                <p class="heading">Category Management</p>
        </div>
        <button class="btn btn-primary shadow-sm fw-normal" t-on-click="() => this.navigateToAddCategory()">
            <i class="fa fa-plus me-2 "></i> Add Category
        </button>
    </div>

    <!-- Filter and Search -->
    <div class="d-flex align-items-center mb-4">
        <div class="me-4">
            <button class="btn btn-light border d-flex align-items-center gap-2 rounded-2 px-3 py-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                    <path d="M18.75 12.75h1.5a.75.75 0 0 0 0-1.5h-1.5a.75.75 0 0 0 0 1.5ZM12 6a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 12 6ZM12 18a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 12 18ZM3.75 6.75h1.5a.75.75 0 1 0 0-1.5h-1.5a.75.75 0 0 0 0 1.5ZM5.25 18.75h-1.5a.75.75 0 0 1 0-1.5h1.5a.75.75 0 0 1 0 1.5ZM3 12a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 3 12ZM9 3.75a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5ZM12.75 12a2.25 2.25 0 1 1 4.5 0 2.25 2.25 0 0 1-4.5 0ZM9 15.75a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5Z" />
                </svg>
                Filter
            </button>
        </div>
       <div class="flex-grow-1">
            <div class="input-group">
                <span class="input-group-text border border-end-0 rounded-start-2 bg-white">
                    <i class="fa fa-search text-muted"></i>
                </span>
                <input 
                    type="text" 
                    class="form-control border border-start-0 rounded-end-2" 
                    placeholder="Search Category..." 
                    t-on-input="handleSearchInput"
                    t-att-value="searchTerm.value"
                />
            </div>
        </div>
    </div>
    
    <!-- Table -->
    <table class="table">
        <thead class="category-table-header category-header-label">
            <tr>
                <th>Category</th>
                <th>Created By</th>
                <th>Created Date</th>
                <th>Modified By</th>
                <th>Modified Date</th>
                <th>Status</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            <t t-foreach="categories" t-as="category" t-key="category.id">
               <t t-if="category.level === 0 || isExpanded(category.parent_id)">
                <tr>
                   <td>
                                <div class="d-flex align-items-center">
                                    <span t-if="category.level > 0" t-att-style="'margin-left: ' + (category.level * 20) + 'px;'"></span>
                                    
                                    <!-- Expandable icon for parents -->
                                    <span t-if="category.children &amp;&amp; category.children.length > 0" 
                                          class="me-2 cursor-pointer"
                                          t-on-click="() => this.toggleExpand(category.id)">
                                        <i t-att-class="isExpanded(category.id) ? 'fa fa-caret-down' : 'fa fa-caret-right'"></i>
                                    </span>
                                    
                                    <span t-att-class="category.children &amp;&amp; category.children.length > 0 ? 'parent-category-text-style' : 'child-category-text-style'">
                                        <t t-esc="category.name"/>
                                        <t t-if="category.children &amp;&amp; category.children.length > 0">
                                            (<t t-esc="category.children.length"/>)
                                        </t>
                                    </span>
                                </div>
                            </td>
                    <td class="child-category-text-style"><t t-esc="category.created_by"/></td>
                    <td class="child-category-text-style"><t t-esc="category.created_date"/></td>
                    <td class="child-category-text-style"><t t-esc="category.modified_by"/></td>
                    <td class="child-category-text-style"><t t-esc="category.modified_date"/></td>
                    <td>
                        <span t-att-class="category.status == 'Active' ? 'badge text-success bg-success-subtle' : 'badge bg-light'">
                            <t t-esc="category.status"/>
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-link btn-sm text-primary" t-on-click="() => this.openDeleteModal(category.id,category.name)">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="20" >
                                <path fill-rule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951Zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 0 0-6 0v-.113c0-.794.609-1.428 1.364-1.452Zm-.355 5.945a.75.75 0 1 0-1.5.058l.347 9a.75.75 0 1 0 1.499-.058l-.346-9Zm5.48.058a.75.75 0 1 0-1.498-.058l-.347 9a.75.75 0 0 0 1.5.058l.345-9Z" clip-rule="evenodd" />
                            </svg>
                        </button>
                        <button class="btn btn-link btn-sm text-primary" t-on-click="() => this.navigateToAddCategory(category.id)">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="20" >
                                <path d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32L19.513 8.2Z" />
                            </svg>
                        </button>
                    </td>
                </tr>
                 </t>
            </t>
        </tbody>
    </table>

    <!-- Delete Confirmation Modal -->
    <div t-if="state.showDeleteModal" class="modal fade show" 
        style="display: block; background-color: rgba(0,0,0,0.5);" 
        tabindex="-1" aria-modal="true" role="dialog">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content p-4">
                <div class="d-flex align-items-center mb-3">
                    <button type="button" class="btn btn-link text-primary p-0 me-3" t-on-click="closeDeleteModal" aria-label="Close">
                        <i class="fa fa-times" style="font-size: 24px; color: #0d6efd;"></i>
                    </button>
                    <h5 class="modal-title fs-4 m-0">Delete <t t-esc="state.categoryToDelete"/> Category</h5>
                </div>
                <div class="modal-body px-0">
                    <p class="text-secondary mb-3">Are you sure you want to delete the selected category?</p>
                    <p class="text-secondary mb-3">
                        Deleting this category will not remove any subcategories, but it will unlink 
                        them from their parent category. Items currently assigned to this category 
                        will remain, but their category field will be cleared.
                    </p>
                    <p class="mb-4">
                        This action is <span class="text-danger">irreversible</span>.
                    </p>
                </div>
                <div class="modal-footer border-0 px-0 pt-2">
                    <div class="d-flex w-100">
                        <button type="button" class="btn btn-light flex-fill me-2 py-2" 
                                style="background-color: #f2f2f2;" t-on-click="closeDeleteModal">
                            Cancel
                        </button>
                        <button type="button" class="btn btn-danger flex-fill py-2" 
                                t-on-click="confirmDelete" t-att-disabled="state.isLoading">
                            <span t-if="state.isLoading" class="spinner-border spinner-border-sm me-2" 
                                role="status" aria-hidden="true"></span>
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>

</div>
`
}

document.addEventListener("DOMContentLoaded", () => {
    const el = document.getElementById("category_list-container");
    console.log("🎯 Mount target:", el);
    if (el) {
        console.log("🚀 Mounting OWL App...");
        const app = new App(CategoryList);
        app.mount(el);
    }
});