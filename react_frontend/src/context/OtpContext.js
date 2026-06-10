// src/contexts/OtpContext.js
import { createDataContext } from './createDataContext';
import { otpService } from 'services/otp.service';

const adapter = {
    getAll: (params) => otpService.getOtps(params),
    getOne: null,
    create: null,
    update: null,
    delete: null,
};

export const { Provider: OtpProvider, useResource: useOtps } = createDataContext(adapter, 'Otp');