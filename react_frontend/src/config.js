// src/config.js
const baseURLApi = "http://localhost:8000/api";
const redirectUrl = typeof window !== "undefined"
    ? window.location.origin
    : "https://yourdomain.com";

const appConfig = {
  baseURLApi,
  redirectUrl,
  remote: "https://sing-generator-node.flatlogic.com",
  auth: {
    email: 'admin@example.com',
    password: 'password',
  },
  app: {
    colors: {
      dark: '#002B49',
      light: '#FFFFFF',
      sea: '#004472',
      sky: '#E9EBEF',
      wave: '#D1E7F6',
      rain: '#CCDDE9',
      middle: '#D7DFE6',
      black: '#13191D',
      salat: '#21AE8C',
    },
  },
};

export default appConfig;