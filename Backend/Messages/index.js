require('dotenv').config();
const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const mongoose = require('mongoose');
const cors = require('cors');
const typeDefs = require('./graphql/typeDefs');
const resolvers = require('./graphql/resolvers');
const { authentication } = require('./middleware/authentication');

// Initialize express
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

const MONGODB_USER = process.env.MONGODB_USER;
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD;
const MONGODB_HOST = process.env.MONGODB_HOST;
const MONGODB_DATABASE = process.env.MONGODB_DATABASE;

const MONGODB_URI = `mongodb://${MONGODB_USER}:${MONGODB_PASSWORD}@${MONGODB_HOST}/${MONGODB_DATABASE}?authSource=admin`;

// Connect to MongoDB
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Setup Apollo Server
async function startApolloServer() {
  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
    /**
     * Add authentication to the GraphQL context
     * @param {Object} obj - { req }
     * @param {Object} obj.req - Express request object
     * @returns {Object} - { user } where user is authenticated user object or null
     */
    context: ({ req }) => {
      // Add authentication to the GraphQL context
      const token = req.headers.authorization || '';
      const user = authentication(token);
      return { user };
    },
  });

  await apolloServer.start();
  apolloServer.applyMiddleware({ app, path: '/graphql' });

  const PORT = process.env.PORT;
  app.listen(PORT, () => {
    console.log(`Messages service running on port ${PORT}`);
    console.log(`GraphQL endpoint: http://localhost:${PORT}${apolloServer.graphqlPath}`);
  });
}

startApolloServer().catch(err => {
  console.error('Error starting server:', err);
}); 