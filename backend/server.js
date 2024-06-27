const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { generateInvoice } = require('./src/invoiceTemplate');

const app = express();
const PORT = 3000;

app.use(bodyParser.json());

app.post('/generate-invoice', async (req, res) => {
    try {
        const invoiceData = req.body;
        const pdfBytes = await generateInvoice(invoiceData);

        // Write PDF to file (optional)
        const filePath = path.resolve(__dirname, 'invoice.pdf');
        fs.writeFileSync(filePath, pdfBytes);

        // Send PDF as response
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=invoice.pdf');
        res.send(pdfBytes);
    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(500).send('Error generating invoice');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
