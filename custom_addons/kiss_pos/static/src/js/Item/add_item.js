import { Component, useState } from "@odoo/owl";
import { App } from "@odoo/owl";
import { xml } from "@odoo/owl";
import { rpc } from "@web/core/network/rpc";
import { Toast } from "../Common/toast";
import { ITEM_TYPES, ITEM_UNITS, PACKAGING_TYPES } from "../constants";

export class AddItem extends Component {
  setup() {
    this.data = useState({
      itemName: "", 
      barcode: "",
      sku: "", 
      selling_price: "", 
      category: "",
      srs_category: "",
      cost: "", 
      msrp: "", 
      status: "Not Confirmed",
      company_id: "",
      parent_company_id: "",
      vendor1_id: "",
      vendor2_id: "",
      item_type:"product",
      item_unit:"",
      inventory_tracking:false,
      packaging_type:"",
      min_order_qty:"",
      volume:"",
      weight:"",
      color:"",
      size:"",
      dimension:"",
      brand: "",
      on_hand: "",
      tax_code: "standard",
      created: "",
      age_restriction: false,
      use_ebt: false,
      in_transit: "",
      reorder_point: "",
      restock_level: "",
      image: null,
      imagePreview: null,
      activeTab: "basic-information",
      showPreFillModal: false,
      dontShowAgain: false,
      categories: [],
      companies: [],
      vendors: [],
      brands: [],
      itemTypes: ITEM_TYPES,
      itemUnits: ITEM_UNITS,
      packagingTypes: PACKAGING_TYPES
    });

    this.handleSave = this.handleSave.bind(this);
    this.confirmSave = this.confirmSave.bind(this);
    this.confirmPreFill = this.confirmPreFill.bind(this);
    this.closePreFillModal = this.closePreFillModal.bind(this);
    this.setActiveTab = this.setActiveTab.bind(this);
    this.duplicate = this.duplicate.bind(this);
    this.deleteItem = this.deleteItem.bind(this);
    this.saveDontShowAgainPreference =
      this.saveDontShowAgainPreference.bind(this);
    this.scrollToTab = this.scrollToTab.bind(this);
    this.handleScroll = this.handleScroll.bind(this);
    this.loadReferenceData();
    this.handleImageUpload = this.handleImageUpload.bind(this);
    this.triggerFileInput = this.triggerFileInput.bind(this);
  }

  mounted() {
    window.addEventListener("scroll", this.handleScroll);

    this.sections = document.querySelectorAll(".tab-section");
  }

  willUnmount() {

    window.removeEventListener("scroll", this.handleScroll);
  }

    async loadReferenceData() {
        try {
            const categoriesResult = await rpc("/web/dataset/call_kw", {
                model: "product.category",
                method: "search_read",
                args: [
                    [], 
                    ["id", "name", "parent_id"],
                ],
                kwargs: {
                    context: {},
                },
            });

            if (categoriesResult && categoriesResult.length) {
                this.data.categories = categoriesResult;
            }

            // Fetch companies
            const companiesResult = await rpc("/web/dataset/call_kw", {
                model: "res.company",
                method: "search_read",
                args: [
                    [], // Domain
                    ["id", "name"], // Fields to fetch
                ],
                kwargs: {
                    context: {},
                },
            });
            console.log("companies", companiesResult)

            if (companiesResult && companiesResult.length) {
                this.data.companies = companiesResult;
            }

            // Fetch vendors (suppliers)
            const vendorsResult = await rpc("/web/dataset/call_kw", {
                model: "res.partner",
                method: "search_read",
                args: [
                    [],
                    ["id", "name", "supplier_rank"], // Fields to fetch
                ],
                kwargs: {
                    context: {},
                },
            });
            console.log("vendors", vendorsResult)

            if (vendorsResult && vendorsResult.length) {
                console.log("vendors", vendorsResult)
                this.data.vendors = vendorsResult;
            }

            const brandsResult = await rpc("/web/dataset/call_kw", {
              model: "product.data.feed.brand",
              method: "search_read",
              args: [
                  [],
                  ["id", "name"], // Fields to fetch
              ],
              kwargs: {
                  context: {},
              },
          });
          console.log("brands", brandsResult)

          if (brandsResult && brandsResult.length) {
              console.log("brands", brandsResult)
              this.data.brands = brandsResult;
          }

        } catch (e) {
            console.error("Failed to load reference data:", e);
            this.data.error = `Error loading reference data: ${e.message}`;
        }
    }

