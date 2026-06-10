// src/contexts/ProductContext.js
import { createDataContext } from './createDataContext';
import { productService } from 'services/product.service';

const adapter = {
  getAll: (params) => productService.getProducts(params),
  getOne: (id) => productService.getProduct(id),
  create: (data) => productService.createProduct(data),
  update: (id, data) => productService.updateProduct(id, data),
  delete: (id) => productService.deleteProduct(id),
};

export const { Provider: ProductProvider, useResource: useProducts } = createDataContext(adapter, 'Product');