import React, { useState } from 'react';
import axios from 'axios';

const InvoiceForm = () => {
  const [formData, setFormData] = useState({
    sellerDetails: '',
    billingDetails: '',
    shippingDetails: '',
    orderDetails: '',
    invoiceDetails: '',
    items: '',
    reverseCharge: 'No'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/generate-invoice', formData, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'invoice.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      console.error('Error generating invoice:', error);
    }
  };

  return (
    <div className="invoice-form-container">
      <form onSubmit={handleSubmit}>
        <h2>Generate Invoice</h2>
        <label>
          Seller Details:
          <textarea name="sellerDetails" value={formData.sellerDetails} onChange={handleChange} />
        </label>
        <label>
          Billing Details:
          <textarea name="billingDetails" value={formData.billingDetails} onChange={handleChange} />
        </label>
        <label>
          Shipping Details:
          <textarea name="shippingDetails" value={formData.shippingDetails} onChange={handleChange} />
        </label>
        <label>
          Order Details:
          <textarea name="orderDetails" value={formData.orderDetails} onChange={handleChange} />
        </label>
        <label>
          Invoice Details:
          <textarea name="invoiceDetails" value={formData.invoiceDetails} onChange={handleChange} />
        </label>
        <label>
          Items (JSON format):
          <textarea name="items" value={formData.items} onChange={handleChange} />
        </label>
        <label>
          Reverse Charge:
          <select name="reverseCharge" value={formData.reverseCharge} onChange={handleChange}>
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
        </label>
        <button type="submit">Generate Invoice</button>
      </form>
    </div>
  );
};

export default InvoiceForm;
