"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEventToUserService = exports.sendEventToRestaurantService = exports.sendEventToOrderService = exports.sendEventToNotificationService = exports.sendEventToMessageService = exports.userService = exports.restaurantService = exports.orderService = exports.notificationService = exports.messageService = void 0;
const graphql_request_1 = require("graphql-request");
const ports_1 = __importDefault(require("../ports"));
// Initialize GraphQL clients
exports.messageService = new graphql_request_1.GraphQLClient(`http://messages:${ports_1.default.messages}`);
exports.notificationService = new graphql_request_1.GraphQLClient(`http://notification:${ports_1.default.notifications}`);
exports.orderService = new graphql_request_1.GraphQLClient(`http://orders:${ports_1.default.orders}`);
exports.restaurantService = new graphql_request_1.GraphQLClient(`http://restaurants:${ports_1.default.restaurants}`);
exports.userService = new graphql_request_1.GraphQLClient(`http://users:${ports_1.default.users}`);
// GraphQL mutations
exports.sendEventToMessageService = (0, graphql_request_1.gql) `
  mutation Mutation($input: EventInput!) {
    events(input: $input) {
      id
    }
  }
`;
exports.sendEventToNotificationService = (0, graphql_request_1.gql) `
  mutation Mutation($input: EventInput!) {
    events(input: $input) {
      id
    }
  }
`;
exports.sendEventToOrderService = (0, graphql_request_1.gql) `
  mutation Mutation($input: EventInput!) {
    events(input: $input) {
      id
    }
  }
`;
exports.sendEventToRestaurantService = (0, graphql_request_1.gql) `
  mutation Mutation($input: EventInput!) {
    events(input: $input) {
      id
    }
  }
`;
exports.sendEventToUserService = (0, graphql_request_1.gql) `
  mutation Mutation($input: EventInput!) {
    events(input: $input) {
      id
    }
  }
`;
