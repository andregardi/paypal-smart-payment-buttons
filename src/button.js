/* @flow */

import { querySelectorAll, onClick } from 'belter/src';

import { renderCheckout } from './checkout';

export function setupButton() {

    if (!window.paypal) {
        throw new Error(`PayPal library not loaded`);
    }

    querySelectorAll('.paypal-button').forEach(button => {
        const fundingSource = button.getAttribute('data-funding-source');
        const card = button.getAttribute('data-card');

        onClick(button, event => {
            event.preventDefault();
            event.stopPropagation();

            if (window.xprops.onClick) {
                window.xprops.onClick({ fundingSource, card });
            }

            renderCheckout({ fundingSource });
        });
    });
}
