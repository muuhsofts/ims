import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export const showSnackbar = ({ type, message }) => {
    toast[type || 'info'](message, {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
    });
};