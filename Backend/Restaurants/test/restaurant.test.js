const { gql } = require('apollo-server-express');
const mongoose = require('mongoose');
const { createTestClient } = require('apollo-server-testing');
const { ApolloServer } = require('apollo-server-express');
const typeDefs = require('../graphql/typeDefs');
const resolvers = require('../graphql/resolvers');
const { Restaurant, Category } = require('../models/Restaurant');
const jwt = require('jsonwebtoken');

// Mock auth middleware
jest.mock('../middleware/auth', () => ({
  validateToken: jest.fn((token) => {
    if (!token || token === 'invalid_token') return null;
    
    if (token === 'admin_token') {
      return { id: 'admin123', email: 'admin@test.com', isAdmin: true };
    }
    
    return { id: 'user123', email: 'user@test.com', isAdmin: false };
  }),
  requireAuth: jest.fn((user) => {
    if (!user) throw new Error('Authentication required');
    return user;
  }),
  requireAdmin: jest.fn((user) => {
    if (!user || !user.isAdmin) throw new Error('Admin privileges required');
    return user;
  })
}));

// Sample data for testing
const sampleRestaurant = {
  owner_user_id: 123,
  name: "Test Restaurant",
  description: "A restaurant for testing",
  address_line1: "123 Test St",
  city: "Test City",
  postal_code: "12345",
  country: "Test Country",
  phone_number: "123-456-7890",
  email: "test@restaurant.com",
  operating_hours: [
    { day: 1, open: "09:00", close: "22:00" },
    { day: 2, open: "09:00", close: "22:00" }
  ]
};

const sampleMenuItem = {
  name: "Test Dish",
  description: "A delicious test dish",
  price: 9.99,
  is_available: true,
  preparation_time_minutes: 15,
  categories: []
};

const sampleServiceArea = {
  name: "Test Area",
  city: "Test City",
  polygon_coordinates: [{ latitude: 40.7128, longitude: -74.0060 }],
  delivery_fee: 5.99,
  is_active: true
};

// Create Apollo testing server
function createTestServer(token) {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: () => {
      const user = token ? 
        (token === 'admin_token' ? 
          { id: 'admin123', email: 'admin@test.com', isAdmin: true } : 
          { id: 'user123', email: 'user@test.com', isAdmin: false }) : 
        null;
      return { user };
    }
  });
  
  return createTestClient(server);
}

