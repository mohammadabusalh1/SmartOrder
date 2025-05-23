interface Ports {
  messages: number;
  notifications: number;
  orders: number;
  restaurants: number;
  users: number;
  logger: number;
}

const ports: Ports = {
  messages: 4001,
  notifications: 4002,
  orders: 4003,
  restaurants: 4004,
  users: 4005,
  logger: 4006,
};

export default ports;
