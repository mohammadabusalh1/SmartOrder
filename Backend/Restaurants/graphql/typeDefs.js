const { gql } = require('apollo-server-express');

const typeDefs = gql`
  scalar DateTime
  scalar JSON

  type Restaurant {
    owner_user_id: ID!
    name: String!
    description: String
    address_line1: String!
    address_line2: String
    city: String!
    postal_code: String!
    country: String!
    latitude: Float
    longitude: Float
    phone_number: String!
    email: String!
    website_url: String
    logo_url: String
    cover_image_url: String
    operating_hours: [OperatingHours!]!
    reviews: [Review!]
    service_areas: [ServiceArea!]
    menu_items: [MenuItem!]
    average_rating: Float
    total_ratings: Int
    bank_account_details: String
    created_at: DateTime!
    updated_at: DateTime!
  }

  type OperatingHours {
    day: Int!
    open: String!
    close: String!
  }

  type Review {
    order_id: ID!
    customer_user_id: ID
    rating_service_experience: Int
    comment: String
    review_images_urls: [String!]
    restaurant_reply_text: String
    restaurant_reply_timestamp: DateTime
    is_anonymous: Boolean
    created_at: DateTime
    updated_at: DateTime
  }

  type PolygonCoordinates {
    latitude: Float!
    longitude: Float!
  }

  type ServiceArea {
    name: String!
    city: String!
    polygon_coordinates: [PolygonCoordinates!]!
    delivery_fee: Float!
    min_order_value_for_delivery: Float
    is_active: Boolean
    created_at: DateTime
    updated_at: DateTime
  }

  type Category {
    name: String!
    description: String
    sort_order: Int
    categories: [Category!]
    created_at: DateTime
    updated_at: DateTime
  }

  type MenuItem {
    categories: [Category!]!
    name: String!
    description: String
    price: Float!
    image_url: String
    is_available: Boolean!
    preparation_time_minutes: Int!
    calories: Int
    dietary_tags: [String!]
    portion_size: String
    created_at: DateTime
    updated_at: DateTime
  }
  
  input RestaurantInput {
    owner_user_id: ID!
    name: String!
    description: String
    address_line1: String!
    address_line2: String
    city: String!
    postal_code: String!
    country: String!
    latitude: Float
    longitude: Float
    phone_number: String!
    email: String!
    website_url: String
    logo_url: String
    cover_image_url: String
    operating_hours: [OperatingHoursInput!]!
    reviews: [ReviewInput]
    service_areas: [ServiceAreaInput]
    menu_items: [MenuItemInput]
    average_rating: Float
    total_ratings: Int
    bank_account_details: String
  }

  input OperatingHoursInput {
    day: Int!
    open: String!
    close: String!
  }

  input ReviewInput {
    order_id: ID!
    customer_user_id: ID
    rating_service_experience: Int
    comment: String
    review_images_urls: [String!]
    restaurant_reply_text: String
    restaurant_reply_timestamp: DateTime
    is_anonymous: Boolean
  }


  input PolygonCoordinatesInput {
    latitude: Float!
    longitude: Float!
  }

  input ServiceAreaInput {
    name: String!
    city: String!
    polygon_coordinates: [PolygonCoordinatesInput!]
    delivery_fee: Float!
    min_order_value_for_delivery: Float
    is_active: Boolean
  }

  input CategoryInput {
    name: String!
    description: String
    sort_order: Int
    categories: [CategoryInput]
  }

  input MenuItemInput {
    categories: [ID!]!
    name: String!
    description: String
    price: Float!
    image_url: String
    is_available: Boolean!
    preparation_time_minutes: Int!
    calories: Int
    dietary_tags: [String!]
    portion_size: String
  }

  input EventInput {
    type: String!
    data: JSON!
  }

  type Event {
    id: ID!
    type: String!
    data: JSON!
  }

  type Query {
    restaurants: [Restaurant!]!
    restaurant(id: ID!): Restaurant!
    serviceAreas(restaurantId: ID!): [ServiceArea!]!
    menuItems(restaurantId: ID!): [MenuItem!]!
    menuItem(itemId: ID!): MenuItem!
    categories(restaurantId: ID!): [Category!]!
  }

  type Mutation {
    events(input: EventInput!): Event!
    registerRestaurant(restaurantInput: RestaurantInput!): Restaurant!
    updateRestaurant(id: ID!, restaurantInput: RestaurantInput!): Restaurant!
    deleteRestaurant(id: ID!): Boolean!
    addServiceArea(restaurantId: ID!, serviceAreaInput: ServiceAreaInput!): ServiceArea!
    updateServiceArea(restaurantId: ID!, id: ID!, serviceAreaInput: ServiceAreaInput!): ServiceArea!
    deleteServiceArea(restaurantId: ID!, id: ID!): Boolean!
    checkRestaurantServiceArea(restaurantId: ID!, latitude: Float!, longitude: Float!): Boolean!
    addMenuItem(restaurantId: ID!, menuItemInput: MenuItemInput!): MenuItem!
    updateMenuItem(restaurantId: ID!, id: ID!, menuItemInput: MenuItemInput!): MenuItem!
    deleteMenuItem(restaurantId: ID!, id: ID!): Boolean!
    addCategory(categoryInput: CategoryInput!): Category!
    updateCategory(id: ID!, categoryInput: CategoryInput!): Category!
    deleteCategory(id: ID!): Boolean!
  }
`;

module.exports = typeDefs; 