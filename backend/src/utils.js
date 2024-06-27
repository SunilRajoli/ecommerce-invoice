const { toWords } = require('number-to-words');

function calculateNetAmount(unitPrice, quantity, discount = 0) {
    return unitPrice * quantity - discount;
}

function calculateTaxAmount(netAmount, billingState, shippingState) {
    // Assuming CGST and SGST are each 9% if billing and shipping states are the same, otherwise 18% IGST
    if (billingState === shippingState) {
        const cgst = netAmount * 0.09;
        const sgst = netAmount * 0.09;
        return [cgst, sgst];
    } else {
        const igst = netAmount * 0.18;
        return [0, igst];
    }
}

function amountInWords(amount) {
    return toWords(amount) + ' only';
}

module.exports = { calculateNetAmount, calculateTaxAmount, amountInWords };
