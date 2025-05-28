interface Ports {
  messages: number;
  notifications: number;
  orders: number;
  restaurants: number;
  users: number;
  logger: number;
}

const ports: Ports = {
  messages: 4003,
  notifications: 4004,
  orders: 4005,
  restaurants: 4006,
  users: 4007,
  logger: 4002,
};

export default ports;
