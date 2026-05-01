import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    shippingAddress: { type: String },
    products: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true }
      }
    ],
    subTotal: { type: Number, default: 0 },
    discountTotal: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    deliveryCharge: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    deliveryLocation: {
      label: { type: String },
      address: { type: String },
      latitude: { type: Number },
      longitude: { type: Number },
      source: { type: String, enum: ['manual', 'search', 'map'], default: 'manual' }
    },
    paymentMethod: { type: String, enum: ['COD', 'ONLINE'], default: 'COD' },
    paymentProvider: {
      type: String,
      enum: ['CARD', 'PAYPAL', 'UPI', 'NETBANKING', 'WALLET'],
      default: undefined
    },
    paymentMeta: {
      cardHolder: { type: String },
      cardLast4: { type: String },
      cardExpiry: { type: String },
      paypalEmail: { type: String },
      upiId: { type: String },
      provider: { type: String }
    },
    paymentReference: { type: String },
    paymentIntentId: { type: String },
    paymentStatus: { type: String, enum: ['Pending', 'Paid', 'Returned', 'Refunded'], default: 'Pending' },
    orderStatus: {
      type: String,
      enum: ['Placed', 'Confirmed', 'In Transit', 'Out for Delivery', 'Delivered', 'Cancelled', 'Refunded', 'Pending'],
      default: 'Placed'
    },
    deliveryPartnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deliveryTrackingStatus: {
      type: String,
      enum: ['Awaiting Acceptance', 'On the Way', 'Near Delivery Location', 'Delayed', 'Delivered']
    },
    estimatedArrivalAt: { type: Date },
    inTransitAt: { type: Date },
    deliveryAcceptedAt: { type: Date },
    outForDeliveryAt: { type: Date },
    isDeliveryDelayed: { type: Boolean, default: false },
    delayNotifiedAt: { type: Date }
  },
  { timestamps: true }
);

const Order = mongoose.model('Order', orderSchema);
export default Order;
