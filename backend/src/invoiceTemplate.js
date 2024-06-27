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
        const page = pdfDoc.addPage([735, 895]);
        const { width, height } = page.getSize();
        const fontSize = 8;

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

        // Seller details on left side
        page.drawText("Sold By:", { x: 40, y: height - 120, size: fontSize });
        drawMultilineText(page, formatSellerDetails(sellerDetails), 40, height - 130, fontSize);

        // Order details on left side
        drawMultilineText(page, formatOrderDetails(orderDetails), 40, height - 270, fontSize);

        // Tax Invoice details on right side
        page.drawText("Tax Invoice/Bill of Supply/Cash Memo", { x: 320, y: height - 50, size: 14 });
        page.drawText("(Original for Recipient)", { x: 320, y: height - 65, size: 10 });

        // Billing details on right side
        page.drawText("Billing Address:", { x: 320, y: height - 115, size: fontSize });
        drawMultilineText(page, formatBillingDetails(billingDetails), 320, height - 125, fontSize);

        // Shipping details on right side
        page.drawText("Shipping Address:", { x: 320, y: height - 185, size: fontSize });
        drawMultilineText(page, formatShippingDetails(shippingDetails), 320, height - 195, fontSize);

        // Invoice details on right side
        drawMultilineText(page, formatInvoiceDetails(invoiceDetails), 320, height - 255, fontSize);

        // Table headers and content
        drawTableHeaders(page, height - 320, fontSize);
        drawTableContent(page, height - 340, fontSize, items, billingDetails.state, shippingDetails.state);

        // Totals and amount in words
        drawTotals(page, height - (340 + 20 * items.length), fontSize, items, billingDetails, shippingDetails, sellerDetails, signatureImage);

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
    const headers = ["Sl.No", "Description", "Unit Price", "Qty", "Net Amount", "Tax Rate", "Tax Type", "Tax Amount", "Total Amount"];
    const xPositions = [40, 65, 395, 435, 455, 505, 545, 605, 655];

    headers.forEach((header, index) => {
        page.drawText(header, { x: xPositions[index], y, size: fontSize });
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
            (idx + 1).toString(),
            item.description,
            item.unitPrice.toFixed(2),
            item.quantity.toString(),
            netAmount.toFixed(2),
            `${(cgst ? 9 : 18)}%`,
            taxType,
            taxAmount.toFixed(2),
            totalAmount.toFixed(2)
        ];

        const xPositions = [40, 65, 395, 435, 455, 505, 545, 605, 655];
        values.forEach((value, index) => {
            page.drawText(value.toString(), { x: xPositions[index], y: y - (idx * 20), size: fontSize });
        });
    });
}

function drawTotals(page, y, fontSize, items, billingDetails, shippingDetails, sellerDetails, signatureImage) {
    const totalNetAmount = items.reduce((sum, item) => {
        const netAmount = calculateNetAmount(item.unitPrice, item.quantity, item.discount);
        console.log(`Item netAmount: ${netAmount}`);
        return sum + netAmount;
    }, 0);

    const totalTaxAmount = items.reduce((sum, item) => {
        const netAmount = calculateNetAmount(item.unitPrice, item.quantity, item.discount);
        const [cgst, sgst] = calculateTaxAmount(netAmount, billingDetails.state, shippingDetails.state);
        console.log(`Item taxAmount (CGST+SGST): ${cgst + sgst}`);
        return sum + cgst + sgst;
    }, 0);

    const totalAmount = totalNetAmount + totalTaxAmount;
    const roundedTotalAmount = Math.round(totalAmount * 100) / 100;

    console.log(`Total Net Amount: ${totalNetAmount}`);
    console.log(`Total Tax Amount: ${totalTaxAmount}`);
    console.log(`Total Amount: ${totalAmount}`);
    console.log(`Rounded Total Amount: ${roundedTotalAmount}`);

    if (!isFinite(roundedTotalAmount)) {
        throw new Error(`Calculated totalAmount is not a finite number: ${roundedTotalAmount}`);
    }

    const totalStartY = y - 20;
    const wordsStartY = totalStartY - 20;
    const forStartY = wordsStartY - 40;

    page.drawText(`Total Net Amount: ${totalNetAmount.toFixed(2)}`, { x: 40, y: totalStartY, size: fontSize });
    page.drawText(`Amount in Words: ${amountInWords(roundedTotalAmount)}`, { x: 40, y: wordsStartY, size: fontSize });

    page.drawText(`For ${sellerDetails.name}:`, { x: 550, y: forStartY, size: fontSize });
    page.drawImage(signatureImage, { x: 550, y: forStartY - 30, width: 100, height: 30 });
    page.drawText("Authorized Signatory", { x: 550, y: forStartY - 40, size: fontSize });
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
