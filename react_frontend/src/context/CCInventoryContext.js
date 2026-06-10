// src/contexts/CollectionCenterContext.js
import { createDataContext } from './createDataContext';
import { collectionCenterService } from 'services/collection-center.service';

const adapter = {
    getAll: (params) => collectionCenterService.getCenters(params),
    getOne: (id) => collectionCenterService.getCenter(id),
    create: (data) => collectionCenterService.createCenter(data),
    update: (id, data) => collectionCenterService.updateCenter(id, data),
    delete: (id) => collectionCenterService.deleteCenter(id),
};

export const {
    Provider: CollectionCenterProvider,
    useResource: useCollectionCenters
} = createDataContext(adapter, 'CollectionCenter');