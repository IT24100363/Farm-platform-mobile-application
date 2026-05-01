import dotenv from 'dotenv';
import connectDB from './config/db.js';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import Product from './models/Product.js';
import Order from './models/Order.js';
import Promotion from './models/Promotion.js';
import Review from './models/Review.js';
import Notification from './models/Notification.js';

dotenv.config();

const DAY_MS = 24 * 60 * 60 * 1000;
const now = Date.now();
const daysFromNow = (days) => new Date(now + days * DAY_MS);

const round = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const buildTotals = ({ subTotal, discountTotal = 0, taxAmount = 0, deliveryCharge = 0 }) => {
  const itemTotal = round(Number(subTotal || 0) - Number(discountTotal || 0));
  const totalAmount = round(itemTotal + Number(taxAmount || 0) + Number(deliveryCharge || 0));
  return {
    subTotal: round(subTotal),
    discountTotal: round(discountTotal),
    taxAmount: round(taxAmount),
    deliveryCharge: round(deliveryCharge),
    totalAmount
  };
};

const seed = async () => {
  try {
    await connectDB();

    await Promise.all([
      User.deleteMany(),
      Product.deleteMany(),
      Order.deleteMany(),
      Promotion.deleteMany(),
      Review.deleteMany(),
      Notification.deleteMany()
    ]);

    const passwordHash = await bcrypt.hash('password123', 10);

    const users = await User.insertMany([
      {
        name: 'Alice Admin',
        email: 'admin@example.com',
        phone: '+94 77 111 2233',
        password: passwordHash,
        role: 'admin',
        address: 'Colombo HQ',
        isApproved: true,
        isActive: true
      },
      {
        name: 'Frank Farmer',
        email: 'farmer@example.com',
        phone: '+94 77 222 3344',
        password: passwordHash,
        role: 'farmer',
        address: 'Nuwara Eliya Farm',
        isApproved: true,
        isActive: true
      },
      {
        name: 'Fiona Farmer',
        email: 'farmer2@example.com',
        phone: '+94 77 333 4455',
        password: passwordHash,
        role: 'farmer',
        address: 'Kandy Hills Farm',
        isApproved: true,
        isActive: true
      },
      {
        name: 'Pending Farmer',
        email: 'farmer-pending@example.com',
        phone: '+94 77 444 5566',
        password: passwordHash,
        role: 'farmer',
        address: 'Kurunegala Farm',
        isApproved: false,
        isActive: true
      },
      {
        name: 'Cathy Customer',
        email: 'customer@example.com',
        phone: '+94 77 555 6677',
        password: passwordHash,
        role: 'customer',
        address: 'Galle Road, Colombo',
        isApproved: true,
        isActive: true
      },
      {
        name: 'Chris Customer',
        email: 'customer2@example.com',
        phone: '+94 77 666 7788',
        password: passwordHash,
        role: 'customer',
        address: 'Peradeniya Road, Kandy',
        isApproved: true,
        isActive: true
      },
      {
        name: 'Derek Delivery',
        email: 'delivery@example.com',
        phone: '+94 77 777 8899',
        password: passwordHash,
        role: 'delivery',
        address: 'Delivery Hub Colombo',
        isApproved: true,
        isActive: true
      },
      {
        name: 'Dana Delivery',
        email: 'delivery2@example.com',
        phone: '+94 77 888 9900',
        password: passwordHash,
        role: 'delivery',
        address: 'Delivery Hub Kandy',
        isApproved: true,
        isActive: true
      }
    ]);

    const byEmail = Object.fromEntries(users.map((user) => [user.email, user]));
    const admin = byEmail['admin@example.com'];
    const farmerOne = byEmail['farmer@example.com'];
    const farmerTwo = byEmail['farmer2@example.com'];
    const customerOne = byEmail['customer@example.com'];
    const customerTwo = byEmail['customer2@example.com'];
    const deliveryOne = byEmail['delivery@example.com'];
    const deliveryTwo = byEmail['delivery2@example.com'];

    const products = await Product.insertMany([
      {
        farmerId: farmerOne._id,
        productName: 'Organic Tomatoes',
        category: 'Fresh Vegetables',
        description: 'Vine-ripened and harvested every morning.',
        price: 220,
        quantity: 48,
        images: ['https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=900&q=80'],
        isAvailable: true
      },
      {
        farmerId: farmerOne._id,
        productName: 'Baby Spinach Bunch',
        category: 'Fresh Vegetables',
        description: 'Tender leaves ideal for salads and stir-fry.',
        price: 180,
        quantity: 26,
        images: ['https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=900&q=80'],
        isAvailable: true
      },
      {
        farmerId: farmerOne._id,
        productName: 'Fresh Carrots 1kg',
        category: 'Fresh Vegetables',
        description: 'Crunchy and naturally sweet carrots.',
        price: 260,
        quantity: 3,
        images: ['https://images.unsplash.com/photo-1447175008436-170170753d52?auto=format&fit=crop&w=900&q=80'],
        isAvailable: true,
        lowStockAlertSent: true
      },
      {
        farmerId: farmerTwo._id,
        productName: 'Seasonal Mango Box',
        category: 'Seasonal Fruits',
        description: 'Premium ripe mangoes in a 6-piece box.',
        price: 950,
        quantity: 20,
        images: ['https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=900&q=80'],
        isAvailable: true
      },
      {
        farmerId: farmerTwo._id,
        productName: 'Sweet Bananas 1kg',
        category: 'Seasonal Fruits',
        description: 'Naturally ripened bananas from hill country.',
        price: 320,
        quantity: 55,
        images: ['https://images.unsplash.com/photo-1574226516831-e1dff420e8f8?auto=format&fit=crop&w=900&q=80'],
        isAvailable: true
      },
      {
        farmerId: farmerTwo._id,
        productName: 'Farm Apples Pack',
        category: 'Seasonal Fruits',
        description: 'Crisp apples packed and sorted by grade.',
        price: 540,
        quantity: 0,
        images: ['https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=900&q=80'],
        isAvailable: false,
        lowStockAlertSent: true
      },
      {
        farmerId: farmerOne._id,
        productName: 'Free-range Eggs (Dozen)',
        category: 'Dairy & Eggs',
        description: 'Pasture-raised eggs from hormone-free hens.',
        price: 690,
        quantity: 30,
        images: ['https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=900&q=80'],
        isAvailable: true
      },
      {
        farmerId: farmerOne._id,
        productName: 'Fresh Cow Milk 1L',
        category: 'Dairy & Eggs',
        description: 'Fresh chilled milk with same-day dispatch.',
        price: 280,
        quantity: 40,
        images: ['https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=900&q=80'],
        isAvailable: true
      },
      {
        farmerId: farmerTwo._id,
        productName: 'Organic Brown Rice 1kg',
        category: 'Organic Staples',
        description: 'Stone-milled and pesticide-free brown rice.',
        price: 420,
        quantity: 34,
        images: ['https://images.unsplash.com/photo-1586201375761-83865001e31f?auto=format&fit=crop&w=900&q=80'],
        isAvailable: true
      },
      {
        farmerId: farmerOne._id,
        productName: 'Organic Lentils 1kg',
        category: 'Organic Staples',
        description: 'Protein-rich lentils cleaned and ready to cook.',
        price: 390,
        quantity: 31,
        images: ['https://images.unsplash.com/photo-1515543904379-3d757afe72e1?auto=format&fit=crop&w=900&q=80'],
        isAvailable: true
      },
      {
        farmerId: farmerTwo._id,
        productName: 'Mango Pickle 500g',
        category: 'Processed Foods',
        description: 'Traditional spicy pickle in glass jar.',
        price: 410,
        quantity: 18,
        images: ['https://images.unsplash.com/photo-1599921841143-819065a55cc6?auto=format&fit=crop&w=900&q=80'],
        isAvailable: true
      },
      {
        farmerId: farmerOne._id,
        productName: 'Mixed Fruit Jam 350g',
        category: 'Processed Foods',
        description: 'Low-sugar fruit preserve made in small batches.',
        price: 360,
        quantity: 24,
        images: ['https://images.unsplash.com/photo-1471194402529-8e0f5a675de6?auto=format&fit=crop&w=900&q=80'],
        isAvailable: true
      }
    ]);

    const productByName = Object.fromEntries(products.map((product) => [product.productName, product]));
    const tomato = productByName['Organic Tomatoes'];
    const carrots = productByName['Fresh Carrots 1kg'];
    const eggs = productByName['Free-range Eggs (Dozen)'];
    const milk = productByName['Fresh Cow Milk 1L'];
    const mango = productByName['Seasonal Mango Box'];
    const banana = productByName['Sweet Bananas 1kg'];
    const rice = productByName['Organic Brown Rice 1kg'];
    const apples = productByName['Farm Apples Pack'];
    const pickle = productByName['Mango Pickle 500g'];
    const jam = productByName['Mixed Fruit Jam 350g'];

    await Promotion.insertMany([
      {
        title: 'Veggie Saver',
        description: '12% off on all fresh vegetables this week.',
        discountType: 'percentage',
        discountValue: 12,
        applicableTo: 'category',
        category: 'Fresh Vegetables',
        ownerId: admin._id,
        promoCode: 'VEG12',
        startDate: daysFromNow(-2),
        endDate: daysFromNow(10),
        isActive: true,
        isApproved: true,
        usageCount: 9
      },
      {
        title: 'Egg Deal',
        description: 'Save Rs. 50 on each dozen eggs.',
        discountType: 'fixed',
        discountValue: 50,
        applicableTo: 'product',
        productId: eggs._id,
        ownerId: admin._id,
        promoCode: 'EGG50',
        startDate: daysFromNow(-2),
        endDate: daysFromNow(7),
        isActive: true,
        isApproved: true,
        usageCount: 5
      },
      {
        title: 'Farmer Harvest Bonus',
        description: '8% off all products from Fiona Farmer.',
        discountType: 'percentage',
        discountValue: 8,
        applicableTo: 'farmer',
        farmerId: farmerTwo._id,
        ownerId: farmerTwo._id,
        promoCode: 'HARVEST8',
        startDate: daysFromNow(-1),
        endDate: daysFromNow(5),
        isActive: true,
        isApproved: true,
        usageCount: 3
      },
      {
        title: 'Pending Jam Boost',
        description: '25% off Mixed Fruit Jam (awaiting admin approval).',
        discountType: 'percentage',
        discountValue: 25,
        applicableTo: 'product',
        productId: jam._id,
        farmerId: farmerOne._id,
        ownerId: farmerOne._id,
        promoCode: 'JAM25',
        startDate: daysFromNow(1),
        endDate: daysFromNow(14),
        isActive: false,
        isApproved: false,
        usageCount: 0
      },
      {
        title: 'Expired Pickle Flash',
        description: 'Old limited-time pickle discount (expired sample).',
        discountType: 'fixed',
        discountValue: 40,
        applicableTo: 'product',
        productId: pickle._id,
        farmerId: farmerTwo._id,
        ownerId: farmerTwo._id,
        startDate: daysFromNow(-20),
        endDate: daysFromNow(-5),
        isActive: false,
        isApproved: true,
        usageCount: 15
      }
    ]);

    const orderOneTotals = buildTotals({
      subTotal: 700,
      discountTotal: 84,
      taxAmount: 0,
      deliveryCharge: 100
    });
    const orderTwoTotals = buildTotals({
      subTotal: 1250,
      discountTotal: 50,
      taxAmount: 60,
      deliveryCharge: 100
    });
    const orderThreeTotals = buildTotals({
      subTotal: 1590,
      discountTotal: 127.2,
      taxAmount: 73.14,
      deliveryCharge: 0
    });
    const orderFourTotals = buildTotals({
      subTotal: 720,
      discountTotal: 0,
      taxAmount: 36,
      deliveryCharge: 100
    });
    const orderFiveTotals = buildTotals({
      subTotal: 420,
      discountTotal: 0,
      taxAmount: 21,
      deliveryCharge: 100
    });
    const orderSixTotals = buildTotals({
      subTotal: 540,
      discountTotal: 43.2,
      taxAmount: 24.84,
      deliveryCharge: 100
    });

    await Order.insertMany([
      {
        customerId: customerOne._id,
        farmerId: farmerOne._id,
        shippingAddress: customerOne.address,
        products: [
          { productId: tomato._id, quantity: 2, price: 193.6 },
          { productId: carrots._id, quantity: 1, price: 228.8 }
        ],
        ...orderOneTotals,
        paymentMethod: 'COD',
        paymentStatus: 'Pending',
        orderStatus: 'Placed',
        deliveryPartnerId: deliveryOne._id,
        deliveryTrackingStatus: 'Awaiting Acceptance',
        inTransitAt: null
      },
      {
        customerId: customerOne._id,
        farmerId: farmerOne._id,
        shippingAddress: customerOne.address,
        products: [
          { productId: eggs._id, quantity: 1, price: 640 },
          { productId: milk._id, quantity: 2, price: 280 }
        ],
        ...orderTwoTotals,
        paymentMethod: 'ONLINE',
        paymentProvider: 'CARD',
        paymentMeta: {
          cardHolder: 'Cathy Customer',
          cardLast4: '4242',
          cardExpiry: '12/30'
        },
        paymentReference: 'DEMO-ORDER-1001',
        paymentStatus: 'Paid',
        orderStatus: 'Confirmed',
        deliveryPartnerId: deliveryOne._id,
        deliveryTrackingStatus: 'Awaiting Acceptance'
      },
      {
        customerId: customerTwo._id,
        farmerId: farmerTwo._id,
        shippingAddress: customerTwo.address,
        products: [
          { productId: mango._id, quantity: 1, price: 874 },
          { productId: banana._id, quantity: 2, price: 294.4 }
        ],
        ...orderThreeTotals,
        paymentMethod: 'ONLINE',
        paymentProvider: 'UPI',
        paymentMeta: { upiId: 'ch***@bank' },
        paymentReference: 'DEMO-ORDER-1002',
        paymentStatus: 'Paid',
        orderStatus: 'Delivered',
        deliveryPartnerId: deliveryTwo._id,
        inTransitAt: daysFromNow(-4),
        outForDeliveryAt: daysFromNow(-3.5),
        deliveryAcceptedAt: daysFromNow(-3.5),
        deliveryTrackingStatus: 'Delivered',
        estimatedArrivalAt: daysFromNow(-3.45),
        isDeliveryDelayed: false
      },
      {
        customerId: customerOne._id,
        farmerId: farmerOne._id,
        shippingAddress: customerOne.address,
        products: [{ productId: jam._id, quantity: 2, price: 360 }],
        ...orderFourTotals,
        paymentMethod: 'ONLINE',
        paymentProvider: 'CARD',
        paymentMeta: { cardHolder: 'Cathy Customer', cardLast4: '1111', cardExpiry: '09/29' },
        paymentReference: 'DEMO-ORDER-1003',
        paymentStatus: 'Paid',
        orderStatus: 'Cancelled',
        deliveryPartnerId: deliveryOne._id
      },
      {
        customerId: customerTwo._id,
        farmerId: farmerTwo._id,
        shippingAddress: customerTwo.address,
        products: [{ productId: rice._id, quantity: 1, price: 420 }],
        ...orderFiveTotals,
        paymentMethod: 'ONLINE',
        paymentProvider: 'PAYPAL',
        paymentMeta: { paypalEmail: 'ch***@gmail.com' },
        paymentReference: 'DEMO-ORDER-1004',
        paymentStatus: 'Refunded',
        orderStatus: 'Refunded',
        deliveryPartnerId: deliveryTwo._id
      },
      {
        customerId: customerTwo._id,
        farmerId: farmerTwo._id,
        shippingAddress: customerTwo.address,
        products: [{ productId: apples._id, quantity: 1, price: 496.8 }],
        ...orderSixTotals,
        paymentMethod: 'COD',
        paymentStatus: 'Pending',
        orderStatus: 'Out for Delivery',
        deliveryPartnerId: deliveryTwo._id,
        inTransitAt: daysFromNow(-1),
        outForDeliveryAt: daysFromNow(-0.6),
        deliveryAcceptedAt: daysFromNow(-0.6),
        deliveryTrackingStatus: 'Delayed',
        estimatedArrivalAt: new Date(now - 2 * 60 * 60 * 1000),
        isDeliveryDelayed: true,
        delayNotifiedAt: new Date(now - 30 * 60 * 1000)
      }
    ]);

    await Review.insertMany([
      {
        customerId: customerOne._id,
        productId: tomato._id,
        rating: 5,
        comment: 'Super fresh and juicy tomatoes. Great quality!',
        farmerReply: 'Thank you for the review. We harvest these every morning.',
        farmerReplyAt: daysFromNow(-1),
        farmerReplyBy: farmerOne._id
      },
      {
        customerId: customerTwo._id,
        productId: mango._id,
        rating: 4,
        comment: 'Mangoes were sweet and delivery was on time.',
        farmerReply: 'Happy you liked them. More seasonal batches coming soon.',
        farmerReplyAt: daysFromNow(-2),
        farmerReplyBy: farmerTwo._id
      },
      {
        customerId: customerOne._id,
        productId: jam._id,
        rating: 3,
        comment: 'Taste is good but I expected thicker texture.'
      },
      {
        customerId: customerTwo._id,
        productId: eggs._id,
        rating: 2,
        comment: 'Packaging needs improvement for fragile items.'
      }
    ]);

    const ratingStats = await Review.aggregate([
      { $group: { _id: '$productId', avg: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);

    await Promise.all(
      ratingStats.map((entry) =>
        Product.findByIdAndUpdate(entry._id, {
          averageRating: round(entry.avg),
          ratingCount: entry.count
        })
      )
    );

    await Notification.insertMany([
      {
        userId: customerOne._id,
        message: 'Your order #1001 has been placed successfully.',
        type: 'order',
        isRead: false
      },
      {
        userId: customerTwo._id,
        message: 'Refund completed for order #1004.',
        type: 'refund',
        isRead: false
      },
      {
        userId: farmerOne._id,
        message: 'New customer order received #1001.',
        type: 'order',
        isRead: false
      },
      {
        userId: farmerTwo._id,
        message: 'New review submitted for Seasonal Mango Box.',
        type: 'review',
        isRead: false
      },
      {
        userId: admin._id,
        message: 'Promotion "Pending Jam Boost" is waiting for approval.',
        type: 'promotion',
        isRead: false
      },
      {
        userId: deliveryOne._id,
        message: 'New delivery assigned for order #1001.',
        type: 'delivery',
        isRead: false
      }
    ]);

    console.log('Seed data created successfully.');
    console.log('Sample login credentials (password: password123):');
    console.table([
      { role: 'Admin', email: 'admin@example.com' },
      { role: 'Farmer 1', email: 'farmer@example.com' },
      { role: 'Farmer 2', email: 'farmer2@example.com' },
      { role: 'Pending Farmer', email: 'farmer-pending@example.com' },
      { role: 'Customer 1', email: 'customer@example.com' },
      { role: 'Customer 2', email: 'customer2@example.com' },
      { role: 'Delivery 1', email: 'delivery@example.com' },
      { role: 'Delivery 2', email: 'delivery2@example.com' }
    ]);

    process.exit(0);
  } catch (err) {
    console.error('Seeder error:', err);
    process.exit(1);
  }
};

seed();
