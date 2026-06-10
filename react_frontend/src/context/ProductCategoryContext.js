// src/contexts/ProductCategoryContext.js
import { createDataContext } from './createDataContext';
import { productCategoryService } from 'services/product-category.service';

const adapter = {
    getAll: async (params) => {
        const response = await productCategoryService.getCategories(params);
        if (response.data?.success) {
            // Your API returns: { success: true, data: { current_page:1, data: [...], total:12 } }
            return {
                data: response.data.data.data,   // array of categories
                total: response.data.data.total,
            };
        }
        throw new Error('Failed to fetch categories');
    },
    getOne: (id) => productCategoryService.getCategory(id),
    create: (data) => productCategoryService.createCategory(data),
    update: (id, data) => productCategoryService.updateCategory(id, data),
    delete: (id) => productCategoryService.deleteCategory(id),
};

export const { Provider: ProductCategoryProvider, useResource: useProductCategories } = createDataContext(adapter, 'ProductCategory');