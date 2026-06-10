// src/contexts/DistributionContext.js
import { createDataContext } from './createDataContext';
import { distributionService } from 'services/distribution.service';

const adapter = {
    getAll: (params) => distributionService.getDistributions(params),
    getOne: (id) => distributionService.getDistribution(id),
    create: (data) => distributionService.createDistribution(data),
    update: (id, data) => distributionService.updateDistribution(id, data),
    delete: (id) => distributionService.deleteDistribution(id),
};

export const { Provider: DistributionProvider, useResource: useDistributions } = createDataContext(adapter, 'Distribution');