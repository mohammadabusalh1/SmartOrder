import { GraphQLClient, gql } from "graphql-request";
import ports from "../ports";

// Initialize GraphQL clients
export const messageService = new GraphQLClient(
  `http://messages:${ports.messages}`
);
export const notificationService = new GraphQLClient(
  `http://notification:${ports.notifications}`
);
export const orderService = new GraphQLClient(`http://orders:${ports.orders}`);
export const restaurantService = new GraphQLClient(
  `http://restaurants:${ports.restaurants}`
);
export const userService = new GraphQLClient(`http://users:${ports.users}`);

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
