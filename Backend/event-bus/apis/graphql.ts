import { GraphQLClient, gql } from "graphql-request";
import ports from "../ports.js";

const isDocker = process.env.DOCKER === "true";
const baseUrl = isDocker ? "" : "localhost";

// Initialize GraphQL clients
export const messageService = new GraphQLClient(
  `http://${baseUrl}:${ports.messages}/graphql`
);
export const notificationService = new GraphQLClient(
  `http://${baseUrl}:${ports.notifications}/graphql`
);
export const orderService = new GraphQLClient(
  `http://${baseUrl}:${ports.orders}/graphql`
);
export const restaurantService = new GraphQLClient(
  `http://${baseUrl}:${ports.restaurants}/graphql`
);
export const userService = new GraphQLClient(
  `http://${baseUrl}:${ports.users}/graphql`
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
