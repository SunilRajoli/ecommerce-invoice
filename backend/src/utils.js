const numberToWords = require('number-to-words');

function amountInWords(amount) {
    return numberToWords.toWords(amount);
}

function calculateNetAmount(unitPrice, quantity, discount) {
    return (unitPrice * quantity) - discount;
}

function calculateTaxAmount(netAmount, billingState, shippingState) {
    const TAX_RATE = 0.18;
    const CGST_SGST_RATE = 0.09;

    if (billingState === shippingState) {
        const cgst = netAmount * CGST_SGST_RATE;
        const sgst = netAmount * CGST_SGST_RATE;
        return [cgst, sgst];
    } else {
        const igst = netAmount * TAX_RATE;
        return [0, igst];
    }
}

module.exports = { amountInWords, calculateNetAmount, calculateTaxAmount };
