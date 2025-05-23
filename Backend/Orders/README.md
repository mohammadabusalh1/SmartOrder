# Orders Service

This is the Orders microservice for the SmartOrder application, responsible for managing orders, payments, promotions, addresses, and bidding functionality.

## Features

- Order management (create, read, update, cancel)
- Order item management
- Payment processing
- Address management
- Promotion/discount management
- Bidding system for restaurants

## Tech Stack

- Node.js
- Express
- Apollo Server (GraphQL)
- Mongoose (MongoDB)
- Jest (Testing)

## Getting Started

### Prerequisites

- Node.js (v14+)
- MongoDB

### Installation

1. Clone the repository
2. Navigate to the Orders service directory:
   ```
   cd Orders
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Create a `.env` file with the following variables:
   ```
   PORT=4002
   MONGODB_URI=mongodb://localhost:27017/smartorder_orders
   JWT_SECRET=your_jwt_secret
   ```

### Running the Service

To start the service in development mode:

```
npm run dev
```

To start the service in production mode:

```
npm start
```

## API Documentation

This service uses GraphQL for its API. Here are the main queries and mutations:

### Queries

- `order(id: ID!)`: Get a single order by ID
- `orders(filter: OrderFilterInput, sort: OrderSortInput, pagination: PaginationInput)`: Get multiple orders with filtering, sorting and pagination
- `customerOrders(customer_id: ID!, status: [OrderStatus!], pagination: PaginationInput)`: Get orders for a specific customer
- `restaurantOrders(restaurant_id: ID!, status: [OrderStatus!], pagination: PaginationInput)`: Get orders for a specific restaurant
- `orderItems(order_id: ID!)`: Get items for a specific order
- `payment(id: ID!)`: Get a payment by ID
- `orderPayment(order_id: ID!)`: Get payment for a specific order
- `address(id: ID!)`: Get an address by ID
- `userAddresses(user_id: ID!)`: Get addresses for a specific user
- `promotion(id: ID!)`: Get a promotion by ID
- `promotionByCode(promo_code: String!)`: Get a promotion by code
- `validPromotions`: Get all valid promotions
- `bid(id: ID!)`: Get a bid by ID
- `orderBids(order_id: ID!)`: Get bids for a specific order
- `restaurantBids(restaurant_id: ID!, status: [BidStatus!])`: Get bids from a specific restaurant

### Mutations

- `createOrder(input: CreateOrderInput!)`: Create a new order
- `updateOrder(id: ID!, input: UpdateOrderInput!)`: Update an existing order
- `cancelOrder(id: ID!, reason: String)`: Cancel an order
- `markOrderDelivered(id: ID!, actual_delivery_time: String)`: Mark an order as delivered
- `addOrderItem(order_id: ID!, input: OrderItemInput!)`: Add an item to an order
- `removeOrderItem(id: ID!)`: Remove an item from an order
- `createPayment(input: CreatePaymentInput!)`: Create a payment for an order
- `updatePaymentStatus(id: ID!, status: PaymentStatus!)`: Update payment status
- `refundPayment(id: ID!, amount: Float!, reason: String)`: Process a refund
- `createAddress(input: AddressInput!)`: Create a new address
- `updateAddress(id: ID!, input: AddressInput!)`: Update an existing address
- `deleteAddress(id: ID!)`: Delete an address
- `setDefaultAddress(id: ID!, user_id: ID!)`: Set an address as default
- `createPromotion(input: CreatePromotionInput!)`: Create a new promotion
- `updatePromotion(id: ID!, input: CreatePromotionInput!)`: Update an existing promotion
- `deactivatePromotion(id: ID!)`: Deactivate a promotion
- `applyPromoToOrder(order_id: ID!, promo_code: String!)`: Apply a promotion to an order
- `createBid(input: CreateBidInput!)`: Create a bid for an order
- `updateBidStatus(id: ID!, status: BidStatus!)`: Update bid status
- `acceptBid(id: ID!)`: Accept a bid

## Testing

To run tests:

```
npm test
```

## Database Schema

The service uses MongoDB with the following main collections:

- Orders
- OrderItems
- Payments
- Addresses
- Promotions
- Bids

See the models directory for detailed schema information.

## License

This project is licensed under the MIT License. 