    triggerFileInput() {
      const fileInput = document.getElementById('item-image-upload');
      if (fileInput) {
        fileInput.click();
      }
    }
  
    handleImageUpload(event) {
      const file = event.target.files[0];
      if (!file) return;
  
      if (!file.type.match('image.*')) {
        Toast.error('Please select an image file');
        return;
      }
  
      const reader = new FileReader();
      reader.onload = (e) => {
        this.data.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
  
      this.data.image = file;
    }
  
    async processAndUploadImage(itemId) {
      if (!this.data.image || !itemId) return;
      
      try {
        let finalImage = this.data.image;
        
        try {
          finalImage = await this.convertToWebP(this.data.image);
        } catch (conversionError) {
          console.warn("WebP conversion failed, using original image", conversionError);
        }
        
        const resolutions = [1920, 1024, 512, 256, 128];
        for (const resolution of resolutions) {
          await this.uploadImageToAttachment(itemId, finalImage, resolution);
        }
        
        return true;
      } catch (error) {
        console.error("Error processing image:", error);
        Toast.error(`Error uploading image: ${error.message}`);
        return false;
      }
    }
    
    async convertToWebP(imageFile) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();
        
        reader.onload = (event) => {
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0);
              
              canvas.toBlob((blob) => {
                if (!blob) {
                  reject(new Error("WebP conversion failed"));
                  return;
                }
                
                const fileName = imageFile.name.split('.')[0] + '.webp';
                const webpFile = new File([blob], fileName, { type: 'image/webp' });
                resolve(webpFile);
              }, 'image/webp', 0.85);
            } catch (err) {
              reject(err);
            }
          };
          
          img.onerror = () => {
            reject(new Error("Failed to load image"));
          };
          
          img.src = event.target.result;
        };
        
        reader.onerror = () => {
          reject(new Error("Failed to read file"));
        };
        
        reader.readAsDataURL(imageFile);
      });
    }
    
    async resizeImage(imageFile, maxWidth) {
      if (!imageFile || !(imageFile instanceof Blob)) {
        throw new Error("Invalid image file provided for resizing");
      }
      
      return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();
        
        reader.onload = (event) => {
          img.onload = () => {
            try {
              let width = img.width;
              let height = img.height;
              
              if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
              }
              
              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, width, height);
              
              canvas.toBlob((blob) => {
                if (!blob) {
                  reject(new Error("Image resizing failed"));
                  return;
                }
                
                const fileType = imageFile.type === 'image/webp' ? 'image/webp' : imageFile.type;
                const fileName = imageFile.name;
                const resizedFile = new File([blob], fileName, { type: fileType });
                resolve(resizedFile);
              }, imageFile.type, 0.85);
            } catch (err) {
              reject(err);
            }
          };
          
          img.onerror = () => {
            reject(new Error("Failed to load image for resizing"));
          };
          
          img.src = event.target.result;
        };
        
        reader.onerror = () => {
          reject(new Error("Failed to read file for resizing"));
        };
        
        reader.readAsDataURL(imageFile);
      });
    }
    
    async uploadImageToAttachment(itemId, imageFile, resolution = 1920) {
      if (!itemId || !imageFile) {
        throw new Error("Item ID and image file are required for upload");
      }
      
      try {
        const resizedImage = await this.resizeImage(imageFile, resolution);
        
        const formData = new FormData();
        formData.append('ufile', resizedImage);
        formData.append('model', 'product.template');
        formData.append('id', itemId);
        
        const baseName = imageFile.name.split('.')[0];
        const extension = imageFile.type === 'image/webp' ? 'webp' : imageFile.name.split('.').pop();
        const filename = `${baseName}_${resolution}.${extension}`;
        formData.append('filename', filename);
        
        formData.append('csrf_token', odoo.csrf_token);
    
        const response = await fetch('/web/binary/upload_attachment', {
          method: 'POST',
          body: formData,
        });
    
        const result = await response.json();
        if (result && result.length > 0) {
          const attachmentId = result[0].id;
          await this.updateAttachmentRecord(attachmentId, itemId, resolution);
          return attachmentId;
        }
        return null;
      } catch (error) {
        console.error(`Error uploading image (${resolution}):`, error);
        throw error;
      }
    }
    
    async updateAttachmentRecord(attachmentId, itemId, resolution = 1920) {
      try {
        const resField = resolution === 1920 ? 'image_1920' : 
                        resolution === 1024 ? 'image_1024' :
                        resolution === 512 ? 'image_512' :
                        resolution === 256 ? 'image_256' : 
                        resolution === 128 ? 'image_128' : 'image_1920';
        
        await rpc("/web/dataset/call_kw", {
          model: "ir.attachment",
          method: "write",
          args: [
            [attachmentId], 
            {
              res_id: itemId,
              res_model: "product.template",
              res_field: resField,
              name: resField,
              description: `Product Image (${resolution}px)`,
              index_content: "image"
            },
          ],
          kwargs: {
            context: {},
          },
        });
      } catch (error) {
        console.error(`Error updating attachment record (${resolution}):`, error);
        throw error;
      }
    }

  // Handle scroll event to update active tab
  handleScroll() {
    const scrollPosition = window.scrollY;

    // Find the current section in viewport
    let currentSection = this.sections[0];

    this.sections.forEach((section) => {
      const sectionTop = section.offsetTop - 100; // Offset for header/navigation
      if (scrollPosition >= sectionTop) {
        currentSection = section;
      }
    });

    if (currentSection) {
      // Get tab ID from section and update active tab
      const tabId = currentSection.getAttribute("data-tab");
      if (tabId && this.data.activeTab !== tabId) {
        this.data.activeTab = tabId;
      }
    }
  }

  // Scroll to specific tab section
  scrollToTab(tabId) {
    const section = document.querySelector(`[data-tab="${tabId}"]`);
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
      this.data.activeTab = tabId;
    }
  }

  confirmPreFill() {
    // Logic to pre-fill item details
    console.log("Pre-filling item details...");

    // Optionally store user preference to not show the modal again
    this.saveDontShowAgainPreference();
    this.confirmSave();

    this.data.showPreFillModal = false; // Close modal after pre-filling
  }

  closePreFillModal() {
    this.data.showPreFillModal = false;
  }

  saveDontShowAgainPreference() {
    // If the user checked the "Don't show this message again" checkbox
    if (this.data.dontShowAgain) {
      localStorage.setItem("dontShowPreFillModal", "true"); // Store in localStorage or sessionStorage
    }
  }

  async handleSave() {
    // Show the pre-fill item details modal before saving
    if (!localStorage.getItem("dontShowPreFillModal")) {
      this.data.showPreFillModal = true;
    } else {
      this.data.showPreFillModal = false;
      this.confirmSave();
    }
  }

  navigateBack() {
    if (this.props.onNavigate) {
      this.props.onNavigate("/item_list");
    } else {
      // Fallback to direct navigation if onNavigate prop is not available
      window.history.pushState({}, "", "/item_list");
      // Trigger a popstate event to update the route in MainLayout
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  }

  async confirmSave() {
    try {
      this.data.showPreFillModal = false;
      const formData = {
        item_name: this.data.itemName,
        barcode: this.data.barcode,
        sku: this.data.sku,
        selling_price: this.data.selling_price,
        cost: this.data.cost,
        msrp: this.data.msrp,
        status: this.data.status,
        company_id: this.data.company_id,
        parent_company_id: this.data.parent_company_id,
        brand: this.data.brand,
        on_hand: this.data.on_hand,
        tax_code: this.data.tax_code,
        age_restriction: this.data.age_restriction,
        use_ebt: this.data.use_ebt,
        categ_id: this.data.category,
        volume:this.data.volume,
        weight:this.data.weight,
        vendor1_id:this.data.vendor1_id,
        vendor2_id:this.data.vendor2_id,
        item_type:this.data.item_type,
        item_unit:this.data.item_unit,
        packaging_type:this.data.packaging_type,
        srs_category:this.data.srs_category,
        inventory_tracking:this.data.inventory_tracking,
        in_transit:this.data.in_transit,
        reorder_point:this.data.reorder_point,
        restock_level:this.data.restock_level,
        min_order_qty:this.data.min_order_qty,
        color:this.data.color,
        size:this.data.size,
        dimension:this.data.dimension,
      };

      console.log("Form Data:", formData); // Log to see if all fields are correct

      // Send the form data to the server
      const res = await fetch("/api/add_item", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          params: formData,
        }),
      });

      const data = await res.json();
      console.log("Response from server:", data); // Log the response

      // Check for success property directly in the result property of the response
      if (data.result && data.result.success) {
        const itemId = data.result.item_id;
    
        if (this.data.image && itemId) {
          await this.processAndUploadImage(itemId);
        }
        
        Toast.success("Item created successfully!");
        this.navigateBack();
      } else {
        // Handle error
        const errorMsg =
          (data.result && data.result.error) || "An error occurred";
        Toast.error(`${errorMsg}`);
      }
    } catch (error) {
      Toast.error(`Error occurred: ${error}`);
      console.error("Error occurred:", error);;
    }
  }

  setActiveTab(tabId) {
    this.data.activeTab = tabId;
    this.scrollToTab(tabId);
  }

  duplicate() {
    // Logic to duplicate the item
    console.log("Duplicating item");
    // Implement the actual duplication logic here
  }

  deleteItem() {
    // Logic to delete the item
    console.log("Deleting item");
    // Implement the actual deletion logic here
  }

  // Main component template

  static template = xml`
  <div class="container-fluid px-4 pt-4">
    <!-- Breadcrumb -->
    <div class="text-muted small mb-0">
      <a href="/" class="text-decoration-none text-muted">Home</a> / <a href="/item_list"
        class="text-decoration-none text-muted">Item Management</a> / <strong>Add New Item</strong>
    </div>
  
    <!-- Title and Top Bar -->
    <div class="p-4">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h2 class="fs-28 fw-bold mb-0">Add New Item</h2>
        <div>
          <button class="btn btn-primary" t-on-click="handleSave">
            Save Changes
          </button>
        </div>
      </div>
  
  
      <!-- Fixed position tab navigation - This stays visible when scrolling -->
      <div class="sticky-top bg-white pt-2">
        <ul class="nav nav-tabs mb-4">
          <li class="nav-item">
            <a class="nav-link" t-att-class="{'active': data.activeTab === 'basic-information'}"
              href="#" t-on-click.prevent="() => setActiveTab('basic-information')">
              Basic Information
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link" t-att-class="{'active': data.activeTab === 'product-detail'}"
              href="#" t-on-click.prevent="() => setActiveTab('product-detail')">
              Product Detail
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link" t-att-class="{'active': data.activeTab === 'inventory-vendor'}"
              href="#" t-on-click.prevent="() => setActiveTab('inventory-vendor')">
              Inventory &amp; Vendor
            </a>
          </li>
        </ul>
      </div>
  
      <!-- Save Changes Confirmation Modal -->
      <div t-if="data.showPreFillModal" class="modal fade show"
        style="display: block; background-color: rgba(0,0,0,0.5);"
        tabindex="-1" role="dialog" aria-labelledby="preFillModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered" role="document">
          <div class="modal-content">
  
            <div class="modal-header">
              <h5 class="modal-title" id="preFillModalLabel">Would you like to pre-fill item details?</h5>
              <button type="button" class="btn-close" aria-label="Close"
                t-on-click="closePreFillModal"></button>
            </div>
  
            <div class="modal-body">
              <div class="form-check">
                <input class="form-check-input" type="checkbox" id="dontShowAgain"
                  t-model="data.dontShowAgain" />
                <label class="form-check-label" for="dontShowAgain">
                  Don't show this message again.
                </label>
              </div>
            </div>
  
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" t-on-click="closePreFillModal">No</button>
              <button type="button" class="btn btn-primary" t-on-click="confirmPreFill">Yes</button>
            </div>
  
          </div>
        </div>
      </div>
      <!-- All tab content sections displayed together -->
      <div class="tab-sections">
        <!-- Basic Information Section -->
        <div class="tab-section" data-tab="basic-information">
          <div class="tab-content">
            <h4 class="mb-3">Basic Information</h4>
            <div class="card mb-4">
              <div class="card-body">
                <h5 class="mb-3">Item Detail</h5>
                <div class="row">
                  <div class="col-md-4">
                    <div class="form-group mb-3">
                      <label for="barcode" class="form-label">Barcode *</label>
                      <div class="input-group">
                        <input type="text" class="form-control" id="barcode" t-model="data.barcode"
                          placeholder="ABCD-1234" t-att-required="true" />
                        <button class="btn btn-outline-primary" type="button">
                          <i class="fa fa-barcode"></i> Generate </button>
                      </div>
                    </div>
                  </div>
                  <div class="col-md-4">
                    <div class="form-group mb-3">
                      <label for="sku" class="form-label">SKU *</label>
                      <input type="text" class="form-control" id="sku" t-model="data.sku"
                        placeholder="123456" t-att-required="true" />
                    </div>
                  </div>
                  <div class="col-md-4">
                    <div class="form-group mb-3">
                      <label class="form-label text-center">Item Photo</label>
                      <input type="file" id="item-image-upload" accept="image/*" 
                        style="display: none;" t-on-change="handleImageUpload" />
                      
                      <div class="position-relative">
                        <div class="text-center rounded-circle bg-blue-200 d-flex align-items-center justify-content-center" 
                          style="width: 120px; height: 120px; overflow: hidden;">
                          <img t-if="data.imagePreview" t-att-src="data.imagePreview" 
                            style="width: 100%; height: 100%; object-fit: cover;" />
                          <i t-if="!data.imagePreview" class="fa fa-camera text-primary" style="font-size: 45px;"></i>
                        </div>
                        
                        <button class="btn btn-primary rounded-circle position-absolute" 
                          style="bottom: -10px; left:80px; width: 36px; height: 36px;"
                          t-on-click="triggerFileInput">
                          <i class="fa fa-pencil" style="font-size: 19px;"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
  
                <div class="form-group mb-3">
                  <label for="item_name" class="form-label">Item Name *</label>
                  <input type="text" class="form-control" id="item_name" t-model="data.itemName"
                    placeholder="Luxurious Nails" t-att-required="true" />
                </div>
  
                <div class="row mb-3">
                  <div class="col-md-4">
                    <div class="form-group">
                      <label for="company_id" class="form-label">Company</label>
                      <select class="form-select" id="company_id" t-model="data.company_id">
                        <option value="">Select Company</option>
                        <t t-foreach="data.companies" t-as="company" t-key="company.id">
                          <option t-att-value="company.id">
                            <t t-esc="company.name" />
                          </option>
                        </t>
                      </select>
                    </div>
                  </div>
                  <div class="col-md-4">
                    <div class="form-group">
                      <label for="parent_company_id" class="form-label">Parent Company</label>
                      <select class="form-select" id="parent_company_id"
                        t-model="data.parent_company_id">
                        <option value="">Select Parent Company</option>
                        <t t-foreach="data.companies" t-as="company" t-key="company.id">
                          <option t-att-value="company.id">
                            <t t-esc="company.name" />
                          </option>
                        </t>
                      </select>
                    </div>
                  </div>
                  <div class="col-md-4">
                    <div class="form-group">
                      <label for="brand" class="form-label">Brand</label>
                      <select class="form-select" id="brand" t-model="data.brand">
                        <option value="">Select Brand</option>
                        <t t-foreach="data.brands" t-as="brand" t-key="brand.id">
                          <option t-att-value="brand.id">
                            <t t-esc="brand.name" />
                          </option>
                        </t>
                      </select>
                    </div>
                  </div>
                  <div class="col-md-4">
                    <div class="form-group mb-3">
                      <label for="status" class="form-label">Status</label>
                      <select class="form-select" id="status" t-model="data.status">
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Discontinued">Discontinued</option>
                        <option value="Not Confirmed">Not Confirmed</option>
                      </select>
                    </div>
                  </div>                  
                </div>
  
                <div class="row">
                  <div class="col-md-8">
                    <div class="form-group mb-3">
                      <label class="form-label d-block">Options</label>
                      <div class="form-check form-check-inline mt-2">
                        <input class="form-check-input" type="checkbox" id="age_restriction"
                          t-model="data.age_restriction" />
                        <label class="form-check-label" for="age_restriction">Age Restriction</label>
                      </div>
                      <div class="form-check form-check-inline">
                        <input class="form-check-input" type="checkbox" id="use_ebt"
                          t-model="data.use_ebt" />
                        <label class="form-check-label" for="use_ebt">Use EBT</label>
                      </div>
                    </div>
                  </div>
                </div>
  
                <h5 class="mb-3 mt-4">Price</h5>
                <div class="row">
                  <div class="col-md-4">
                    <div class="form-group mb-3">
                      <label for="selling_price" class="form-label">Selling Price *</label>
                      <div class="input-group">
                        <span class="input-group-text">$</span>
                        <input type="number" class="form-control" id="selling_price"
                          t-model="data.selling_price" placeholder="0.00" step="0.01"
                          t-att-required="true" />
                      </div>
                    </div>
                  </div>
                  <div class="col-md-4">
                    <div class="form-group mb-3">
                      <label for="cost" class="form-label">Cost</label>
                      <div class="input-group">
                        <span class="input-group-text">$</span>
                        <input type="number" class="form-control" id="cost"
                          t-model="data.cost" placeholder="0.00" step="0.01" />
                      </div>
                    </div>
                  </div>
                  <div class="col-md-4">
                    <div class="form-group mb-3">
                      <label for="msrp" class="form-label">MSRP</label>
                      <div class="input-group">
                        <span class="input-group-text">$</span>
                        <input type="number" class="form-control" id="msrp"
                          t-model="data.msrp" placeholder="0.00" step="0.01" />
                      </div>
                    </div>
                  </div>
                </div>
  
                <div class="form-group mb-3">
                  <label class="form-label">Tax Code</label>
                  <div>
                    <div class="form-check form-check-inline">
                      <input class="form-check-input" type="radio" name="tax_code" t-model="data.tax_code" id="standard"
                        value="standard" />
                      <label class="form-check-label" for="standard">Standard</label>
                    </div>
                    <div class="form-check form-check-inline">
                      <input class="form-check-input" type="radio" name="tax_code" t-model="data.tax_code" id="reduced"
                        value="reduced" />
                      <label class="form-check-label" for="reduced">Reduced</label>
                    </div>
                    <div class="form-check form-check-inline">
                      <input class="form-check-input" type="radio" name="tax_code" t-model="data.tax_code" id="zero"
                        value="zero" />
                      <label class="form-check-label" for="zero">Zero</label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
  
        <!-- Product Detail Section -->
        <div class="tab-section mb-5" data-tab="product-detail">
          <div class="tab-content">
            <h4 class="mb-3">Product Detail</h4>
            <div class="card mb-4">
              <div class="card-body">
                <h5 class="mb-3">Item Attribute</h5>
                <div class="row mb-3">
                  <div class="col-md-4">
                    <div class="form-group">
                      <label for="item_type" class="form-label">Item Type</label>
                      <select class="form-select" id="item_type" t-model="data.item_type">
                        <option value="">Select Item Type</option>
                        <t t-foreach="data.itemTypes" t-as="types" t-key="types.id">
                          <option t-att-value="types.id">
                            <t t-esc="types.name" />
                          </option>
                        </t>
                      </select>
                    </div>
                  </div>
                  <div class="col-md-4">
                    <div class="form-group">
                      <label for="packaging_type" class="form-label">Packaging Type</label>
                      <select class="form-select" id="packaging_type" t-model="data.packaging_type">
                        <option value="">Select Packaging Type</option>
                        <t t-foreach="data.packagingTypes" t-as="packaging" t-key="packaging.id">
                          <option t-att-value="packaging.id"> 
                            <t t-esc="packaging.name" />
                          </option>
                        </t>
                      </select>
                    </div>
                  </div>
                  <div class="col-md-4">
                    <div class="form-group">
                      <label for="item_unit" class="form-label">Item Unit</label>
                      <select class="form-select" id="item_unit" t-model="data.item_unit">
                        <option value="">Select Unit</option>
                        <t t-foreach="data.itemUnits" t-as="itemUnits" t-key="itemUnits.id">
                          <option t-att-value="itemUnits.id">
                            <t t-esc="itemUnits.name" />
                          </option>
                        </t>
                      </select>
                    </div>
                  </div>
                </div>
  
                <div class="row">
                  <div class="col-md-2">
                    <div class="form-group mb-3">
                      <label for="color" class="form-label">Color</label>
                      <input type="text" class="form-control" id="color" t-model="data.color" placeholder="Enter Color" />
                    </div>
                  </div>
                  <div class="col-md-2">
                    <div class="form-group mb-3">
                      <label for="size" class="form-label">Size</label>
                      <input type="text" class="form-control" id="size" t-model="data.size" placeholder="Enter Size" />
                    </div>
                  </div>
                  <div class="col-md-2">
                    <div class="form-group mb-3">
                      <label for="dimension" class="form-label">Dimension</label>
                      <input type="text" class="form-control" id="dimension" t-model="data.dimension"
                        placeholder="Enter Dimension" />
                    </div>
                  </div>
                  <div class="col-md-2">
                    <div class="form-group mb-3">
                      <label for="volume" class="form-label">Volume</label>
                      <input type="text" class="form-control" id="volume" placeholder="Enter Volume" t-model="data.volume"/>
                    </div>
                  </div>
                  <div class="col-md-2">
                    <div class="form-group mb-3">
                      <label for="weight" class="form-label">Weight</label>
                      <input type="text" class="form-control" id="weight" placeholder="Enter Weight" t-model="data.weight"/>
                    </div>
                  </div>
                </div>
  
                <h5 class="mb-3 mt-4">Category</h5>
                <div class="row">
                  <div class="col-md-6">
                    <div class="form-group mb-3">
                      <label for="category" class="form-label">Category</label>
                      <select class="form-select" id="category" t-model="data.category">
                        <option value="">Select Category</option>
                        <t t-foreach="data.categories" t-as="category" t-key="category.id">
                          <option t-att-value="category.id">
                            <t t-esc="category.name" />
                          </option>
                        </t>
                      </select>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="form-group mb-3">
                      <label for="srs_category" class="form-label">SRS Category (Suggested)</label>
                      <div class="input-group">
                        <input type="text" class="form-control" id="srs_category" t-model="data.srs_category"
                          placeholder="Add Product Barcode" />
                        <button class="btn btn-outline-secondary" type="button">Hide</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
  
        <!-- Inventory & Vendor Section -->
        <div class="tab-section mb-5" data-tab="inventory-vendor">
          <div class="tab-content">
            <h4 class="mb-3">
              Inventory &amp; Vendor
            </h4>
            <div class="card mb-4">
              <div class="card-body">
                <h5 class="mb-3">
                  Inventory Information
                </h5>
                <div class="row mb-3">
                  <div class="col-md-4">
                    <div class="form-group">
                      <label class="form-label">On Hand</label>
                      <input type="number" class="form-control" id="on_hand" t-model="data.on_hand" placeholder="0" />
                    </div>
                  </div>
                  <div class="col-md-4">
                    <div class="form-group">
                      <label for="in_transit" class="form-label">In Transit</label>
                      <input type="number" class="form-control" id="in_transit" t-model="data.in_transit" placeholder="0" />
                    </div>
                  </div>
                  <div class="col-md-4">
                    <div class="form-group">
                      <label for="reorder_point" class="form-label">Reorder Point</label>
                      <input type="number" class="form-control" id="reorder_point" t-model="data.reorder_point" placeholder="0" />
                    </div>
                  </div>
                </div>
                <div class="row mb-3">
                  <div class="col-md-6">
                    <div class="form-group">
                      <label for="restock_level" class="form-label">Restock Level</label>
                      <input type="number" class="form-control" id="restock_level" t-model="data.restock_level" placeholder="0" />
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="form-group">
                      <label for="min_order_qty" class="form-label">Minimum Order Quantity</label>
                      <input type="number" class="form-control" id="min_order_qty" t-model="data.min_order_qty" placeholder="0" />
                    </div>
                  </div>
                </div>
                <div class="row">
                  <div class="col-md-12">
                    <div class="form-check">
                      <input class="form-check-input" type="checkbox" id="inventory_tracking" t-model="data.inventory_tracking" />
                      <label class="form-check-label" for="inventory_tracking">Inventory Tracking</label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="card">
              <div class="card-body">
                <h5 class="mb-3">Vendor</h5>
                <div class="row mb-3">
                  <div class="col-md-6">
                    <div class="form-group">
                      <label for="vendor1_id" class="form-label">Vendor 1</label>
                      <select class="form-select" id="vendor1_id" t-model="data.vendor1_id">
                        <option value="">Select Code (Name)</option>
                        <t t-foreach="data.vendors" t-as="vendor" t-key="vendor.id">
                          <option t-att-value="vendor.id">
                            <t t-esc="vendor.name" />
                          </option>
                        </t>
                      </select>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="form-group">
                      <label for="vendor2_id" class="form-label">Vendor 2</label>
                      <select class="form-select" id="vendor2_id" t-model="data.vendor2_id">
                        <option value="">Select Code (Name)</option>
                        <t t-foreach="data.vendors" t-as="vendor" t-key="vendor.id">
                          <option t-att-value="vendor.id">
                            <t t-esc="vendor.name" />
                          </option>
                        </t>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
    const el = document.getElementById("add_item-container");
    if (el) {
        const app = new App(AddItem);
        app.mount(el);
    }
});
