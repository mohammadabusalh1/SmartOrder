# Restaurants Service

This microservice handles all restaurant-related operations for the SmartOrder application using GraphQL, Express.js, and MongoDB.

## Features

- CRUD operations for restaurants
- Menu item management
- GraphQL API with queries and mutations
- Authentication and authorization middleware
- MongoDB integration

## Setup and Installation

1. Clone the repository
2. Navigate to the Restaurants directory
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a `.env` file in the root of the Restaurants directory with the following variables:
   ```
   PORT=4001
   MONGODB_URI=mongodb://localhost:27017/restaurants
   JWT_SECRET=your_jwt_secret
   ```

## Running the Service

### Development mode:
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

## GraphQL API

The GraphQL endpoint is available at: `http://localhost:4001/graphql`

### Main Queries:
- `getRestaurants`: Get all restaurants
- `getRestaurant(id)`: Get a restaurant by ID
- `getMenu(restaurantId)`: Get menu for a specific restaurant
- `getMenuItem(restaurantId, itemId)`: Get a specific menu item

### Main Mutations:
- `createRestaurant(restaurantInput)`: Create a new restaurant
- `updateRestaurant(id, restaurantInput)`: Update an existing restaurant
- `deleteRestaurant(id)`: Delete a restaurant
- `addMenuItem(restaurantId, menuItemInput)`: Add a menu item to a restaurant
- `updateMenuItem(restaurantId, itemId, menuItemInput)`: Update a menu item
- `deleteMenuItem(restaurantId, itemId)`: Delete a menu item

## Authentication and Authorization

This service validates tokens passed from the Authentication service. All mutations require admin privileges. These tokens should be passed in the Authorization header as follows:

```
Authorization: Bearer <token>
``` 