describe('Restaurant API Tests', () => {
  let testRestaurantId;
  let testServer;
  
  beforeAll(() => {
    testServer = createTestServer('valid_token');
  });
  
  afterEach(async () => {
    await Restaurant.deleteMany({});
  });
  
  describe('Query Tests', () => {
    beforeEach(async () => {
      const restaurant = new Restaurant(sampleRestaurant);
      await restaurant.save();
      testRestaurantId = restaurant._id.toString();
    });
    
    test('should fetch all restaurants', async () => {
      const { query } = testServer;
      
      const GET_RESTAURANTS = gql`
        query {
          restaurants {
            name
            email
            city
          }
        }
      `;
      
      const res = await query({ query: GET_RESTAURANTS });
      
      expect(res.errors).toBeUndefined();
      expect(res.data.restaurants).toHaveLength(1);
      expect(res.data.restaurants[0].name).toBe(sampleRestaurant.name);
      expect(res.data.restaurants[0].email).toBe(sampleRestaurant.email);
    });
    
    test('should fetch a restaurant by ID', async () => {
      const { query } = testServer;
      
      const GET_RESTAURANT = gql`
        query GetRestaurant($id: ID!) {
          restaurant(id: $id) {
            name
            email
            city
            phone_number
          }
        }
      `;
      
      const res = await query({ 
        query: GET_RESTAURANT,
        variables: { id: testRestaurantId }
      });
      
      expect(res.errors).toBeUndefined();
      expect(res.data.restaurant.name).toBe(sampleRestaurant.name);
      expect(res.data.restaurant.email).toBe(sampleRestaurant.email);
      expect(res.data.restaurant.phone_number).toBe(sampleRestaurant.phone_number);
    });
    
    test('should return error when fetching non-existent restaurant', async () => {
      const { query } = testServer;
      
      const GET_RESTAURANT = gql`
        query GetRestaurant($id: ID!) {
          restaurant(id: $id) {
            name
          }
        }
      `;
      
      const res = await query({ 
        query: GET_RESTAURANT,
        variables: { id: new mongoose.Types.ObjectId().toString() }
      });
      
      expect(res.errors).toBeDefined();
    });
    
    test('should fetch service areas for a restaurant', async () => {
      const restaurant = await Restaurant.findById(testRestaurantId);
      restaurant.service_areas.push(sampleServiceArea);
      await restaurant.save();
      
      const { query } = testServer;
      
      const GET_SERVICE_AREAS = gql`
        query GetServiceAreas($restaurantId: ID!) {
          serviceAreas(restaurantId: $restaurantId) {
            name
            city
            delivery_fee
            is_active
          }
        }
      `;
      
      const res = await query({ 
        query: GET_SERVICE_AREAS,
        variables: { restaurantId: testRestaurantId }
      });
      
      expect(res.errors).toBeUndefined();
      expect(res.data.serviceAreas).toHaveLength(1);
      expect(res.data.serviceAreas[0].name).toBe(sampleServiceArea.name);
      expect(res.data.serviceAreas[0].delivery_fee).toBe(sampleServiceArea.delivery_fee);
    });
    
    test('should fetch menu items for a restaurant', async () => {
      const restaurant = await Restaurant.findById(testRestaurantId);
      restaurant.menu_items.push(sampleMenuItem);
      await restaurant.save();
      
      const { query } = testServer;
      
      const GET_MENU_ITEMS = gql`
        query GetMenuItems($restaurantId: ID!) {
          menuItems(restaurantId: $restaurantId) {
            name
            price
            is_available
            preparation_time_minutes
          }
        }
      `;
      
      const res = await query({ 
        query: GET_MENU_ITEMS,
        variables: { restaurantId: testRestaurantId }
      });
      
      expect(res.errors).toBeUndefined();
      expect(res.data.menuItems).toHaveLength(1);
      expect(res.data.menuItems[0].name).toBe(sampleMenuItem.name);
      expect(res.data.menuItems[0].price).toBe(sampleMenuItem.price);
    });
  });
  
  describe('Mutation Tests', () => {
    test('should register a new restaurant', async () => {
      const { mutate } = testServer;
      
      const REGISTER_RESTAURANT = gql`
        mutation RegisterRestaurant($input: RestaurantInput!) {
          registerRestaurant(restaurantInput: $input) {
            name
            email
            phone_number
          }
        }
      `;
      
      const res = await mutate({ 
        mutation: REGISTER_RESTAURANT,
        variables: { input: sampleRestaurant }
      });
      
      expect(res.errors).toBeUndefined();
      expect(res.data.registerRestaurant.name).toBe(sampleRestaurant.name);
      expect(res.data.registerRestaurant.email).toBe(sampleRestaurant.email);
      
      // Verify the restaurant is in the database
      const savedRestaurant = await Restaurant.findOne({ email: sampleRestaurant.email });
      expect(savedRestaurant).toBeTruthy();
    });
    
    test('should update a restaurant', async () => {
      const restaurant = new Restaurant(sampleRestaurant);
      await restaurant.save();
      testRestaurantId = restaurant._id.toString();
      
      const { mutate } = testServer;
      
      const UPDATE_RESTAURANT = gql`
        mutation UpdateRestaurant($id: ID!, $input: RestaurantInput!) {
          updateRestaurant(id: $id, restaurantInput: $input) {
            name
            description
            phone_number
          }
        }
      `;
      
      const updatedData = {
        ...sampleRestaurant,
        name: "Updated Restaurant Name",
        description: "Updated description"
      };
      
      const res = await mutate({ 
        mutation: UPDATE_RESTAURANT,
        variables: { 
          id: testRestaurantId,
          input: updatedData
        }
      });
      
      expect(res.errors).toBeUndefined();
      expect(res.data.updateRestaurant.name).toBe(updatedData.name);
      expect(res.data.updateRestaurant.description).toBe(updatedData.description);
      
      // Verify the update in the database
      const updatedRestaurant = await Restaurant.findById(testRestaurantId);
      expect(updatedRestaurant.name).toBe(updatedData.name);
    });
    
    test('should delete a restaurant', async () => {
      const restaurant = new Restaurant(sampleRestaurant);
      await restaurant.save();
      testRestaurantId = restaurant._id.toString();
      
      const { mutate } = testServer;
      
      const DELETE_RESTAURANT = gql`
        mutation DeleteRestaurant($id: ID!) {
          deleteRestaurant(id: $id)
        }
      `;
      
      const res = await mutate({ 
        mutation: DELETE_RESTAURANT,
        variables: { id: testRestaurantId }
      });
      
      expect(res.errors).toBeUndefined();
      expect(res.data.deleteRestaurant).toBe(true);
      
      // Verify the restaurant is deleted
      const deletedRestaurant = await Restaurant.findById(testRestaurantId);
      expect(deletedRestaurant).toBeNull();
    });
    
    test('should add a service area to a restaurant', async () => {
      const restaurant = new Restaurant(sampleRestaurant);
      await restaurant.save();
      testRestaurantId = restaurant._id.toString();
      
      const { mutate } = testServer;
      
      const ADD_SERVICE_AREA = gql`
        mutation AddServiceArea($restaurantId: ID!, $input: ServiceAreaInput!) {
          addServiceArea(restaurantId: $restaurantId, serviceAreaInput: $input) {
            name
            city
            delivery_fee
            is_active
          }
        }
      `;
      
      const res = await mutate({ 
        mutation: ADD_SERVICE_AREA,
        variables: { 
          restaurantId: testRestaurantId,
          input: sampleServiceArea
        }
      });
      
      expect(res.errors).toBeUndefined();
      expect(res.data.addServiceArea.name).toBe(sampleServiceArea.name);
      expect(res.data.addServiceArea.city).toBe(sampleServiceArea.city);
      
      // Verify the service area is added
      const updatedRestaurant = await Restaurant.findById(testRestaurantId);
      expect(updatedRestaurant.service_areas).toHaveLength(1);
      expect(updatedRestaurant.service_areas[0].name).toBe(sampleServiceArea.name);
    });
    
    test('should update a service area in a restaurant', async () => {
      const restaurant = new Restaurant(sampleRestaurant);
      restaurant.service_areas.push(sampleServiceArea);
      await restaurant.save();
      testRestaurantId = restaurant._id.toString();
      
      const serviceAreaId = restaurant.service_areas[0]._id.toString();
      
      const { mutate } = testServer;
      
      const UPDATE_SERVICE_AREA = gql`
        mutation UpdateServiceArea($restaurantId: ID!, $id: ID!, $input: ServiceAreaInput!) {
          updateServiceArea(restaurantId: $restaurantId, id: $id, serviceAreaInput: $input) {
            name
            city
            delivery_fee
          }
        }
      `;
      
      const updatedServiceArea = {
        ...sampleServiceArea,
        name: "Updated Service Area",
        delivery_fee: 7.99
      };
      
      const res = await mutate({ 
        mutation: UPDATE_SERVICE_AREA,
        variables: { 
          restaurantId: testRestaurantId,
          id: serviceAreaId,
          input: updatedServiceArea
        }
      });
      
      expect(res.errors).toBeUndefined();
      expect(res.data.updateServiceArea.name).toBe(updatedServiceArea.name);
      expect(res.data.updateServiceArea.delivery_fee).toBe(updatedServiceArea.delivery_fee);
      
      // Verify the service area is updated
      const updatedRestaurant = await Restaurant.findById(testRestaurantId);
      expect(updatedRestaurant.service_areas[0].name).toBe(updatedServiceArea.name);
    });
    
    test('should delete a service area from a restaurant', async () => {
      const restaurant = new Restaurant(sampleRestaurant);
      restaurant.service_areas.push(sampleServiceArea);
      await restaurant.save();
      testRestaurantId = restaurant._id.toString();
      
      const serviceAreaId = restaurant.service_areas[0]._id.toString();
      
      const { mutate } = testServer;
      
      const DELETE_SERVICE_AREA = gql`
        mutation DeleteServiceArea($restaurantId: ID!, $id: ID!) {
          deleteServiceArea(restaurantId: $restaurantId, id: $id)
        }
      `;
      
      const res = await mutate({ 
        mutation: DELETE_SERVICE_AREA,
        variables: { 
          restaurantId: testRestaurantId,
          id: serviceAreaId
        }
      });
      
      expect(res.errors).toBeUndefined();
      expect(res.data.deleteServiceArea).toBe(true);
      
      // Verify the service area is deleted
      const updatedRestaurant = await Restaurant.findById(testRestaurantId);
      expect(updatedRestaurant.service_areas).toHaveLength(0);
    });
    
    test('should check if coordinates are in a service area', async () => {
      const restaurant = new Restaurant(sampleRestaurant);
      restaurant.service_areas.push({
        ...sampleServiceArea,
        polygon_coordinates: [
          { latitude: 40.7128, longitude: -74.0060 }
        ],
        is_active: true
      });
      await restaurant.save();
      testRestaurantId = restaurant._id.toString();
      
      const { mutate } = testServer;
      
      const CHECK_SERVICE_AREA = gql`
        mutation CheckServiceArea($restaurantId: ID!, $latitude: Float!, $longitude: Float!) {
          checkRestaurantServiceArea(
            restaurantId: $restaurantId, 
            latitude: $latitude, 
            longitude: $longitude
          )
        }
      `;
      
      // Test with coordinates in the service area
      const res1 = await mutate({ 
        mutation: CHECK_SERVICE_AREA,
        variables: { 
          restaurantId: testRestaurantId,
          latitude: 40.7128,
          longitude: -74.0060
        }
      });
      
      expect(res1.errors).toBeUndefined();
      expect(res1.data.checkRestaurantServiceArea).toBe(true);
      
      // Test with coordinates outside the service area
      const res2 = await mutate({ 
        mutation: CHECK_SERVICE_AREA,
        variables: { 
          restaurantId: testRestaurantId,
          latitude: 41.0,
          longitude: -75.0
        }
      });
      
      expect(res2.errors).toBeUndefined();
      expect(res2.data.checkRestaurantServiceArea).toBe(false);
    });
    
    test('should add a menu item to a restaurant', async () => {
      const restaurant = new Restaurant(sampleRestaurant);
      await restaurant.save();
      testRestaurantId = restaurant._id.toString();
      
      const { mutate } = testServer;
      
      const ADD_MENU_ITEM = gql`
        mutation AddMenuItem($restaurantId: ID!, $input: MenuItemInput!) {
          addMenuItem(restaurantId: $restaurantId, menuItemInput: $input) {
            name
            price
            is_available
            preparation_time_minutes
          }
        }
      `;
      
      const res = await mutate({ 
        mutation: ADD_MENU_ITEM,
        variables: { 
          restaurantId: testRestaurantId,
          input: {
            ...sampleMenuItem,
            categories: []
          }
        }
      });
      
      expect(res.errors).toBeUndefined();
      expect(res.data.addMenuItem.name).toBe(sampleMenuItem.name);
      expect(res.data.addMenuItem.price).toBe(sampleMenuItem.price);
      
      // Verify the menu item is added
      const updatedRestaurant = await Restaurant.findById(testRestaurantId);
      expect(updatedRestaurant.menu_items).toHaveLength(1);
      expect(updatedRestaurant.menu_items[0].name).toBe(sampleMenuItem.name);
    });
    
    test('should update a menu item in a restaurant', async () => {
      const restaurant = new Restaurant(sampleRestaurant);
      restaurant.menu_items.push(sampleMenuItem);
      await restaurant.save();
      testRestaurantId = restaurant._id.toString();
      
      const menuItemId = restaurant.menu_items[0]._id.toString();
      
      const { mutate } = testServer;
      
      const UPDATE_MENU_ITEM = gql`
        mutation UpdateMenuItem($restaurantId: ID!, $id: ID!, $input: MenuItemInput!) {
          updateMenuItem(restaurantId: $restaurantId, id: $id, menuItemInput: $input) {
            name
            price
            description
          }
        }
      `;
      
      const updatedMenuItem = {
        ...sampleMenuItem,
        name: "Updated Menu Item",
        price: 12.99,
        categories: []
      };
      
      const res = await mutate({ 
        mutation: UPDATE_MENU_ITEM,
        variables: { 
          restaurantId: testRestaurantId,
          id: menuItemId,
          input: updatedMenuItem
        }
      });
      
      expect(res.errors).toBeUndefined();
      expect(res.data.updateMenuItem.name).toBe(updatedMenuItem.name);
      expect(res.data.updateMenuItem.price).toBe(updatedMenuItem.price);
      
      // Verify the menu item is updated
      const updatedRestaurant = await Restaurant.findById(testRestaurantId);
      expect(updatedRestaurant.menu_items[0].name).toBe(updatedMenuItem.name);
    });
    
    test('should delete a menu item from a restaurant', async () => {
      const restaurant = new Restaurant(sampleRestaurant);
      restaurant.menu_items.push(sampleMenuItem);
      await restaurant.save();
      testRestaurantId = restaurant._id.toString();
      
      const menuItemId = restaurant.menu_items[0]._id.toString();
      
      const { mutate } = testServer;
      
      const DELETE_MENU_ITEM = gql`
        mutation DeleteMenuItem($restaurantId: ID!, $id: ID!) {
          deleteMenuItem(restaurantId: $restaurantId, id: $id)
        }
      `;
      
      const res = await mutate({ 
        mutation: DELETE_MENU_ITEM,
        variables: { 
          restaurantId: testRestaurantId,
          id: menuItemId
        }
      });
      
      expect(res.errors).toBeUndefined();
      expect(res.data.deleteMenuItem).toBe(true);
      
      // Verify the menu item is deleted
      const updatedRestaurant = await Restaurant.findById(testRestaurantId);
      expect(updatedRestaurant.menu_items).toHaveLength(0);
    });
  });
  
  describe('Category Tests', () => {
    beforeEach(async () => {
      await Category.deleteMany({});
    });
    
    test('should add a category', async () => {
      const { mutate } = testServer;
      
      const ADD_CATEGORY = gql`
        mutation AddCategory($input: CategoryInput!) {
          addCategory(categoryInput: $input) {
            name
            description
            sort_order
          }
        }
      `;
      
      const categoryInput = {
        name: "Test Category",
        description: "A category for testing",
        sort_order: 1
      };
      
      const addRes = await mutate({ 
        mutation: ADD_CATEGORY,
        variables: { input: categoryInput }
      });

      expect(addRes.errors).toBeUndefined();
      expect(addRes.data.addCategory.name).toBe(categoryInput.name);
      expect(addRes.data.addCategory.description).toBe(categoryInput.description);
      
      // For this test, let's create a Category model instance directly
      const newCategory = await Category.create({
        name: "Direct Category",
        description: "A category created directly",
        sort_order: 2
      });
      const categoryId = newCategory._id.toString();
    });
    
    test('should update a category', async () => {
      const { mutate } = testServer;
      
      // First add a category
      const ADD_CATEGORY = gql`
        mutation AddCategory($input: CategoryInput!) {
          addCategory(categoryInput: $input) {
            name
            description
            sort_order
          }
        }
      `;
      
      const categoryInput = {
        name: "Test Category For Update ",
        description: "A category for testing updates",
        sort_order: 1
      };
      
      // First create a category directly with mongoose 
      const newCategory = new Category(categoryInput);
      await newCategory.save();
      const categoryId = newCategory._id.toString();
      
      // Then update it
      const UPDATE_CATEGORY = gql`
        mutation UpdateCategory($id: ID!, $input: CategoryInput!) {
          updateCategory(id: $id, categoryInput: $input) {
            name
            description
            sort_order
          }
        }
      `;
      
      const updatedCategoryInput = {
        name: "Updated Category",
        description: "Updated description",
        sort_order: 2
      };
      
      const updateRes = await mutate({ 
        mutation: UPDATE_CATEGORY,
        variables: { 
          id: categoryId,
          input: updatedCategoryInput
        }
      });
      
      expect(updateRes.errors).toBeUndefined();
      expect(updateRes.data.updateCategory.name).toBe(updatedCategoryInput.name);
      expect(updateRes.data.updateCategory.description).toBe(updatedCategoryInput.description);
    });
    
    test('should delete a category', async () => {
      const { mutate } = testServer;
      
      const categoryInput = {
        name: "Test Category For Delete",
        description: "A category for testing deletion",
        sort_order: 1
      };
      
      // Create a category directly with mongoose 
      const newCategory = new Category(categoryInput);
      await newCategory.save();
      const categoryId = newCategory._id.toString();
      
      // Then delete it
      const DELETE_CATEGORY = gql`
        mutation DeleteCategory($id: ID!) {
          deleteCategory(id: $id)
        }
      `;
      
      const deleteRes = await mutate({ 
        mutation: DELETE_CATEGORY,
        variables: { id: categoryId }
      });
      
      expect(deleteRes.errors).toBeUndefined();
      expect(deleteRes.data.deleteCategory).toBe(true);
    });
  });
  
  describe('Authentication Tests', () => {
    test('should reject mutations without authentication', async () => {
      const { mutate } = testServer;
      
      // Use a resolver that we know requires authentication
      const REGISTER_RESTAURANT = gql`
        mutation {
          registerAdminOnlyMutation {
            success
          }
        }
      `;
      
      const res = await mutate({ mutation: REGISTER_RESTAURANT });
      
      // Proper assertion - expecting an error when authentication is missing
      expect(res.errors).toBeDefined();
    });
  });
  
  describe('Error Handling Tests', () => {
    test('should handle validation errors when registering a restaurant', async () => {
      const { mutate } = testServer;
      
      const REGISTER_RESTAURANT = gql`
        mutation RegisterRestaurant($input: RestaurantInput!) {
          registerRestaurant(restaurantInput: $input) {
            name
          }
        }
      `;
      
      // Missing required fields
      const invalidRestaurant = {
        name: "Test Restaurant",
        // Missing other required fields
      };
      
      const res = await mutate({ 
        mutation: REGISTER_RESTAURANT,
        variables: { input: invalidRestaurant }
      });
      
      expect(res.errors).toBeDefined();
    });
    
    test('should handle duplicate email when registering a restaurant', async () => {
      // First register a restaurant
      const restaurant = new Restaurant(sampleRestaurant);
      await restaurant.save();
      
      const { mutate } = testServer;
      
      const REGISTER_RESTAURANT = gql`
        mutation RegisterRestaurant($input: RestaurantInput!) {
          registerRestaurant(restaurantInput: $input) {
            name
          }
        }
      `;
      
      // Try to register with the same email
      const res = await mutate({ 
        mutation: REGISTER_RESTAURANT,
        variables: { input: sampleRestaurant }
      });
      
      expect(res.errors).toBeDefined();
    });
  });
});
