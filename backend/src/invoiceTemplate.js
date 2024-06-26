const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const { amountInWords, calculateNetAmount, calculateTaxAmount } = require('./utils');

async function generateInvoice(data) {
    try {
        const {
            sellerDetails,
            billingDetails,
            shippingDetails,
            orderDetails,
            invoiceDetails,
            items,
            reverseCharge
        } = data;

        console.log("Request Data:", data);

        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595, 842]);
        const { width, height } = page.getSize();
        const fontSize = 10;

        const logoPath = path.resolve(__dirname, '../static/logo.png');
        if (!fs.existsSync(logoPath)) throw new Error('Logo image not found');
        const logoBytes = fs.readFileSync(logoPath);
        const logoImage = await pdfDoc.embedPng(logoBytes);

        const signaturePath = path.resolve(__dirname, '../static/signature.png');
        if (!fs.existsSync(signaturePath)) throw new Error('Signature image not found');
        const signatureBytes = fs.readFileSync(signaturePath);
        const signatureImage = await pdfDoc.embedPng(signatureBytes);

        page.drawImage(logoImage, {
            x: 40,
            y: height - 80,
            width: 100,
            height: 50
        });

        page.drawText("Tax Invoice/Bill of Supply/Cash Memo", { x: 180, y: height - 40, size: 14 });
        page.drawText("(Original for Recipient)", { x: 180, y: height - 55, size: 10 });

        page.drawText("Sold By:", { x: 40, y: height - 100, size: fontSize });
        drawMultilineText(page, formatSellerDetails(sellerDetails), 40, height - 110, fontSize);

        drawMultilineText(page, formatOrderDetails(orderDetails), 320, height - 100, fontSize);
        drawMultilineText(page, formatInvoiceDetails(invoiceDetails), 320, height - 140, fontSize);

        page.drawText("Billing Address:", { x: 40, y: height - 180, size: fontSize });
        drawMultilineText(page, formatBillingDetails(billingDetails), 40, height - 190, fontSize);

        page.drawText("Shipping Address:", { x: 320, y: height - 180, size: fontSize });
        drawMultilineText(page, formatShippingDetails(shippingDetails), 320, height - 190, fontSize);

        drawTableHeaders(page, height - 250, fontSize);
        drawTableContent(page, height - 270, fontSize, items, billingDetails.state, shippingDetails.state);
        drawTotals(page, height - (270 + 20 * items.length), fontSize, items, billingDetails, shippingDetails);

        page.drawText(`For ${sellerDetails.name}:`, { x: 40, y: 70, size: fontSize });
        page.drawImage(signatureImage, { x: 40, y: 30, width: 100, height: 30 });
        page.drawText("Authorized Signatory", { x: 40, y: 20, size: fontSize });

        const pdfBytes = await pdfDoc.save();
        return pdfBytes;
    } catch (error) {
        console.error('Error in generateInvoice:', error);
        throw error;
    }
}

function drawMultilineText(page, text, x, y, fontSize) {
    if (typeof text !== 'string') {
        throw new Error(`Expected string for text, but received ${typeof text}`);
    }
    const lines = text.split('\n');
    lines.forEach((line, index) => {
        page.drawText(line, { x, y: y - (index * (fontSize + 2)), size: fontSize });
    });
}

function drawTableHeaders(page, y, fontSize) {
    const headers = ["Sl. No", "Description", "Unit Price", "Qty", "Discount", "Net Amount", "Tax Rate", "Tax Type", "Tax Amount", "Total Amount"];
    headers.forEach((header, index) => {
        page.drawText(header, { x: 40 + index * 50, y, size: fontSize });
    });
}

function drawTableContent(page, y, fontSize, items, billingState, shippingState) {
    items.forEach((item, idx) => {
        const netAmount = calculateNetAmount(item.unitPrice, item.quantity, item.discount);
        const [cgst, sgst] = calculateTaxAmount(netAmount, billingState, shippingState);
        const taxType = cgst ? "CGST + SGST" : "IGST";
        const taxAmount = cgst + sgst;
        const totalAmount = netAmount + taxAmount;

        const values = [
            idx + 1,
            item.description,
            item.unitPrice.toFixed(2),
            item.quantity,
            item.discount.toFixed(2),
            netAmount.toFixed(2),
            `${(cgst ? 9 : 18)}%`,
            taxType,
            taxAmount.toFixed(2),
            totalAmount.toFixed(2)
        ];

        values.forEach((value, index) => {
            page.drawText(value.toString(), { x: 40 + index * 50, y: y - (idx * 20), size: fontSize });
        });
    });
}

function drawTotals(page, y, fontSize, items, billingDetails, shippingDetails) {
    const totalNetAmount = items.reduce((sum, item) => sum + calculateNetAmount(item.unitPrice, item.quantity, item.discount), 0);
    const totalTaxAmount = items.reduce((sum, item) => {
        const netAmount = calculateNetAmount(item.unitPrice, item.quantity, item.discount);
        const [cgst, sgst] = calculateTaxAmount(netAmount, billingDetails.state, shippingDetails.state);
        return sum + cgst + sgst;
    }, 0);
    const totalAmount = totalNetAmount + totalTaxAmount;

    page.drawText(`Total Net Amount: ${totalNetAmount.toFixed(2)}`, { x: 40, y: y - 20, size: fontSize });
    page.drawText(`Total Tax Amount: ${totalTaxAmount.toFixed(2)}`, { x: 40, y: y - 40, size: fontSize });
    page.drawText(`Total Amount: ${totalAmount.toFixed(2)}`, { x: 40, y: y - 60, size: fontSize });
    page.drawText(`Amount in Words: ${amountInWords(totalAmount)}`, { x: 40, y: y - 80, size: fontSize });
}

function formatSellerDetails(details) {
    return `${details.name}\n${details.address}\n${details.city}, ${details.state}, ${details.pincode}\nPAN No: ${details.panNo}\nGST Registration No: ${details.gstNo}`;
}

function formatBillingDetails(details) {
    return `${details.name}\n${details.address}\n${details.city}, ${details.state}, ${details.pincode}\nState/UT Code: ${details.stateCode}`;
}

function formatShippingDetails(details) {
    return `${details.name}\n${details.address}\n${details.city}, ${details.state}, ${details.pincode}\nState/UT Code: ${details.stateCode}`;
}

function formatOrderDetails(details) {
    return `Order Number: ${details.orderNo}\nOrder Date: ${details.orderDate}`;
}

function formatInvoiceDetails(details) {
    return `Invoice Number: ${details.invoiceNo}\nInvoice Details: ${details.invoiceDetails}\nInvoice Date: ${details.invoiceDate}`;
}

module.exports = { generateInvoice };
