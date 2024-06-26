const express = require('express');
const bodyParser = require('body-parser');
const { generateInvoice } = require('./src/invoiceTemplate');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(bodyParser.json());

app.post('/generate-invoice', async (req, res) => {
    try {
        console.log("Request Body:", req.body);
        const pdfBytes = await generateInvoice(req.body);
        const outputPath = path.resolve(__dirname, './output/invoice.pdf');
        fs.writeFileSync(outputPath, pdfBytes);
        res.status(200).send('Invoice generated successfully');
    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(500).send('Error generating invoice');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
