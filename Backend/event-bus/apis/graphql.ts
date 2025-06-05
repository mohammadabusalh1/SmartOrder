import { GraphQLClient, gql } from "graphql-request";
import ports from "../ports.js";

// const isDocker = process.env.DOCKER === "true";
// const baseUrl = isDocker ? "" : "localhost";
const message = process.env.MESSAGE_SERVICE || "message-service";
const notification = process.env.NOTIFICATION_SERVICE || "notification-service";
const order = process.env.ORDER_SERVICE || "order-service";
const restaurant = process.env.RESTAURANT_SERVICE || "restaurant-service";
const user = process.env.USER_SERVICE || "user-service";

// Initialize GraphQL clients
export const messageService = new GraphQLClient(
  `http://${message}:${ports.messages}/graphql`
);
export const notificationService = new GraphQLClient(
  `http://${notification}:${ports.notifications}/graphql`
);
export const orderService = new GraphQLClient(
  `http://${order}:${ports.orders}/graphql`
);
export const restaurantService = new GraphQLClient(
  `http://${restaurant}:${ports.restaurants}/graphql`
);
export const userService = new GraphQLClient(
  `http://${user}:${ports.users}/graphql`
);

// GraphQL mutations
export const sendEventToMessageService = gql`
  mutation Mutation($input: EventInput!) {
    events(input: $input) {
      id
    }
  }
`;

export const sendEventToNotificationService = gql`
  mutation Mutation($input: EventInput!) {
    events(input: $input) {
      id
    }
  }
`;

export const sendEventToOrderService = gql`
  mutation Mutation($input: EventInput!) {
    events(input: $input) {
      id
    }
  }
`;

export const sendEventToRestaurantService = gql`
  mutation Mutation($input: EventInput!) {
    events(input: $input) {
      id
    }
  }
`;

export const sendEventToUserService = gql`
  mutation Mutation($input: EventInput!) {
    events(input: $input) {
      id
    }
  }
`;
